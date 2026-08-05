// The Dashboard Convergence Test — the legacy dashboard predates ADR-0003; this proves it now obeys the same
// Capability Registry. Exactly five bars, no more: the SHELL owns no data (imports nothing, consumes rendered
// fragments), and each of the three cards is a renderer that owns exactly one model. The existing 19 content
// bars (render.test.mjs) already guarantee the OUTPUT; these five guarantee the OWNERSHIP.
//   node dashboard/convergence.test.mjs
import { composeDashboard } from './compose.mjs';
import { renderInventoryCard, renderAnalyticsSummaryCard, renderTrendCard } from './render.mjs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const HERE = dirname(fileURLToPath(import.meta.url));

const inventory = { hypotheses: [{ id: 'H0', dim: 'Representation', status: 'SUPPORTED', live: '' }], engines: [{ family: 'transition', versions: ['v0.1'] }], connectors: ['html'], realityTests: [{ name: 'live', status: 'VALID (live)' }], knowledge: { packages: ['taggle-bug'], gated: 1, permissive: 0 }, reviews: [] };
const analytics = { overview: { reports: 1, reviews: 0, hypotheses: 1, engines: 1 }, benchmark: { verdict_distribution: { SUPPORTED: 1 } }, review: { override_rate: 0 }, rule: { context: { env: 'production' }, would_block: 0, evaluated: 1 }, trend: { status: 'no history yet' } };

try {
  console.log('DASHBOARD CONVERGENCE — the legacy dashboard obeys the Capability Registry');

  // 1 — the shell owns no data, structurally: a module with no import cannot read a snapshot or touch disk.
  const shellSrc = await readFile(resolve(HERE, 'compose.mjs'), 'utf8');
  ok('1. shell (compose.mjs) imports NOTHING — owns no data', !/^\s*import\s/m.test(shellSrc), 'found an import in compose.mjs');

  // 2 — the shell consumes RENDERED fragments (strings), never a DTO: a fake card lands verbatim in the grid.
  const page = composeDashboard({ generated_at: 't', cards: ['<p>FAKE-CARD-Z</p>'] });
  ok('2. shell receives rendered card fragments and places them verbatim', page.includes('<div class="grid"><p>FAKE-CARD-Z</p>'));

  // 3, 4, 5 — each card is a renderer that owns exactly one model: pure over it, and a body fragment (the shell
  // owns the page). Analytics degrades to '' when absent — the card owns the snapshot, not the dashboard's shape.
  ok('3. inventory renderer owns the inventory model (pure; a fragment, not a page)',
    renderInventoryCard(inventory) === renderInventoryCard(inventory) && renderInventoryCard(inventory).includes('Hypotheses') && !renderInventoryCard(inventory).includes('<!doctype'));
  ok('4. analytics renderer owns the AnalyticsSnapshot (pure; absent → empty, degrades independently)',
    renderAnalyticsSummaryCard(analytics) === renderAnalyticsSummaryCard(analytics) && renderAnalyticsSummaryCard(analytics).includes('Analytics Summary') && renderAnalyticsSummaryCard(undefined) === '');
  ok('5. trend renderer owns the AnalyticsSnapshot (pure; "no history yet" is a shown state, not a hidden card)',
    renderTrendCard(analytics) === renderTrendCard(analytics) && renderTrendCard(analytics).includes('No history yet') && renderTrendCard(undefined) === '');
} finally { /* pure — nothing to clean up */ }

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
