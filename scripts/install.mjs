#!/usr/bin/env node
/**
 * Install or update the Legend AI Toolkit in a project: `node scripts/install.mjs --to <project> [--check]`.
 *
 * The toolkit owns a namespace in the project: `.claude/pipeline/core/`, `.claude/skills/pipeline-*` and
 * `.claude/agents/pipeline-*.md`. This copies `core/`, `skills/pipeline-*` and `agents/pipeline-*.md` into it (content
 * and executable bit), removes every other entry found in it, writes `.claude/pipeline/toolkit.lock` (version, sha256
 * per file, executables) and merges the pipeline gate hooks into `.claude/settings.json` without duplicating a hook
 * already there. Outside the namespace it touches only the lock and the settings: never `profile.yml`, the extensions
 * or another skill. It refuses to write through a symbolic link, and validates the settings before writing anything.
 * `--check` writes nothing, prints what would change and exits 1 when anything would. Dependency free and
 * deterministic: the prompt orchestrates, this script only copies.
 */
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isExecutable, ownedFiles } from '../core/verify.mjs';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));
const LOCK = '.claude/pipeline/toolkit.lock';
const SETTINGS = '.claude/settings.json';
const GATE = 'node "$CLAUDE_PROJECT_DIR/.claude/pipeline/core/pipeline-gate.mjs"';
const HOOKS = [
  { event: 'PreToolUse', matcher: 'Bash', command: `${GATE} hook` },
  { event: 'PreToolUse', matcher: 'Write|Edit|MultiEdit|NotebookEdit', command: `${GATE} hook` },
  { event: 'UserPromptSubmit', matcher: undefined, command: `${GATE} authorize` },
];

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

