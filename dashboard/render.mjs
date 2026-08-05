// Dashboard renderers — the CARDS, each a pure projection of exactly one model (docs/adr/0003, the Renderer
// row). renderInventoryCard owns the dashboard's own inventory model; renderAnalyticsSummaryCard and
// renderTrendCard own the AnalyticsSnapshot (state vs direction — two questions, two cards). Each returns a card
// BODY fragment; the shell (compose.mjs) owns the frame and holds no data. renderDashboardHtml is the thin
// composition that decomposes a DashboardSnapshot into cards and hands their STRINGS to the shell — the same
// HTML as before, byte for byte, but ownership now matches the registry (proven in render.test.mjs).
import { composeDashboard } from './compose.mjs';

const badge = s => `<span class="b ${/(SUPPORTED|VALID)/.test(s) ? 'ok' : /FRONTIER|DEFER|pending/.test(s) ? 'warn' : 'muted'}">${s}</span>`;
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
// Trend direction badge — coloured by VALENCE, not by arrow: good (toward_supported / ccw falling) = ok,
// bad (away_from_supported / ccw rising) = warn, neutral (unchanged / flat / insufficient) = muted.
const dirBadge = d => `<span class="b ${/toward_supported|falling/.test(d) ? 'ok' : /away_from_supported|rising/.test(d) ? 'warn' : 'muted'}">${esc(d)}</span>`;

// Analytics Summary — overview-level STATE (reports/reviews, verdict spread, override rate, would-block). Owns
// the AnalyticsSnapshot; absent analytics → '' so the dashboard degrades to inventory-only, exactly as before.
export function renderAnalyticsSummaryCard(a) {
  return a ? `
  <div class="card"><h2>Analytics Summary</h2>
    <div class="row"><span class="k">Reports · Reviews</span><span class="v mono">${a.overview.reports} · ${a.overview.reviews}</span></div>
    <div class="row"><span class="k">Implementation verdicts</span><span class="v mono">${Object.entries(a.benchmark.verdict_distribution).map(([k, n]) => `${k} ${n}`).join(' · ')}</span></div>
    <div class="row"><span class="k">Human override rate</span><span class="v">${(a.review.override_rate * 100).toFixed(0)}%</span></div>${a.rule ? `
    <div class="row"><span class="k">Would block @ ${esc(a.rule.context.env || '—')}</span><span class="v mono">${a.rule.would_block} / ${a.rule.evaluated}</span></div>` : ''}
  </div>` : '';
}

// Trend — DIRECTION (transitions), a peer of but distinct from Analytics Summary (latest state). Direction
// TOKENS only; endpoints stay in the snapshot for the explorer. Shown whenever analytics is present — even with
// no history ("no history yet" is a valid state; hiding it would read as "feature missing"). Owns the snapshot.
export function renderTrendCard(a) {
  const t = a && a.trend;
  const hasHistory = t && t.hypotheses;
  const nHyp = hasHistory ? Object.keys(t.hypotheses).length : 0;
  const flips = hasHistory ? Object.values(t.stability || {}).reduce((n, s) => n + s.flips, 0) : 0;
  // Stability as a STATE, not a bare number — a summary reader should see "ok / not ok" without inferring it.
  const flipBadge = flips === 0 ? `<span class="b ok">Stable (0 flips)</span>` : `<span class="b warn">${flips} flip${flips === 1 ? '' : 's'}</span>`;
  return a ? `
  <div class="card"><h2>Trend (Local Machine)</h2>${hasHistory ? `
    <div class="row"><span class="k" style="color:var(--mut);font-size:12px">${nHyp} tracked hypothes${nHyp === 1 ? 'is' : 'es'}</span><span class="v"></span></div>
    <div class="row"><span class="k" style="color:var(--mut);font-size:12px">Direction — verdict trajectory</span><span class="v"></span></div>
    ${Object.entries(t.hypotheses).map(([h, x]) => `<div class="row"><span class="k mono">${esc(h)}</span><span class="v">${dirBadge(x.verdict.direction)}</span></div>`).join('')}
    <div class="row"><span class="k" style="color:var(--mut);font-size:12px">Confidence — critical-confident-wrong</span><span class="v"></span></div>
    ${Object.entries(t.hypotheses).map(([h, x]) => `<div class="row"><span class="k mono">${esc(h)}</span><span class="v">${dirBadge(x.ccw.direction)}</span></div>`).join('')}
    <div class="row"><span class="k">Fixed-specimen stability</span><span class="v">${flipBadge}</span></div>`
    : `<div class="row"><span class="k" style="color:var(--mut)">No history yet. Run AVF to begin collecting local execution history.</span><span class="v"></span></div>`}
  </div>` : '';
}

