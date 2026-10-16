#!/usr/bin/env node
/**
 * Install or update the Legend AI Toolkit in a project: `node scripts/install.mjs --to <project> [--check]`.
 *
 * Copies `core/**` to `.claude/pipeline/core/`, `skills/pipeline-*` to `.claude/skills/` and `agents/pipeline-*.md`
 * to `.claude/agents/`, removes the files the previous `.claude/pipeline/toolkit.lock` listed and this version no
 * longer ships, writes the new lock (version and sha256 per file) and merges the pipeline gate hooks into
 * `.claude/settings.json` without duplicating a hook already there. It never touches `profile.yml`, the extensions or
 * a skill outside `pipeline-*`. `--check` writes nothing, prints what would change and exits 1 when anything would.
 * Deterministic and dependency free: the prompt orchestrates, this script only copies.
 */
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));
const LOCK = '.claude/pipeline/toolkit.lock';
const SETTINGS = '.claude/settings.json';
const GATE = 'node "$CLAUDE_PROJECT_DIR/.claude/pipeline/core/pipeline-gate.mjs"';
const HOOKS = [
  { event: 'PreToolUse', matcher: 'Bash', command: `${GATE} hook` },
  { event: 'PreToolUse', matcher: 'Write|Edit|MultiEdit|NotebookEdit', command: `${GATE} hook` },
  { event: 'UserPromptSubmit', matcher: undefined, command: `${GATE} authorize` },
];
const IGNORED = new Set(['.DS_Store']);
const OWNED = /^\.claude\/(?:pipeline\/core\/|skills\/pipeline-[^/]+\/|agents\/pipeline-[^/]+\.md$)/;

function usage() {
  process.stderr.write('Usage: node scripts/install.mjs --to <project> [--check]\n');
  process.exit(1);
}

function readArgs(argv) {
  const index = argv.indexOf('--to');
  const to = index === -1 ? '' : (argv[index + 1] ?? '');
  if (!to || to.startsWith('--')) usage();

  return { project: path.resolve(to), check: argv.includes('--check') };
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function walk(directory) {
  const found = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;

    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else if (entry.isFile()) found.push(full);
  }

  return found;
}

function toPosix(relative) {
  return relative.split(path.sep).join('/');
}

