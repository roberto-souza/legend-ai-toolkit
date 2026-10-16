#!/usr/bin/env node
/**
 * Toolkit drift guard: `node .claude/pipeline/core/verify.mjs`, meant for the project's gate.
 *
 * The core (`.claude/pipeline/core/`), the `pipeline-*` skills and the `pipeline-*` agents come from the Legend AI
 * Toolkit and are listed, with sha256 and executable bit, in `.claude/pipeline/toolkit.lock`. This fails, naming each
 * file, when one was edited, deleted, lost its executable bit or was added inside that namespace by hand: a change goes
 * to the toolkit and reaches the project by its update prompt. Without a lock it warns and passes, so a project that has
 * not installed the toolkit yet is not blocked. `ownedFiles` and `isExecutable` are shared with `scripts/install.mjs`.
 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const LOCK = '.claude/pipeline/toolkit.lock';

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

export function isExecutable(file) {
  return (lstatSync(file).mode & 0o111) !== 0;
}

function walk(root, relative) {
  const directory = path.join(root, relative);
  const found = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;

    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) found.push(...walk(root, child));
    else found.push(child);
  }

  return found;
}

/** Every entry inside the toolkit namespace of a project, as posix paths relative to its root; links are not followed. */
export function ownedFiles(root) {
  const found = [];
  const isDirectory = relative => {
    const full = path.join(root, relative);
    return existsSync(full) && lstatSync(full).isDirectory();
  };

  if (isDirectory('.claude/pipeline/core')) found.push(...walk(root, '.claude/pipeline/core'));

  if (isDirectory('.claude/skills')) {
    for (const entry of readdirSync(path.join(root, '.claude/skills'), { withFileTypes: true })) {
      if (!entry.name.startsWith('pipeline-')) continue;
      const relative = `.claude/skills/${entry.name}`;
      if (entry.isDirectory()) found.push(...walk(root, relative));
      else found.push(relative);
    }
  }

  if (isDirectory('.claude/agents')) {
    for (const name of readdirSync(path.join(root, '.claude/agents'))) {
      if (name.startsWith('pipeline-') && name.endsWith('.md')) found.push(`.claude/agents/${name}`);
    }
  }

  return found.sort();
}

function readLock(root) {
  const file = path.join(root, LOCK);
  if (!existsSync(file)) return null;

  const lock = JSON.parse(readFileSync(file, 'utf8'));
  if (!lock || typeof lock.files !== 'object' || lock.files === null) throw new Error(`${LOCK} is malformed`);

  return lock;
}

function drift(root, lock) {
  const problems = [];
  const executables = new Set(lock.executables ?? []);

  for (const [target, hash] of Object.entries(lock.files)) {
    const file = path.join(root, target);
    if (!existsSync(file) || !lstatSync(file).isFile()) problems.push(`${target} (missing)`);
    else if (sha256(file) !== hash) problems.push(target);
    else if (executables.has(target) !== isExecutable(file)) problems.push(`${target} (executable bit)`);
  }

  for (const target of ownedFiles(root)) {
    if (!(target in lock.files)) problems.push(`${target} (not in the toolkit)`);
  }

  return problems;
}

function main() {
  const lock = readLock(ROOT);

  if (!lock) {
    process.stderr.write(`verify: no ${LOCK}, nothing to check\n`);
    return 0;
  }

  const problems = drift(ROOT, lock);

  if (problems.length === 0) {
    process.stdout.write(`verify: ${Object.keys(lock.files).length} files match Legend AI Toolkit ${lock.version}\n`);
    return 0;
  }

  process.stderr.write(
    `verify: ${problems.length} files differ from Legend AI Toolkit ${lock.version}:\n` +
      problems.map(problem => `  ${problem}\n`).join('') +
      'Change them in the Legend AI Toolkit and reinstall, not here.\n',
  );
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`verify: ${error.message}\n`);
    process.exitCode = 1;
  }
}
