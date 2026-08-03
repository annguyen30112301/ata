// ORACLE RUNTIME tests — the closed loop evidence -> verdict -> human review -> learning, with the
// Oracle Contract enforced at runtime (human required, reason required, append-only, propose-not-apply).
//   node oracle-tests/oracle.test.mjs
import { rm, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { submitReview, validateReview, suggestLearning } from '../oracle/review.mjs';
import { all, history } from '../oracle/store.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TMP = resolve(HERE, '.tmp-reviews.json');
await rm(TMP, { force: true });
let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const throws = async fn => { try { await fn(); return false; } catch { return true; } };

console.log('ORACLE RUNTIME — Oracle Contract enforced at runtime');
ok('a review with no reviewer is rejected (only a human confirms)', await throws(() => validateReview({ reason: 'x', decision: 'confirm', verdict: 'VALID', subject: { hypothesis: 'H4' } })));
ok('a review with no reason is rejected (history + reason)', await throws(() => validateReview({ reviewer: 'a', decision: 'confirm', verdict: 'VALID', subject: { hypothesis: 'H4' } })));
ok('an override with no human_verdict is rejected', await throws(() => validateReview({ reviewer: 'a', reason: 'r', decision: 'override', verdict: 'INVALID', subject: { hypothesis: 'H4' } })));

console.log('\nORACLE RUNTIME — append-only store + history');
{
  const subj = { hypothesis: 'H4', engine: 'transition@v0.1', case_id: 'wit/9283' };
  await submitReview({ reviewer: 'qa', reason: 'looks right', decision: 'confirm', verdict: 'VALID', subject: subj }, { file: TMP });
  await submitReview({ reviewer: 'lead', reason: 'reopened later, still fine', decision: 'confirm', verdict: 'VALID', subject: subj }, { file: TMP });
  const log = await all(TMP);
  ok('reviews accumulate (append-only, nothing overwritten)', log.length === 2);
  ok('history() reconstructs the full trail for a subject', history(log, subj).length === 2);
  ok('every stored review has id + timestamp (audit)', log.every(r => r.id && r.timestamp));
}

console.log('\nORACLE RUNTIME — learning routing (propose, human ratifies)');
{
  const deferConfirm = { reviewer: 'qa', reason: 'pipeline publishes no test run', decision: 'confirm', verdict: 'DEFER', subject: { hypothesis: 'H5' } };
  ok('confirm + DEFER -> a knowledge-note (a confirmed domain fact / process gap)', suggestLearning(deferConfirm).kind === 'knowledge-note');
  const okConfirm = { reviewer: 'qa', reason: 'agree', decision: 'confirm', verdict: 'VALID', subject: { hypothesis: 'H4' } };
  ok('confirm + VALID -> reinforced', suggestLearning(okConfirm).kind === 'reinforced');
  const override = { reviewer: 'qa', reason: 'this edge IS allowed at Taggle', decision: 'override', verdict: 'INVALID', human_verdict: 'VALID', subject: { hypothesis: 'H4', case_id: 'committed->done' } };
  const s = suggestLearning(override);
  ok('override -> benchmark-correction proposal with from/to + reason', s.kind === 'benchmark-correction' && s.from === 'INVALID' && s.to === 'VALID' && !!s.reason);
}

console.log('\nORACLE RUNTIME — the seeded real review (9288 process gap)');
{
  const seeded = JSON.parse(await readFile(resolve(HERE, '../oracle/reviews.json'), 'utf8'));
  const r = seeded[0];
  ok('a real human review of the live 9288 DEFER exists', r.subject.hypothesis === 'H5' && r.decision === 'confirm' && r.verdict === 'DEFER');
  ok('it routes to a knowledge-note (Taggle pipeline gap)', suggestLearning(r).kind === 'knowledge-note' && /gap/i.test(suggestLearning(r).note));
}

await rm(TMP, { force: true });
console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
