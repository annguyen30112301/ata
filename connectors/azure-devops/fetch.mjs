// ADO Fetch Adapter — EVIDENCE ACQUISITION ONLY. Its one job is source -> Fetched envelope
// { raw, source, fetched_at }: no parse, no shape, no normalize. The HOW of talking to the network
// (auth · transport · retry · pagination) is delegated to the Shared Integration Runtime, so this
// file holds only ADO's URLs and envelope shape. Going live changes the SOURCE of evidence, never
// the proof process.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireEnv, basicAuth, jsonHeaders, get, getAllPages } from '../integration/index.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));

// Step 1/3 — acquire from the LOCKED fixture. Deterministic timestamp so replay is exact.
export async function fetchFromFixture(ref) {
  const fx = JSON.parse(await readFile(resolve(HERE, 'fixtures/work-items.json'), 'utf8'));
  const raw = fx.raw_payloads[ref];
  if (!raw) throw new Error(`ado.fetch: no raw payload '${ref}' in fixture`);
  return { raw, source: `fixture:work-items.json#${ref}`, fetched_at: '2026-07-31T03:00:00.000Z' };
}

const adoHeaders = env => jsonHeaders(basicAuth(requireEnv(env, 'AZDO_PAT')));

// Step 3/3 — a single work item via REST. Returns the raw ADO payload UNTOUCHED (same shape the
// fixture locked), so the entire downstream pipeline is identical to the fixture path.
export async function fetchLive(source, opts = {}) {
  const { org, project, id } = source;
  if (!org || !project || !id) throw new Error('ado.fetchLive: source needs { org, project, id }');
  const headers = adoHeaders(opts.env || process.env);
  const url = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_apis/wit/workitems/${encodeURIComponent(id)}?api-version=7.0`;
  const { json } = await get(url, headers, opts);
  return { raw: json, source: `azure-devops:${org}/${project}/wit/${id}`, fetched_at: new Date().toISOString() };
}

// Step 3/3 (list) — a paged endpoint; the shared runtime follows the continuation token.
export async function fetchLivePaged(source, opts = {}) {
  const { org, project, path } = source;
  if (!org || !project || !path) throw new Error('ado.fetchLivePaged: source needs { org, project, path }');
  const headers = adoHeaders(opts.env || process.env);
  const base = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_apis/${path}?api-version=7.0`;
  const { value } = await getAllPages(base, headers, opts);
  return { raw: { value }, source: `azure-devops:${org}/${project}/${path}`, fetched_at: new Date().toISOString() };
}

export function fetch(source, opts) {
  if (source?.kind === 'fixture') return fetchFromFixture(source.ref);
  if (source?.kind === 'live') return fetchLive(source, opts);
  if (source?.kind === 'live-paged') return fetchLivePaged(source, opts);
  throw new Error(`ado.fetch: unknown source.kind '${source?.kind}' (expected 'fixture' | 'live' | 'live-paged')`);
}
