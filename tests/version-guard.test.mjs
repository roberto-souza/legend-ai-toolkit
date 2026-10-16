import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isGreater, needsBump } from '../scripts/version-guard.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/version-guard.mjs', import.meta.url));

test('only core, skills, agents and templates need a new version', () => {
  assert.deepEqual(
    needsBump(['core/seals.md', 'skills/pipeline-doctor/SKILL.md', 'agents/a.md', 'templates/pipeline/rules.md', 'README.md', 'scripts/install.mjs', 'tests/x.test.mjs', 'corefile.md']),
    ['core/seals.md', 'skills/pipeline-doctor/SKILL.md', 'agents/a.md', 'templates/pipeline/rules.md'],
  );
});

test('compares semver numerically', () => {
  assert.equal(isGreater('0.2.1', '0.2.0'), true);
  assert.equal(isGreater('0.10.0', '0.9.9'), true);
  assert.equal(isGreater('1.0.0', '0.99.99'), true);
  assert.equal(isGreater('0.2.0', '0.2.0'), false);
  assert.equal(isGreater('0.1.9', '0.2.0'), false);
});

function repository(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'legend-version-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };

  mkdirSync(path.join(directory, 'scripts'));
  mkdirSync(path.join(directory, 'core'));
  cpSync(SCRIPT, path.join(directory, 'scripts/version-guard.mjs'));
  writeFileSync(path.join(directory, 'VERSION'), '0.2.0\n');
  writeFileSync(path.join(directory, 'core/seals.md'), 'v1\n');
  git('init', '-q', '-b', 'main');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'empty');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'base');
  git('switch', '-q', '-c', 'change');

  const commit = files => {
    for (const [file, content] of Object.entries(files)) writeFileSync(path.join(directory, file), content);
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'change');
  };
  const run = () => spawnSync(process.execPath, [path.join(directory, 'scripts/version-guard.mjs'), 'main'], { encoding: 'utf8' });

  return { commit, run };
}

test('the CLI refuses a core change without a new version and accepts it with one', t => {
  const { commit, run } = repository(t);

  commit({ 'README.md': 'docs\n' });
  assert.equal(run().status, 0);

  commit({ 'core/seals.md': 'v2\n' });
  const refused = run();
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /core\/seals\.md/);

  commit({ VERSION: '0.2.1\n' });
  const accepted = run();
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.match(accepted.stdout, /0\.2\.0 -> 0\.2\.1/);
});
