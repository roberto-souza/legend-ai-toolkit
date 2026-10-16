#!/usr/bin/env node
/**
 * Toolkit drift guard: `node .claude/pipeline/core/verify.mjs`, meant for the project's gate.
 *
 * Recomputes the sha256 of every file `.claude/pipeline/toolkit.lock` lists and fails, naming each one, when a file
 * was edited or deleted by hand. The core, the `pipeline-*` skills and the `pipeline-*` agents come from the Legend AI
 * Toolkit: a change goes there, and reaches the project by its update prompt. Without a lock it warns and passes, so
 * a project that has not installed the toolkit yet is not blocked.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const LOCK = path.join(ROOT, '.claude', 'pipeline', 'toolkit.lock');

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function main() {
  if (!existsSync(LOCK)) {
    process.stderr.write('verify: no .claude/pipeline/toolkit.lock, nothing to check\n');
    return 0;
  }

  const lock = JSON.parse(readFileSync(LOCK, 'utf8'));
  const drifted = [];

  for (const [target, hash] of Object.entries(lock.files ?? {})) {
    const file = path.join(ROOT, target);
    if (!existsSync(file)) drifted.push(`${target} (missing)`);
    else if (sha256(file) !== hash) drifted.push(target);
  }

  if (drifted.length === 0) {
    process.stdout.write(`verify: ${Object.keys(lock.files ?? {}).length} files match Legend AI Toolkit ${lock.version}\n`);
    return 0;
  }

  process.stderr.write(
    `verify: ${drifted.length} files differ from Legend AI Toolkit ${lock.version}:\n` +
      drifted.map(target => `  ${target}\n`).join('') +
      'Change them in the Legend AI Toolkit and reinstall, not here.\n',
  );
  return 1;
}

try {
  process.exitCode = main();
} catch (error) {
  process.stderr.write(`verify: ${error.message}\n`);
  process.exitCode = 1;
}
