/**
 * Verify the instructions budget guard passes a file within the limit, names the file, size and limit when it is
 * larger, and warns and passes without `knowledge.instructionsBudget`. The profile is JSON, which is valid YAML, read
 * through a stub `yaml` package so the test needs no dependency.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { budgetProblem } from '../core/document-budget.mjs';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));

function write(directory, file, content) {
  mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
  writeFileSync(path.join(directory, file), content);
}

function guarded(t, knowledge, instructions) {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-budget-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q', directory]);
  spawnSync(process.execPath, [path.join(TOOLKIT, 'scripts', 'install.mjs'), '--to', directory]);
  write(directory, 'node_modules/yaml/package.json', JSON.stringify({ name: 'yaml', type: 'module', main: 'index.js' }));
  write(directory, 'node_modules/yaml/index.js', 'export const parse = JSON.parse;\n');
  write(directory, '.claude/pipeline/profile.yml', JSON.stringify({ knowledge }));
  write(directory, 'CLAUDE.md', instructions);
  return spawnSync(process.execPath, [path.join(directory, '.claude/pipeline/core/document-budget.mjs')], {
    encoding: 'utf8',
  });
}

test('a file within the budget passes', t => {
  const result = guarded(t, { projectInstructions: 'CLAUDE.md', instructionsBudget: 10 }, '0123456789');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'Document budget check passed.\n');
});

test('a file over the budget fails with its size and the limit', t => {
  const result = guarded(t, { projectInstructions: 'CLAUDE.md', instructionsBudget: 10 }, '0123456789A');
  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'CLAUDE.md: 11 bytes, limit 10\n');
});

test('without the key it warns and passes', t => {
  const result = guarded(t, { projectInstructions: 'CLAUDE.md' }, 'x'.repeat(100));
  assert.equal(result.status, 0);
  assert.match(result.stderr, /no knowledge\.instructionsBudget/);
});

test('a budget that is not a positive integer is refused', () => {
  for (const instructionsBudget of [0, -1, 1.5, '100']) {
    assert.throws(() => budgetProblem({ projectInstructions: 'CLAUDE.md', instructionsBudget }, () => 0), /positive integer/);
  }
});
