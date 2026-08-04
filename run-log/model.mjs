// Run Log — the entry model. A PURE projection from the `verdict` that run() already assembles to the
// canonical RunLogEntry (docs/run-log.contract.md §3). It reads ONLY its input verdict — never the log —
// which is what makes the writer treat the log as an append SINK, never an input (§2, invariant 3):
// identical verdict → identical entry, byte for byte, regardless of what the log already holds.
//
// Field selection is the CONTRACT's, not a renderer's: source facts only (§3). Projections (rule,
// would_block, action) and other sources (decision → reviews.json; per-case detail → reports/) are excluded
// by design — a projection would change when a policy changes without re-running run(), so it is not a fact
// of this run and must not be persisted here.

// Canonical key order (§3): identity · subject · verdicts · quality · volume · provenance.
// A new field APPENDS at the end (never inserts between) so a JSONL diff stays stable.
export const RUN_LOG_FIELDS = Object.freeze([
  'run_id', 'timestamp', 'hypothesis', 'engine',
  'benchmark_verdict', 'implementation_verdict', 'critical_confident_wrong', 'counts', 'framework_version',
]); // frozen: it is the canonical contract, not mutable state — a consumer/test can read it, never edit it

// verdict → RunLogEntry. Every field is lifted straight from what run() already computed (§3 mapping table);
// nothing new is derived here. `counts` is shallow-copied so the entry never aliases the verdict's object.
export function toEntry(verdict) {
  const { run, benchmark, implementation, counts } = verdict;
  return {
    run_id: run.run_id,
    timestamp: run.timestamp,
    hypothesis: benchmark.hypothesis,
    engine: implementation.engine,
    benchmark_verdict: benchmark.verdict,               // observed AT the time of the run — a historical fact
    implementation_verdict: implementation.verdict,
    critical_confident_wrong: implementation.critical_confident_wrong,
    counts: { ...counts },
    framework_version: run.framework_version,
  };
}