/** Map every shipped file to its project-relative destination. */
function manifest() {
  const files = new Map();
  const add = (source, target) => files.set(toPosix(target), source);

  for (const file of walk(path.join(TOOLKIT, 'core'))) {
    add(file, path.join('.claude/pipeline/core', path.relative(path.join(TOOLKIT, 'core'), file)));
  }

  for (const skill of readdirSync(path.join(TOOLKIT, 'skills')).filter(name => name.startsWith('pipeline-'))) {
    for (const file of walk(path.join(TOOLKIT, 'skills', skill))) {
      add(file, path.join('.claude/skills', path.relative(path.join(TOOLKIT, 'skills'), file)));
    }
  }

  for (const agent of readdirSync(path.join(TOOLKIT, 'agents'))) {
    if (agent.startsWith('pipeline-') && agent.endsWith('.md')) {
      add(path.join(TOOLKIT, 'agents', agent), path.join('.claude/agents', agent));
    }
  }

  return new Map([...files].sort(([a], [b]) => a.localeCompare(b)));
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;

  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error.message}`);
  }
}

function sameMatcher(entry, matcher) {
  return (entry.matcher ?? undefined) === matcher || (matcher === undefined && entry.matcher === '');
}

/** Return the settings with the gate hooks merged in, and the hooks that were missing. */
function mergeHooks(settings) {
  const merged = structuredClone(settings);
  const added = [];
  merged.hooks ??= {};

  for (const hook of HOOKS) {
    const entries = (merged.hooks[hook.event] ??= []);
    const present = entries.some(
      entry => sameMatcher(entry, hook.matcher) && entry.hooks?.some(item => item.command === hook.command),
    );
    if (present) continue;

    const command = { type: 'command', command: hook.command };
    const entry = entries.find(item => sameMatcher(item, hook.matcher));

    if (entry) (entry.hooks ??= []).push(command);
    else entries.push(hook.matcher === undefined ? { hooks: [command] } : { matcher: hook.matcher, hooks: [command] });

    added.push(`${hook.event}${hook.matcher ? ` ${hook.matcher}` : ''}`);
  }

  return { merged, added };
}

function removeEmptyParents(file, project) {
  let directory = path.dirname(file);

  while (directory.startsWith(path.join(project, '.claude')) && directory !== path.join(project, '.claude')) {
    if (readdirSync(directory).length > 0) return;
    rmdirSync(directory);
    directory = path.dirname(directory);
  }
}

function plan(project) {
  const files = manifest();
  const lock = readJson(path.join(project, LOCK), { files: {} });
  const changes = [];

  for (const [target, source] of files) {
    const destination = path.join(project, target);
    if (!existsSync(destination)) changes.push({ action: 'ADD', target, source });
    else if (sha256(destination) !== sha256(source)) changes.push({ action: 'CHANGE', target, source });
  }

  for (const target of Object.keys(lock.files ?? {})) {
    const owned = OWNED.test(target) && !target.split('/').includes('..');
    if (owned && !files.has(target) && existsSync(path.join(project, target))) changes.push({ action: 'REMOVE', target });
  }

  const settings = readJson(path.join(project, SETTINGS), {});
  const { merged, added } = mergeHooks(settings);
  const version = readFileSync(path.join(TOOLKIT, 'VERSION'), 'utf8').trim();
  const nextLock = { version, files: Object.fromEntries([...files].map(([target, source]) => [target, sha256(source)])) };
  const lockChanged = JSON.stringify(lock) !== JSON.stringify(nextLock);

  return { files, changes, merged, added, nextLock, lockChanged, version };
}

function apply(project, { changes, merged, added, nextLock, lockChanged }) {
  for (const change of changes) {
    const destination = path.join(project, change.target);

    if (change.action === 'REMOVE') {
      rmSync(destination);
      removeEmptyParents(destination, project);
      continue;
    }

    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(change.source, destination);
    chmodSync(destination, statSync(change.source).mode & 0o777);
  }

  if (lockChanged) writeFileSync(path.join(project, LOCK), JSON.stringify(nextLock, null, 2) + '\n');

  if (added.length > 0) {
    mkdirSync(path.join(project, '.claude'), { recursive: true });
    writeFileSync(path.join(project, SETTINGS), JSON.stringify(merged, null, 2) + '\n');
  }
}

function main() {
  const { project, check } = readArgs(process.argv.slice(2));

  if (!existsSync(path.join(project, '.git'))) {
    process.stderr.write(`install: ${project} is not the root of a git repository\n`);
    process.exit(1);
  }

  const result = plan(project);
  const { changes, added, lockChanged, version } = result;

  for (const change of changes) process.stdout.write(`${change.action} ${change.target}\n`);
  for (const hook of added) process.stdout.write(`HOOK ${hook}\n`);

  const pending = changes.length > 0 || added.length > 0 || lockChanged;

  if (check) {
    if (lockChanged && changes.length === 0) process.stdout.write(`LOCK ${LOCK}\n`);
    process.stdout.write(pending ? `check: differs from Legend AI Toolkit ${version}\n` : `check: up to date with ${version}\n`);
    process.exit(pending ? 1 : 0);
  }

  apply(project, result);

  const count = action => changes.filter(change => change.action === action).length;
  process.stdout.write(
    `install: Legend AI Toolkit ${version}: ${count('ADD')} added, ${count('CHANGE')} changed, ` +
      `${count('REMOVE')} removed, ${added.length} hooks added\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`install: ${error.message}\n`);
  process.exit(1);
}
