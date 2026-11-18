/**
 * Verify the two maestro scripts of the single UX reading: the message built from the capture tool output carries only
 * facts (steps, measures, siblings, recorded PR sections, seal commands) and splits big rounds into parts; the queue sends
 * clear, role and message one reading at a time, prints one `enviado` and one `fim` line per PR, and waits on pids.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const MESSAGE = fileURLToPath(new URL('../skills/pipeline-maestro/maestro-ux-message.mjs', import.meta.url));
const QUEUE = fileURLToPath(new URL('../skills/pipeline-maestro/maestro-ux-queue.sh', import.meta.url));
const BASH = existsSync('/bin/bash') ? '/bin/bash' : 'bash';

function temp(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-ux-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

/** A round folder with `count` PR scenarios over two screens and one sibling. */
function round(directory, count = 3) {
  const scenarios = [];
  for (let index = 0; index < count; index++) {
    const screen = index % 2 ? 'b-list' : 'a-list';
    scenarios.push({ id: `cenario-${index + 1}-${screen}-desktop-claro`, kind: 'cenario', ref: `cenário ${index + 1}`, app: 'web', screen,
      route: `/${screen}`, viewport: index === 2 ? 'celular' : 'desktop', theme: 'claro', expected: `lista com ${index + 1} linhas` });
  }
  scenarios.push({ id: 'irmas/c-list-desktop-claro', kind: 'irma', ref: 'irma', app: 'web', screen: 'c-list', route: '/c' });
  writeFileSync(path.join(directory, 'cenarios.json'), JSON.stringify({ scenarios }));
  writeFileSync(path.join(directory, 'medidas.json'), JSON.stringify({
    scenarios: scenarios.map(scenario => ({ id: scenario.id, file: `${scenario.id}.png`, result: 'OK',
      measures: [{ type: 'url', value: '/x?s=1', limit: '/x?s=1', result: 'OK' }, { type: 'console', value: 'sem erro', limit: 'nenhum erro', result: 'OK' }] })),
  }));
  writeFileSync(path.join(directory, 'capturas.md'), 'linhas\n\n## Fora do script\n');
  writeFileSync(path.join(directory, 'dados-criados.md'), 'a-list — um registro pago — cenário 1\n');
}

function generate(directory, extra = []) {
  const args = [MESSAGE, '--dir', directory, '--pr', '11', '--branch', 'feat/x', '--sha', 'abc123', '--round', '1', '--root', '/r',
    '--screens', 'b-list,a-list', ...extra];
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim().split('\n').map(file => [file, readFileSync(file, 'utf8')]);
}

