// CLI smoke test — the `avf` command IS the public surface now, so it needs a benchmark of its own.
// This is the Clone Test in executable form: does a newcomer's first commands actually behave?
//   node cli-tests/run.mjs
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AVF = resolve(ROOT, 'bin', 'avf.mjs');
const avf = (...args) => spawnSync(process.execPath, [AVF, ...args], { cwd: ROOT, encoding: 'utf8' });

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

console.log('AVF CLI — public surface smoke test');

// Generate the report the `report` cases below read — so this suite is self-sufficient on a fresh clone
// (reports/ is a generated artifact and is .gitignore'd; it must never be a precondition to the tests).
avf('run', 'h5', 'referential@v0.3');

{
  const r = avf('simulate', '--verdict', 'DEFER', '--env', 'production');
  ok('simulate DEFER@production -> BLOCK, exit 1 (CI gate fires)', r.status === 1 && /BLOCK/.test(r.stdout), `status=${r.status}`);
}
{
  const r = avf('simulate', '--verdict', 'DEFER', '--env', 'sandbox');
  ok('simulate DEFER@sandbox -> WARN, exit 0 (same verdict, different action)', r.status === 0 && /WARN/.test(r.stdout), `status=${r.status}`);
}
{
  const r = avf('simulate', '--verdict', 'VALID', '--env', 'production');
  ok('simulate VALID@production -> ALLOW, exit 0', r.status === 0 && /ALLOW/.test(r.stdout), `status=${r.status}`);
}
{
  const r = avf('report', 'reports/h5_referential_v0.3.json', '--format', 'md');
  ok('report --format md renders an Overall line', r.status === 0 && /Overall:/.test(r.stdout), `status=${r.status}`);
}
{
  const r = avf('report', 'reports/h5_referential_v0.3.json', '--format', 'json', '--gate');
  ok('report --gate rides a ruling in json output', r.status === 0 && JSON.parse(r.stdout).ruling !== undefined, `status=${r.status}`);
}
{
  const r = avf('review', '--dry-run', '--reviewer', 'ci', '--decision', 'confirm', '--hypothesis', 'H5', '--verdict', 'DEFER', '--reason', 'smoke');
  ok('review --dry-run validates without writing the store', r.status === 0 && /validated \(not stored\)/.test(r.stdout), `status=${r.status}`);
}
{
  const r = avf('help');
  ok('help exits 0 and lists the subcommands', r.status === 0 && /avf run/.test(r.stdout) && /avf simulate/.test(r.stdout));
}
{
  const r = avf('bogus');
  ok('unknown command exits 1', r.status === 1);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
