#!/usr/bin/env node
/**
 * Pipeline seal gate (contract: `.claude/pipeline/core/seals.md`). `stamp` writes a `pipeline/<seal>` commit status on a
 * PR head, `check` lists the seals a PR kind requires, `hook` (PreToolUse) lets only `gh pr merge <n>` through, and only
 * with every seal plus the human's authorization, and `authorize` (UserPromptSubmit) records that authorization from
 * a prompt that asks for the merge in free text
 * (a named `#n` is an issue or a PR; without one, the request covers every PR whose closing issues are In review, and the
 * PRs that close none). `carry` copies a validation seal to a new PR head when the delta since
 * the sealed head touches no file of a kind that requires it. `prose` tells whether a git range changes only files of
 * `review.proseOnly`, for the reviewer model. `resume` (SessionStart, matcher `compact`) points the team orchestrator
 * back to the `team.note` after a compaction, and prints nothing without `team`. No override or skip flag exists. `gh`
 * and `git` are called without a shell.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const SEALS = ['review', 'e2e', 'screen', 'ux'];
const KINDS = ['api', 'screen', 'app'];
const MAX_DESCRIPTION = 140;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const ALLOWED_MERGE = /^(?:rtk )?gh pr merge ([1-9]\d*)((?: --?[a-z][a-z-]*)*)$/;
const MERGE_COMMAND = /\bgh[\s\\]+pr\b(?:[\s\\]+-[^\s\\]+(?:[\s\\]+[^-\s\\][^\s\\]*)?)*[\s\\]+merge\b/;
const GH_API = /\bgh[\s\\]+api\b/;
const GH_ALIAS = /\bgh[\s\\]+alias\b/;
const MERGE_TARGET = /\/merges?\b|mergePullRequest|AutoMerge/i;
const USE_MESSAGE = 'Merge blocked: use gh pr merge <number> (only that exact form is checked for seals).';
const AUTH_MARKER = 'pipeline-merge-auth';
const AUTH_FILE = path.join(ROOT, '.git', `${AUTH_MARKER}.json`);
const AUTH_TTL_MS = 12 * 60 * 60 * 1000;
const REQUEST_OPENERS = new Set([
  'ok',
  'beleza',
  'blz',
  'show',
  'pronto',
  'certo',
  'perfeito',
  'sim',
  'valeu',
  'otimo',
]);
const REQUEST_WORDS = new Set([
  'pode',
  'podem',
  'vai',
  'bora',
  'manda',
  'segue',
  'libera',
  'autorizo',
  'faz',
  'faca',
  'fazer',
]);
const REQUEST_FILLERS = new Set(['fazer', 'com', 'o', 'a', 'os', 'as']);
const MERGE_VERB = /^merge(?:ar|ia|ie)?$/;
const REQUEST_TARGETS = new Set([
  'e',
  'o',
  'a',
  'os',
  'as',
  'do',
  'da',
  'dos',
  'das',
  'de',
  'no',
  'na',
  'nos',
  'nas',
  'em',
  'in',
  'review',
  'tudo',
  'que',
  'pilha',
  'task',
  'tasks',
  'ticket',
  'tickets',
  'pr',
  'prs',
  'issue',
  'issues',
  'todos',
  'todas',
  'todo',
  'toda',
  'isso',
  'essa',
  'esse',
  'essas',
  'esses',
  'agora',
  'por',
  'favor',
  'pf',
  'pfv',
  'pfvr',
  'gentileza',
  'pra',
  'para',
  'mim',
]);
const STATE_WORDS = new Set(['esta', 'estao', 'ta']);
const COUNTED_TARGETS = new Set(['prs', 'tasks', 'tickets', 'issues']);
const MAX_REQUEST_LENGTH = 200;
const COMPARE_FILE_LIMIT = 300;
const HOOK_BUDGET_MS = 40000;
const CALL_BUDGET_MS = 10000;

let hookDeadline = null;

const print = text => process.stdout.write(`${text}\n`);
const printError = text => process.stderr.write(`${text}\n`);

function parseArgs(args, allowedFlags) {
  const flags = {};
  const positional = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (!allowedFlags.includes(name)) throw new Error(`unknown flag --${name}`);
    const value = args[++index];
    if (value === undefined) throw new Error(`--${name} needs a value`);
    flags[name] = value;
  }
  return { flags, positional };
}

function requireFlag(flags, name) {
  if (!flags[name]) throw new Error(`missing --${name}`);
  return flags[name];
}

function requirePr(flags) {
  const value = requireFlag(flags, 'pr');
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`--pr must be a PR number, got "${value}"`);
  return Number(value);
}

async function loadProfile() {
  const { parse } = await import('yaml');
  const profile = parse(readFileSync(path.join(ROOT, '.claude/pipeline/profile.yml'), 'utf8'));
  if (typeof profile?.repo !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(profile.repo)) {
    throw new Error('profile.yml has no valid `repo` (owner/name)');
  }
  return profile;
}

function kindGlobs(profile) {
  const kinds = profile.seals?.kinds ?? {};
  for (const [kind, globs] of Object.entries(kinds)) {
    if (!KINDS.includes(kind)) throw new Error(`seals.kinds.${kind} is not one of ${KINDS.join(', ')}`);
    if (!Array.isArray(globs) || globs.length === 0 || globs.some(glob => typeof glob !== 'string')) {
      throw new Error(`seals.kinds.${kind} must be a non-empty list of globs`);
    }
  }
  return kinds;
}

function callTimeout() {
  if (hookDeadline === null) return 30000;
  const remaining = hookDeadline - Date.now();
  if (remaining <= 0) throw new Error('the seal check timed out');
  return Math.min(CALL_BUDGET_MS, remaining);
}

function gh(args) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: callTimeout() });
  } catch (error) {
    const target = args.find(arg => arg.startsWith('repos/')) ?? args.slice(0, 2).join(' ');
    if (error.code === 'ETIMEDOUT') throw new Error(`the seal check timed out on ${target}`);
    const detail = String(error.stderr || error.message)
      .trim()
      .split('\n')[0];
    throw new Error(`gh failed on ${target}: ${detail}`);
  }
}

function headSha(repo, pr) {
  const sha = gh(['api', `repos/${repo}/pulls/${pr}`, '--jq', '.head.sha']).trim();
  if (!SHA_PATTERN.test(sha)) throw new Error(`PR #${pr} returned no head SHA`);
  return sha;
}

function prFiles(repo, pr) {
  const output = gh(['api', '--paginate', `repos/${repo}/pulls/${pr}/files?per_page=100`, '--jq', '.[].filename']);
  return output.split('\n').filter(Boolean);
}

function proseGlobs(profile) {
  const globs = profile.review?.proseOnly;
  if (globs === undefined) return null;
  if (!Array.isArray(globs) || globs.length === 0 || globs.some(glob => typeof glob !== 'string')) {
    throw new Error('review.proseOnly must be a non-empty list of globs');
  }
  return globs;
}

function changedFiles(range) {
  if (range.startsWith('-')) throw new Error(`--range must be a git range, got "${range}"`);
  try {
    const output = execFileSync('git', ['diff', '--name-only', '--no-renames', range], {
      cwd      : ROOT,
      encoding : 'utf8',
      stdio    : ['ignore', 'pipe', 'pipe'],
    });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    const detail = String(error.stderr || error.message)
      .trim()
      .split('\n')[0];
    throw new Error(`git diff failed on ${range}: ${detail}`);
  }
}

function kindsFor(files, kinds) {
  if (typeof path.matchesGlob !== 'function')
    throw new Error('this Node has no path.matchesGlob (needs 22.5 or newer)');
  return KINDS.filter(kind => files.some(file => (kinds[kind] ?? []).some(glob => path.matchesGlob(file, glob))));
}

function requiredSeals(matchedKinds, team) {
  const required = new Map([['review', []]]);
  const add = (seal, kind) => required.set(seal, [...(required.get(seal) ?? []), kind]);
  for (const kind of team ? matchedKinds : []) {
    if (kind === 'api') add(team.e2e ? 'e2e' : 'screen', kind);
    if (kind === 'screen' || (kind === 'app' && team.devices?.length)) {
      add('screen', kind);
      if (team.roles?.ux) add('ux', kind);
    }
  }
  return SEALS.filter(name => required.has(name)).map(name => ({ name, kinds: required.get(name) }));
}

function combinedStatus(repo, sha) {
  const status = JSON.parse(gh(['api', `repos/${repo}/commits/${sha}/status`]));
  return new Map((status.statuses ?? []).map(entry => [entry.context, entry.state]));
}

function runCheck(profile, pr) {
  const repo = profile.repo;
  const kinds = kindGlobs(profile);
  const sha = headSha(repo, pr);
  const matchedKinds = kindsFor(prFiles(repo, pr), kinds);
  const states = combinedStatus(repo, sha);
  const seals = requiredSeals(matchedKinds, profile.team).map(({ name, kinds: requiredBy }) => ({
    name,
    requiredBy : name === 'review' ? 'every PR' : requiredBy.join(', '),
    present    : states.get(`pipeline/${name}`) === 'success',
  }));
  return { pr, sha, seals };
}

function sealLine(seal) {
  return `${seal.present ? 'OK' : 'MISSING'} pipeline/${seal.name} (required by ${seal.requiredBy})`;
}

function summaryLine({ pr, sha, seals }) {
  const present = seals.filter(seal => seal.present).length;
  return `PR #${pr} head ${sha.slice(0, 7)}: ${present} of ${seals.length} required seals present`;
}

async function check(args) {
  const { flags } = parseArgs(args, ['pr']);
  const result = runCheck(await loadProfile(), requirePr(flags));
  for (const seal of result.seals) print(sealLine(seal));
  print(summaryLine(result));
  return result.seals.every(seal => seal.present) ? 0 : 1;
}

function readVerdict(reportPath) {
  const report = readFileSync(reportPath, 'utf8');
  const section = report.split(/^## /m).find(part => part.startsWith('Verdict'));
  if (!section) throw new Error(`${reportPath} has no "## Verdict" section`);
  const lines = section.split('\n').slice(1);
  const verdict = lines.find(line => line.trim())?.trim();
  const reviewedHead = lines.map(line => line.match(/^Reviewed head:\s*([0-9a-f]{40})\s*$/)?.[1]).find(Boolean);
  return { verdict, reviewedHead };
}

async function stamp(args) {
  const { flags, positional } = parseArgs(args, ['pr', 'sha', 'evidence', 'report']);
  const [seal] = positional;
  if (!SEALS.includes(seal)) throw new Error(`unknown seal "${seal ?? ''}", expected one of ${SEALS.join(', ')}`);
  const pr = requirePr(flags);
  const sha = requireFlag(flags, 'sha');
  if (!SHA_PATTERN.test(sha)) throw new Error('--sha must be the full 40-character commit SHA');
  const evidence = requireFlag(flags, 'evidence');
  if (seal === 'review') {
    const { verdict, reviewedHead } = readVerdict(requireFlag(flags, 'report'));
    if (verdict !== 'APPROVED') throw new Error(`the review report verdict is "${verdict}", not APPROVED`);
    if (reviewedHead !== sha) {
      throw new Error(`the review report reviewed head ${reviewedHead ?? '(missing)'}, but --sha is ${sha}`);
    }
  }
  const { repo } = await loadProfile();
  const head = headSha(repo, pr);
  if (head !== sha) throw new Error(`PR #${pr} head is ${head}, but --sha is ${sha}: the stage ran on a stale head`);
  const description = [...evidence].slice(0, MAX_DESCRIPTION).join('');
  gh([
    'api',
    '--method',
    'POST',
    `repos/${repo}/statuses/${sha}`,
    '-f',
    'state=success',
    '-f',
    `context=pipeline/${seal}`,
    '-f',
    `description=${description}`,
  ]);
  print(`stamped pipeline/${seal} on ${sha.slice(0, 7)} for PR #${pr}`);
  return 0;
}

export function mentionsMerge(text) {
  return MERGE_COMMAND.test(text) || GH_ALIAS.test(text) || (GH_API.test(text) && MERGE_TARGET.test(text));
}

function rawMentionsMerge(raw) {
  return raw.includes('gh') && raw.includes('merge');
}

export function normalize(text) {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[.! ]+$/, '')
      .trim()
  );
}

function isTargetWord(word, previous, next) {
  if (/^#\d+$/.test(word) || REQUEST_TARGETS.has(word)) return true;
  if (/^\d+$/.test(word)) return COUNTED_TARGETS.has(next);
  return STATE_WORDS.has(word) && previous === 'que';
}

export function parseAuthorization(prompt) {
  if (prompt.length > MAX_REQUEST_LENGTH || prompt.endsWith('?')) return null;
  const words = prompt.replace(/[,;:]/g, ' ').split(' ').filter(Boolean);
  let index = 0;
  while (REQUEST_OPENERS.has(words[index])) index++;
  const requested = REQUEST_WORDS.has(words[index]);
  if (requested) index++;
  while (requested && REQUEST_FILLERS.has(words[index])) index++;
  const verb = words[index] ?? '';
  if (!MERGE_VERB.test(verb) || (verb === 'merge' && !requested)) return null;
  const target = words.slice(index + 1);
  if (!target.every((word, at) => isTargetWord(word, target[at - 1], target[at + 1]))) return null;
  const issues = target.filter(word => word.startsWith('#')).map(word => Number(word.slice(1)));
  if (issues.length > 0) return { mode: 'list', issues };
  return { mode: 'in-review', issues: [] };
}

export function carryProblem(seal, deltaFiles, profile) {
  if (!SEALS.includes(seal)) return `unknown seal "${seal ?? ''}", expected one of ${SEALS.join(', ')}`;
  if (seal === 'review') return 'pipeline/review is never carried: the fix goes through the delta review';
  const needed = requiredSeals(kindsFor(deltaFiles, kindGlobs(profile)), profile.team).find(
    ({ name }) => name === seal,
  );
  return needed ? `the delta touches ${needed.kinds.join(', ')}, which requires pipeline/${seal}` : null;
}

export function resumeInstruction(profile) {
  const note = profile?.team?.note;
  return note ? `If you are the team orchestrator, read the note "${note}" before acting.` : '';
}

async function resume() {
  try {
    const file = path.join(ROOT, '.claude/pipeline/profile.yml');
    if (!existsSync(file)) return 0;
    const { parse } = await import('yaml');
    const instruction = resumeInstruction(parse(readFileSync(file, 'utf8')));
    if (instruction) print(instruction);
  } catch (error) {
    printError(`resume instruction not printed: ${error.message}`);
  }
  return 0;
}

async function authorize() {
  try {
    const authorization = parseAuthorization(normalize(String(JSON.parse(readFileSync(0, 'utf8'))?.prompt ?? '')));
    if (!authorization) return 0;
    if (!statSync(path.join(ROOT, '.git')).isDirectory()) return 0;
    const grantedAt = new Date();
    const expiresAt = new Date(grantedAt.getTime() + AUTH_TTL_MS);
    const record = { ...authorization, grantedAt: grantedAt.toISOString(), expiresAt: expiresAt.toISOString() };
    writeFileSync(AUTH_FILE, JSON.stringify(record, null, 2));
    print(
      `merge authorization recorded: ${record.mode} ${record.issues.map(issue => `#${issue}`).join(' ')} until ${record.expiresAt}`,
    );
  } catch (error) {
    printError(`merge authorization not recorded: ${error.message}`);
  }
  return 0;
}

function authorizationProblem(repo, pr) {
  let auth;
  try {
    auth = JSON.parse(readFileSync(AUTH_FILE, 'utf8'));
  } catch {
    return 'no authorization recorded';
  }
  if (!(Date.parse(auth.expiresAt) > Date.now())) return 'the authorization expired';
  const closing = JSON.parse(
    gh([
      'pr',
      'view',
      String(pr),
      '--repo',
      repo,
      '--json',
      'closingIssuesReferences',
      '--jq',
      '[.closingIssuesReferences[].number]',
    ]),
  );
  if (auth.mode === 'list') {
    if (auth.issues?.includes(pr)) return null;
    if (closing.length === 0) return `PR #${pr} closes no issue and was not named`;
    const unnamed = closing.filter(issue => !auth.issues?.includes(issue));
    return unnamed.length ? `closing issue ${unnamed.map(issue => `#${issue}`).join(' ')} was not named` : null;
  }
  if (auth.mode !== 'in-review') return 'the authorization has an unknown mode';
  for (const issue of closing) {
    const statuses = JSON.parse(
      gh([
        'issue',
        'view',
        String(issue),
        '--repo',
        repo,
        '--json',
        'projectItems',
        '--jq',
        '[.projectItems[] | (.status.name // "")]',
      ]),
    );
    if (!statuses.includes('In review')) return `closing issue #${issue} is not In review on the board`;
  }
  return null;
}

function touchesAuthFile(toolInput) {
  return [toolInput.command, toolInput.file_path, toolInput.notebook_path].some(
    value => typeof value === 'string' && value.includes(AUTH_MARKER),
  );
}

async function hook() {
  hookDeadline = Date.now() + HOOK_BUDGET_MS;
  const raw = readFileSync(0, 'utf8');
  if (!raw.includes(AUTH_MARKER) && !rawMentionsMerge(raw)) return 0;
  const toolInput = JSON.parse(raw)?.tool_input ?? {};
  if (touchesAuthFile(toolInput)) {
    printError("Blocked: the merge authorization file is written only by the human's prompt");
    return 2;
  }
  const command = String(toolInput.command ?? '');
  if (!mentionsMerge(command)) return 0;
  const allowed = command.trim().match(ALLOWED_MERGE);
  if (!allowed) {
    printError(USE_MESSAGE);
    return 2;
  }
  const pr = Number(allowed[1]);
  const profile = await loadProfile();
  const result = runCheck(profile, pr);
  const problem = authorizationProblem(profile.repo, pr);
  const blocks = [];
  if (!result.seals.every(seal => seal.present)) {
    blocks.push(
      'Merge blocked: the PR lacks seals (.claude/pipeline/core/seals.md).',
      [summaryLine(result), ...result.seals.map(sealLine)].join('\n'),
    );
  }
  if (problem) blocks.push(`Merge blocked: merge needs the human's authorization for PR #${pr} (${problem})`);
  if (blocks.length === 0) return 0;
  printError(blocks.join('\n'));
  return 2;
}

async function prose(args) {
  const { flags } = parseArgs(args, ['range']);
  const range = requireFlag(flags, 'range');
  const globs = proseGlobs(await loadProfile());
  if (globs === null) {
    print('NOT PROSE-ONLY: review.proseOnly not declared');
    return 0;
  }
  const files = changedFiles(range);
  if (typeof path.matchesGlob !== 'function')
    throw new Error('this Node has no path.matchesGlob (needs 22.5 or newer)');
  if (files.length === 0) {
    print('NOT PROSE-ONLY: empty diff');
    return 0;
  }
  const outside = files.find(file => !globs.some(glob => path.matchesGlob(file, glob)));
  print(outside === undefined ? 'PROSE-ONLY' : `NOT PROSE-ONLY: ${outside}`);
  return 0;
}

async function carry(args) {
  const { flags, positional } = parseArgs(args, ['pr', 'from']);
  const [seal] = positional;
  const sealProblem = carryProblem(seal, [], { seals: {} });
  if (sealProblem) throw new Error(sealProblem);
  const pr = requirePr(flags);
  const from = requireFlag(flags, 'from');
  if (!SHA_PATTERN.test(from)) throw new Error('--from must be the full 40-character commit SHA');
  const profile = await loadProfile();
  const { repo } = profile;
  const head = headSha(repo, pr);
  if (head === from) throw new Error(`--from is already the head of PR #${pr}`);
  if (combinedStatus(repo, from).get(`pipeline/${seal}`) !== 'success') {
    throw new Error(`${from.slice(0, 7)} has no pipeline/${seal} in success`);
  }
  const compare = JSON.parse(
    gh([
      'api',
      `repos/${repo}/compare/${from}...${head}`,
      '--jq',
      '{status: .status, files: [.files[] | .filename, (.previous_filename // empty)]}',
    ]),
  );
  if (compare.status !== 'ahead') throw new Error(`${from.slice(0, 7)} is not an ancestor of the head of PR #${pr}`);
  if (compare.files.length >= COMPARE_FILE_LIMIT) {
    throw new Error('the delta is too large to inspect: run the stage again');
  }
  const problem = carryProblem(seal, compare.files, profile);
  if (problem) throw new Error(problem);
  gh([
    'api',
    '--method',
    'POST',
    `repos/${repo}/statuses/${head}`,
    '-f',
    'state=success',
    '-f',
    `context=pipeline/${seal}`,
    '-f',
    `description=carried from ${from.slice(0, 7)}: the delta needs no pipeline/${seal}`,
  ]);
  print(`carried pipeline/${seal} from ${from.slice(0, 7)} to ${head.slice(0, 7)} for PR #${pr}`);
  return 0;
}

const COMMANDS = { stamp, check, hook, authorize, prose, carry, resume };

async function main() {
  const [commandName, ...commandArgs] = process.argv.slice(2);
  const failureCode = commandName === 'hook' ? 2 : 1;
  try {
    if (!COMMANDS[commandName]) {
      throw new Error('usage: pipeline-gate.mjs <stamp|check|hook|authorize|prose|carry|resume> [flags]');
    }
    process.exitCode = await COMMANDS[commandName](commandArgs);
  } catch (error) {
    printError(commandName === 'hook' ? `Merge blocked: ${error.message}` : `error: ${error.message}`);
    process.exitCode = failureCode;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) await main();
