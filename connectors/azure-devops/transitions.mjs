// ADO Transition Adapter — extracts the observed state transition { from, to } from a raw ADO
// work-item UPDATES payload. It knows only ADO's updates VOCABULARY (fields.System.State.oldValue /
// newValue, the value[] history). The state VALUES are canonicalized by the one json.normalize
// (so "Ready for Testing" -> "ready for testing", matching the lifecycle vocabulary) — meaning stays
// in a single place. This produces the { from, to } half of H4's input; the lifecycle half is
// benchmark-owned. Vocabulary belongs to adapters; meaning belongs to normalization.
import { connector as json } from '../json/index.mjs';

const normState = v => (v == null ? undefined : json.normalize({ state: v }).state);

export function toTransition(updatesRaw) {
  let last = null;
  for (const u of updatesRaw.value || []) {
    const s = u.fields?.['System.State'];
    if (s && 'newValue' in s) last = s;                 // keep the most recent System.State change
  }
  if (!last) throw new Error('ado.toTransition: no System.State change found in updates');
  return { from: normState(last.oldValue), to: normState(last.newValue) };
}

// All DISTINCT state transitions seen in an item's history. This is EVIDENCE (it happened), NOT
// permission (it is always allowed). Feeds a Knowledge Package's `observed`, never its `allowed`.
export function observedTransitions(updatesRaw) {
  const seen = new Set(), out = [];
  for (const u of updatesRaw.value || []) {
    const s = u.fields?.['System.State'];
    if (!s || !('newValue' in s) || s.oldValue == null) continue;   // need a real from->to
    const from = normState(s.oldValue), to = normState(s.newValue), key = `${from}->${to}`;
    if (!seen.has(key)) { seen.add(key); out.push([from, to]); }
  }
  return out;
}
