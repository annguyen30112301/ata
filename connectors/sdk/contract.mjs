// AVF Connector Contract — the THIRD contract, parallel to Benchmark and Engine.
//
//   connector = {
//     id: 'html', version: 'v0',
//     fetchFromString(source) -> Fetched   // IO-free family member
//     fetchFromFile(source)   -> Fetched   // IO: reads a file
//     fetch(source)           -> Fetched   // dispatches to the fetchFrom* above by source.kind
//     normalize(raw)          -> canonical // PURE, OPTIONAL: FORMAT only (casing, aliased keys)
//     materialize(canonical)  -> input     // PURE: MEANING/shape -> the `input` a case carries
//   }
//
// The pure pipeline:   raw -> normalize() -> canonical -> materialize() -> input
//   normalize() solves FORMAT: 'High' | 'HIGH' | 1 all collapse to one canonical value;
//               a source's private keys ('System.State') become canonical ('state').
//   materialize() solves MEANING/shape for the engine.
//   Two different responsibilities. normalize() is optional (HTML has none — it parses
//   straight to input); when present it MUST obey the same laws materialize() does.
//
//   Fetched          = { raw, source, fetched_at }          // fetch() envelope (source + IO time)
//   MaterializedInput = { input, provenance }               // via sdk/collect.mjs (never hand-built)
//   provenance        = { connector, source, fetched_at, checksum }  // checksum is of the ORIGINAL raw
//
// The whole point of the connector layer:
//   - the fetch* family is the ONLY code that touches the outside world (a file, a REST call).
//   - materialize() is a deterministic transform; it never calls an API, never reads the clock.
//   - Benchmark and Engine NEVER call an API. The KERNEL never sees a connector or provenance.
//
//        Connector  →  Benchmark  →  Engine
//        (evidence)    (what/oracle)  (means)
//        loader takes materialized.input ─┘ ; provenance is for AUDIT, not the kernel.
//
// `input` is deliberately opaque to the kernel: it is whatever a given hypothesis's engine
// consumes (H0 wants { a, b }; H3 wants { candidates }). The connector and the benchmark
// package agree on that shape; the kernel does not.
//
// THE line of the whole layer — a connector produces INPUT (materialized evidence),
// NEVER the ORACLE. Oracles stay human-confirmed — a connector feeds the evidence, a human
// labels the truth. That is how an evidence source enters WITHOUT breaking "the benchmark
// is human-owned"; if a connector could mint oracles, all of Project Horizon collapses.
//
// Why split fetch into a family (fetchFromString / fetchFromFile / …): future sources have
// several entry modes — Azure DevOps will want fetchByWorkItem / fetchByQuery / fetchByUrl —
// and keeping fetch() a thin dispatcher over named members keeps every connector consistent.
//
// Three laws this layer must not break:
//   - Kernel must not change to accommodate a connector (Golden Kernel Tests hold this).
//   - Evolution must not break Audit (materialize pure + provenance + replay-exact).
//   - A connector produces input, never an oracle (separation of powers).
export function defineConnector(c) { return c; }   // identity helper (symmetry with engines/benchmarks)
