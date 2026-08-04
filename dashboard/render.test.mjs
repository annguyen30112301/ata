// Dashboard render contract — the renderer is a PURE function of a DashboardSnapshot: deterministic,
// non-mutating, and it owns no clock (the timestamp is injected). Proves the model↔render split holds.
//   node dashboard/render.test.mjs
import { renderDashboardHtml } from './render.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

const snapshot = {
  inventory: {
    hypotheses: [{ id: 'H4', dim: 'Lifecycle', status: 'SUPPORTED', live: 'ADO → verdict' }],
    engines: [{ family: 'transition', versions: ['v0', 'v0.1'] }],
    connectors: ['json', 'azure-devops'],
    realityTests: [{ name: 'ADO — H4', status: 'VALID (live)' }],
    knowledge: { packages: ['taggle-bug', 'taggle-task'], gated: 1, permissive: 1 },
    reviews: [{ subject: { hypothesis: 'H5' }, decision: 'confirm', verdict: 'DEFER', reason: 'process gap', reviewer: 'qa' }],
  },
  analytics: { overview: { reports: 0, reviews: 1, hypotheses: 1, engines: 1 } },  // composed but not yet presented
};

console.log('DASHBOARD RENDER — pure function of a snapshot');
{
  const a = renderDashboardHtml(snapshot, { generated_at: 'FIXED' });
  const b = renderDashboardHtml(snapshot, { generated_at: 'FIXED' });
  ok('deterministic: same snapshot + timestamp → identical HTML', a === b);
  ok('injected timestamp appears (renderer owns no clock)', a.includes('Generated FIXED ·'));
  ok('renders snapshot data (engines count, a knowledge package, a review)', a.includes('2 across 1 families') && a.includes('taggle-bug') && a.includes('process gap'));
  ok('self-contained document', a.startsWith('<!doctype html>') && a.trimEnd().endsWith('</html>'));

  const before = JSON.stringify(snapshot);
  renderDashboardHtml(snapshot, { generated_at: 'X' });
  ok('pure: snapshot is not mutated', JSON.stringify(snapshot) === before);

  ok('empty reviews → "no reviews yet", no crash', renderDashboardHtml({ ...snapshot, inventory: { ...snapshot.inventory, reviews: [] } }, {}).includes('no reviews yet'));
  ok('renderer reads inventory only — analytics may be absent', renderDashboardHtml({ inventory: snapshot.inventory }, { generated_at: 'X' }).includes('Generated X'));
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
