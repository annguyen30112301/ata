// Adapters — turn AVF's existing verdict objects into the canonical Report. Nothing else knows the
// raw shapes: the kernel's two-layer verdict, or a live bridge's per-chain results.
import { makeReport } from './model.mjs';

// The kernel's report (reports/<h>_<engine>_<ver>.json) -> a one-result Report.
export function fromKernelVerdict(v, extra = {}) {
  return makeReport({
    source: v.run ? `run ${String(v.run.run_id).slice(0, 8)}` : extra.source,
    results: [{ hypothesis: v.benchmark?.hypothesis, engine: v.implementation?.engine, verdict: v.implementation?.verdict, reason: v.implementation?.reason }],
    ...extra,
  });
}

// A live bridge output (chains[] + overall, or a single chain) -> a Report (one result per chain).
export function fromChains({ source, chains = [], hypothesis = 'H5', engine = 'referential@v0.3' } = {}) {
  return makeReport({
    source,
    results: chains.map(c => ({ hypothesis, engine, verdict: c.verdict, reason: c.reason || `PR ${c.prId} → build ${c.buildId ?? '—'}` })),
  });
}
