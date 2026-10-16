/**
 * Verify the drift guard passes on an intact install, names a hand-edited or deleted file, and passes without a lock.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));

function installed(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-verify-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q', directory]);
  spawnSync(process.execPath, [path.join(TOOLKIT, 'scripts', 'install.mjs'), '--to', directory]);
  return directory;
}

function verify(directory) {
  return spawnSync(process.execPath, [path.join(directory, '.claude/pipeline/core/verify.mjs')], { encoding: 'utf8' });
}

test('an intact install passes', t => {
  const result = verify(installed(t));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /files match Legend AI Toolkit/);
});

test('a hand-edited or deleted file fails and is named', t => {
  const directory = installed(t);
  writeFileSync(path.join(directory, '.claude/pipeline/core/seals.md'), 'edited\n');
  rmSync(path.join(directory, '.claude/agents/pipeline-reviewer.md'));

  const result = verify(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\.claude\/pipeline\/core\/seals\.md/);
  assert.match(result.stderr, /pipeline-reviewer\.md \(missing\)/);
  assert.match(result.stderr, /Change them in the Legend AI Toolkit/);
});

test('a project without a lock passes with a warning', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-nolock-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(path.join(directory, '.claude/pipeline/core'), { recursive: true });
  copyFileSync(path.join(TOOLKIT, 'core/verify.mjs'), path.join(directory, '.claude/pipeline/core/verify.mjs'));

  const result = verify(directory);
  assert.equal(result.status, 0);
  assert.match(result.stderr, /no \.claude\/pipeline\/toolkit\.lock/);
});
