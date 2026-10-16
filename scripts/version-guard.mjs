#!/usr/bin/env node
/**
 * Refuse a change to what projects receive without a new version: `node scripts/version-guard.mjs <base ref>`.
 *
 * `core/`, `skills/`, `agents/` and `templates/` reach the projects by the install, so a diff against the base that
 * touches any of them must raise `VERSION` above the base's; `tests/version.test.mjs` then demands the CHANGELOG section
 * of the new version. Without that, a change would ship under an old version, with no changelog entry and no release.
 * The validate workflow runs it on pull requests; `needsBump` and `isGreater` are exported for the tests.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHIPPED = ['core/', 'skills/', 'agents/', 'templates/'];

/** The changed files that reach the projects. */
export function needsBump(files) {
  return files.filter(file => SHIPPED.some(prefix => file.startsWith(prefix)));
}

/** Whether semver `next` is above `previous`. */
export function isGreater(next, previous) {
  const a = next.split('.').map(Number);
  const b = previous.split('.').map(Number);

  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }

  return false;
}

function git(args) {
  const result = spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${(result.stderr ?? '').trim()}`);
  return result.stdout;
}

function main(argv) {
  const base = argv[0];
  if (!base) {
    process.stderr.write('Usage: node scripts/version-guard.mjs <base ref>\n');
    return 1;
  }

  const shipped = needsBump(git(['diff', '--name-only', '--no-renames', `${base}...HEAD`]).split('\n').filter(Boolean));
  if (shipped.length === 0) {
    process.stdout.write('version-guard: nothing that projects receive changed\n');
    return 0;
  }

  const previous = git(['show', `${base}:VERSION`]).trim();
  const next = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();
  if (isGreater(next, previous)) {
    process.stdout.write(`version-guard: ${shipped.length} shipped files changed, version ${previous} -> ${next}\n`);
    return 0;
  }

  process.stderr.write(
    `version-guard: ${shipped.length} files that projects receive changed, but VERSION is ${next} (base ${previous}):\n` +
      shipped.map(file => `  ${file}\n`).join('') +
      'Raise VERSION (and package.json, the README badge and a CHANGELOG section) in this change.\n',
  );
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`version-guard: ${error.message}\n`);
    process.exitCode = 1;
  }
}
