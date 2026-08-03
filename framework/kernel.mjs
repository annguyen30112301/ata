// AVF kernel — the pure, hypothesis-AGNOSTIC evaluation core (no IO, no argv, no fs).
// run.mjs is only the CLI shell around this. Golden Kernel Tests exercise THIS file:
// give it any {bench, engine} and it must tier a verdict — never crash, never branch
// on a hypothesis id. If a future connector forces a change here, the kernel was not
// general enough — the same law Project Horizon applied to benchmarks vs engines.
export const ABSTAIN = 'DEFER';
export const FRAMEWORK_VERSION = '0.1.0';        // kernel identity, stamped into every report
export const SUPPORTED_SCHEMAS = new Set([1]);   // benchmark schema_versions this kernel can read

export function validate(b) {                    // benchmark schema check before running
  if (b?.schema_version === undefined) throw new Error('benchmark: missing schema_version (add `schema_version: 1` at root)');
  if (!SUPPORTED_SCHEMAS.has(b.schema_version)) throw new Error(`benchmark: schema_version ${b.schema_version} not readable by framework ${FRAMEWORK_VERSION} (supports ${[...SUPPORTED_SCHEMAS].join(', ')})`);
  if (!b?.hypothesis?.id || !b?.hypothesis?.verdict) throw new Error('benchmark: missing hypothesis {id, verdict}');
  const ROLES = new Set(['regression', 'refutation', 'guard']);
  for (const c of b.cases || []) {
    if (!c.id || !c.role || c.oracle === undefined || c.input === undefined) throw new Error(`benchmark case ${c.id || '?'}: needs {id, role, oracle, input}`);
    if (!ROLES.has(c.role)) throw new Error(`benchmark case ${c.id}: invalid role '${c.role}'`);
  }
}

// evaluate: the deterministic heart. Returns { benchmark, implementation, counts, cases }.
// (The non-deterministic run identity — run_id, timestamp — is added by the IO shell.)
export function evaluate({ bench, engine, engName, engVer }) {
  validate(bench);
  const rows = bench.cases.map(c => {
    let decision = 'ERROR', err = false;
    try { decision = String(engine.evaluate(c.input).decision); } catch { err = true; }   // an engine throwing is a REFUTED/INVALID engine, never a kernel crash
    const correct = !err && decision === String(c.oracle);
    const abstain = !err && decision === ABSTAIN && String(c.oracle) !== ABSTAIN;   // safe but not correct
    const wrong = err || (!correct && !abstain);
    let status;
    if (c.role === 'regression') status = correct ? 'preserved' : 'REGRESSED';
    else if (c.role === 'guard') status = correct ? 'held' : 'GUARD_FAILED';        // guard oracle is typically DEFER
    else status = correct ? 'survived' : abstain ? 'survived(defer)' : 'REFUTED';   // refutation
    const critWrong = c.criticality === 'critical' && wrong;
    return { id: c.id, role: c.role, oracle: String(c.oracle), decision: err ? 'ERROR' : decision, status, critWrong, breaks: c.breaks || '' };
  });

  const by = r => rows.filter(x => x.role === r);
  const failReg = by('regression').filter(r => r.status === 'REGRESSED');
  const failGuard = by('guard').filter(r => r.status === 'GUARD_FAILED');
  const refuted = by('refutation').filter(r => r.status === 'REFUTED');
  let implVerdict, reason = null;
  if (failReg.length) { implVerdict = 'INVALID'; reason = 'regression at ' + failReg.map(r => r.id).join(', '); }
  else if (failGuard.length) { implVerdict = 'INVALID'; reason = 'over-reach on guard at ' + failGuard.map(r => r.id).join(', '); }
  else if (refuted.length) { implVerdict = 'REFUTED'; reason = refuted.map(r => r.id + (r.breaks ? ` (${r.breaks})` : '')).join('; '); }
  else implVerdict = 'SUPPORTED';

  return {
    benchmark: { hypothesis: bench.hypothesis.id, name: bench.hypothesis.name, verdict: bench.hypothesis.verdict },
    implementation: { engine: `${engName}@${engVer}`, kind: engine.kind,
      capabilities: engine.capabilities || [], verdict: implVerdict, reason,
      critical_confident_wrong: rows.filter(r => r.critWrong).length },
    counts: { regression: by('regression').length, preserved: by('regression').filter(r => r.status === 'preserved').length,
      guard: by('guard').length, held: by('guard').filter(r => r.status === 'held').length,
      refutation: by('refutation').length, survived: by('refutation').filter(r => r.status.startsWith('survived')).length },
    cases: rows,
  };
}
