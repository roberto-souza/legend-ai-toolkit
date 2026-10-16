/**
 * Verify the neutrality guard finds a project name as a whole word, ignoring case and accents, and honors the allow list.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';

import { findLeaks } from '../scripts/neutrality-guard.mjs';

const CONFIG = { terms: ['acme', 'joao'], allow: ['allowed.md'] };

test('a whole-word project name is a leak, whatever the case or accent', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'legend-neutral-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, 'a.md'), 'line one\nbuilt for ACME\n');
  writeFileSync(path.join(root, 'b.md'), 'by João\n');
  writeFileSync(path.join(root, 'c.md'), 'acmeville and preacme are fine\n');
  writeFileSync(path.join(root, 'allowed.md'), 'acme\n');
  writeFileSync(path.join(root, 'acme-notes.md'), 'neutral\n');

  assert.deepEqual(findLeaks(root, CONFIG), ['a.md:2: acme', 'acme-notes.md: acme (file name)', 'b.md:1: joao']);
});
