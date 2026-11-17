/**
 * Verify the maestro sentinel against a fake `maestri`: lines already on screen at the first poll stay silent, new
 * lines are reported once, and an expected capture folder makes its `CAPTURAS PRONTAS` line count even from the baseline.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SENTINEL = fileURLToPath(new URL('../skills/pipeline-maestro/maestro-sentinel.sh', import.meta.url));

function fakeMaestri(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-sentinel-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const screen = path.join(directory, 'screen.txt');
  const bin = path.join(directory, 'maestri');
  writeFileSync(bin, `#!/usr/bin/env bash\n[[ $1 == check ]] && cat "${screen}"\nexit 0\n`);
  chmodSync(bin, 0o755);
  return { directory, screen };
}

/** Runs the sentinel with a 1 s poll, rewrites the screen after the first poll and returns what it printed. */
function run(t, { baseline, later, expected = [] }) {
  const { directory, screen } = fakeMaestri(t);
  writeFileSync(screen, baseline);
  return new Promise(resolve => {
    const child = spawn('bash', [SENTINEL, '[EXECUTOR]', 'nota', '20', '1', ...expected], {
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    setTimeout(() => writeFileSync(screen, baseline + later), 1500);
    setTimeout(() => child.kill(), 3200);
    child.on('exit', () => resolve(output));
  });
}

const READY_1 = 'CAPTURAS PRONTAS: PR #11 — 12 capturas — /r/ux/pr-11/\n';
const READY_2 = 'CAPTURAS PRONTAS: PR #12 — 9 capturas — /r/ux/pr-12/\n';

test('without expected folders, the baseline stays silent and only a new line is reported', async t => {
  const output = await run(t, { baseline: READY_1, later: READY_2 });
  assert.equal(output, `SENTINEL [EXECUTOR]: ${READY_2}`);
});

test('an expected folder reports its baseline line once, and other baseline lines stay silent', async t => {
  const output = await run(t, { baseline: READY_1 + READY_2, later: '', expected: ['/r/ux/pr-12/'] });
  assert.equal(output, `SENTINEL [EXECUTOR]: ${READY_2}`);
});

test('an expected folder does not change how a line printed after the first poll is reported', async t => {
  const output = await run(t, { baseline: '', later: READY_2, expected: ['/r/ux/pr-12/'] });
  assert.equal(output, `SENTINEL [EXECUTOR]: ${READY_2}`);
});