test('one part: steps by diff screen order, measures, siblings, created data, recorded sections and both seals', t => {
  const directory = temp(t);
  round(directory);
  const body = path.join(directory, 'body.md');
  writeFileSync(body, '## Summary\nx\n\n## Decisions\n\n- tabela sem paginação, decidido pelo dono\n\n## Sugestões futuras — UX\n\n- ordenar por data\n\n## Test plan\ny\n');
  const [[file, text]] = generate(directory, ['--pr-body', body]);
  assert.equal(path.basename(file), 'leitura-parte-1.md');
  assert.match(text, /Telas tocadas pelo diff: b-list, a-list\./);
  assert.ok(text.indexOf('passo 1 — ') < text.indexOf('b-list-desktop-claro.png'));
  assert.match(text, /passo 1 — .*cenario-2-b-list-desktop-claro\.png/);
  assert.match(text, /descrição do cenário: lista com 2 linhas/);
  assert.match(text, /medida url: valor \/x\?s=1 · limite \/x\?s=1 · OK/);
  assert.match(text, /Referência, sem nota \(irmãs\):\n- .*irmas\/c-list-desktop-claro\.png — c-list-desktop-claro — rota \/c/);
  assert.doesNotMatch(text, /passo \d+ — .*irmas\//);
  assert.match(text, /a-list — um registro pago — cenário 1/);
  assert.match(text, /seção "Decisions"[^\n]*\n- tabela sem paginação/);
  assert.match(text, /seção "Sugestões futuras — UX"[^\n]*\n- ordenar por data/);
  assert.doesNotMatch(text, /## Summary|Test plan/);
  assert.match(text, new RegExp(`grave o laudo de tela e o de UX completos em ${directory}/laudo\\.md`));
  assert.match(text, /stamp screen --pr 11 --sha abc123/);
  assert.match(text, /stamp ux --pr 11 --sha abc123/);
});

test('the generated message carries no severity or judgment words', t => {
  const directory = temp(t);
  round(directory);
  const [[, text]] = generate(directory);
  for (const word of [/bloque/i, /severidade/i, /entrou/i, /não é /i, /corrig/i, /\[MELHORIA\]/]) assert.doesNotMatch(text, word);
});

test('--stamps none drops the seal commands, and ux keeps only the ux one', t => {
  const directory = temp(t);
  round(directory);
  assert.doesNotMatch(generate(directory, ['--stamps', 'none'])[0][1], /stamp /);
  const ux = generate(directory, ['--stamps', 'ux'])[0][1];
  assert.doesNotMatch(ux, /stamp screen/);
  assert.match(ux, /stamp ux/);
});

test('mobile-first front lists the phone capture first within its screen', t => {
  const directory = temp(t);
  round(directory, 5);
  const [[, text]] = generate(directory, ['--mobile-first', 'web', '--screens', 'a-list,b-list']);
  assert.match(text, /passo 1 — .*cenario-3-a-list-desktop-claro\.png\n {2}cenario \(cenário 3\) · tela a-list · rota \/a-list celular/);
  assert.match(text, /No front web, o celular é o uso principal/);
});

test('a round over the image limit splits by screen; only the last part merges the reports and carries the seals', t => {
  const directory = temp(t);
  round(directory, 6);
  const parts = generate(directory, ['--max-images', '4']);
  assert.equal(parts.length, 2);
  const [[, first], [, last]] = parts;
  assert.match(first, /parte 1 de 2/);
  assert.match(first, new RegExp(`${directory}/laudo-parte-1\\.md`));
  assert.doesNotMatch(first, /stamp /);
  assert.match(last, /parte 2 de 2/);
  assert.match(last, new RegExp(`leia os laudos das partes anteriores \\(${directory}/laudo-parte-1\\.md\\)`));
  assert.match(last, /stamp ux/);
  assert.match(first, /Referência, sem nota/);
  assert.match(last, /Referência, sem nota/);
  assert.match(last, /passo 4 — /);
  assert.doesNotMatch(last, /passo 1 — /);
  for (const [, text] of parts) assert.ok(new Set(text.match(/tela [ab]-list/g)).size === 1, 'one screen per part');
});

test('a second run replaces the older parts', t => {
  const directory = temp(t);
  round(directory, 6);
  generate(directory, ['--max-images', '4']);
  assert.equal(generate(directory).length, 1);
  assert.ok(!existsSync(path.join(directory, 'leitura-parte-2.md')));
});

/** A fake `maestri` that logs each ask and, on a message part, writes the report the part asks for. */
function fakeMaestri(directory, { slow = 0 } = {}) {
  const calls = path.join(directory, 'calls');
  const bin = path.join(directory, 'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin, 'maestri'), [
    '#!/bin/bash',
    '[ "$1" = ask ] || exit 0',
    `printf '%s\\n' "start ${'$'}{3:0:40}" >> "${calls}"`,
    slow ? `sleep ${slow}` : ':',
    'printf "%s" "$3" | grep -oE "[^ (),]+/laudo(-parte-[0-9]+)?\\.md" | while read -r report; do echo "MÉDIA 8/10 — PRONTO" > "$report"; done',
    `printf '%s\\n' "end" >> "${calls}"`,
    'echo "resposta do leitor"',
    '',
  ].join('\n'));
  chmodSync(path.join(bin, 'maestri'), 0o755);
  return { calls, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } };
}

/** A message part whose report path the fake reader finds. */
const withReport = (ux, pr) => `leitura ${pr}: grave os laudos completos em ${ux}/pr-${pr}/laudo.md. Fim.`;

function queue(args, env) {
  return new Promise(resolve => {
    const child = spawn(BASH, [QUEUE, '--poll', '1', ...args], { env });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('exit', status => resolve({ status, output }));
  });
}

