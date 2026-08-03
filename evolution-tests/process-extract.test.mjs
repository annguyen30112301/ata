// KNOWLEDGE EXTRACTION — seed a Knowledge Package from ADO process config, then gate it behind
// human confirmation. Proves: extraction produces a faithful DRAFT (states + categories from real
// config), the draft is NOT usable until a human ratifies it, and a hand-confirmed package is.
//   node evolution-tests/process-extract.test.mjs
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toLifecycleDraft, fetchAll, parseWorkItemTypes } from '../connectors/azure-devops/process.mjs';
import { observedTransitions } from '../connectors/azure-devops/transitions.mjs';
import { assertUsable, loadKnowledge } from '../knowledge/loader.mjs';
import { deepEqual } from '../connectors/sdk/util.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

const raw = JSON.parse(await readFile(resolve(HERE, '../connectors/azure-devops/fixtures/process-states.json'), 'utf8'));

console.log('KNOWLEDGE EXTRACTION — ADO process config -> DRAFT (no PAT, stubbed by fixture)');
const draft = toLifecycleDraft(raw, { id: 'taggle', type: 'Bug', org: 'taggle', project: 'Taggle Health App - Research' });

ok('states extracted + normalized from config', deepEqual(draft.lifecycle.states, ['new', 'committed', 'ready for testing', 'done', 'removed']), JSON.stringify(draft.lifecycle.states));
ok('stateCategory captured from config', draft.categories['ready for testing'] === 'InProgress' && draft.categories['done'] === 'Completed');
ok('policy mode is permissive (ADO is any->any)', draft.policy.mode === 'permissive');
ok('forbidden is EMPTY — policy is human Oracle knowledge, NOT extracted', draft.lifecycle.forbidden.length === 0);
ok('provenance records extraction method', draft.provenance.method === 'ado-process-api');

// Observed transitions are EVIDENCE (from history), distinct from allowed (policy).
{
  const updates = JSON.parse(await readFile(resolve(HERE, '../connectors/azure-devops/fixtures/updates.json'), 'utf8'));
  const obs = observedTransitions(updates.payloads.into_ready_for_testing);
  ok('observedTransitions derives edges from history (evidence)', obs.some(([a, b]) => a === 'active' && b === 'ready for testing'), JSON.stringify(obs));
  ok('observed != policy (evidence is not permission)', draft.lifecycle.forbidden.length === 0 && obs.length > 0);
}

console.log('\nCONFIRMATION GATE — a machine proposes, a human ratifies');
{
  let threw = false; try { assertUsable(draft, 'taggle'); } catch { threw = true; }
  ok('extracted DRAFT is NOT usable (confirmed:false)', threw);
  const confirmed = { ...draft, confirmed: true, cases: [] };
  // still needs cases to be a real benchmark, but the confirmation gate itself must pass once ratified:
  ok('same package becomes usable once a human sets confirmed:true', (() => { try { assertUsable(confirmed, 'taggle'); return true; } catch { return false; } })());
}

console.log('\nALL-TYPES EXTRACTION — one pass, one draft per work-item type (stubbed transport)');
{
  const typesFx = JSON.parse(await readFile(resolve(HERE, '../connectors/azure-devops/fixtures/process-types.json'), 'utf8'));
  const statesFx = raw;   // reuse the states fixture for each type
  const resp = (status, json) => ({ status, ok: status >= 200 && status < 300, json: async () => json, headers: { get: () => null } });
  const transport = url => (/\/workitemtypes\?/.test(url) ? resp(200, typesFx) : /\/workitemtypes\/.+\/states/.test(url) ? resp(200, statesFx) : resp(404, {}));
  const opts = { transport, env: { AZDO_PAT: 'fake' }, backoffMs: 0 };

  ok('parseWorkItemTypes reads the type list', deepEqual(parseWorkItemTypes(typesFx), ['Bug', 'User Story', 'Task']));
  const drafts = await fetchAll({ org: 'taggle', project: 'Taggle Health App - Research' }, opts);
  ok('fetchAll returns one draft per type', drafts.length === 3, `got ${drafts.length}`);
  ok('draft ids are org-type slugs', deepEqual(drafts.map(d => d.id), ['taggle-bug', 'taggle-user-story', 'taggle-task']), JSON.stringify(drafts.map(d => d.id)));
  ok('every extracted draft is confirmed:false (needs a human)', drafts.every(d => d.confirmed === false));
  ok('each draft carries the extracted states', drafts.every(d => d.lifecycle.states.includes('ready for testing')));
}

console.log('\nEXISTING PACKAGE — generic stays usable');
{
  let okgen = true; try { await loadKnowledge('generic'); } catch { okgen = false; }
  ok('knowledge/generic loads (confirmed, unchanged behavior)', okgen);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
