// Dashboard renderer — a PURE function of a DashboardSnapshot: the same snapshot (+ the same
// generated_at) yields the same HTML, byte for byte. No I/O, no repo knowledge, and no clock of its
// own — the timestamp is injected by the caller. Rendering concerns (badge, esc) live here, not in the model.
// It reads ONLY snapshot.inventory today; snapshot.analytics is composed but not yet presented.
const badge = s => `<span class="b ${/(SUPPORTED|VALID)/.test(s) ? 'ok' : /FRONTIER|DEFER|pending/.test(s) ? 'warn' : 'muted'}">${s}</span>`;
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function renderDashboardHtml(snapshot, { generated_at = '' } = {}) {
  const s = snapshot.inventory;
  const engineCount = s.engines.reduce((n, e) => n + e.versions.length, 0);

  // Analytics Summary — overview-level only (reports/reviews, verdict spread, override rate, would-block).
  // Rendered ONLY if analytics is present, so inventory and analytics degrade independently: if the
  // analytics branch is absent (disabled, failed to build), the dashboard still renders inventory intact.
  const a = snapshot.analytics;
  const analyticsCard = a ? `
  <div class="card"><h2>Analytics Summary</h2>
    <div class="row"><span class="k">Reports · Reviews</span><span class="v mono">${a.overview.reports} · ${a.overview.reviews}</span></div>
    <div class="row"><span class="k">Implementation verdicts</span><span class="v mono">${Object.entries(a.benchmark.verdict_distribution).map(([k, n]) => `${k} ${n}`).join(' · ')}</span></div>
    <div class="row"><span class="k">Human override rate</span><span class="v">${(a.review.override_rate * 100).toFixed(0)}%</span></div>${a.rule ? `
    <div class="row"><span class="k">Would block @ ${esc(a.rule.context.env || '—')}</span><span class="v mono">${a.rule.would_block} / ${a.rule.evaluated}</span></div>` : ''}
  </div>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AVF — Automation Validation Dashboard</title><style>
:root{--bg:#0f1115;--card:#171a21;--fg:#e6e8ec;--mut:#9aa3af;--line:#262b34;--ok:#2ec26b;--warn:#e0a530;--accent:#6ea8fe}
@media(prefers-color-scheme:light){:root{--bg:#f6f7f9;--card:#fff;--fg:#1b1f27;--mut:#5a6472;--line:#e5e8ee;--ok:#178a4c;--warn:#9a6b00;--accent:#2f6feb}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1040px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:22px;margin:0 0 2px}.sub{color:var(--mut);margin:0 0 20px}
.principle{border-left:3px solid var(--accent);padding:10px 14px;background:var(--card);border-radius:8px;margin:0 0 26px;color:var(--fg)}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
.card h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin:0 0 12px}
.row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line)}.row:first-of-type{border-top:0}
.k{color:var(--fg)}.v{color:var(--mut);text-align:right}
.b{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;white-space:nowrap}
.b.ok{background:color-mix(in srgb,var(--ok) 20%,transparent);color:var(--ok)}
.b.warn{background:color-mix(in srgb,var(--warn) 22%,transparent);color:var(--warn)}
.b.muted{background:var(--line);color:var(--mut)}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}
.loop{text-align:center;color:var(--mut);margin:6px 0 22px;font-size:13.5px}
.foot{color:var(--mut);font-size:12px;margin-top:26px;text-align:center}
</style></head><body><div class="wrap">
<h1>Automation Validation Dashboard</h1>
<p class="sub">Project Horizon · AVF — evidence → benchmark → engine → verdict → human review → knowledge</p>
<div class="principle"><b>The Proof Principle</b> — every evolvable transformation stands behind an invariant artifact and emits a verifiable proof.</div>
<p class="loop">Evidence&nbsp;→&nbsp;Benchmark&nbsp;→&nbsp;Engine&nbsp;→&nbsp;<b>Verdict</b>&nbsp;→&nbsp;Human&nbsp;Review&nbsp;→&nbsp;Learning</p>
<div class="grid">${analyticsCard}
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
  </div>
</div>
<p class="foot">Generated ${generated_at} · self-contained snapshot · regenerate with <span class="mono">node dashboard/build.mjs</span></p>
</div></body></html>`;
}