test('the queue sends clear, role and each message in order and prints enviado and fim per PR', async t => {
  const directory = temp(t);
  const ux = path.join(directory, 'ux');
  mkdirSync(path.join(ux, 'pr-11'), { recursive: true });
  mkdirSync(path.join(ux, 'pr-12', 'rodada-2'), { recursive: true });
  round(path.join(ux, 'pr-11'));
  round(path.join(ux, 'pr-12', 'rodada-2'));
  generate(path.join(ux, 'pr-11'));
  const second = spawnSync(process.execPath, [MESSAGE, '--dir', path.join(ux, 'pr-12', 'rodada-2'), '--pr', '12', '--branch', 'b', '--sha', 's',
    '--round', '2', '--root', '/r', '--screens', 'a-list'], { encoding: 'utf8' });
  assert.equal(second.status, 0, second.stderr);
  const role = path.join(directory, 'papel.md');
  writeFileSync(role, 'Você é a especialista de UX.');
  const { calls, env } = fakeMaestri(directory);
  const { status, output } = await queue(['[UX] claude', role, ux, '11:1', '12:2', '13:1'], env);
  assert.equal(status, 0, output);
  assert.deepEqual(output.trim().split('\n'), [
    'UX-QUEUE: PR #11 rodada 1 enviado — 1 parte(s)',
    `UX-QUEUE: PR #11 rodada 1 fim — laudo ${ux}/pr-11/laudo.md`,
    'UX-QUEUE: PR #12 rodada 2 enviado — 1 parte(s)',
    `UX-QUEUE: PR #12 rodada 2 fim — laudo ${ux}/pr-12/rodada-2/laudo.md`,
    `UX-QUEUE: PR #13 rodada 1 sem mensagem — ${ux}/pr-13`,
  ]);
  const starts = readFileSync(calls, 'utf8').split('\n').filter(line => line.startsWith('start'));
  assert.deepEqual(starts.map(line => line.slice(6, 16)), ['/clear', 'Você é a e', 'Leitura ún', '/clear', 'Você é a e', 'Leitura ún']);
  assert.match(readFileSync(path.join(ux, 'pr-11', 'leitura-parte-1.log'), 'utf8'), /resposta do leitor/);
  assert.ok(!existsSync(path.join(ux, '.fila-ux.lock')));
});

test('a reading without the report file ends with laudo ausente and stops before the next PR', async t => {
  const directory = temp(t);
  const ux = path.join(directory, 'ux');
  mkdirSync(path.join(ux, 'pr-11'), { recursive: true });
  writeFileSync(path.join(ux, 'pr-11', 'leitura-parte-1.md'), 'mensagem sem caminho de laudo');
  writeFileSync(path.join(directory, 'papel.md'), 'papel');
  mkdirSync(path.join(ux, 'pr-12'));
  writeFileSync(path.join(ux, 'pr-12', 'leitura-parte-1.md'), 'leitura 12');
  const { calls, env } = fakeMaestri(directory);
  const { status, output } = await queue(['[UX] claude', path.join(directory, 'papel.md'), ux, '11:1', '12:1'], env);
  assert.equal(status, 3);
  assert.match(output, /fim — laudo ausente .*pr-11\/laudo\.md\n$/);
  assert.doesNotMatch(readFileSync(calls, 'utf8'), /leitura 12/);
});

test('two queues on the same folder never interleave readings', async t => {
  const directory = temp(t);
  const ux = path.join(directory, 'ux');
  for (const pr of ['11', '12']) {
    mkdirSync(path.join(ux, `pr-${pr}`), { recursive: true });
    writeFileSync(path.join(ux, `pr-${pr}`, 'leitura-parte-1.md'), withReport(ux, pr));
  }
  writeFileSync(path.join(directory, 'papel.md'), 'papel');
  const { calls, env } = fakeMaestri(directory, { slow: 0.3 });
  const role = path.join(directory, 'papel.md');
  const first = queue(['[UX] claude', role, ux, '11:1'], env);
  await new Promise(resolve => setTimeout(resolve, 150));
  const second = queue(['[UX] claude', role, ux, '12:1'], env);
  const [one, two] = await Promise.all([first, second]);
  assert.equal(one.status, 0, one.output);
  assert.equal(two.status, 0, two.output);
  assert.match(two.output, /aguardando a fila do pid \d+/);
  const lines = readFileSync(calls, 'utf8').split('\n').filter(Boolean);
  for (let index = 0; index < lines.length; index += 2) {
    assert.match(lines[index], /^start/);
    assert.equal(lines[index + 1], 'end');
  }
  const order = lines.filter(line => line.startsWith('start leitura')).map(line => line.slice(6, 16));
  assert.deepEqual(order, ['leitura 11', 'leitura 12']);
});

