// Proof Contract — the shared vocabulary EVERY stage of EVERY connector emits. HTML, JSON,
// Azure DevOps, Jira — none of them speak their own dialect of "did it pass". They all emit
// one shape, so a dashboard renders Proof without knowing which connector produced it:
//
//   Proof = { kind: 'Evidence'|'Semantic'|'Projection'|'Replay',
//             artifact: string,                 // the invariant standard this was checked against
//             verdict: 'SUPPORTED'|'REFUTED'|'N/A',
//             reason:  string }
//
// This makes the connector layer self-describing, the same way the kernel's two-layer verdict
// object already makes the evaluation layer self-describing. One system, one language.
export const PROOF_KIND = { EVIDENCE: 'Evidence', SEMANTIC: 'Semantic', PROJECTION: 'Projection', REPLAY: 'Replay' };
export const VERDICT = { SUPPORTED: 'SUPPORTED', REFUTED: 'REFUTED', NA: 'N/A' };

// Which invariant standard each kind of proof stands behind (used as a default artifact label).
export const STANDARD = {
  Evidence: 'Evidence Fixture', Semantic: 'Equivalence Fixture',
  Projection: 'Expected Input', Replay: 'Replay Artifact',
};

// Construct a Proof; throws if it does not conform — the contract is enforced at the source,
// so nothing malformed can reach a consumer.
export function proof({ kind, artifact, verdict, reason }) {
  if (!Object.values(PROOF_KIND).includes(kind)) throw new Error(`proof: invalid kind '${kind}'`);
  if (!Object.values(VERDICT).includes(verdict)) throw new Error(`proof: invalid verdict '${verdict}'`);
  return { kind, artifact: artifact || STANDARD[kind], verdict, reason: reason || '' };
}

export const isProof = p =>
  !!p && Object.values(PROOF_KIND).includes(p.kind) && Object.values(VERDICT).includes(p.verdict) &&
  typeof p.artifact === 'string' && typeof p.reason === 'string';
