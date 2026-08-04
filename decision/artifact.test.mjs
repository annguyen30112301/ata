// The Decision Artifact Test — the model is proven by decision.test.mjs; this proves only the ONE new thing
// build.mjs adds: the file it writes IS the RecommendationSnapshot, serialized and re-readable, and it is a
// projection of the AnalyticsSnapshot on disk (never of raw evidence). It runs against a throwaway repo of
// fixtures (no dependency on the real reports/), then cleans up.
//   node decision/artifact.test.mjs
import { buildDecision } from './build.mjs';
import { buildSnapshot } from '../analytics/model.mjs';
import { recommendationSnapshot } from './model.mjs';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- a throwaway repo: one INVALID report + a policy that blocks it, so the snapshot's would_block > 0 and
//     Decision must emit exactly one HOLD. No run log → trend is silent → HOLD is the only recommendation. ---
const root = await mkdtemp(resolve(tmpdir(), 'avf-decision-'));
try {
  await mkdir(resolve(root, 'reports'), { recursive: true });
  await mkdir(resolve(root, 'rules'), { recursive: true });
  await writeFile(resolve(root, 'reports', 'h5_referential_v0.json'), JSON.stringify(
    { benchmark: { hypothesis: 'H5', verdict: 'SUPPORTED' }, implementation: { engine: 'referential@v0', verdict: 'INVALID', critical_confident_wrong: 1 }, counts: { regression: 2, preserved: 1, guard: 1, held: 0, refutation: 2, survived: 1 } }));
  await writeFile(resolve(root, 'rules', 'default.json'), JSON.stringify(
    { rules: [{ name: 'block bad', when: { verdict_in: ['INVALID'] }, then: 'block' }] }));

  console.log('DECISION ARTIFACT — the file IS the RecommendationSnapshot');
  const r = await buildDecision(root);
  const raw = await readFile(resolve(root, 'decision', 'decision.json'), 'utf8');
  const onDisk = JSON.parse(raw);

  ok('build reports where it wrote + a truthful count', r.jsonPath === resolve(root, 'decision', 'decision.json') && r.recommendations === 1);
  ok('artifact is valid, pretty-printed JSON ending in a newline', raw.endsWith(']\n') || raw.endsWith('}\n'), JSON.stringify(raw.slice(-4)));
  ok('keys are in canonical order [generated_at, source, recommendations]', eq(Object.keys(onDisk), ['generated_at', 'source', 'recommendations']));
  ok('generated_at is a real ISO timestamp (a clock, not a placeholder)', typeof onDisk.generated_at === 'string' && !Number.isNaN(Date.parse(onDisk.generated_at)));
  ok('source records the snapshot it read (provenance, not raw evidence)', typeof onDisk.source.snapshot_generated_at === 'string' && !Number.isNaN(Date.parse(onDisk.source.snapshot_generated_at)));

  // The one HOLD, in full — the artifact carries real, resolvable recommendations, not a placeholder.
  ok('artifact carries the would_block HOLD, with evidence', eq(onDisk.recommendations, [
    { id: 'project:hold', priority: 'HIGH', kind: 'HOLD', subject: { scope: 'project' }, evidence: [{ signal: 'rule.would_block', value: 1 }] },
  ]), JSON.stringify(onDisk.recommendations));

  // The whole point: the recommendations on disk equal what the model returns from the snapshot on disk —
  // the file is a projection of the AnalyticsSnapshot, deterministic and independent of the clock.
  const fresh = recommendationSnapshot(await buildSnapshot(root));
  ok('on-disk recommendations === recommendationSnapshot(buildSnapshot()) (a projection of the snapshot)',
    eq(onDisk.recommendations, fresh.recommendations), JSON.stringify(onDisk.recommendations));

  console.log('\nDECISION ARTIFACT — silence is honest, on disk too');
  // A repo with no policy and no run log has nothing to act on: the artifact is an EMPTY list, not absent.
  const quietRoot = await mkdtemp(resolve(tmpdir(), 'avf-decision-quiet-'));
  try {
    await mkdir(resolve(quietRoot, 'reports'), { recursive: true });   // a report, but no rules/ → no would_block, no trend
    await writeFile(resolve(quietRoot, 'reports', 'h5_referential_v0.json'), JSON.stringify(
      { benchmark: { hypothesis: 'H5', verdict: 'SUPPORTED' }, implementation: { engine: 'referential@v0', verdict: 'SUPPORTED', critical_confident_wrong: 0 }, counts: { regression: 0, preserved: 1, guard: 0, held: 0, refutation: 0, survived: 1 } }));
    const q = await buildDecision(quietRoot);
    const quiet = JSON.parse(await readFile(resolve(quietRoot, 'decision', 'decision.json'), 'utf8'));
    ok('nothing to act on → recommendations: [] (present and empty, never absent)', q.recommendations === 0 && eq(quiet.recommendations, []));
  } finally { await rm(quietRoot, { recursive: true, force: true }); }
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
