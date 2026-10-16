#!/usr/bin/env node
/**
 * Neutrality guard: the toolkit ships to every project, so no file in it may name one of them.
 *
 * Reads `scripts/neutrality.json` (`terms`, `allow`) and fails, with file and line, on every whole-word match of a
 * term in any file name or file of the repository outside `.git`, `node_modules` and the `allow` list. Matching ignores case and
 * accents. `findLeaks(root, config)` is exported for the spec.
 */
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));
const SKIPPED = new Set(['.git', 'node_modules']);

function fold(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function walk(root, directory = root) {
  const found = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED.has(entry.name)) continue;

    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walk(root, full));
    else if (entry.isFile()) found.push(path.relative(root, full).split(path.sep).join('/'));
  }

  return found;
}

export function findLeaks(root, { terms, allow = [] }) {
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${terms.map(term => fold(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}_])`, 'u');
  const leaks = [];

  for (const file of walk(root).filter(name => !allow.includes(name)).sort()) {
    const named = pattern.exec(fold(file));
    if (named) leaks.push(`${file}: ${named[0]} (file name)`);

    const lines = readFileSync(path.join(root, file), 'utf8').split('\n');

    lines.forEach((line, index) => {
      const match = pattern.exec(fold(line));
      if (match) leaks.push(`${file}:${index + 1}: ${match[0]}`);
    });
  }

  return leaks;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const config = JSON.parse(readFileSync(path.join(TOOLKIT, 'scripts', 'neutrality.json'), 'utf8'));
  const leaks = findLeaks(TOOLKIT, config);

  if (leaks.length > 0) {
    process.stderr.write(`neutrality: ${leaks.length} project names in the toolkit:\n${leaks.map(leak => `  ${leak}\n`).join('')}`);
    process.exitCode = 1;
  } else {
    process.stdout.write('neutrality: no project names in the toolkit\n');
  }
}
