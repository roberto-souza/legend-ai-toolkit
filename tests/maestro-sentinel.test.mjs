/**
 * Verify the maestro sentinel against a fake `maestri`: lines already on screen at the first poll stay silent, new
 * lines are reported once, and an expected request id makes its `CAPTURAS PRONTAS` line count even from the baseline,
 * while an older line for the same folder (another request) does not. A `<id>=<folder>` argument also reports a new
 * `medidas.json` in that folder, once per id, whichever of the two events comes first.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SENTINEL = fileURLToPath(new URL('../skills/pipeline-maestro/maestro-sentinel.sh', import.meta.url));
const BASH = existsSync('/bin/bash') ? '/bin/bash' : 'bash';

/**
 * Runs the sentinel with a 1 s poll. The fake `maestri check` prints the baseline, and from its second call on the
 * baseline plus `later`, so the rewrite never races the first poll; on its second call it also runs `onSecond`, a shell
 * command. `expected` may use `{dir}` for the temporary directory. Returns what the sentinel printed after 3 polls.
 */
function run(t, { baseline, later = '', expected = [], onSecond = '', setup = () => {} }) {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-sentinel-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  setup(directory);
  writeFileSync(path.join(directory, 'first.txt'), baseline);
  writeFileSync(path.join(directory, 'next.txt'), baseline + later);
  const calls = path.join(directory, 'calls');
  const bin = path.join(directory, 'maestri');
  writeFileSync(bin, [
    '#!/bin/sh',
    '[ "$1" = check ] || exit 0',
    `echo x >> "${calls}"`,
    `if [ "$(wc -l < "${calls}")" -eq 2 ]; then ${onSecond.replaceAll('{dir}', directory) || ':'}; fi`,
    `if [ "$(wc -l < "${calls}")" -le 1 ]; then cat "${directory}/first.txt"; else cat "${directory}/next.txt"; fi`,
    '',
  ].join('\n'));
  chmodSync(bin, 0o755);
  return new Promise(resolve => {
    const args = expected.map(arg => arg.replaceAll('{dir}', directory));
    const child = spawn(BASH, [SENTINEL, '[EXECUTOR]', 'nota', '20', '1', ...args], {
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    const timer = setInterval(() => {
      if (existsSync(calls) && readCalls(calls) >= 3) { clearInterval(timer); child.kill(); }
    }, 100);
    child.on('exit', () => { clearInterval(timer); resolve(output); });
  });
}

function readCalls(file) {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
}

const OLD = 'CAPTURAS PRONTAS: PR #11 — 12 capturas — /r/ux/pr-11/ — pedido 11-1-1\n';
const NEW = 'CAPTURAS PRONTAS: PR #11 — 12 capturas — /r/ux/pr-11/ — pedido 11-1-2\n';
const NEXT = 'CAPTURAS PRONTAS: PR #12 — 9 capturas — /r/ux/pr-12/ — pedido 12-1-1\n';
const report = line => `SENTINEL [EXECUTOR]: ${line}`;

test('without expected ids, the baseline stays silent and only a new line is reported', async t => {
  assert.equal(await run(t, { baseline: OLD, later: NEXT }), report(NEXT));
});

test('an expected id reports its baseline line once, and other baseline lines stay silent', async t => {
  const output = await run(t, { baseline: `${OLD}TRAVADO: x\n${NEXT}${NEXT}`, expected: ['12-1-1'] });
  assert.equal(output, report(NEXT));
});

test('an older line for the same folder does not match a new request id', async t => {
  assert.equal(await run(t, { baseline: OLD, later: NEW, expected: ['11-1-2'] }), report(NEW));
});

test('trailing spaces after the request id still match', async t => {
  assert.equal(await run(t, { baseline: NEXT.replace('\n', '   \n'), expected: ['12-1-1'] }), report(NEXT.replace('\n', '   \n')));
});

test('an expected id does not change how a line printed after the first poll is reported', async t => {
  assert.equal(await run(t, { baseline: '', later: NEXT, expected: ['12-1-1'] }), report(NEXT));
});

const MEDIDAS = '{"scenarios":[]}';
const writeOldMeasures = directory => {
  mkdirSync(path.join(directory, 'pr-11'));
  writeFileSync(path.join(directory, 'pr-11', 'medidas.json'), MEDIDAS);
};
const rewriteMeasures = 'touch -t 203001010000 "{dir}/pr-11/medidas.json"';

test('a new medidas.json in the watched folder is reported once, even without the executor line', async t => {
  const output = await run(t, { baseline: '', setup: writeOldMeasures, onSecond: rewriteMeasures, expected: ['11-1-2={dir}/pr-11/'] });
  assert.match(output, /^SENTINEL \[EXECUTOR\]: MEDIDAS PRONTAS: pedido 11-1-2 — .*\/pr-11\/medidas\.json\n$/);
});

test('a medidas.json already there at the first poll and unchanged stays silent', async t => {
  assert.equal(await run(t, { baseline: '', setup: writeOldMeasures, expected: ['11-1-2={dir}/pr-11'] }), '');
});

test('a medidas.json that appears in an empty folder is reported', async t => {
  const output = await run(t, {
    baseline: '',
    setup: directory => mkdirSync(path.join(directory, 'pr-11')),
    onSecond: `printf '{}' > "{dir}/pr-11/medidas.json"`,
    expected: ['11-1-2={dir}/pr-11'],
  });
  assert.match(output, /MEDIDAS PRONTAS: pedido 11-1-2/);
});

test('the executor line after the new medidas.json of the same request is not reported again', async t => {
  const output = await run(t, { baseline: '', later: NEW, setup: writeOldMeasures, onSecond: rewriteMeasures, expected: ['11-1-2={dir}/pr-11'] });
  assert.equal(output.split('\n').filter(Boolean).length, 1, output);
});

test('with the request time, a medidas.json written before the first poll but after the request is reported', async t => {
  const setup = directory => {
    writeOldMeasures(directory);
    spawnSync('touch', ['-t', '203001010000', path.join(directory, 'pr-11', 'medidas.json')]);
  };
  const output = await run(t, { baseline: '', setup, expected: [`11-1-2@${Math.floor(Date.now() / 1000)}={dir}/pr-11`] });
  assert.match(output, /^SENTINEL \[EXECUTOR\]: MEDIDAS PRONTAS: pedido 11-1-2 — /);
  assert.equal(output.split('\n').filter(Boolean).length, 1);
});

test('with the request time, a medidas.json older than the request stays silent', async t => {
  const output = await run(t, { baseline: '', setup: writeOldMeasures, expected: [`11-1-2@${Math.floor(Date.now() / 1000) + 3600}={dir}/pr-11`] });
  assert.equal(output, '');
});
