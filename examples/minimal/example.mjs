// examples/minimal — the whole AVF loop in one offline script, using ONLY the public API (../../index.mjs).
// No Azure DevOps, no CI, no network. Run it:  node examples/minimal/example.mjs
//
//   Evidence → Benchmark → Engine → Verdict → Ruling → render/gate
//
// It shows the two ideas that make AVF different from a test runner:
//   1. the same benchmark judges different engines (one REFUTED, one SUPPORTED) — the benchmark never moves;
//   2. the SAME verdict yields a DIFFERENT action depending on policy+context (Ruling), never a different verdict.
import { run, makeReport, evaluateRules, exitCodeFor, toMarkdown } from '../../index.mjs';

const line = (t) => console.log(`\n${'='.repeat(64)}\n${t}\n${'='.repeat(64)}`);

// 1) Run one engine against the H5 benchmark. The benchmark is immutable; the engine is the specimen.
line('1) BENCHMARK JUDGES ENGINES — same H5 benchmark, two engines');
const weak = await run('h5', 'referential@v0');       // trusts the test result, follows no reference
const strong = await run('h5', 'referential@v0.3');   // resolves the reference chain
console.log(`referential@v0    → ${weak.verdict.implementation.verdict}   (${weak.verdict.implementation.reason || 'weak engine'})`);
console.log(`referential@v0.3  → ${strong.verdict.implementation.verdict}`);
console.log('the benchmark did not change to accommodate either engine — that invariance IS the value.');

// 2) The interesting case is a DEFER — AVF's honest "not enough evidence to decide". This is the real
//    H5 live outcome (the pipeline built green but published no test run). Same verdict, and yet policy
//    makes it BLOCK a production release while only WARNing on a sandbox — that split is the Ruling's job.
line('2) RULING — same DEFER verdict, different action per context');
const report = makeReport({
  source: 'wit 9288 → PR 8182',
  results: [{ hypothesis: 'H5', engine: 'referential@v0.3', verdict: 'DEFER', reason: 'build is green but publishes no test run' }],
});

// A tiny policy, inline (normally rules/default.json): DEFER blocks prod, warns elsewhere; bad verdicts block.
const policy = [
  { name: 'block bad verdicts', when: { verdict_in: ['INVALID', 'MISMATCH', 'REFUTED', 'NOT_READY'] }, then: 'block' },
  { name: 'block DEFER on production', when: { verdict: 'DEFER', env: 'production' }, then: 'block' },
  { name: 'warn on DEFER elsewhere', when: { verdict: 'DEFER' }, then: 'warn' },
];

for (const env of ['production', 'sandbox']) {
  const ruling = evaluateRules(report, policy, { env });
  console.log(`env=${env.padEnd(11)} → gate ${ruling.action.toUpperCase().padEnd(5)} (exit ${exitCodeFor(ruling)}) — ${ruling.reason}`);
}

// 3) Render the report + ruling for a human. The renderer knows nothing about rules, policy, or CI.
line('3) RENDER — one report, a human view (Markdown)');
const ruling = evaluateRules(report, policy, { env: 'production' });
console.log(toMarkdown(report, ruling));

console.log('\nThat is the whole loop. Next: `node bin/avf.mjs simulate --verdict DEFER --env production`.');
