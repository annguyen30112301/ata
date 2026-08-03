// Examples smoke test — every example must run offline and exit 0. This is the Clone Test in CI form:
// a newcomer's first runnable artifacts cannot be allowed to rot.
//   node examples-tests/run.mjs
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runScript = (rel) => spawnSync(process.execPath, [resolve(ROOT, rel)], { cwd: ROOT, encoding: 'utf8' });

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

console.log('EXAMPLES — every example runs offline and exits 0');

const cases = [
  ['examples/minimal/example.mjs', /SUPPORTED/, /BLOCK[\s\S]*WARN/],   // benchmark judges engines; ruling splits by env
  ['examples/jira/demo.mjs', /sha256\(jira canonical\) === sha256\(ado canonical\) : true/, /jira\.materialize === ado\.materialize\s+: true/],
  ['examples/azure-devops/demo.mjs', /one canonical: true/, null],
];

for (const [rel, mustMatch, alsoMatch] of cases) {
  const r = runScript(rel);
  const okExit = r.status === 0;
  const okOut = (!mustMatch || mustMatch.test(r.stdout)) && (!alsoMatch || alsoMatch.test(r.stdout));
  ok(rel, okExit && okOut, `status=${r.status} ${r.stderr?.trim().slice(0, 120) || ''}`);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