// Inventory — the dashboard's OWN authored + scanned model (hypotheses, engines, connectors, reality tests,
// knowledge, oracle reviews). A dashboard MAY own a model; the registry forbids the SHELL from owning data, not
// a card. This renderer owns the inventory model and returns its six cards as one body fragment.
export function renderInventoryCard(s) {
  const engineCount = s.engines.reduce((n, e) => n + e.versions.length, 0);
  return `
  <div class="card"><h2>Hypotheses — the knowledge map</h2>
    ${s.hypotheses.map(h => `<div class="row"><span class="k"><b>${h.id}</b> · ${h.dim}${h.live ? ` <span class="mono" style="color:var(--mut)">· live: ${esc(h.live)}</span>` : ''}</span><span class="v">${badge(h.status)}</span></div>`).join('')}
  </div>
  <div class="card"><h2>Engines (${engineCount} across ${s.engines.length} families)</h2>
    ${s.engines.map(e => `<div class="row"><span class="k mono">${e.family}</span><span class="v mono">${e.versions.join(' · ')}</span></div>`).join('')}
  </div>
  <div class="card"><h2>Evidence Sources / Connectors</h2>
    ${s.connectors.map(c => `<div class="row"><span class="k mono">${c}</span><span class="v">${badge('ready')}</span></div>`).join('')}
  </div>
  <div class="card"><h2>Reality Tests (real data)</h2>
    ${s.realityTests.map(t => `<div class="row"><span class="k">${esc(t.name)}</span><span class="v">${badge(t.status)}</span></div>`).join('')}
  </div>
  <div class="card"><h2>Knowledge Packages — Taggle (${s.knowledge.packages.length})</h2>
    <div class="row"><span class="k">Gated (real policy)</span><span class="v">${badge(s.knowledge.gated + ' gated')}</span></div>
    <div class="row"><span class="k">Permissive (no bans)</span><span class="v"><span class="b muted">${s.knowledge.permissive}</span></span></div>
    <div class="row"><span class="k mono" style="color:var(--mut);font-size:12px">${s.knowledge.packages.slice(0, 6).join(', ')}${s.knowledge.packages.length > 6 ? ' …' : ''}</span><span class="v"></span></div>
  </div>
  <div class="card"><h2>Oracle Runtime — human reviews (${s.reviews.length})</h2>
    ${s.reviews.length ? s.reviews.map(r => `<div class="row"><span class="k">${esc(r.subject.hypothesis)} · ${esc(r.decision)} <span class="mono" style="color:var(--mut)">${esc(r.verdict)}</span><br><span style="color:var(--mut);font-size:12.5px">${esc(r.reason.slice(0, 120))}${r.reason.length > 120 ? '…' : ''}</span></span><span class="v mono" style="font-size:11px">${esc(r.reviewer)}</span></div>`).join('') : '<div class="row"><span class="k" style="color:var(--mut)">no reviews yet</span><span class="v"></span></div>'}
  </div>`;
}

// renderDashboardHtml — the composition: decompose a DashboardSnapshot into its cards and hand their STRINGS to
// the shell. Not the shell (that is composeDashboard, which owns no data); this is the orchestration-in-a-function
// that assembles them. Same signature and same output as before the convergence.
export function renderDashboardHtml(snapshot, { generated_at = '' } = {}) {
  const cards = [
    renderAnalyticsSummaryCard(snapshot.analytics),
    renderTrendCard(snapshot.analytics),
    renderInventoryCard(snapshot.inventory),
  ];
  return composeDashboard({ generated_at, cards });
}
