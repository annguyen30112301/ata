// INTEGRATION test — Azure DevOps Live. Proves the live path WITHOUT a network or a PAT, by
// injecting a fake transport that returns exactly what the ADO REST API returns (the fixture's
// raw payload IS that shape). The whole point:
//
//     Fixture Path  ==  Live Path      (except the evidence source + fetch time)
//
// If this is green, The Proof Principle held against real-world-shaped evidence: fetchLive only
// acquires; every downstream proof is the same already-tested pipeline. A real run just sets
// AZDO_PAT and points at a real org/project — no code below changes.
//   node connectors/azure-devops/live.test.mjs
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLive, fetchLivePaged } from './fetch.mjs';
import { connector as ado } from './index.mjs';
import { canonicalize, transform } from '../sdk/collect.mjs';
import { deepEqual } from '../sdk/util.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
// A fake ADO transport: canned status + json + optional continuation-token header.
const resp = (status, json, token = null) => ({ status, ok: status >= 200 && status < 300, json: async () => json, headers: { get: n => (n === 'x-ms-continuationtoken' ? token : null) } });
const env = { AZDO_PAT: 'fake-pat-for-test' };

console.log('AZURE DEVOPS LIVE — integration (stubbed transport, no network)');

const fx = JSON.parse(await readFile(resolve(HERE, 'fixtures/work-items.json'), 'utf8'));
const wit = fx.raw_payloads.wit_api;                      // exactly what wit/workitems/{id} returns

// 1) Fixture Path == Live Path — the live raw flows through the SAME pipeline to the SAME result.
{
  const transport = () => resp(200, wit);
  const envelope = await fetchLive({ org: 'org', project: 'proj', id: 1234 }, { transport, env });
  ok('fetchLive yields a well-formed Fetched envelope', envelope.raw !== undefined && typeof envelope.source === 'string' && typeof envelope.fetched_at === 'string');
  ok('fetchLive does NOT touch the payload (raw === REST body)', deepEqual(envelope.raw, wit));

  const liveCanonical = canonicalize(ado, envelope.raw);
  const liveInput = transform(ado, envelope.raw);
  const fixtureCanonical = canonicalize(ado, wit);
  const fixtureInput = transform(ado, wit);
  ok('canonical: live == fixture', deepEqual(liveCanonical, fixtureCanonical) && deepEqual(liveCanonical, fx.cases[0].expect_canonical), JSON.stringify(liveCanonical));
  ok('input: live == fixture (== locked target)', deepEqual(liveInput, fixtureInput) && deepEqual(liveInput, fx.cases[0].expect_input), JSON.stringify(liveInput));
  ok('only source + fetched_at differ (provenance, not proof)', envelope.source.startsWith('azure-devops:') && envelope.source !== 'fixture:work-items.json#wit_api');
}

// 2) Retry — transient failures (429) are retried; the call still succeeds.
{
  let calls = 0;
  const flaky = () => { calls++; return calls < 3 ? resp(429, {}) : resp(200, wit); };
  const envelope = await fetchLive({ org: 'o', project: 'p', id: 1 }, { transport: flaky, env, backoffMs: 0 });
  ok('retry recovers after transient 429s', calls === 3 && deepEqual(envelope.raw, wit), `calls=${calls}`);
}

// 3) Auth — 401 throws immediately and is NOT retried.
{
  let calls = 0;
  const denied = () => { calls++; return resp(401, {}); };
  let msg = '';
  try { await fetchLive({ org: 'o', project: 'p', id: 1 }, { transport: denied, env, backoffMs: 0 }); }
  catch (e) { msg = e.message; }
  ok('401 throws auth error and does not retry', /auth failed/.test(msg) && calls === 1, `calls=${calls} msg=${msg}`);
}

// 4) Missing PAT — refuses to run.
{
  let msg = '';
  try { await fetchLive({ org: 'o', project: 'p', id: 1 }, { transport: () => resp(200, wit), env: {} }); }
  catch (e) { msg = e.message; }
  ok('no AZDO_PAT -> refuses (does not silently proceed)', /AZDO_PAT not set/.test(msg));
}

// 5) Pagination — follows the continuation token across pages and merges `value`.
{
  let page = 0;
  const paged = () => { page++; return page === 1 ? resp(200, { value: [{ id: 1 }] }, 'TOKEN') : resp(200, { value: [{ id: 2 }] }); };
  const envelope = await fetchLivePaged({ org: 'o', project: 'p', path: 'wit/reporting/workitemrevisions' }, { transport: paged, env, backoffMs: 0 });
  ok('pagination merges all pages', envelope.raw.value.length === 2 && page === 2, JSON.stringify(envelope.raw));
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
