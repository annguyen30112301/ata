// JSON connector — the SECOND connector, built to prove ONE responsibility: NORMALIZE.
// HTML proved parse; JSON proves that many raw FORMATS collapse to one canonical form
// WITHOUT changing meaning; Azure DevOps will later prove only fetch. Each first connector
// of its kind exists to establish a new SDK capability, not merely to add a data source.
//
// The engine must never see a source's private format. So:
//   raw (any format)  -> normalize() -> canonical  -> materialize() -> input
import { readFile } from 'node:fs/promises';
import { defineConnector } from '../sdk/contract.mjs';

// FORMAT knowledge lives here (and only here): aliased keys + value encodings.
const KEY_ALIASES = { 'system.state': 'state', 'state': 'state', 'system.priority': 'priority', 'priority': 'priority' };
const PRIORITY = { '1': 'high', 'high': 'high', '2': 'medium', 'medium': 'medium', '3': 'low', 'low': 'low' };

export const connector = defineConnector({
  id: 'json',
  version: 'v0',

  // ── fetch family (IO) ── raw for JSON is the PARSED object (the fetched artifact).
  fetchFromString(source) {
    return { raw: JSON.parse(source.json), source: 'inline', fetched_at: new Date().toISOString() };
  },
  async fetchFromFile(source) {
    return { raw: JSON.parse(await readFile(source.path, 'utf8')), source: `file:${source.path}`, fetched_at: new Date().toISOString() };
  },
  fetch(source) {
    if (source?.kind === 'string') return this.fetchFromString(source);
    if (source?.kind === 'file') return this.fetchFromFile(source);
    throw new Error(`json.fetch: unknown source.kind '${source?.kind}' (expected 'string' | 'file')`);
  },

  // ── NORMALIZE (PURE) ── FORMAT only: alias keys -> canonical keys, canonicalize values
  //    (casing, numeric priority codes). Meaning is NOT touched: 'High' | 'HIGH' | 1 all mean
  //    the same priority, so they collapse; a genuinely different priority stays different.
  normalize(raw) {
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      const key = KEY_ALIASES[k.toLowerCase()];
      if (!key) continue;                                    // drop format-specific keys the engine never needs
      if (key === 'state') out.state = String(v).toLowerCase();
      else if (key === 'priority') out.priority = PRIORITY[String(v).toLowerCase()] ?? String(v).toLowerCase();
    }
    return out;
  },

  // ── MATERIALIZE (PURE) ── MEANING/shape for the engine: project canonical -> input.
  materialize(canonical) {
    return { record: { state: canonical.state, priority: canonical.priority } };
  },
});
