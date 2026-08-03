// ADO Shape Adapter — a raw ADO REST payload -> plain JSON the JSON connector understands.
// It knows ADO's VOCABULARY and STRUCTURE only: the `fields` nesting, dotted `System.*` keys,
// `Microsoft.VSTS.*` keys, and the flatter analytics shape. It does NOT touch value meaning —
// casing and priority codes are canonicalized by the JSON connector's normalize(), so that
// meaning-preserving logic lives in exactly one place. This is shape, not normalize.
export function toJson(payload) {
  const flat = payload.fields ? payload.fields : payload;    // wit nests under `fields`; analytics is flat
  const state = flat['System.State'] ?? flat.State ?? flat.state;
  const priority = flat['Microsoft.VSTS.Common.Priority'] ?? flat['System.Priority'] ?? flat.Priority ?? flat.priority;
  const out = {};
  if (state !== undefined) out.state = state;                // -> the neutral JSON Vocabulary { state, priority };
  if (priority !== undefined) out.priority = priority;       //    values kept RAW, JSON normalize canonicalizes them
  return out;
}
