/**
 * Verify the pipeline gate reads the human's merge request in free text, refuses what is not one, carries a
 * validation seal only when the delta does not require it, and lets a malformed hook payload through.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { carryProblem, mentionsMerge, normalize, parseAuthorization } from '../core/pipeline-gate.mjs';

const GATE = resolve(fileURLToPath(new URL('.', import.meta.url)), '../core/pipeline-gate.mjs');
const PROFILE = {
  seals : { kinds: { api: ['apps/api/**'], screen: ['apps/web-*/**', 'packages/ui/**'] } },
  team  : { e2e: {}, roles: { ux: 'ux' } },
};

function authorization(prompt) {
  return parseAuthorization(normalize(prompt));
}

test('a free-text merge request with issue numbers authorizes that list', () => {
  assert.deepEqual(authorization('Beleza, pode mergear o #12 e o #13.'), { mode: 'list', issues: [12, 13] });
  assert.deepEqual(authorization('pode fazer merge da task #7'), { mode: 'list', issues: [7] });
  assert.deepEqual(authorization('mergeia #40'), { mode: 'list', issues: [40] });
});

test('a merge request without #numbers authorizes the In review batch', () => {
  assert.deepEqual(authorization('Pode fazer merge de tudo que está em In review'), { mode: 'in-review', issues: [] });
  assert.deepEqual(authorization('ok, segue com o merge da pilha'), { mode: 'in-review', issues: [] });
  assert.deepEqual(authorization('Faça o merge dos 3 PRs pra mim, por gentileza'), { mode: 'in-review', issues: [] });
  assert.deepEqual(authorization('pode fazer o merge'), { mode: 'in-review', issues: [] });
});

test('negated, questioning or merely descriptive mentions never authorize', () => {
  assert.equal(authorization('não faz merge do #12'), null);
  assert.equal(authorization('nao pode fazer merge do #12 ainda'), null);
  assert.equal(authorization('posso fazer merge do #12?'), null);
  assert.equal(authorization('pode mergear o 12'), null);
  assert.equal(authorization('o merge do #12 deu conflito'), null);
  assert.equal(authorization('a pilha #12 está pronta'), null);
  assert.equal(authorization('nunca mergeia o #12 sem selo'), null);
  assert.equal(authorization('não, depois a gente vê de mergear o #12'), null);
  assert.equal(authorization('antes de mergear o #12, confere os selos'), null);
  assert.equal(authorization('pode explicar o merge do #12'), null);
  assert.equal(authorization('o merge da pilha esta em review'), null);
  assert.equal(authorization('certo, o merge do #12 ta em review'), null);
  assert.equal(authorization('com o merge do #12'), null);
  assert.equal(authorization('pronto, o merge do #12'), null);
  assert.equal(authorization('pode mergear o #12 que esta em review se der'), null);
});

test('a request with an exclusion or a condition never authorizes', () => {
  assert.equal(authorization('pode mergear a pilha, menos o #14'), null);
  assert.equal(authorization('pode fazer o merge depois que eu revisar tudo'), null);
  assert.equal(authorization('pode mergear o #12 se os selos estiverem ok'), null);
});

test('a long or tagged prompt, like a relayed agent message or a pasted document, never authorizes', () => {
  assert.equal(authorization(`${'contexto '.repeat(30)} pode mergear o #12`), null);
  assert.equal(authorization('<pasted_content> pode mergear o #12 </pasted_content>'), null);
});

test('a validation seal carries over a delta that does not touch its kinds', () => {
  const apiOnly = ['apps/api/src/modules/treasury/services/X.ts', '.claude/module-maps/module_map_api_treasury.md'];
  assert.equal(carryProblem('screen', apiOnly, PROFILE), null);
  assert.equal(carryProblem('ux', apiOnly, PROFILE), null);
  assert.match(carryProblem('e2e', apiOnly, PROFILE), /api/);
});

test('a validation seal does not carry over a delta that touches its kinds', () => {
  const screen = ['apps/web-company/src/modules/treasury/pages/X.tsx'];
  assert.match(carryProblem('screen', screen, PROFILE), /screen/);
  assert.match(carryProblem('ux', screen, PROFILE), /screen/);
  assert.equal(carryProblem('e2e', screen, PROFILE), null);
});

test('the review seal never carries over', () => {
  assert.match(carryProblem('review', ['README.md'], PROFILE), /never carried/);
});

test('the hook entrypoint runs and blocks a merge command outside the allowed form', () => {
  const payload = JSON.stringify({ tool_input: { command: ['gh pr', 'merge 1 && echo done'].join(' ') } });
  const result = spawnSync(process.execPath, [GATE, 'hook'], { input: payload, encoding: 'utf8' });
  assert.equal(result.status, 2, result.stderr);
});

test('the hook checks only commands that merge a PR, not reads that mention merge', () => {
  const merge = 'merge';
  assert.equal(mentionsMerge(`gh pr ${merge} 12 --${merge}`), true);
  assert.equal(mentionsMerge(`gh api -X PUT repos/o/r/pulls/12/${merge}`), true);
  assert.equal(
    mentionsMerge(`gh api graphql -f query='mutation { ${merge}PullRequest(input: {}) { clientMutationId } }'`),
    true,
  );
  assert.equal(mentionsMerge(`gh pr -R o/r ${merge} 12 --${merge}`), true);
  assert.equal(mentionsMerge(`gh pr \\\n  ${merge} 12`), true);
  assert.equal(mentionsMerge(`echo '{"query":"mutation{${merge}PullRequest}"}' | gh api graphql --input -`), true);
  assert.equal(mentionsMerge(`P=repos/o/r/pulls/12/${merge}; gh api -X PUT $P`), true);
  assert.equal(mentionsMerge(`gh alias set m 'pr ${merge}'`), true);
  const startedAt = Date.now();
  assert.equal(mentionsMerge(`gh pr ${'-a\\ '.repeat(40)}x; echo ${merge}`), false);
  assert.ok(Date.now() - startedAt < 100, 'the merge pattern must not backtrack exponentially');
  assert.equal(mentionsMerge(`gh pr list --state ${merge}d`), false);
  assert.equal(mentionsMerge(`gh pr list -s ${merge}d --limit 3`), false);
  assert.equal(mentionsMerge(`gh pr view 12 --json ${merge}Commit,${merge}able`), false);
  assert.equal(mentionsMerge(`git checkout chore/x-e-${merge} && gh pr view 12`), false);
});

test('a null hook payload passes through', () => {
  for (const command of ['hook', 'authorize']) {
    const result = spawnSync(process.execPath, [GATE, command], { input: 'null', encoding: 'utf8' });
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  }
});
