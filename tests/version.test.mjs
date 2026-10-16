import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const VERSION = read('VERSION').trim();

test('package.json, the README badge and the changelog follow VERSION', () => {
  assert.equal(JSON.parse(read('package.json')).version, VERSION);
  assert.ok(read('README.md').includes(`vers%C3%A3o-${VERSION}-`), 'README badge');
  assert.ok(read('CHANGELOG.md').includes(`\n## ${VERSION} — `), 'CHANGELOG section');
});
