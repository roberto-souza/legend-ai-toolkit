#!/usr/bin/env node
/**
 * Estimate the cost of local Claude Code transcripts for one project, by agent role and by ticket.
 *
 * Reads `~/.claude/projects/<dir>` for every directory whose name contains `--project <text>` (default: the
 * name of the current directory, since Claude Code names that directory after the project path), takes the `*.jsonl`
 * files modified in the last `--days N` (default 14) or after `--since <ISO date-time, local time>`, recursively,
 * keeps only the lines whose `timestamp` falls in that window, and deduplicates the assistant messages by
 * `message.id`. A transcript under `subagents/agent-X.jsonl` is typed by the `agentType` of its
 * `agent-X.meta.json`; any other transcript is a main session. Prices are USD per million tokens
 * (input/output): opus 5/25, sonnet 3/15, haiku 1/5; cache write is 1.25x input and cache read 0.1x input.
 * Local tool, estimate only: it is not a guard and has no spec.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

const PRICES = {
  opus   : { input: 5, output: 25 },
  sonnet : { input: 3, output: 15 },
  haiku  : { input: 1, output: 5 },
};
const CACHE_WRITE_FACTOR = 1.25;
const CACHE_READ_FACTOR = 0.1;
const TOP_SESSIONS = 15;
const PROMPT_LENGTH = 80;
const MAIN_SESSION = 'main session';
const IMPLEMENTER = 'pipeline-implementer';

function usage() {
  process.stderr.write(
    'Usage: node scripts/token-usage.mjs [--project <text>] [--days N | --since YYYY-MM-DDTHH:MM]\n',
  );
  process.exit(1);
}

function readWindow() {
  const daysIndex = process.argv.indexOf('--days');
  const sinceIndex = process.argv.indexOf('--since');

  if (daysIndex !== -1 && sinceIndex !== -1) usage();

  if (sinceIndex !== -1) {
    const value = process.argv[sinceIndex + 1] ?? '';
    const since = Date.parse(value);
    if (Number.isNaN(since)) usage();
    return { since, label: `since ${value}` };
  }

  const days = daysIndex === -1 ? 14 : Number(process.argv[daysIndex + 1]);
  if (!Number.isFinite(days) || days <= 0) usage();

  return { since: Date.now() - days * 24 * 60 * 60 * 1000, label: `last ${days} days` };
}

function readProject() {
  const index = process.argv.indexOf('--project');
  if (index === -1) return basename(process.cwd());

  const value = process.argv[index + 1] ?? '';
  if (!value || value.startsWith('--')) usage();

  return value;
}

function listTranscripts(directory, since) {
  const found = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      found.push(...listTranscripts(path, since));
    } else if (entry.name.endsWith('.jsonl') && statSync(path).mtimeMs >= since) {
      found.push(path);
    }
  }

  return found;
}

function priceOf(model = '') {
  const family = Object.keys(PRICES).find(name => model.includes(name));
  return PRICES[family ?? 'sonnet'];
}

function costOf(model, usage) {
  const price = priceOf(model);
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const perToken = 1 / 1_000_000;

  return (
    (input * price.input +
      output * price.output +
      cacheRead * price.input * CACHE_READ_FACTOR +
      cacheWrite * price.input * CACHE_WRITE_FACTOR) *
    perToken
  );
}

function readJsonLines(path) {
  const rows = [];

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line) continue;

    try {
      rows.push(JSON.parse(line));
    } catch {
      continue;
    }
  }

  return rows;
}

function readMeta(path) {
  const metaPath = path.replace(/\.jsonl$/, '.meta.json');
  try {
    return JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch {
    return {};
  }
}

function firstPrompt(rows) {
  for (const row of rows) {
    if (row.type !== 'user' || !row.message) continue;

    const content = row.message.content;
    const text = Array.isArray(content) ? content.find(part => part.type === 'text')?.text : content;

    if (typeof text === 'string' && !text.trimStart().startsWith('<')) {
      return text.replace(/\s+/g, ' ').trim().slice(0, PROMPT_LENGTH);
    }
  }

  return '';
}

function loadTranscript(path, since) {
  const rows = readJsonLines(path).filter(row => !row.timestamp || Date.parse(row.timestamp) >= since);
  const isSubagent = path.includes('/subagents/');
  const meta = isSubagent ? readMeta(path) : {};
  const messages = new Map();

  for (const row of rows) {
    if (row.message?.usage && row.message.id) messages.set(row.message.id, row.message);
  }

  return {
    path,
    isSubagent,
    agentType   : isSubagent ? (meta.agentType ?? 'subagent') : MAIN_SESSION,
    description : meta.description ?? '',
    prompt      : isSubagent ? '' : firstPrompt(rows),
    messages    : [...messages.values()],
  };
}

function summarize(transcript) {
  let cost = 0;
  let context = 0;
  let maxContext = 0;

  for (const message of transcript.messages) {
    const usage = message.usage;
    const tokens =
      (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);

    cost += costOf(message.model, usage);
    context += tokens;
    maxContext = Math.max(maxContext, tokens);
  }

  const calls = transcript.messages.length;
  return { calls, cost, averageContext: calls ? context / calls : 0, maxContext };
}

function money(value) {
  return '$' + value.toFixed(2);
}

function kilo(value) {
  return Math.round(value / 1000) + 'k';
}

function write(line = '') {
  process.stdout.write(line + '\n');
}

function main() {
  const { since, label } = readWindow();
  const project = readProject();
  const root = join(homedir(), '.claude', 'projects');
  const directories = existsSync(root) ? readdirSync(root).filter(name => name.includes(project)) : [];
  const seen = new Set();
  const transcripts = [];

  for (const directory of directories) {
    for (const path of listTranscripts(join(root, directory), since)) {
      const transcript = loadTranscript(path, since);
      const fresh = transcript.messages.filter(message => !seen.has(message.id));

      for (const message of fresh) seen.add(message.id);
      transcripts.push({ ...transcript, messages: fresh });
    }
  }

  const summaries = transcripts.map(transcript => ({ transcript, ...summarize(transcript) }));
  const total = summaries.reduce((sum, item) => sum + item.cost, 0);

  write(`Estimated total (${project}, ${label}, ${transcripts.length} transcripts): ${money(total)}`);
  write();

  const byAgent = new Map();

  for (const item of summaries) {
    const row = byAgent.get(item.transcript.agentType) ?? { calls: 0, cost: 0, context: 0 };
    row.calls += item.calls;
    row.cost += item.cost;
    row.context += item.averageContext * item.calls;
    byAgent.set(item.transcript.agentType, row);
  }

  write('By agent type: calls | average context | USD | share');

  for (const [agent, row] of [...byAgent].sort((a, b) => b[1].cost - a[1].cost)) {
    const average = row.calls ? row.context / row.calls : 0;
    const share = total ? (row.cost / total) * 100 : 0;
    write(`  ${agent}: ${row.calls} | ${kilo(average)} | ${money(row.cost)} | ${share.toFixed(1)}%`);
  }

  write();
  write(`Top ${TOP_SESSIONS} main sessions: USD | calls | average context | max context | first prompt`);

  const mains = summaries.filter(item => !item.transcript.isSubagent).sort((a, b) => b.cost - a.cost);

  for (const item of mains.slice(0, TOP_SESSIONS)) {
    const name = basename(item.transcript.path, '.jsonl').slice(0, 8);
    write(
      `  ${name} ${money(item.cost)} | ${item.calls} | ${kilo(item.averageContext)} | ${kilo(item.maxContext)} | ${item.transcript.prompt}`,
    );
  }

  write();

  const byTicket = new Map();

  for (const item of summaries) {
    if (!item.transcript.isSubagent) continue;

    const ticket = /#(\d+)/.exec(item.transcript.description)?.[1];
    if (ticket) byTicket.set(ticket, (byTicket.get(ticket) ?? 0) + item.cost);
  }

  write('Subagent cost by ticket (description containing #<n>):');

  for (const [ticket, cost] of [...byTicket].sort((a, b) => b[1] - a[1]).slice(0, TOP_SESSIONS)) {
    write(`  #${ticket}: ${money(cost)}`);
  }

  const tickets = summaries.filter(item => item.transcript.agentType === IMPLEMENTER).length;
  const perTicket = tickets ? total / tickets : 0;
  write();
  write(`tickets ~ ${tickets} (${IMPLEMENTER} runs); total cost per ticket ~ ${money(perTicket)}`);
}

main();
