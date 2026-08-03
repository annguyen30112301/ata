// Shared Integration Runtime — transport. One HTTP GET, classified: 401/403 -> hard auth error
// (never retried); 429/5xx/network -> TransientError (retried); other non-2xx -> hard error; 2xx ->
// { json, continuation }. `get` wraps a single call in the shared retry. Transport is injectable
// so any live connector is testable with no network.
import { withRetry, TransientError } from './retry.mjs';

export const defaultTransport = (url, opts) => globalThis.fetch(url, opts);

export async function getOnce(url, headers, transport = defaultTransport) {
  let res;
  try { res = await transport(url, { headers }); }
  catch (e) { throw new TransientError(`network: ${e.message}`); }
  if (res.status === 401 || res.status === 403) throw new Error(`auth failed (${res.status}) — check credentials/scope`);
  if (res.ok) return { json: await res.json(), continuation: res.headers?.get?.('x-ms-continuationtoken') || null };
  if (res.status === 429 || res.status >= 500) throw new TransientError(`transient ${res.status}`);
  throw new Error(`request failed (${res.status})`);
}

export function get(url, headers, { transport, retries, backoffMs } = {}) {
  return withRetry(() => getOnce(url, headers, transport), { retries, backoffMs });
}
