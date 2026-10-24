/**
 * Verify the prose the toolkit ships keeps working: every canonical pointer (`core/format.md`, section "Ponteiro")
 * resolves to a file and, with `, seção "<title>"`, to a heading of that file, and the doctor's context command (item
 * 28) reports the env and the resume hook on real settings files.
 *
 * Pointers in shipped files name the installed layout (`.claude/pipeline/core/`, `.claude/skills/pipeline-*`,
 * `.claude/agents/pipeline-*.md`) and are mapped back to this repository; any other path there belongs to the project
 * (an extension, its instructions) and is skipped, as the doctor itself reports it. Pointers in this repository's own
 * docs are paths from its root.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));
const POINTER = /`([^`\s<>*{}]+\.md)`(?:, seção "([^"]+)")?/g;
const INSTALLED = [
  ['.claude/pipeline/core/', 'core/'],
  ['.claude/skills/pipeline-', 'skills/pipeline-'],
  ['.claude/agents/pipeline-', 'agents/pipeline-'],
];

function markdown(directory) {
  const found = [];
  for (const entry of readdirSync(path.join(TOOLKIT, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) found.push(...markdown(relative));
    else if (entry.name.endsWith('.md')) found.push(relative);
  }
  return found;
}

function shipped() {
  const skills = readdirSync(path.join(TOOLKIT, 'skills')).filter(name => name.startsWith('pipeline-'));
  const agents = readdirSync(path.join(TOOLKIT, 'agents')).filter(name => name.startsWith('pipeline-'));
  return [
    ...markdown('core'),
    ...skills.flatMap(skill => markdown(`skills/${skill}`)),
    ...agents.map(name => `agents/${name}`),
  ];
}

/** Map a pointer to a file of this repository, or null when it names a file the project owns. */
function resolve(target, { inShipped }) {
  for (const [installed, source] of INSTALLED) {
    if (target.startsWith(installed)) return source + target.slice(installed.length);
  }
  if (target.startsWith('.claude/') || inShipped) return null;
  return target;
}

function headings(file) {
  return readFileSync(path.join(TOOLKIT, file), 'utf8')
    .split('\n')
    .filter(line => /^#+ /.test(line))
    .map(line => line.replace(/^#+ /, ''));
}

function brokenPointers(files, { inShipped }) {
  const broken = [];
  for (const file of files) {
    readFileSync(path.join(TOOLKIT, file), 'utf8')
      .split('\n')
      .forEach((line, index) => {
        for (const [, target, title] of line.matchAll(POINTER)) {
          if (!target.includes('/') && !title) continue;
          const source = resolve(target, { inShipped });
          if (!source) continue;
          const where = `${file}:${index + 1}`;
          if (!existsSync(path.join(TOOLKIT, source))) broken.push(`${where}: ${target} does not exist`);
          else if (title && !headings(source).includes(title)) broken.push(`${where}: ${target} has no "${title}"`);
        }
      });
  }
  return broken;
}

test('every pointer in the shipped core, skills and agents resolves', () => {
  assert.deepEqual(brokenPointers(shipped(), { inShipped: true }), []);
});

test('every pointer in this repository docs resolves', () => {
  const docs = ['CLAUDE.md', 'AGENTS.md', 'README.md', ...markdown('docs'), ...markdown('prompts')];
  assert.deepEqual(brokenPointers(docs, { inShipped: false }), []);
});

/** The bash block of a numbered doctor item, without the list indentation. */
function doctorCommand(item) {
  const text = readFileSync(path.join(TOOLKIT, 'skills/pipeline-doctor/SKILL.md'), 'utf8');
  const start = text.indexOf(`\n${item}. **`);
  const end = text.indexOf(`\n${item + 1}. **`, start);
  assert.notEqual(start, -1, `doctor item ${item}`);
  const block = text.slice(start, end === -1 ? undefined : end).match(/```bash\n([\s\S]*?)\n[ \t]*```/);
  assert.ok(block, `doctor item ${item} has a bash block`);
  return block[1].replace(/^ {4}/gm, '');
}

function runIn(t, files) {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-doctor-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    writeFileSync(path.join(directory, file), content);
  }
  const result = spawnSync('bash', ['-c', doctorCommand(28)], { cwd: directory, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('doctor item 28 reports a missing settings file as a warning, without crashing', t => {
  assert.equal(runIn(t, {}), 'AVISO env ausente\ngancho resume ausente (FALHA só com team:)\n');
});

test('doctor item 28 sees the env and the resume hook the installer writes', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-doctor-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q', directory]);
  mkdirSync(path.join(directory, '.claude/pipeline'), { recursive: true });
  writeFileSync(path.join(directory, '.claude/pipeline/profile.yml'), 'team:\n  note: <nota>\n');
  spawnSync(process.execPath, [path.join(TOOLKIT, 'scripts/install.mjs'), '--to', directory]);

  const settings = readFileSync(path.join(directory, '.claude/settings.json'), 'utf8');
  assert.equal(runIn(t, { '.claude/settings.json': settings }), 'OK env 250000\nOK gancho resume presente\n');
});

test('doctor item 28 keeps the project value, ignores another resume command and flags invalid JSON', t => {
  const other = JSON.stringify({
    env   : { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '180000' },
    hooks : { SessionStart: [{ matcher: 'compact', hooks: [{ type: 'command', command: 'tool resume' }] }] },
  });
  assert.equal(
    runIn(t, { '.claude/settings.json': other }),
    'OK env 180000\ngancho resume ausente (FALHA só com team:)\n',
  );
  assert.equal(runIn(t, { '.claude/settings.json': '{ broken' }), 'FALHA settings.json não é JSON válido\n');
});
