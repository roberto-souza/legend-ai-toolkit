/**
 * Verify the installer copies the toolkit into a project, is idempotent, merges the gate hooks without duplicating
 * them or dropping other settings, removes only the files the previous lock owned, and never touches project files.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));
const INSTALL = path.join(TOOLKIT, 'scripts', 'install.mjs');
const LOCK = '.claude/pipeline/toolkit.lock';
const SETTINGS = '.claude/settings.json';

function project(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-install-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q', directory]);
  return directory;
}

function install(directory, ...flags) {
  return spawnSync(process.execPath, [INSTALL, '--to', directory, ...flags], { encoding: 'utf8' });
}

function read(directory, file) {
  return readFileSync(path.join(directory, file), 'utf8');
}

function write(directory, file, content) {
  mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
  writeFileSync(path.join(directory, file), content);
}

function gateCommands(settings) {
  return Object.values(settings.hooks)
    .flat()
    .flatMap(entry => entry.hooks.map(hook => hook.command))
    .filter(command => command.includes('pipeline-gate.mjs'));
}

test('a first install copies core, skills and agents, writes the lock and the three gate hooks', t => {
  const directory = project(t);
  const result = install(directory);
  assert.equal(result.status, 0, result.stderr);

  for (const file of [
    '.claude/pipeline/core/pipeline-gate.mjs',
    '.claude/pipeline/core/verify.mjs',
    '.claude/skills/pipeline-execute-ticket/SKILL.md',
    '.claude/agents/pipeline-reviewer.md',
  ]) {
    assert.ok(existsSync(path.join(directory, file)), file);
  }

  assert.ok(statSync(path.join(directory, '.claude/skills/pipeline-maestro/maestro-sentinel.sh')).mode & 0o100);
  const lock = JSON.parse(read(directory, LOCK));
  assert.equal(lock.version, read(TOOLKIT, 'VERSION').trim());
  assert.ok(Object.keys(lock.files).every(file => file.startsWith('.claude/')));
  assert.equal(gateCommands(JSON.parse(read(directory, SETTINGS))).length, 3);
});

test('a second install changes nothing and check passes', t => {
  const directory = project(t);
  install(directory);
  const settings = read(directory, SETTINGS);
  const lock = read(directory, LOCK);

  const again = install(directory);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /0 added, 0 changed, 0 removed, 0 hooks added/);
  assert.equal(read(directory, SETTINGS), settings);
  assert.equal(read(directory, LOCK), lock);
  assert.equal(install(directory, '--check').status, 0);
});

test('the hook merge keeps other settings and hooks and leaves an existing gate hook alone', t => {
  const directory = project(t);
  const bash = 'node "$CLAUDE_PROJECT_DIR/.claude/pipeline/core/pipeline-gate.mjs" hook';
  write(
    directory,
    SETTINGS,
    JSON.stringify({
      env   : { KEEP: '1' },
      hooks : {
        PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo mine' }, { type: 'command', command: bash }] }],
        Stop: [{ hooks: [{ type: 'command', command: 'echo stop' }] }],
      },
    }),
  );

  const result = install(directory);
  assert.equal(result.status, 0, result.stderr);
  const settings = JSON.parse(read(directory, SETTINGS));
  assert.equal(settings.env.KEEP, '1');
  assert.equal(settings.hooks.Stop[0].hooks[0].command, 'echo stop');
  assert.equal(settings.hooks.PreToolUse[0].hooks.length, 2);
  assert.equal(gateCommands(settings).length, 3);
  assert.doesNotMatch(result.stdout, /HOOK PreToolUse Bash/);
});

test('an install removes a file the previous lock owned, and only that', t => {
  const directory = project(t);
  install(directory);
  const orphan = '.claude/skills/pipeline-gone/SKILL.md';
  write(directory, orphan, 'old');
  write(directory, '.claude/skills/other/SKILL.md', 'project skill');
  write(directory, 'README.md', 'project readme');
  const lock = JSON.parse(read(directory, LOCK));
  lock.files[orphan] = 'x';
  lock.files['README.md'] = 'x';
  lock.files['.claude/skills/pipeline-x/../../../README.md'] = 'x';
  write(directory, LOCK, JSON.stringify(lock));

  assert.equal(install(directory, '--check').status, 1);
  const result = install(directory);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /REMOVE \.claude\/skills\/pipeline-gone\/SKILL\.md/);
  assert.ok(!existsSync(path.join(directory, '.claude/skills/pipeline-gone')));
  assert.equal(read(directory, '.claude/skills/other/SKILL.md'), 'project skill');
  assert.equal(read(directory, 'README.md'), 'project readme');
});

test('check reports a hand-edited core file without writing, and install restores it', t => {
  const directory = project(t);
  install(directory);
  const file = '.claude/pipeline/core/seals.md';
  write(directory, file, 'edited');

  const check = install(directory, '--check');
  assert.equal(check.status, 1);
  assert.match(check.stdout, /CHANGE \.claude\/pipeline\/core\/seals\.md/);
  assert.equal(read(directory, file), 'edited');

  install(directory);
  assert.equal(read(directory, file), read(TOOLKIT, 'core/seals.md'));
});

test('an install never touches the profile, the extensions or a skill outside pipeline-*', t => {
  const directory = project(t);
  const own = {
    '.claude/pipeline/profile.yml' : 'profileVersion: 2\n',
    '.claude/pipeline/rules.md'    : '# rules\n',
    '.claude/skills/app-api/SKILL.md' : '# app\n',
  };
  for (const [file, content] of Object.entries(own)) write(directory, file, content);

  install(directory);
  for (const [file, content] of Object.entries(own)) assert.equal(read(directory, file), content, file);
  assert.ok(!Object.keys(JSON.parse(read(directory, LOCK)).files).some(file => file in own));
});

test('an install refuses a directory that is not a git root and a malformed settings file', t => {
  const plain = mkdtempSync(path.join(tmpdir(), 'legend-plain-'));
  t.after(() => rmSync(plain, { recursive: true, force: true }));
  assert.equal(install(plain).status, 1);

  const directory = project(t);
  write(directory, SETTINGS, '{ broken');
  const result = install(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not valid JSON/);
  assert.ok(!existsSync(path.join(directory, LOCK)));
});
