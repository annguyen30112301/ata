// The Decision Render Test — the explorer is a PURE function of a RecommendationSnapshot. It proves the page
// builds from the snapshot ALONE (the architectural proof: model owns logic, snapshot owns data, renderer owns
// presentation), that auditability is visible (every recommendation shows its evidence as signal = value), and
// that silence is SHOWN, not hidden. Fixture-first: a hand-built RecommendationSnapshot with known content.
//   node decision/render.test.mjs
import { renderDecisionHtml } from './render.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

// Two recommendations exercising both subject shapes (a hypothesis, and project scope) and resolvable evidence.
const snap = {
  generated_at: '2026-08-04T10:00:00.000Z',
  source: { snapshot_generated_at: '2026-08-04T09:59:00.000Z' },
  recommendations: [
    { id: 'H4:review', priority: 'HIGH', kind: 'REVIEW', subject: { hypothesis: 'H4' }, evidence: [{ signal: 'trend.hypotheses.H4.verdict.direction', value: 'away_from_supported' }] },
    { id: 'project:hold', priority: 'HIGH', kind: 'HOLD', subject: { scope: 'project' }, evidence: [{ signal: 'rule.would_block', value: 8 }] },
  ],
};
const empty = { generated_at: '2026-08-04T11:00:00.000Z', source: { snapshot_generated_at: '2026-08-04T10:59:00.000Z' }, recommendations: [] };

try {
  console.log('DECISION RENDER — pure explorer over a RecommendationSnapshot');
  {
    ok('deterministic: same snapshot → identical HTML', renderDecisionHtml(snap) === renderDecisionHtml(snap));
    const html = renderDecisionHtml(snap);
    ok('self-contained document (doctype + closing html, no external resource)', html.startsWith('<!doctype html>') && html.includes('</html>') && !/(src=|href=")https?:/.test(html));
    ok('owns no clock — uses the snapshot\'s generated_at', html.includes('2026-08-04T10:00:00.000Z'));
    ok('opens with The Proof Principle (explorer is often opened standalone)', html.includes('The Proof Principle'));
    const copy = JSON.stringify(snap);
    renderDecisionHtml(snap);
    ok('pure: the snapshot is not mutated', JSON.stringify(snap) === copy);
  }

  console.log('\nDECISION RENDER — auditability is visible');
  {
    const html = renderDecisionHtml(snap);
    ok('renders each recommendation id, priority, kind, subject', html.includes('H4:review') && html.includes('REVIEW') && html.includes('HIGH') && html.includes('project:hold') && html.includes('HOLD'));
    ok('renders evidence as signal = value (walk a recommendation back to the number)', html.includes('because') && html.includes('trend.hypotheses.H4.verdict.direction') && html.includes('away_from_supported') && html.includes('rule.would_block') && html.includes('8'));
    ok('reflects the source snapshot stamp (provenance: which snapshot)', html.includes('2026-08-04T09:59:00.000Z'));
  }

  console.log('\nDECISION RENDER — silence is shown, not hidden');
  {
    const html = renderDecisionHtml(empty);
    ok('empty → "No actionable signal" message, never a hidden card', html.includes('No actionable signal') && !html.includes('class="rec"'));
    ok('empty → still a self-contained page, no crash', html.startsWith('<!doctype html>') && html.includes('</html>'));
  }
} finally { /* pure — nothing to clean up */ }

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
