/**
 * The production error triage module: the `observability.md` template carries the sections and labels the skill and the
 * doctor read by name, and the doctor's item 30 command tells a ready project from the failures it exists to catch,
 * without ever printing a token.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));
const read = file => readFileSync(path.join(TOOLKIT, file), 'utf8');

const SECTIONS = ['Provedor', 'Triagem', 'Vínculo', 'Dado pessoal'];
const LABELS = ['Organização', 'Projetos', 'Servidor MCP', 'Ambiente', 'Janela', 'Tags', 'Id', 'Issue', 'PR', 'Regra'];
const TOKEN = `sntrys_${'A1b2C3d4'.repeat(4)}`;

const FACTS = `# Observabilidade

## Provedor

- **Organização:** acme.
- **Projetos:** shop, worker.
- **Servidor MCP:** \`sentry\`.

## Triagem

- **Ambiente:** \`production\`.
- **Janela:** \`72h\`.
- **Tags:** \`request_id\`, \`route\`, \`tenant_id\`.

## Vínculo

- **Id:** \`SHOP-{n}\`, \`WORKER-{n}\`.
- **Issue:** \`Sentry issue: {id}\`.
- **PR:** \`Fixes {id}\`.

## Dado pessoal

- **Regra:** só ids.
`;
const MCP = JSON.stringify({ mcpServers: { sentry: { type: 'http', url: 'https://mcp.sentry.dev/mcp/acme' } } });

test('the template carries the four sections and the ten labels, in order', () => {
  const text = read('templates/pipeline/observability.md');
  assert.deepEqual(text.split('\n').filter(l => l.startsWith('## ')).map(l => l.slice(3)), SECTIONS);
  assert.deepEqual([...text.matchAll(/^- \*\*([^*]+):\*\*/gm)].map(m => m[1]), LABELS);
});

test('the doctor item 30 and the schema name the same sections and labels as the template', () => {
  const doctor = read('skills/pipeline-doctor/SKILL.md').split('\n30. **')[1];
  for (const name of [...SECTIONS, ...LABELS]) assert.ok(doctor.includes(`"${name}"`), `doctor checks ${name}`);
  const schema = read('core/profile-schema.md');
  for (const name of LABELS.filter(l => l !== 'Regra')) assert.ok(schema.includes(`**${name}**`), `schema names ${name}`);
});

/** The bash block of doctor item 30, without the list indentation. */
function doctorCommand() {
  const item = read('skills/pipeline-doctor/SKILL.md').split('\n30. **')[1];
  return item.match(/```bash\n([\s\S]*?)\n[ \t]*```/)[1].replace(/^ {4}/gm, '');
}

/** Install the toolkit into a fresh git project with the given files tracked, and run the item 30 command there. */
function doctor(t, files) {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-triage-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q', directory]);
  const all = { '.claude/pipeline/profile.yml': 'observability:\n  provider: sentry\n', ...files };
  for (const [file, content] of Object.entries(all)) {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    writeFileSync(path.join(directory, file), content);
  }
  spawnSync(process.execPath, [path.join(TOOLKIT, 'scripts/install.mjs'), '--to', directory]);
  spawnSync('git', ['add', '-A'], { cwd: directory });
  const result = spawnSync('bash', ['-c', doctorCommand()], { cwd: directory, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('doctor item 30 passes a ready project', t => {
  assert.equal(doctor(t, { '.claude/pipeline/observability.md': FACTS, '.mcp.json': MCP }), 'OK servidor sentry\n');
});

test('doctor item 30 flags a missing facts file and the unfilled template', t => {
  assert.equal(doctor(t, { '.mcp.json': MCP }), 'FALHA observability.md ausente\n');
  const out = doctor(t, { '.claude/pipeline/observability.md': read('templates/pipeline/observability.md'), '.mcp.json': MCP });
  assert.match(out, /FALHA \.claude\/pipeline\/observability\.md:\d+ ainda com <\.\.\.>/);
});

test('doctor item 30 flags a facts file without a label or the {id} marker', t => {
  const facts = FACTS.replace(/^- \*\*Janela:\*\*.*\n/m, '').replace('Fixes {id}', 'Fixes');
  const out = doctor(t, { '.claude/pipeline/observability.md': facts, '.mcp.json': MCP });
  assert.match(out, /FALHA observability.md sem o rótulo Janela\n/);
  assert.match(out, /FALHA rótulo PR sem \{id\}\n/);
});

test('doctor item 30 flags an empty label and a project-scoped url with more than one project', t => {
  const facts = FACTS.replace('- **Ambiente:** `production`.', '- **Ambiente:**');
  const scoped = JSON.stringify({ mcpServers: { sentry: { type: 'http', url: 'https://mcp.sentry.dev/mcp/acme/shop' } } });
  const out = doctor(t, { '.claude/pipeline/observability.md': facts, '.mcp.json': scoped });
  assert.match(out, /FALHA rótulo Ambiente sem valor\n/);
  assert.match(out, /FALHA mcpServers\.sentry\.url escopada a um projeto, com 2 em Projetos\n/);
  const single = FACTS.replace('shop, worker', 'shop');
  assert.equal(doctor(t, { '.claude/pipeline/observability.md': single, '.mcp.json': scoped }), 'OK servidor sentry\n');
});

test('doctor item 30 flags a missing server, a non-http server and a credential in .mcp.json', t => {
  const other = JSON.stringify({ mcpServers: { other: { type: 'http', url: 'https://mcp.sentry.dev/mcp' } } });
  assert.equal(
    doctor(t, { '.claude/pipeline/observability.md': FACTS, '.mcp.json': other }),
    'FALHA .mcp.json sem mcpServers.sentry\n',
  );
  const stdio = JSON.stringify({ mcpServers: { sentry: { command: 'npx', env: { SENTRY_ACCESS_TOKEN: '$SENTRY_ACCESS_TOKEN' } } } });
  const out = doctor(t, { '.claude/pipeline/observability.md': FACTS, '.mcp.json': stdio });
  assert.match(out, /FALHA mcpServers\.sentry\.type não é http\n/);
  assert.match(out, /FALHA mcpServers\.sentry\.env: credencial no \.mcp\.json\n/);
  assert.match(out, /AVISO mcpServers\.sentry\.url fora/);
});

test('doctor item 30 flags a token in a tracked file and in the settings, naming only the file and the line', t => {
  const out = doctor(t, {
    '.claude/pipeline/observability.md' : FACTS,
    '.mcp.json'                         : MCP,
    'config/sentry.ts'                  : `export const token = '${TOKEN}';\n`,
    '.claude/settings.local.json'       : JSON.stringify({ env: { SENTRY_AUTH_TOKEN: 'abc' } }),
    '.env.production'                   : 'SENTRY_AUTH_TOKEN=abc\n',
    '.github/workflows/deploy.yml'      : 'env:\n  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}\n',
  });
  assert.match(out, /FALHA token em \.env\.production:1\n/);
  assert.ok(!out.includes('deploy.yml'), 'a secret reference is not a token');
  assert.match(out, /FALHA token em config\/sentry\.ts:1\n/);
  assert.match(out, /FALHA token em \.claude\/settings\.local\.json:1\n/);
  assert.ok(!out.includes(TOKEN) && !out.includes('abc'), 'the token never shows up');
});
