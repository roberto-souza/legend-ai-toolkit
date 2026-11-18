/**
 * Keep every shipped SKILL.md small enough to load whole and to pass the documentation size guards that installing
 * projects run on their own copy. The ceiling is not a profile key: a project's guard is the project's rule, and this
 * test only keeps the toolkit below the smallest one known, with room for the next versions to grow.
 */
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TOOLKIT = fileURLToPath(new URL('..', import.meta.url));
const CEILING = 28000;
const ROOM = 1500;

test(`every skills/*/SKILL.md stays at least ${ROOM} bytes under ${CEILING}`, () => {
  const over = readdirSync(`${TOOLKIT}skills`)
    .map(skill => [skill, statSync(`${TOOLKIT}skills/${skill}/SKILL.md`).size])
    .filter(([, size]) => size > CEILING - ROOM)
    .map(([skill, size]) => `${skill}: ${size} bytes`);
  assert.deepEqual(over, [], 'move detail to the skill reference/ and point to it');
});
