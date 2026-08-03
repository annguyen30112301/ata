// REPORT ENGINE + RULE ENGINE tests — one Verdict Object -> many views; rules decide the action.
//   node report-tests/report.test.mjs
import { makeReport, overallVerdict, classify } from '../report/model.mjs';
import { fromKernelVerdict, fromChains } from '../report/adapters.mjs';
import { toMarkdown } from '../report/markdown.mjs';
import { toPrComment } from '../report/pr-comment.mjs';
import { toJson } from '../report/json.mjs';
import { toSarif } from '../report/sarif.mjs';
import { toTeamsCard } from '../report/teams.mjs';
import { evaluateRules, exitCodeFor, ACTION, SEVERITY } from '../rules/engine.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

console.log('REPORT ENGINE — one Report, many views');
const report = makeReport({ source: 'PR 8182', results: [
  { hypothesis: 'H4', engine: 'transition@v0.1', verdict: 'VALID' },
  { hypothesis: 'H5', engine: 'referential@v0.3', verdict: 'DEFER', reason: 'no published test run' },
] });
ok('overall = worst verdict (DEFER over VALID)', report.overall === 'DEFER', report.overall);
ok('classify maps verdicts to icon/level', classify('INVALID').level === 'error' && classify('VALID').level === 'note' && classify('DEFER').level === 'warning');

const md = toMarkdown(report);
ok('markdown has an Overall line + a row per result', /Overall: .*DEFER/.test(md) && md.includes('H4') && md.includes('H5'));
const pr = toPrComment(report, { action: 'warn' });
ok('pr-comment shows overall + the gate action', pr.includes('Overall') && /WARN/.test(pr));
ok('json round-trips the report', JSON.parse(toJson(report)).overall === 'DEFER');
const sarif = toSarif(report);
ok('sarif is 2.1.0 with a result per check + levels', sarif.version === '2.1.0' && sarif.runs[0].results.length === 2 && sarif.runs[0].results[1].level === 'warning');
const teams = toTeamsCard(report);
ok('teams card has facts per check', teams['@type'] === 'MessageCard' && teams.sections[0].facts.length === 2);

console.log('\nREPORT ENGINE — adapters over existing verdict shapes');
{
  const kernel = { run: { run_id: 'abcdef12' }, benchmark: { hypothesis: 'H4' }, implementation: { engine: 'transition@v0.2', verdict: 'SUPPORTED' } };
  ok('fromKernelVerdict -> one-result report', fromKernelVerdict(kernel).results[0].verdict === 'SUPPORTED');
  const bridge = fromChains({ source: 'wit 9283', chains: [{ prId: '8182', buildId: 14426, verdict: 'DEFER', reason: 'no test run' }] });
  ok('fromChains -> one result per chain', bridge.results.length === 1 && bridge.results[0].hypothesis === 'H5');
}

console.log('\nRULE ENGINE — action, not reasoning; context-dependent; severity precedence');
{
  const rules = [
    { name: 'block bad', when: { verdict_in: ['INVALID', 'MISMATCH', 'REFUTED', 'NOT_READY'] }, then: 'block' },
    { name: 'block DEFER on prod', when: { verdict: 'DEFER', env: 'production' }, then: 'block' },
    { name: 'warn DEFER', when: { verdict: 'DEFER' }, then: 'warn' },
  ];
  ok('H5 DEFER on sandbox -> WARN', evaluateRules(report, rules, { env: 'sandbox' }).action === ACTION.WARN);
  ok('H5 DEFER on production -> BLOCK', evaluateRules(report, rules, { env: 'production' }).action === ACTION.BLOCK);
  const bad = makeReport({ results: [{ hypothesis: 'H4', verdict: 'INVALID' }, { hypothesis: 'H5', verdict: 'DEFER' }] });
  ok('any INVALID -> BLOCK (most severe wins)', evaluateRules(bad, rules, { env: 'sandbox' }).action === ACTION.BLOCK);
  const good = makeReport({ results: [{ hypothesis: 'H4', verdict: 'VALID' }] });
  ok('all good -> ALLOW (default)', evaluateRules(good, rules, {}).action === ACTION.ALLOW);
  ok('exitCodeFor: block=1, others=0 (CI gate)', exitCodeFor('block') === 1 && exitCodeFor('warn') === 0 && exitCodeFor('allow') === 0);
  ok('rules never change the verdict (only the action)', report.results[1].verdict === 'DEFER');
}

console.log('\nRULING — the Rule Engine output contract { action, severity, reason, matched }');
{
  const rules = [
    { name: 'block DEFER on prod', when: { verdict: 'DEFER', env: 'production' }, then: 'block' },
    { name: 'warn DEFER', when: { verdict: 'DEFER' }, then: 'warn' },
  ];
  const ruling = evaluateRules(report, rules, { env: 'production' });
  ok('ruling carries action+severity+reason+matched', ruling.action === 'block' && ruling.severity === SEVERITY.block && typeof ruling.reason === 'string' && Array.isArray(ruling.matched));
  ok('ruling.reason names the decisive rule', ruling.reason.includes('block DEFER on prod'));
  ok('exitCodeFor accepts a Ruling, not just a string', exitCodeFor(ruling) === 1);
  const allow = evaluateRules(makeReport({ results: [{ hypothesis: 'H4', verdict: 'VALID' }] }), rules, {});
  ok('no match -> allow ruling with severity none + reason', allow.action === 'allow' && allow.severity === 'none' && /no rule matched/.test(allow.reason));

  console.log('\nRENDERERS — every view accepts (report, ruling) uniformly');
  ok('markdown shows the gate + reason', toMarkdown(report, ruling).includes('BLOCK') && toMarkdown(report, ruling).includes('block DEFER on prod'));
  ok('pr-comment shows the gate', toPrComment(report, ruling).includes('BLOCK'));
  ok('json rides the ruling alongside the report', JSON.parse(toJson(report, ruling)).ruling.action === 'block' && JSON.parse(toJson(report, ruling)).overall === 'DEFER');
  ok('teams leads facts with the gate', toTeamsCard(report, ruling).sections[0].facts[0].name === 'Gate');
  ok('sarif carries gate/severity at run level', toSarif(report, ruling).runs[0].properties.gate === 'block');
  ok('renderers unchanged when no ruling passed', !toMarkdown(report).includes('Gate:') && toTeamsCard(report).sections[0].facts.length === 2);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
