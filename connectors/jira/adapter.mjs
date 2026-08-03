// Jira Shape Adapter — a raw Jira REST issue -> the neutral JSON Vocabulary { state, priority }.
// It knows ONLY Jira's vocabulary and structure: `fields.status.name`, `fields.priority.name`.
// It does NOT know that "High" means the same as ADO's numeric 1, or that "Closed" lowercases —
// that is MEANING, and it lives in the single json.normalize. Vocabulary belongs to adapters;
// meaning belongs to normalization. If this file ever needs to normalize a value, the boundary broke.
export function toJson(payload) {
  const f = payload.fields || {};
  const out = {};
  if (f.status?.name !== undefined) out.state = f.status.name;       // Jira vocabulary -> JSON vocabulary
  if (f.priority?.name !== undefined) out.priority = f.priority.name;
  return out;
}
