#!/usr/bin/env node
/**
 * Install or update the Legend AI Toolkit in a project: `node scripts/install.mjs --to <project> [--check]`.
 *
 * The toolkit owns a namespace in the project: `.claude/pipeline/core/`, `.claude/skills/pipeline-*` and
 * `.claude/agents/pipeline-*.md`. This copies `core/`, `skills/pipeline-*` and `agents/pipeline-*.md` into it (content
 * and executable bit), removes every other entry found in it, writes `.claude/pipeline/toolkit.lock` (version, sha256
 * per file, executables) and merges the pipeline gate hooks into `.claude/settings.json` without duplicating a hook
 * already there. It also sets `env.CLAUDE_CODE_AUTO_COMPACT_WINDOW` when the project has no value for it and, only
 * while `profile.yml` declares `team:`, the SessionStart `compact` hook that points the team orchestrator back to its
 * note (removed again when `team:` goes away). Outside the namespace it touches only the lock and the settings: it
 * reads `profile.yml` but never writes it, the extensions or another skill. It refuses to write through a symbolic
 * link, and validates the settings before writing anything.
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
const PROFILE = '.claude/pipeline/profile.yml';
const COMPACT_ENV = 'CLAUDE_CODE_AUTO_COMPACT_WINDOW';
const COMPACT_WINDOW = '250000';
const GATE = 'node "$CLAUDE_PROJECT_DIR/.claude/pipeline/core/pipeline-gate.mjs"';
const HOOKS = [
  { event: 'PreToolUse', matcher: 'Bash', command: `${GATE} hook` },
  { event: 'PreToolUse', matcher: 'Write|Edit|MultiEdit|NotebookEdit', command: `${GATE} hook` },
  { event: 'UserPromptSubmit', matcher: undefined, command: `${GATE} authorize` },
];
const RESUME_HOOK = { event: 'SessionStart', matcher: 'compact', command: `${GATE} resume` };

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
  if (settings.env !== undefined && !isPlainObject(settings.env)) throw new Error(`${SETTINGS}: "env" must be an object`);
  if (settings.hooks === undefined) return settings;
  if (!isPlainObject(settings.hooks)) throw new Error(`${SETTINGS}: "hooks" must be an object`);

  for (const hook of [...HOOKS, RESUME_HOOK]) {
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

/** Tell whether the project profile declares a top-level `team:` key, without a YAML parser. */
function declaresTeam(project) {
  const file = path.join(project, PROFILE);
  return existsSync(file) && /^team:/m.test(readFileSync(file, 'utf8'));
}

const hookLabel = hook => `${hook.event}${hook.matcher ? ` ${hook.matcher}` : ''}`;

/** Drop the toolkit's own command for `hook`, and the entries it leaves empty. Return whether it was there. */
function removeHook(hooks, hook) {
  const entries = hooks[hook.event];
  if (!entries) return false;

  let removed = false;
  for (const entry of entries.filter(item => sameMatcher(item, hook.matcher))) {
    const kept = (entry.hooks ?? []).filter(item => item?.command !== hook.command);
    removed ||= kept.length !== (entry.hooks ?? []).length;
    entry.hooks = kept;
  }
  if (!removed) return false;

  hooks[hook.event] = entries.filter(entry => !sameMatcher(entry, hook.matcher) || entry.hooks.length > 0);
  if (hooks[hook.event].length === 0) delete hooks[hook.event];
  return true;
}

/**
 * Return the settings with the toolkit's env and hooks merged in, plus what changed: the hooks added, the hooks removed
 * and the env keys set. The resume hook follows `team:`; an env value the project already has is kept.
 */
function mergeSettings(settings, { team }) {
  const merged = structuredClone(settings);
  const added = [];
  const removed = [];
  const env = [];
  merged.hooks ??= {};

  if (merged.env?.[COMPACT_ENV] === undefined) {
    merged.env = { ...merged.env, [COMPACT_ENV]: COMPACT_WINDOW };
    env.push(COMPACT_ENV);
  }

  if (!team && removeHook(merged.hooks, RESUME_HOOK)) removed.push(hookLabel(RESUME_HOOK));

  for (const hook of team ? [...HOOKS, RESUME_HOOK] : HOOKS) {
    const entries = (merged.hooks[hook.event] ??= []);
    const present = entries.some(
      entry => sameMatcher(entry, hook.matcher) && entry.hooks?.some(item => item?.command === hook.command),
    );
    if (present) continue;

    const command = { type: 'command', command: hook.command };
    const entry = entries.find(item => sameMatcher(item, hook.matcher));

    if (entry) (entry.hooks ??= []).push(command);
    else entries.push(hook.matcher === undefined ? { hooks: [command] } : { matcher: hook.matcher, hooks: [command] });

    added.push(hookLabel(hook));
  }

  return { merged, added, removed, env };
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
    else if (lstatSync(destination).isDirectory()) {
      changes.push({ action: 'REMOVE', target }, { action: 'ADD', target, source });
    }
    else if (sha256(destination) !== sha256(source)) changes.push({ action: 'CHANGE', target, source });
    else if (isExecutable(destination) !== isExecutable(source)) changes.push({ action: 'MODE', target, source });
  }

  const replaced = changes.filter(change => change.action === 'REMOVE').map(change => `${change.target}/`);

  for (const target of ownedFiles(project)) {
    if (files.has(target) || replaced.some(prefix => target.startsWith(prefix))) continue;
    assertNoLink(project, target, { allowLeaf: true });
    changes.push({ action: 'REMOVE', target });
  }

  for (const file of [LOCK, SETTINGS]) assertNoLink(project, file);

  const { merged, added, removed, env } = mergeSettings(readSettings(project), { team: declaresTeam(project) });
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

  const settingsChanged = added.length > 0 || removed.length > 0 || env.length > 0;
  const lockChanged = readLock(project) !== lock;
  return { changes, merged, added, removed, env, settingsChanged, lock, lockChanged, version };
}

function removeEmptyParents(file, project) {
  const stop = path.join(project, '.claude');
  let directory = path.dirname(file);

  while (directory.startsWith(stop + path.sep) && readdirSync(directory).length === 0) {
    rmdirSync(directory);
    directory = path.dirname(directory);
  }
}

function apply(project, { changes, merged, settingsChanged, lock, lockChanged }) {
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

  if (settingsChanged) {
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
  const { changes, added, removed, env, settingsChanged, lockChanged, version } = result;

  for (const change of changes) process.stdout.write(`${change.action} ${change.target}\n`);
  for (const hook of added) process.stdout.write(`HOOK ${hook}\n`);
  for (const hook of removed) process.stdout.write(`UNHOOK ${hook}\n`);
  for (const key of env) process.stdout.write(`ENV ${key}\n`);
  if (lockChanged) process.stdout.write(`LOCK ${LOCK}\n`);

  if (check) {
    const pending = changes.length > 0 || settingsChanged || lockChanged;
    process.stdout.write(pending ? `check: differs from Legend AI Toolkit ${version}\n` : `check: up to date with ${version}\n`);
    process.exit(pending ? 1 : 0);
  }

  apply(project, result);

  const count = action => changes.filter(change => change.action === action).length;
  process.stdout.write(
    `install: Legend AI Toolkit ${version}: ${count('ADD')} added, ${count('CHANGE') + count('MODE')} changed, ` +
      `${count('REMOVE')} removed, ${added.length} hooks added, ${removed.length} hooks removed, ` +
      `${env.length} env set\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`install: ${error.message}\n`);
  process.exit(1);
}
