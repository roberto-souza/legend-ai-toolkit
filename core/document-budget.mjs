#!/usr/bin/env node
/**
 * Instructions budget guard: `node .claude/pipeline/core/document-budget.mjs`, meant for the project's gate.
 *
 * The project instructions file (`knowledge.projectInstructions`) is an index: a one-line rule and a pointer, with the
 * history and the detail elsewhere (`.claude/pipeline/core/format.md`). With `knowledge.instructionsBudget` (bytes) in
 * the profile, this fails naming the file, its size and the limit when the file is larger. Without the key, or
 * without a profile, it warns and passes, so a project that has not chosen a budget is not blocked. It loads the `yaml`
 * package only when a line that is not a comment names `instructionsBudget:` (block or flow style), so only a project
 * with a budget needs that package; the parsed `knowledge.instructionsBudget` then decides.
 */
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const PROFILE = '.claude/pipeline/profile.yml';
const BUDGET_KEY = /^(?![ \t]*#).*\binstructionsBudget\b["']?[ \t]*:/m;

/** Return the problem with the instructions file, or null when it fits. `sizeOf` maps a relative path to bytes. */
export function budgetProblem(knowledge, sizeOf) {
  const { projectInstructions: file, instructionsBudget: limit } = knowledge;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('knowledge.instructionsBudget must be a positive integer');
  }
  if (typeof file !== 'string' || !file) throw new Error('knowledge.projectInstructions is missing');

  const size = sizeOf(file);
  return size > limit ? `${file}: ${size} bytes, limit ${limit}` : null;
}

function sizeOf(file) {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) throw new Error(`${file} (knowledge.projectInstructions) does not exist`);
  return statSync(full).size;
}

async function main() {
  const file = path.join(ROOT, PROFILE);
  if (!existsSync(file)) {
    process.stderr.write(`document-budget: no ${PROFILE}, nothing checked\n`);
    return 0;
  }

  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const noBudget = () => {
    process.stderr.write('document-budget: no knowledge.instructionsBudget in the profile, nothing checked\n');
    return 0;
  };
  if (!BUDGET_KEY.test(text)) return noBudget();

  const { parse } = await import('yaml').catch(() => {
    throw new Error('the yaml package is not installed in this project; the pipeline gate needs it too');
  });
  const knowledge = parse(text)?.knowledge ?? {};
  if (knowledge.instructionsBudget === undefined) return noBudget();

  const problem = budgetProblem(knowledge, sizeOf);
  if (problem) {
    process.stderr.write(`${problem}\n`);
    return 1;
  }

  process.stdout.write('Document budget check passed.\n');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    process.exitCode = await main();
  } catch (error) {
    process.stderr.write(`document-budget: ${error.message}\n`);
    process.exitCode = 1;
  }
}
