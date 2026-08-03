// Report Engine — the ONE normalized Report shape every renderer reads. Raw verdicts (from the kernel
// or a live bridge) are adapted into this once; no renderer ever touches a raw verdict or formats on
// its own. Because the verdict is already standardized, a report is just a projection of it.
//
//   Report = { title, source, generated_at, results:[{hypothesis, engine, verdict, reason, confidence}], overall }
const GOOD = new Set(['VALID', 'CONSISTENT', 'SUPPORTED', 'READY', 'PRESERVED', 'HELD', 'SURVIVED']);
const BAD = new Set(['INVALID', 'MISMATCH', 'REFUTED', 'NOT_READY', 'REGRESSED', 'GUARD_FAILED']);

// One place that maps a gate action to a display label — shared by every renderer, so no renderer
// re-derives "⛔/⚠️/✅ BLOCK/WARN/ALLOW" on its own (the same reason classify() is centralized).
export const GATE = { block: '⛔ BLOCK', warn: '⚠️ WARN', allow: '✅ ALLOW' };

// One place that maps a verdict to severity / icon / SARIF level — shared by every renderer.
export function classify(verdict) {
  const V = String(verdict).toUpperCase();
  if (GOOD.has(V)) return { sev: 0, icon: '✅', level: 'note' };
  if (V === 'DEFER' || V.startsWith('DEFER')) return { sev: 2, icon: '⚠️', level: 'warning' };
  if (BAD.has(V)) return { sev: 4, icon: '❌', level: 'error' };
  return { sev: 3, icon: '❓', level: 'warning' };
}

export function overallVerdict(results) {
  if (!results.length) return 'DEFER';
  return results.reduce((w, r) => (classify(r.verdict).sev > classify(w).sev ? r.verdict : w), results[0].verdict);
}

export function makeReport({ title, source, results = [], generated_at } = {}) {
  const norm = results.map(r => ({
    hypothesis: r.hypothesis, engine: r.engine || '', verdict: String(r.verdict),
    reason: r.reason || '', confidence: r.confidence ?? null,
  }));
  return { title: title || 'AVF — Automation Validation', source: source || '', generated_at: generated_at || new Date().toISOString(), results: norm, overall: overallVerdict(norm) };
}
