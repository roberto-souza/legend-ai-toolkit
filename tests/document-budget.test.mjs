/**
 * Verify the instructions budget guard passes a file within the limit, names the file, size and limit when it is
 * larger, warns and passes without `knowledge.instructionsBudget` or without a profile (even without the `yaml`
 * package, as with the template's commented key), finds the key in flow style, and fails on a missing file or an
 * invalid budget. A profile given as an object is written as JSON, which is valid YAML, and read through a stub `yaml`
 * package so the test needs no dependency.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { budgetProblem } from '../core/document-budget.mjs';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));
const BUDGETED = { knowledge: { projectInstructions: 'CLAUDE.md', instructionsBudget: 10 } };
const UNBUDGETED = { knowledge: { projectInstructions: 'CLAUDE.md' } };

function write(directory, file, content) {
  mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
  writeFileSync(path.join(directory, file), content);
}

/** Run the installed guard. `profile` is an object (written as JSON), raw text, or null for no profile at all. */
function guarded(t, profile, instructions, { yaml = true } = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-budget-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q', directory]);
  spawnSync(process.execPath, [path.join(TOOLKIT, 'scripts', 'install.mjs'), '--to', directory]);
  if (yaml) {
    const manifest = { name: 'yaml', type: 'module', main: 'index.js' };
    write(directory, 'node_modules/yaml/package.json', JSON.stringify(manifest));
    write(directory, 'node_modules/yaml/index.js', 'export const parse = JSON.parse;\n');
  }
  if (profile) {
    const text = typeof profile === 'string' ? profile : JSON.stringify(profile, null, 2);
    write(directory, '.claude/pipeline/profile.yml', text);
  }
  if (instructions !== undefined) write(directory, 'CLAUDE.md', instructions);
  return spawnSync(process.execPath, [path.join(directory, '.claude/pipeline/core/document-budget.mjs')], {
    encoding: 'utf8',
  });
}

test('a file within the budget passes', t => {
  const result = guarded(t, BUDGETED, '0123456789');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'Document budget check passed.\n');
});

test('a file over the budget fails with its size and the limit', t => {
  const result = guarded(t, BUDGETED, '0123456789A');
  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'CLAUDE.md: 11 bytes, limit 10\n');
});

test('without the key it warns and passes', t => {
  const result = guarded(t, UNBUDGETED, 'x'.repeat(100));
  assert.equal(result.status, 0);
  assert.match(result.stderr, /no knowledge\.instructionsBudget/);
});

test('without a profile it warns and passes', t => {
  const result = guarded(t, null, 'x');
  assert.equal(result.status, 0);
  assert.match(result.stderr, /no \.claude\/pipeline\/profile\.yml/);
});

test('a missing instructions file fails and is named', t => {
  const result = guarded(t, BUDGETED, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CLAUDE\.md \(knowledge\.projectInstructions\) does not exist/);
});

test('without the yaml package it passes when no budget is declared, and fails naming the package when one is', t => {
  const free = guarded(t, UNBUDGETED, 'x', { yaml: false });
  assert.equal(free.status, 0, free.stderr);
  assert.match(free.stderr, /no knowledge\.instructionsBudget/);

  const bound = guarded(t, BUDGETED, 'x', { yaml: false });
  assert.equal(bound.status, 1);
  assert.match(bound.stderr, /the yaml package is not installed/);
});

test('the template profile, with its commented key, needs no yaml package and checks nothing', t => {
  const template = readFileSync(path.join(TOOLKIT, 'templates/pipeline/profile.yml'), 'utf8');
  assert.match(template, /^[ \t]*# instructionsBudget:/m);
  const result = guarded(t, template, 'x', { yaml: false });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /no knowledge\.instructionsBudget/);
});

test('a budget in flow style is found, and a key of the same name elsewhere is not a budget', t => {
  const over = guarded(t, JSON.stringify(BUDGETED), '0123456789A');
  assert.equal(over.status, 1);
  assert.equal(over.stderr, 'CLAUDE.md: 11 bytes, limit 10\n');

  const elsewhere = guarded(t, { landing: { instructionsBudget: 10 }, ...UNBUDGETED }, 'x'.repeat(20));
  assert.equal(elsewhere.status, 0, elsewhere.stderr);
  assert.match(elsewhere.stderr, /no knowledge\.instructionsBudget/);
});

test('a null budget fails as not a positive integer', t => {
  const result = guarded(t, { knowledge: { ...UNBUDGETED.knowledge, instructionsBudget: null } }, 'x');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must be a positive integer/);
});

test('a budget that is not a positive integer is refused', () => {
  for (const instructionsBudget of [0, -1, 1.5, '100']) {
    assert.throws(
      () => budgetProblem({ projectInstructions: 'CLAUDE.md', instructionsBudget }, () => 0),
      /positive integer/,
    );
  }
});
