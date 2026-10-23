import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = file => readFileSync(new URL(`../core/landing/${file}`, import.meta.url), 'utf8');
const headings = text => text.split('\n').filter(line => line.startsWith('## ')).map(line => line.slice(3));
const labels = text => [...text.matchAll(/^- \*\*([^*]+):\*\*/gm)].map(m => m[1]);

// The contract the later landing pieces read by name; the folder may hold more files.
const SECTIONS = {
  'briefing.md': ['Perguntas de produto', 'Referências', 'Direção', 'Decisões por rodada'],
  'validacao.md': ['Placar', 'Quebrado', 'Correções', 'Varredura', 'Teclado e sem JavaScript', 'Página no ar', 'Parada'],
  'manifesto.md': ['Hierarquia de fontes', 'Arquivos', 'Versionamento'],
  'contexto-tickets.md': ['Demanda', 'Material de referência', 'Decisões do solicitante', 'Decisões do orquestrador (a confirmar)', 'Contrato entre tickets', 'Critérios fixos', 'Recorte'],
  'descoberta.md': ['Como responder', 'Itens'],
  'taste.md': ['Evitar', 'Preferir', 'Movimento', 'Arte'],
};
const CONTRACT = ['Arquivos e donos', 'Tokens', 'Classes e animações', 'Listas fechadas', 'Contagens', 'Política de script', 'Dependência entre tickets'];
const HIERARCHY = 'Spec, depois protótipo, depois copy. Onde divergem, vale a mais à esquerda.';
const DISCOVERY = ['Domínio', 'Deploy', 'Stack', 'Spec', 'Guardas', 'Segurança', 'Privacidade', 'Medição', 'Bots', 'Marca', 'Convenções', 'Segredos', 'Conta', 'Toolchain', 'Redirecionamentos'];

test('every contract file exists in core/landing with its sections in order', () => {
  for (const [file, sections] of Object.entries(SECTIONS)) {
    assert.ok(existsSync(new URL(`../core/landing/${file}`, import.meta.url)), file);
    assert.deepEqual(headings(read(file)), sections, file);
  }
});

test('the contract between tickets carries its seven labels', () => {
  const block = read('contexto-tickets.md').split('## Contrato entre tickets\n')[1].split('\n## ')[0];
  assert.deepEqual(labels(block), CONTRACT);
});

test('the discovery checklist has the fifteen labels, in order, with the gate of each', () => {
  const rows = [...read('descoberta.md').matchAll(/^\| (\d+) \| ([^|]+) \|.*\| ([^|]+) \|$/gm)];
  assert.deepEqual(rows.map(m => Number(m[1])), DISCOVERY.map((_, i) => i + 1));
  assert.deepEqual(rows.map(m => m[2].trim()), DISCOVERY);
  const gate = { 'protótipo': [1, 3, 5, 7], 'primeiro ticket': [2, 4, 6, 8, 10, 11, 14], 'primeiro deploy': [9, 12, 13, 15] };
  for (const m of rows) assert.ok(gate[m[3].trim()]?.includes(Number(m[1])), `row ${m[1]}: ${m[3]}`);
});

test('the validation model opens with its four labels', () => {
  assert.deepEqual(labels(read('validacao.md').split('\n## ')[0]), ['Alvo', 'Larguras fixas', 'Varredura', 'Data']);
});

test('the source hierarchy sentence is fixed in the manifest and in the ticket context', () => {
  for (const file of ['manifesto.md', 'contexto-tickets.md']) assert.ok(read(file).includes(HIERARCHY), file);
});

test('no file in core/landing cites a pointer an installed project may not resolve', () => {
  // Same match as the doctor's pointer check: a .md path with a slash, or a bare name followed by a section.
  const files = readdirSync(new URL('../core/landing/', import.meta.url)).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const hits = (read(file).match(/`[^`\s<>*{}]+\.md`(, seção "[^"]+")?/g) ?? []).filter(hit => hit.includes('/') || hit.includes(', seção'));
    assert.deepEqual(hits, [], file);
  }
});
