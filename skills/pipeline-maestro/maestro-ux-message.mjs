#!/usr/bin/env node
/**
 * Builds the single-reading message for the UX reader from the capture tool output, so the maestro never writes it by
 * hand. The message carries only facts: the files of the round (`cenarios.json`, `medidas.json`, `capturas.md`), the
 * screens the diff touches (names only), recorded PR sections copied verbatim and the seal commands. It never says what
 * the PR fixed, what is or is not blocking, nor the expected severity.
 *
 * A round with more images than `--max-images` is split into parts, one clean session each: every part writes its own
 * report file, and the last one also reads the earlier reports and writes the final one (`laudo.md`).
 *
 * Writes `<dir>/leitura-parte-<i>.md` (removing older ones) and prints each path on its own line.
 *
 * Usage: node maestro-ux-message.mjs --dir <round folder> --pr <n> --branch <branch> --sha <sha> --round <k>
 *   --root <main checkout> --screens <screen>[,<screen>...] [--stamps screen,ux|ux|none] [--pr-body <file>]
 *   [--mobile-first <app>[,<app>...]] [--audience <app>=<text>]... [--pontual <png>=<validator line>]...
 *   [--max-images 80]
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPEATABLE = new Set(['audience', 'pontual']);
const REQUIRED = ['dir', 'pr', 'branch', 'sha', 'round', 'root', 'screens'];
const RECORDED_SECTIONS = [/^Decisions$/i, /^Decisões$/i, /^Sugestões futuras/i];
const UX_ROLE = '.claude/skills/pipeline-maestro/roles/ux.md';

/** Parses `--key value` pairs; repeatable keys collect into arrays. */
export function parseArgs(argv) {
  const flags = { audience: [], pontual: [] };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--') || value === undefined) throw new Error(`expected --<flag> <value>, got ${key}`);
    const name = key.slice(2);
    if (REPEATABLE.has(name)) flags[name].push(value);
    else flags[name] = value;
  }
  for (const name of REQUIRED) if (!flags[name]) throw new Error(`missing --${name}`);
  flags.stamps ??= 'screen,ux';
  if (!['screen,ux', 'ux', 'none'].includes(flags.stamps)) throw new Error(`--stamps must be screen,ux, ux or none`);
  flags.maxImages = Number(flags['max-images'] ?? 80);
  if (!Number.isInteger(flags.maxImages) || flags.maxImages < 1) throw new Error('--max-images must be a positive integer');
  return flags;
}

/** Splits `a=b` into `[a, b]` at the first `=`. */
function pair(value, flag) {
  const at = value.indexOf('=');
  if (at <= 0) throw new Error(`--${flag} expects <key>=<value>, got ${value}`);
  return [value.slice(0, at), value.slice(at + 1)];
}