test('a stale lock from a dead pid is taken over', async t => {
  const directory = temp(t);
  const ux = path.join(directory, 'ux');
  mkdirSync(path.join(ux, 'pr-11'), { recursive: true });
  writeFileSync(path.join(ux, 'pr-11', 'leitura-parte-1.md'), withReport(ux, '11'));
  mkdirSync(path.join(ux, '.fila-ux.lock'));
  writeFileSync(path.join(ux, '.fila-ux.lock', 'pid'), '999999');
  writeFileSync(path.join(directory, 'papel.md'), 'papel');
  const { env } = fakeMaestri(directory);
  const { status, output } = await queue(['[UX] claude', path.join(directory, 'papel.md'), ux, '11:1'], env);
  assert.equal(status, 0, output);
  assert.match(output, /PR #11 rodada 1 fim/);
});

test('the queue never waits by process-name match', () => {
  assert.doesNotMatch(readFileSync(QUEUE, 'utf8').replace(/^#.*$/gm, ''), /pgrep|pkill|ps aux/);
});

test('a split reading checks each part report, and a second run skips the parts already answered', async t => {
  const directory = temp(t);
  const ux = path.join(directory, 'ux');
  const folder = path.join(ux, 'pr-11');
  mkdirSync(folder, { recursive: true });
  round(folder, 6);
  generate(folder, ['--max-images', '4']);
  writeFileSync(path.join(directory, 'papel.md'), 'papel');
  const { calls, env } = fakeMaestri(directory);
  const first = await queue(['[UX] claude', path.join(directory, 'papel.md'), ux, '11:1'], env);
  assert.equal(first.status, 0, first.output);
  assert.ok(existsSync(path.join(folder, 'laudo-parte-1.md')));
  assert.equal(readFileSync(calls, 'utf8').split('\n').filter(line => line.startsWith('start Leitura')).length, 2);
  rmSync(path.join(folder, 'laudo.md'));
  const second = await queue(['[UX] claude', path.join(directory, 'papel.md'), ux, '11:1'], env);
  assert.equal(second.status, 0, second.output);
  const parts = readFileSync(calls, 'utf8').split('\n').filter(line => line.startsWith('start Leitura'));
  assert.equal(parts.length, 3, 'only the last part is sent again');
});

test('generating the message removes older reports of the folder', t => {
  const directory = temp(t);
  round(directory);
  writeFileSync(path.join(directory, 'laudo.md'), 'velho');
  writeFileSync(path.join(directory, 'laudo-parte-1.md'), 'velho');
  generate(directory);
  assert.ok(!existsSync(path.join(directory, 'laudo.md')));
  assert.ok(!existsSync(path.join(directory, 'laudo-parte-1.md')));
});

test('seal commands quote the gate path, and too many siblings fail clearly', t => {
  const directory = temp(t);
  round(directory);
  const [[, text]] = generate(directory, ['--root', '/a b']);
  assert.match(text, /node "\/a b\/\.claude\/pipeline\/core\/pipeline-gate\.mjs" stamp screen/);
  const result = spawnSync(process.execPath, [MESSAGE, '--dir', directory, '--pr', '1', '--branch', 'b', '--sha', 's', '--round', '1',
    '--root', '/r', '--screens', 'a-list', '--max-images', '1'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /leave no room under --max-images 1/);
});

test('--section copies an extra PR body heading verbatim', t => {
  const directory = temp(t);
  round(directory);
  const body = path.join(directory, 'body.md');
  writeFileSync(body, '## Melhorias de UX adiadas\n\n- ícone maior\n');
  const [[, text]] = generate(directory, ['--pr-body', body, '--section', 'Melhorias de UX adiadas']);
  assert.match(text, /seção "Melhorias de UX adiadas"[^\n]*\n- ícone maior/);
});
