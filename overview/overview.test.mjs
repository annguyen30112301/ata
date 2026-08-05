// The Overview Test — the first acceptance proof of the Presentation rows of the Capability Registry
// (docs/adr/0003). It proves the two rows the registry adds:
//   Renderer  — a card is a pure projection of exactly one DTO (same DTO → same view).
//   Dashboard — the shell OWNS NO DATA: it imports nothing and composes opaque rendered strings, never a DTO.
//   node overview/overview.test.mjs
import { composeDashboard } from './compose.mjs';
import { renderAnalyticsCard } from '../analytics/render.mjs';
import { renderDecisionCard } from '../decision/render.mjs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const HERE = dirname(fileURLToPath(import.meta.url));

// Hand-built DTOs — a card is tested against a snapshot with known content, decoupled from any real build.
const analyticsSnap = { generated_at: 'a', overview: { reports: 7, reviews: 3, hypotheses: 2, engines: 2 }, review: { override_rate: 0.5 }, rule: { would_block: 8, evaluated: 16 }, trend: { hypotheses: { H5: { verdict: { direction: 'unchanged' } } } } };
const decisionSnap = { generated_at: 'd', source: { snapshot_generated_at: 'a' }, recommendations: [
  { id: 'project:hold', priority: 'HIGH', kind: 'HOLD', subject: { scope: 'project' }, evidence: [{ signal: 'rule.would_block', value: 8 }] },
] };

try {
  console.log('PRESENTATION REGISTRY — Dashboard row: the shell OWNS NO DATA');
  {
    // The structural proof: a module with no import statement cannot read a DTO or touch disk. This is the
    // .mjs, proof-oriented substitute for a compiler forbidding the dependency.
    const src = await readFile(resolve(HERE, 'compose.mjs'), 'utf8');
    ok('shell imports NOTHING (no model/build/fs) — owns no data, structurally', !/^\s*import\s/m.test(src), 'found an import in compose.mjs');

    // Composes OPAQUE strings: a fabricated card body appears verbatim; the shell only frames + navigates.
    const page = composeDashboard({ generated_at: 't', cards: [{ id: 'x', title: 'X-Card', html: '<p>FAKE-BODY-42</p>' }] });
    ok('places the rendered card verbatim (never inspects it)', page.includes('<p>FAKE-BODY-42</p>'));
    ok('owns navigation: builds a nav anchor from the card label', page.includes('href="#x"') && page.includes('X-Card'));
    ok('owns the frame: wraps each card in a section with its id', page.includes('id="x"'));
    ok('escapes labels it owns (id/title), not the opaque card body', composeDashboard({ cards: [{ id: 'y', title: '<b>', html: '<b>raw</b>' }] }).includes('&lt;b&gt;') === true);
    ok('deterministic: same cards → identical page', composeDashboard({ generated_at: 't', cards: [{ id: 'x', title: 'X', html: 'h' }] }) === composeDashboard({ generated_at: 't', cards: [{ id: 'x', title: 'X', html: 'h' }] }));
    ok('self-contained document', page.startsWith('<!doctype html>') && page.includes('</html>'));
    ok('empty composition → still a valid page, no crash', composeDashboard({}).startsWith('<!doctype html>'));
  }

  console.log('\nPRESENTATION REGISTRY — Renderer row: a card is a pure projection of one DTO');
  {
    ok('renderAnalyticsCard: deterministic, same DTO → same view', renderAnalyticsCard(analyticsSnap) === renderAnalyticsCard(analyticsSnap));
    ok('renderAnalyticsCard: surfaces the headline numbers (reports, would-block, override)', (() => { const h = renderAnalyticsCard(analyticsSnap); return h.includes('7') && h.includes('8/16') && h.includes('50%'); })());
    ok('renderDecisionCard: deterministic, same DTO → same view', renderDecisionCard(decisionSnap) === renderDecisionCard(decisionSnap));
    ok('renderDecisionCard: shows priority spread + top concern', (() => { const h = renderDecisionCard(decisionSnap); return h.includes('project:hold') && h.includes('HOLD'); })());
    ok('renderDecisionCard: empty → "No actionable signal" (silence shown, not hidden)', renderDecisionCard({ recommendations: [] }).includes('No actionable signal'));
    // The cards are BODY fragments — the shell owns the frame, so a card carries no page shell of its own.
    ok('a card is a fragment, not a page (the shell owns <html>/<h2>)', !renderAnalyticsCard(analyticsSnap).includes('<!doctype') && !renderDecisionCard(decisionSnap).includes('<h2'));
  }
} finally { /* pure — nothing to clean up */ }

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
