// Provenance Contract — a connector's product is not a bare input, it is a
// MaterializedInput = { input, provenance }. The benchmark loader takes ONLY
// `materialized.input` to build a case; `materialized.provenance` is for the audit.
// The kernel never sees provenance. Audit always can.
//
//   provenance = { connector: 'html@v0', source: '...', fetched_at: '...', checksum: '...' }
//
// fetched_at and source are IO facts, so they come from fetch() and are carried as
// INPUTS to attachProvenance — never generated inside it. That is what makes replay
// exact: the same fetched envelope always reproduces the same MaterializedInput, incl.
// the original fetch time and checksum.
import { createHash } from 'node:crypto';

export const checksum = raw => createHash('sha256').update(JSON.stringify(raw)).digest('hex');

// The connector pipeline:   raw -> normalize() -> canonical raw -> materialize() -> input
//   normalize() solves FORMAT (casing, aliased keys, numeric codes) — optional per connector.
//   materialize() solves MEANING/shape for the engine.
// A connector without normalize() is just the identity at that stage (HTML today).
export const canonicalize = (connector, raw) =>
  typeof connector.normalize === 'function' ? connector.normalize(raw) : raw;
export const transform = (connector, raw) => connector.materialize(canonicalize(connector, raw));

// PURE: given a fetched envelope { raw, source, fetched_at }, produce MaterializedInput.
// checksum is over the ORIGINAL raw — the exact artifact fetched, before normalization —
// so the audit records what really arrived, whatever its format.
export function attachProvenance(connector, fetched) {
  return {
    input: transform(connector, fetched.raw),
    provenance: {
      connector: `${connector.id}@${connector.version}`,
      source: fetched.source,
      fetched_at: fetched.fetched_at,
      checksum: checksum(fetched.raw),
    },
  };
}

// IO: fetch from the outside world, then materialize + stamp provenance.
export async function collect(connector, source) {
  const fetched = await connector.fetch(source);   // { raw, source, fetched_at }
  return attachProvenance(connector, fetched);      // MaterializedInput
}
