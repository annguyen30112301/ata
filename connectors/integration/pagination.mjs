// Shared Integration Runtime — pagination. Follows a continuation token across pages and merges
// each page's `value` array. Reused by any list endpoint (ADO reporting, Jira search, …).
import { get } from './transport.mjs';

export async function getAllPages(baseUrl, headers, opts = {}) {
  let url = baseUrl, value = [], token;
  do {
    const { json, continuation } = await get(url, headers, opts);
    value = value.concat(json.value || []);
    token = continuation;
    if (token) url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}continuationToken=${encodeURIComponent(token)}`;
  } while (token);
  return { value };
}
