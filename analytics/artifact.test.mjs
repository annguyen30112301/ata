// The Analytics Artifact Test — the model is proven by snapshot.test.mjs; this proves only the ONE new
// thing build.mjs adds: the file it writes is the AnalyticsSnapshot, serialized and re-readable. It runs
// against a throwaway repo of fixtures (no dependency on the real reports/), then cleans up.
//   node analytics/artifact.test.mjs
import { buildAnalytics } from './build.mjs';
import { buildSnapshot } from './model.mjs';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const stripStamp = ({ generated_at, ...rest }) => rest; // generated_at is a clock, not evidence — ignore it

// --- a throwaway repo: two kernel reports, two reviews, a gating policy ---
const root = await mkdtemp(resolve(tmpdir(), 'avf-analytics-'));
try {
  await mkdir(resolve(root, 'reports'), { recursive: true });
  await mkdir(resolve(root, 'oracle'), { recursive: true });
  await mkdir(resolve(root, 'rules'), { recursive: true });
  await mkdir(resolve(root, 'analytics'), { recursive: true });
  await writeFile(resolve(root, 'reports', 'h4_transition_v0_1.json'), JSON.stringify(
    { benchmark: { hypothesis: 'H4', verdict: 'SUPPORTED' }, implementation: { engine: 'transition@v0.1', verdict: 'SUPPORTED', critical_confident_wrong: 0 }, counts: { regression: 6, preserved: 6, guard: 1, held: 1, refutation: 2, survived: 2 } }));
  await writeFile(resolve(root, 'reports', 'h5_referential_v0.json'), JSON.stringify(
    { benchmark: { hypothesis: 'H5', verdict: 'SUPPORTED' }, implementation: { engine: 'referential@v0', verdict: 'INVALID', critical_confident_wrong: 1 }, counts: { regression: 2, preserved: 1, guard: 1, held: 0, refutation: 2, survived: 1 } }));
  await writeFile(resolve(root, 'oracle', 'reviews.json'), JSON.stringify(
    [{ subject: { hypothesis: 'H5' }, decision: 'override', verdict: 'INVALID' }]));
  await writeFile(resolve(root, 'rules', 'default.json'), JSON.stringify(
    { rules: [{ name: 'block bad', when: { verdict_in: ['INVALID'] }, then: 'block' }] }));

  console.log('ANALYTICS ARTIFACT — the file IS the snapshot');
  const r = await buildAnalytics(root);
  const raw = await readFile(resolve(root, 'analytics', 'analytics.json'), 'utf8');

  ok('build reports where it wrote + a truthful summary', r.jsonPath === resolve(root, 'analytics', 'analytics.json') && r.reports === 2 && r.reviews === 1);
  ok('artifact is valid, pretty-printed JSON ending in a newline', raw.endsWith('}\n') && raw.includes('\n  '));

  const onDisk = JSON.parse(raw);
  ok('artifact carries the four sections + derived rule + trend', !!onDisk.generated_at && !!onDisk.overview && !!onDisk.benchmark && !!onDisk.review && !!onDisk.rule && !!onDisk.trend);
  ok('generated_at is a real ISO timestamp (a clock, not a placeholder)', typeof onDisk.generated_at === 'string' && !Number.isNaN(Date.parse(onDisk.generated_at)));
  ok('keys are in canonical order (stable diffs)', JSON.stringify(Object.keys(onDisk)) === JSON.stringify(['generated_at', 'overview', 'benchmark', 'review', 'rule', 'trend']));
  ok('no run log in this fixture → trend reports "no history yet"', onDisk.trend.status === 'no history yet');

  // The whole point: what is on disk equals what buildSnapshot() returns (save for the clock).
  const fresh = await buildSnapshot(root);
  ok('on-disk artifact === buildSnapshot() (modulo generated_at)',
    JSON.stringify(stripStamp(onDisk)) === JSON.stringify(stripStamp(fresh)), JSON.stringify(stripStamp(onDisk)));
  ok('summary matches the snapshot it serialized', r.would_block === onDisk.rule.would_block && onDisk.rule.would_block === 1);

  console.log('\nBUILDSNAPSHOT — policy is injectable (no file read when supplied)');
  // The fixture root ships a rules/default.json that blocks the one INVALID report. Injection must win over it.
  const injected = await buildSnapshot(root, { rules: [] });    // empty policy, supplied directly
  ok('injected policy is used, not the on-disk default (empty policy → 0 blocked)', injected.rule?.would_block === 0, JSON.stringify(injected.rule));
  const fromDisk = await buildSnapshot(root);                   // omitted → falls back to rules/default.json
  ok('omitted policy → falls back to the on-disk default (1 blocked)', fromDisk.rule?.would_block === 1, JSON.stringify(fromDisk.rule));
  const optedOut = await buildSnapshot(root, { rules: null });  // explicit opt-out
  ok('rules:null → no rule metrics at all (reads no policy file)', optedOut.rule === undefined);
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