/** Map every shipped file to its project-relative destination, sorted. */
function manifest() {
  const files = new Map();

  const add = (source, target) => files.set(target, source);
  const walk = (directory, prefix) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.DS_Store') continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full, `${prefix}/${entry.name}`);
      else if (entry.isFile()) add(full, `${prefix}/${entry.name}`);
    }
  };

  walk(path.join(TOOLKIT, 'core'), '.claude/pipeline/core');

  for (const skill of readdirSync(path.join(TOOLKIT, 'skills')).filter(name => name.startsWith('pipeline-'))) {
    walk(path.join(TOOLKIT, 'skills', skill), `.claude/skills/${skill}`);
  }

  for (const agent of readdirSync(path.join(TOOLKIT, 'agents'))) {
    if (agent.startsWith('pipeline-') && agent.endsWith('.md')) add(path.join(TOOLKIT, 'agents', agent), `.claude/agents/${agent}`);
  }

  return new Map([...files].sort(([a], [b]) => a.localeCompare(b)));
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error.message}`);
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Refuse when the target, or any directory between the project root and it, is a symbolic link. */
function assertNoLink(project, target, { allowLeaf = false } = {}) {
  const parts = target.split('/');

  for (let index = 1; index <= parts.length; index++) {
    if (allowLeaf && index === parts.length) return;

    const current = path.join(project, ...parts.slice(0, index));
    if (!existsSync(current) && !isDanglingLink(current)) return;
    if (lstatSync(current).isSymbolicLink()) {
      throw new Error(`refusing to write through the symbolic link ${parts.slice(0, index).join('/')}`);
    }
  }
}

function isDanglingLink(file) {
  try {
    return lstatSync(file).isSymbolicLink();
  } catch {
    return false;
  }
}

function readSettings(project) {
  const file = path.join(project, SETTINGS);
  if (!existsSync(file)) return {};

  const settings = readJson(file);
  if (!isPlainObject(settings)) throw new Error(`${SETTINGS} must be a JSON object`);
  if (settings.hooks === undefined) return settings;
  if (!isPlainObject(settings.hooks)) throw new Error(`${SETTINGS}: "hooks" must be an object`);

  for (const hook of HOOKS) {
    const entries = settings.hooks[hook.event];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) throw new Error(`${SETTINGS}: "hooks.${hook.event}" must be an array`);

    for (const entry of entries) {
      if (!isPlainObject(entry) || (entry.hooks !== undefined && !Array.isArray(entry.hooks))) {
        throw new Error(`${SETTINGS}: every "hooks.${hook.event}" entry must be an object with a "hooks" array`);
      }
    }
  }

  return settings;
}

function sameMatcher(entry, matcher) {
  const current = entry.matcher === '' ? undefined : entry.matcher;
  return current === matcher;
}

/** Return the settings with the gate hooks merged in, and the hooks that were missing. */
function mergeHooks(settings) {
  const merged = structuredClone(settings);
  const added = [];
  merged.hooks ??= {};

  for (const hook of HOOKS) {
    const entries = (merged.hooks[hook.event] ??= []);
    const present = entries.some(
      entry => sameMatcher(entry, hook.matcher) && entry.hooks?.some(item => item?.command === hook.command),
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

function readLock(project) {
  try {
    return readFileSync(path.join(project, LOCK), 'utf8');
  } catch {
    return '';
  }
}

function plan(project) {
  const files = manifest();
  const changes = [];

  for (const [target, source] of files) {
    const destination = path.join(project, target);
    assertNoLink(project, target);

    if (!existsSync(destination)) changes.push({ action: 'ADD', target, source });
    else if (lstatSync(destination).isDirectory()) changes.push({ action: 'ADD', target, source });
    else if (sha256(destination) !== sha256(source)) changes.push({ action: 'CHANGE', target, source });
    else if (isExecutable(destination) !== isExecutable(source)) changes.push({ action: 'MODE', target, source });
  }

  for (const target of ownedFiles(project)) {
    if (files.has(target)) continue;
    assertNoLink(project, target, { allowLeaf: true });
    changes.push({ action: 'REMOVE', target });
  }

  for (const file of [LOCK, SETTINGS]) assertNoLink(project, file);

  const { merged, added } = mergeHooks(readSettings(project));
  const version = readFileSync(path.join(TOOLKIT, 'VERSION'), 'utf8').trim();
  const lock =
    JSON.stringify(
      {
        version,
        files       : Object.fromEntries([...files].map(([target, source]) => [target, sha256(source)])),
        executables : [...files].filter(([, source]) => isExecutable(source)).map(([target]) => target),
      },
      null,
      2,
    ) + '\n';

  return { changes, merged, added, lock, lockChanged: readLock(project) !== lock, version };
}

function removeEmptyParents(file, project) {
  const stop = path.join(project, '.claude');
  let directory = path.dirname(file);

  while (directory.startsWith(stop + path.sep) && readdirSync(directory).length === 0) {
    rmdirSync(directory);
    directory = path.dirname(directory);
  }
}

function apply(project, { changes, merged, added, lock, lockChanged }) {
  const removalsFirst = [...changes].sort((a, b) => (b.action === 'REMOVE') - (a.action === 'REMOVE'));

  for (const change of removalsFirst) {
    const destination = path.join(project, change.target);

    if (change.action === 'REMOVE') {
      rmSync(destination, { recursive: true, force: true });
      removeEmptyParents(destination, project);
      continue;
    }

    mkdirSync(path.dirname(destination), { recursive: true });
    if (change.action !== 'MODE') copyFileSync(change.source, destination);
    chmodSync(destination, lstatSync(change.source).mode & 0o777);
  }

  if (lockChanged) writeFileSync(path.join(project, LOCK), lock);

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
  if (lockChanged) process.stdout.write(`LOCK ${LOCK}\n`);

  if (check) {
    const pending = changes.length > 0 || added.length > 0 || lockChanged;
    process.stdout.write(pending ? `check: differs from Legend AI Toolkit ${version}\n` : `check: up to date with ${version}\n`);
    process.exit(pending ? 1 : 0);
  }

  apply(project, result);

  const count = action => changes.filter(change => change.action === action).length;
  process.stdout.write(
    `install: Legend AI Toolkit ${version}: ${count('ADD')} added, ${count('CHANGE') + count('MODE')} changed, ` +
      `${count('REMOVE')} removed, ${added.length} hooks added\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`install: ${error.message}\n`);
  process.exit(1);
}
