import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { releaseNotes } from '../scripts/release-notes.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/release-notes.mjs', import.meta.url));
const CHANGELOG = '# Changelog\n\nIntro.\n\n## 0.2.0 — 2026-10-16\n\n- new\n\n**Ao atualizar:** nada.\n\n## 0.1.0 — 2026-10-01\n\n- first\n';

test('returns only the section of the version, without its heading', () => {
  assert.equal(releaseNotes(CHANGELOG, '0.2.0'), '- new\n\n**Ao atualizar:** nada.');
  assert.equal(releaseNotes(CHANGELOG, '0.1.0'), '- first');
});

test('returns null for a missing version and does not match a prefix', () => {
  assert.equal(releaseNotes(CHANGELOG, '0.3.0'), null);
  assert.equal(releaseNotes('## 0.1.10 — x\n\n- other\n', '0.1.1'), null);
});

test('the CLI prints the section of the current VERSION and refuses an unknown one', () => {
  const version = readFileSync(fileURLToPath(new URL('../VERSION', import.meta.url)), 'utf8').trim();
  const current = spawnSync(process.execPath, [SCRIPT, `v${version}`], { encoding: 'utf8' });
  assert.equal(current.status, 0, current.stderr);
  assert.ok(current.stdout.includes('**Ao atualizar:**'));

  const missing = spawnSync(process.execPath, [SCRIPT, '99.0.0'], { encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /no section for 99\.0\.0/);
});
