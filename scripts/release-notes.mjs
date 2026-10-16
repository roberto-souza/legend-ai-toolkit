#!/usr/bin/env node
/**
 * Print the CHANGELOG section of one version, as the body of its GitHub release: `node scripts/release-notes.mjs 0.2.1`.
 *
 * The release notes are the changelog, never generated from commits: the changelog already says what changed and what a
 * project must do when it updates. Exits 1 when the version has no section, so a release cannot go out undocumented.
 * The release workflow runs it as a guard; `releaseNotes` is exported for the tests.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CHANGELOG = fileURLToPath(new URL('../CHANGELOG.md', import.meta.url));

/** The body of the `## <version> — <date>` section, without its heading, or null when there is none. */
export function releaseNotes(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex(line => line.startsWith(`## ${version} `) || line === `## ${version}`);
  if (start === -1) return null;

  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.startsWith('## '));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

  return body || null;
}

function main(argv) {
  const version = (argv[0] ?? '').replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    process.stderr.write('Usage: node scripts/release-notes.mjs <X.Y.Z>\n');
    return 1;
  }

  const notes = releaseNotes(readFileSync(CHANGELOG, 'utf8'), version);
  if (!notes) {
    process.stderr.write(`release-notes: CHANGELOG.md has no section for ${version}\n`);
    return 1;
  }

  process.stdout.write(`${notes}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
