/**
 * Verify the screen-capture tool stays opt-in: every section of the shipped prose that changes the screen validation
 * flow is gated on `team.capture`, the flow without the key is still written down, and the contract in
 * `core/capture.md` keeps the fields, measures and outputs the executor and the UX rely on.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));

function read(file) {
  return readFileSync(`${TOOLKIT}${file}`, 'utf8');
}

/** The body of the markdown section whose heading text is `title`, up to the next heading of the same or higher level. */
function section(file, title) {
  const lines = read(file).split('\n');
  const start = lines.findIndex(line => /^#+ /.test(line) && line.replace(/^#+ /, '') === title);
  assert.notEqual(start, -1, `${file}: no section "${title}"`);
  const level = lines[start].match(/^#+/)[0].length;
  const end = lines.findIndex((line, index) => index > start && /^#+ /.test(line) && line.match(/^#+/)[0].length <= level);
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}

const GATED = [
  ['skills/pipeline-maestro/roles/executor.md', 'Pedido de capturas pela ferramenta'],
  ['skills/pipeline-maestro/reference/captura.md', 'Captura pela ferramenta'],
  ['skills/pipeline-maestro/reference/captura.md', 'Varredura pelo diff'],
  ['skills/pipeline-maestro/reference/validacao-tela.md', 'Passos com a ferramenta'],
  ['skills/pipeline-maestro/reference/validacao-ux.md', 'Leitura única'],
  ['skills/pipeline-maestro/reference/validacao-tela.md', 'Validação PR a PR'],
  ['core/ux-reference.md', 'Uma leitura, dois laudos'],
  ['core/ux-reference.md', 'Âncoras da nota'],
  ['skills/pipeline-write-ticket/reference/corpo-do-ticket.md', 'Critério de tela como cenário'],
];

test('every section of the tool flow opens gated on team.capture', () => {
  for (const [file, title] of GATED) {
    const opening = section(file, title).trim().split('\n\n')[0];
    assert.match(opening, /(Só|Vale só) com `team\.capture`/, `${file}, "${title}": the first paragraph is not gated on team.capture`);
  }
});

test('the tool-flow sentences in the main files are gated on team.capture', () => {
  const skill = read('skills/pipeline-maestro/SKILL.md');
  for (const phrase of ['**Com `team.capture`.**', 'Com `team.capture`, a tela web segue', 'Com `team.capture`, abra só as citadas', 'com `team.capture` seguido de `<id>=<pasta>`']) {
    assert.ok(skill.includes(phrase), phrase);
  }
  assert.match(read('skills/pipeline-maestro/roles/executor.md'), /Com `team\.capture` no profile, siga a seção "Pedido de capturas pela ferramenta"/);
  assert.match(read('skills/pipeline-maestro/roles/ux.md'), /Com `team\.capture`, dê a nota pelas âncoras/);
});

test('the flow without team.capture is still the one written down', () => {
  assert.match(section('skills/pipeline-maestro/reference/captura.md', 'Captura pelo script'), /quatro variantes/);
  assert.match(section('skills/pipeline-maestro/roles/executor.md', 'Pedido de capturas'), /capturas-pr-<pr>\.mjs/);
  assert.match(section('skills/pipeline-maestro/reference/validacao-tela.md', 'Passos'), /stamp screen/);
  assert.match(section('core/ux-reference.md', 'Conferência do `PRONTO`'), /todas as capturas das telas do PR/);
  assert.match(read('skills/pipeline-maestro/SKILL.md'), /Sem a chave, nada muda\./);
});

test('the capture contract names its placeholders, fields, measures and outputs', () => {
  const contract = read('core/capture.md');
  for (const placeholder of ['{scenarios}', '{sha}', '{out}']) assert.ok(contract.includes(placeholder), placeholder);
  for (const field of ['"id"', '"route"', '"viewport"', '"theme"', '"actions"', '"capture"', '"transient"', '"measures"', '"consoleAllow"', '"outOfScript"']) {
    assert.ok(contract.includes(field), field);
  }
  for (const measure of ['touchTarget', 'contrast', 'overflow', 'aria', 'url', 'console', 'overlap']) {
    assert.match(contract, new RegExp(`\\| \`${measure}\` \\|`), measure);
  }
  for (const output of ['capturas.md', 'medidas.json']) assert.ok(contract.includes(output), output);
  const schema = read('core/profile-schema.md');
  assert.match(schema, /\| `capture\.command` \| sim, com `capture` \|/);
  assert.match(read('skills/pipeline-project-profile/SKILL.md'), /\| `team\.capture` \|/);
});

test('the scenario and output examples in the contract are valid JSON', () => {
  const blocks = [...read('core/capture.md').matchAll(/```json\n([\s\S]*?)```/g)].map(match => match[1]);
  assert.equal(blocks.length, 2);
  for (const block of blocks) assert.doesNotThrow(() => JSON.parse(block));
});

test('the contract documents waitFor on navigation, fullPage and the wait for animations', () => {
  const contract = read('core/capture.md');
  assert.match(contract, /\| `waitFor` \(de `click` e `press`\) \|/);
  assert.match(contract, /\| `fullPage` \|/);
  assert.match(section('core/capture.md', 'Espera antes da foto'), /document\.getAnimations\(\)/);
  assert.match(contract, /o `medidas\.json` é o último arquivo que a ferramenta grava/);
});

test('the executor and the reader carry the evidence and the report-file rules', () => {
  const executor = section('skills/pipeline-maestro/roles/executor.md', 'Pedido de capturas pela ferramenta');
  for (const rule of [/nunca o critério/, /Dado que prova o critério/, /medida `url`/, /`waitFor` com um seletor da tela de destino/, /`CAPTURAS PRONTAS: PR #<pr> rodada <k> <sha>/, /começa a linha/]) {
    assert.match(executor, rule);
  }
  const reader = section('skills/pipeline-maestro/roles/ux.md', 'Leitura única');
  assert.match(reader, /Laudo em arquivo/);
  assert.match(reader, /Leitura em partes/);
});
