// AUTO-SELECT — the bridge picks the Knowledge Package from the work item's own type, and DEFERs
// (missing-policy) when no confirmed package exists for that type. No manual AVF_KNOWLEDGE.
//   node evolution-tests/bridge-autoselect.test.mjs
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { workItemType, packageIdFor, judge } from './bridge.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

const wit = JSON.parse(await readFile(resolve(HERE, '../connectors/azure-devops/fixtures/work-items.json'), 'utf8')).raw_payloads.wit_api;

console.log('AUTO-SELECT — package chosen from the work item, no manual AVF_KNOWLEDGE');
ok('work item declares its own type', workItemType(wit) === 'Bug', String(workItemType(wit)));
ok('package id derives from org + type', packageIdFor('taggle', workItemType(wit)) === 'taggle-bug');

const t = { from: 'committed', to: 'ready for testing' };
const miss = await judge('taggle-nonexistent-type', t);
ok('no confirmed policy for the type -> DEFER (missing-policy, not crash)', miss.verdict === 'DEFER' && /missing-policy/.test(miss.reason), JSON.stringify(miss));

const hit = await judge('permissive-demo', t);
ok('confirmed permissive package -> real verdict (committed->ready for testing = VALID)', hit.verdict === 'VALID', JSON.stringify(hit));

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
