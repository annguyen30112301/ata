// A connector is a PROOF PIPELINE, not just ETL. Across the pipeline it proves four different
// KINDS of evidence, each standing behind its own invariant standard — and every stage emits
// the SAME Proof shape (see proof.mjs), so the connector layer is self-describing:
//
//   fetch       -> Evidence Proof    (against an Evidence Fixture)     "got the right evidence"
//   normalize   -> Semantic Proof    (against an Equivalence Fixture)  "meaning unchanged"
//   materialize -> Projection Proof  (against an Expected Input)       "projects to benchmark input"
//   replay      -> Replay Proof      (against a Replay Artifact)       "reproducible over time"
//
// The kernel never sees any of this; the Connector SDK does.
import { checkStagePure, checkStageRefTransparent } from './validate.mjs';
import { canonicalize } from './collect.mjs';
import { deepEqual } from './util.mjs';
import { proof, PROOF_KIND, VERDICT } from './proof.mjs';

// Evidence Proof — fetch() acquired a well-formed Fetched envelope { raw, source, fetched_at }.
export async function evaluateFetch(connector, source) {
  try {
    const f = await connector.fetch(source);
    const wellFormed = f && f.raw !== undefined && typeof f.source === 'string' && typeof f.fetched_at === 'string';
    return proof({ kind: PROOF_KIND.EVIDENCE, artifact: f?.source || 'fetch',
      verdict: wellFormed ? VERDICT.SUPPORTED : VERDICT.REFUTED,
      reason: wellFormed ? `fetched from ${f.source}` : `envelope malformed — got ${JSON.stringify(f)}` });
  } catch (e) { return proof({ kind: PROOF_KIND.EVIDENCE, artifact: 'fetch', verdict: VERDICT.REFUTED, reason: e.message }); }
}

// Semantic Proof + Projection Proof — the pure pipeline, stage by stage.
// Returns { name, proofs:[Proof], pass }.
export function evaluateStages(connector, f) {
  const id = connector.id, proofs = [];
  let canonical = f.raw;

  if (typeof connector.normalize === 'function') {
    try {
      checkStagePure(connector.normalize, f.raw, id, 'normalize');
      checkStageRefTransparent(connector.normalize, f.raw, id, 'normalize');
      canonical = connector.normalize(f.raw);
      const bad = f.expect_canonical && !deepEqual(canonical, f.expect_canonical);
      proofs.push(proof({ kind: PROOF_KIND.SEMANTIC, artifact: f.name,
        verdict: bad ? VERDICT.REFUTED : VERDICT.SUPPORTED,
        reason: bad ? `canonical != expected — got ${JSON.stringify(canonical)}` : (f.expect_canonical ? 'canonical matches expected' : 'pure & deterministic') }));
    } catch (e) { proofs.push(proof({ kind: PROOF_KIND.SEMANTIC, artifact: f.name, verdict: VERDICT.REFUTED, reason: e.message })); }
  } else {
    proofs.push(proof({ kind: PROOF_KIND.SEMANTIC, artifact: f.name, verdict: VERDICT.NA, reason: 'no normalize stage (parse straight to input)' }));
  }

  try {
    checkStagePure(connector.materialize, canonical, id, 'materialize');
    checkStageRefTransparent(connector.materialize, canonical, id, 'materialize');
    const input = connector.materialize(canonical);
    const bad = f.expect && !deepEqual(input, f.expect);
    proofs.push(proof({ kind: PROOF_KIND.PROJECTION, artifact: f.name,
      verdict: bad ? VERDICT.REFUTED : VERDICT.SUPPORTED,
      reason: bad ? `input != expected — got ${JSON.stringify(input)}` : (f.expect ? 'input matches expected' : 'pure & deterministic') }));
  } catch (e) { proofs.push(proof({ kind: PROOF_KIND.PROJECTION, artifact: f.name, verdict: VERDICT.REFUTED, reason: e.message })); }

  return { name: f.name, proofs, pass: proofs.every(p => p.verdict !== VERDICT.REFUTED) };
}

// Semantic Proof (equivalence) — the FIXTURE declares which raws mean the same thing; the
// connector must collapse them to ONE canonical. Equivalence is declared, never inferred.
export function evaluateEquivalence(connector, { name, equivalent, canonical }) {
  const canons = equivalent.map(r => canonicalize(connector, r));
  if (!canons.every(c => deepEqual(c, canons[0])))
    return proof({ kind: PROOF_KIND.SEMANTIC, artifact: name, verdict: VERDICT.REFUTED, reason: `formats did NOT collapse — ${JSON.stringify(canons)}` });
  if (canonical && !deepEqual(canons[0], canonical))
    return proof({ kind: PROOF_KIND.SEMANTIC, artifact: name, verdict: VERDICT.REFUTED, reason: `collapsed canonical != declared — got ${JSON.stringify(canons[0])}` });
  return proof({ kind: PROOF_KIND.SEMANTIC, artifact: name, verdict: VERDICT.SUPPORTED, reason: `${equivalent.length} formats collapsed to one canonical` });
}

// The other half: declared-DIFFERENT meanings must stay distinct — normalize fixes format, not truth.
export function evaluateDistinct(connector, { name, members }) {
  const canons = members.map(r => canonicalize(connector, r));
  for (let i = 0; i < canons.length; i++)
    for (let j = i + 1; j < canons.length; j++)
      if (deepEqual(canons[i], canons[j]))
        return proof({ kind: PROOF_KIND.SEMANTIC, artifact: name, verdict: VERDICT.REFUTED, reason: `members ${i} and ${j} collapsed — normalize changed meaning` });
  return proof({ kind: PROOF_KIND.SEMANTIC, artifact: name, verdict: VERDICT.SUPPORTED, reason: 'distinct meanings stayed distinct' });
}
