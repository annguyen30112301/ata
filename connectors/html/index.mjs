// HTML connector — the FIRST connector built on the SDK, and deliberately the purest:
// it only transforms data. If even HTML needed a kernel change, Azure DevOps would be worse.
//
// fetch family (IO)      : { before, after } HTML -> Fetched { raw, source, fetched_at }
// materialize(raw) (PURE): two element snapshots -> H0 observation input { a, b }
import { readFile } from 'node:fs/promises';
import { defineConnector } from '../sdk/contract.mjs';

const attr = (html, name) => (html.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i')) || [])[1] || '';
function parseEl(html) {
  const tag = ((html.match(/<\s*([a-z0-9]+)/i) || [])[1] || '').toLowerCase();
  const text = html.replace(/<[^>]*>/g, '').trim();
  return { role: attr(html, 'role') || tag, tag, cls: attr(html, 'class'),
    name: attr(html, 'aria-label') || attr(html, 'data-name') || text, text };
}

export const connector = defineConnector({
  id: 'html',
  version: 'v0',

  // ── fetch family ── each returns a Fetched envelope { raw, source, fetched_at }.
  fetchFromString(source) {                              // IO-free: HTML already in hand
    return { raw: { before: source.before || '', after: source.after || '' },
      source: 'inline', fetched_at: new Date().toISOString() };
  },
  async fetchFromFile(source) {                          // IO: read the two snapshot files
    const [before, after] = await Promise.all([readFile(source.before, 'utf8'), readFile(source.after, 'utf8')]);
    return { raw: { before, after },
      source: `file:${source.before} | file:${source.after}`, fetched_at: new Date().toISOString() };
  },
  fetch(source) {                                        // dispatch only — no logic of its own
    if (source?.kind === 'string') return this.fetchFromString(source);
    if (source?.kind === 'file') return this.fetchFromFile(source);
    throw new Error(`html.fetch: unknown source.kind '${source?.kind}' (expected 'string' | 'file')`);
  },

  materialize(raw) {                                     // PURE: raw HTML -> H0 input { a, b }
    return { a: parseEl(raw.before || ''), b: parseEl(raw.after || '') };
  },
});
