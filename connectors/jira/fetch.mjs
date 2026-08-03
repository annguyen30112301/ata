// Jira Fetch Adapter — EVIDENCE ACQUISITION ONLY, reusing the Integration Kernel for auth /
// transport / retry / pagination. This file holds only Jira's URL + credential shape + envelope.
// If it had to copy retry/auth/pagination, that would signal the Integration Kernel is incomplete —
// not that Jira is special.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireEnv, basicAuthUser, jsonHeaders, get } from '../integration/index.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));

// Step 1/3 — acquire from the LOCKED fixture. Deterministic timestamp so replay is exact.
export async function fetchFromFixture(ref) {
  const fx = JSON.parse(await readFile(resolve(HERE, 'fixtures/issues.json'), 'utf8'));
  const raw = fx.raw_payloads[ref];
  if (!raw) throw new Error(`jira.fetch: no raw payload '${ref}' in fixture`);
  return { raw, source: `fixture:issues.json#${ref}`, fetched_at: '2026-07-31T03:00:00.000Z' };
}

// Step 3/3 — a single issue via Jira Cloud REST. Basic auth is email:apitoken (from the env only).
// Returns the raw Jira payload UNTOUCHED, so downstream is identical to the fixture path.
export async function fetchLive(source, opts = {}) {
  const env = opts.env || process.env;
  const { host, key } = source;
  if (!host || !key) throw new Error('jira.fetchLive: source needs { host, key }');
  const headers = jsonHeaders(basicAuthUser(requireEnv(env, 'JIRA_EMAIL'), requireEnv(env, 'JIRA_TOKEN')));
  const url = `https://${host}/rest/api/3/issue/${encodeURIComponent(key)}`;
  const { json } = await get(url, headers, opts);
  return { raw: json, source: `jira:${host}/issue/${key}`, fetched_at: new Date().toISOString() };
}

export function fetch(source, opts) {
  if (source?.kind === 'fixture') return fetchFromFixture(source.ref);
  if (source?.kind === 'live') return fetchLive(source, opts);
  throw new Error(`jira.fetch: unknown source.kind '${source?.kind}' (expected 'fixture' | 'live')`);
}