/** Body of every `## <title>` section of a markdown text whose title matches one of `patterns`, verbatim. */
export function sections(markdown, patterns) {
  const found = [];
  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const heading = lines[index].match(/^## (.+?)\s*$/);
    if (!heading || !patterns.some(pattern => pattern.test(heading[1]))) continue;
    let end = index + 1;
    while (end < lines.length && !/^#{1,2} /.test(lines[end])) end++;
    const body = lines.slice(index + 1, end).join('\n').trim();
    if (body) found.push({ title: heading[1], body });
  }
  return found;
}

function readJson(file) {
  if (!existsSync(file)) throw new Error(`missing ${file}`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** One reading item per screenshot: the PR scenarios become numbered steps, siblings stay reference. */
export function collect(dir, flags) {
  const measures = readJson(path.join(dir, 'medidas.json'));
  const scenariosFile = path.join(dir, 'cenarios.json');
  const declared = existsSync(scenariosFile) ? readJson(scenariosFile).scenarios ?? [] : [];
  const byId = new Map(declared.map(scenario => [scenario.id, scenario]));
  const mobileFirst = new Set((flags['mobile-first'] ?? '').split(',').filter(Boolean));
  const screens = flags.screens.split(',').filter(Boolean);
  const items = (measures.scenarios ?? []).map(result => {
    const scenario = byId.get(result.id) ?? {};
    const kind = scenario.kind ?? (result.id.startsWith('irmas/') ? 'irma' : 'cenario');
    return { ...scenario, ...result, kind, file: path.join(dir, result.file ?? `${result.id}.png`) };
  });
  const rank = item => {
    const screen = screens.indexOf(item.screen);
    const phoneFirst = mobileFirst.has(item.app) ? (item.viewport === 'celular' ? 0 : 1) : 0;
    return [screen === -1 ? screens.length : screen, phoneFirst];
  };
  const steps = items
    .filter(item => item.kind !== 'irma')
    .map((item, order) => ({ item, order, rank: rank(item) }))
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.order - b.order)
    .map(({ item }) => item);
  const siblings = items.filter(item => item.kind === 'irma');
  const manifest = existsSync(path.join(dir, 'capturas.md')) ? readFileSync(path.join(dir, 'capturas.md'), 'utf8') : '';
  return { steps, siblings, manifest, screens };
}

/** Packs the steps into parts by screen, each part under `max` images counting the siblings it repeats. */
export function split(steps, siblingCount, max) {
  const room = Math.max(1, max - siblingCount);
  const groups = [];
  for (const step of steps) {
    const last = groups.at(-1);
    if (last && last.screen === step.screen) last.steps.push(step);
    else groups.push({ screen: step.screen, steps: [step] });
  }
  const parts = [[]];
  for (const group of groups) {
    if (parts.at(-1).length && parts.at(-1).length + group.steps.length > room) parts.push([]);
    for (const step of group.steps) {
      if (parts.at(-1).length >= room) parts.push([]);
      parts.at(-1).push(step);
    }
  }
  return parts;
}

function describeStep(number, step) {
  const lines = [`passo ${number} — ${step.file}`];
  const where = [step.kind, step.ref && step.ref !== step.kind ? `(${step.ref})` : '', step.screen ? `· tela ${step.screen}` : '',
    step.route ? `· rota ${step.route}` : '', step.viewport ?? '', step.theme ?? ''].filter(Boolean).join(' ');
  lines.push(`  ${where}`);
  if (step.expected) lines.push(`  descrição do cenário: ${step.expected}`);
  if (step.transient) lines.push('  estado transitório: sim');
  if (step.result === 'FALHA DO SCRIPT') lines.push('  resultado da ferramenta: FALHA DO SCRIPT');
  for (const measure of step.measures ?? []) {
    const target = measure.selector ? ` ${measure.selector}` : '';
    lines.push(`  medida ${measure.type}${target}: valor ${measure.value} · limite ${measure.limit} · ${measure.result}`);
  }
  return lines.join('\n');
}

function stampCommands(flags, report) {
  const gate = `node ${flags.root}/.claude/pipeline/core/pipeline-gate.mjs`;
  const lines = [];
  if (flags.stamps === 'screen,ux') {
    lines.push(`- só no APROVADO: ${gate} stamp screen --pr ${flags.pr} --sha ${flags.sha} --evidence "leitura única rodada ${flags.round}: laudo ${report}"`);
  }
  if (flags.stamps !== 'none') {
    lines.push(`- só com APROVADO e PRONTO: ${gate} stamp ux --pr ${flags.pr} --sha ${flags.sha} --evidence "leitura única rodada ${flags.round}: MÉDIA <n>/10, laudo ${report}"`);
  }
  return lines;
}

/** The text of every part. Pure: reads nothing, so the tests can check it. */
export function render(flags, { steps, siblings, manifest, screens }, recorded) {
  const parts = split(steps, siblings.length + flags.pontual.length, flags.maxImages);
  const total = parts.length;
  const final = path.join(flags.dir, 'laudo.md');
  const reportOf = index => (total === 1 ? final : path.join(flags.dir, `laudo-parte-${index + 1}.md`));
  const audiences = flags.audience.map(value => pair(value, 'audience'));
  const pontuais = flags.pontual.map(value => pair(value, 'pontual'));
  const created = sections(manifest, [/^Dados criados$/i]);
  let number = 0;
  return parts.map((part, index) => {
    const last = index === total - 1;
    const out = [];
    out.push(`Leitura única — PR #${flags.pr}, branch ${flags.branch}, SHA ${flags.sha}, rodada ${flags.round}${total > 1 ? `, parte ${index + 1} de ${total}` : ''}.`);
    out.push(`Siga ${UX_ROLE}, seção "Leitura única".`);
    out.push(`Telas tocadas pelo diff: ${screens.join(', ')}.`);
    for (const [app, text] of audiences) out.push(`Público do front ${app}: ${text}`);
    for (const app of (flags['mobile-first'] ?? '').split(',').filter(Boolean)) {
      out.push(`No front ${app}, o celular é o uso principal: as capturas do celular vêm primeiro.`);
    }
    out.push('');
    if (total === 1) {
      out.push(`Laudo: antes de responder, grave o laudo de tela e o de UX completos em ${final}. A resposta repete só as linhas fixas.`);
    } else if (!last) {
      out.push(`Laudo: antes de responder, grave o laudo desta parte em ${reportOf(index)}. Nesta parte não há selo. A resposta repete só as linhas fixas da parte.`);
    } else {
      const earlier = parts.slice(0, -1).map((_, earlierIndex) => reportOf(earlierIndex)).join(', ');
      out.push(`Laudo: grave o laudo desta parte em ${reportOf(index)}. Depois leia os laudos das partes anteriores (${earlier}) e grave em ${final} os laudos das partes juntas: o de tela com todos os passos, APROVADO só com todos OK, e o de UX com a média de todas as telas. Só então rode os selos. A resposta repete só as linhas fixas do laudo final.`);
    }
    out.push('');
    out.push('Passos (telas do PR):');
    for (const step of part) out.push(describeStep(++number, step));
    if (last && pontuais.length) {
      out.push('');
      out.push('Passos pontuais já aprovados pelo validador de tela (entram só no laudo de UX):');
      for (const [file, line] of pontuais) out.push(`- ${file} — ${line}`);
    }
    out.push('');
    if (siblings.length) {
      out.push('Referência, sem nota (irmãs):');
      for (const sibling of siblings) {
        out.push(`- ${sibling.file} — ${sibling.id.replace(/^irmas\//, '')}${sibling.route ? ` — rota ${sibling.route}` : ''}`);
      }
    } else {
      out.push('Sem telas irmãs nesta rodada.');
    }
    if (created.length) {
      out.push('');
      out.push('Dados criados pelo executor no tenant de teste (capturas.md):');
      out.push(created[0].body);
    }
    for (const section of recorded) {
      out.push('');
      out.push(`Registrado no PR, seção "${section.title}" (texto copiado do corpo do PR):`);
      out.push(section.body);
    }
    const stamps = last ? stampCommands(flags, final) : [];
    if (stamps.length) {
      out.push('');
      out.push('Selos, cada comando sozinho numa chamada:');
      out.push(...stamps);
    }
    return `${out.join('\n')}\n`;
  });
}

function main(argv) {
  const flags = parseArgs(argv);
  flags.dir = path.resolve(flags.dir);
  const recorded = flags['pr-body'] ? sections(readFileSync(flags['pr-body'], 'utf8'), RECORDED_SECTIONS) : [];
  const texts = render(flags, collect(flags.dir, flags), recorded);
  for (const file of readdirSync(flags.dir)) {
    if (/^leitura-parte-\d+\.md$/.test(file)) rmSync(path.join(flags.dir, file));
  }
  texts.forEach((text, index) => {
    const file = path.join(flags.dir, `leitura-parte-${index + 1}.md`);
    writeFileSync(file, text);
    console.log(file);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`maestro-ux-message: ${error.message}`);
    process.exit(1);
  }
}
