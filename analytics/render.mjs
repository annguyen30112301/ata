// Evidence Analytics — the EXPLORER renderer. A PURE function of an AnalyticsSnapshot: it returns a
// self-contained HTML page and reads NOTHING else — no reports/, no reviews.json, no runs.jsonl, no clock of
// its own (the snapshot carries its own `generated_at`). That purity is the architectural proof this whole
// subsystem was built toward: if the page builds from the snapshot ALONE, then the model owns the logic, the
// snapshot owns the data, and the renderer owns only presentation. Same snapshot → same HTML, byte for byte.
//
// Where the dashboard Trend card shows DIRECTION only (a summary), this explorer shows the evidence behind it
// — from → to endpoints, per-series observations, the full per-hypothesis and stability tables. Two consumers
// of one snapshot, with clearly different jobs: dashboard = summary, analytics.html = explorer.
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const rows = obj => Object.entries(obj || {}).map(([k, v]) => `<tr><td class="mono">${esc(k)}</td><td class="v mono">${esc(v)}</td></tr>`).join('');
const table = (head, body) => `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;

function trendSection(trend) {
  if (!trend || !trend.hypotheses) return `<p class="muted">No history yet. Run AVF to begin collecting local execution history.</p>`;
  // Summary FIRST (the same read the dashboard gives), then the detail tables the dashboard omits. Explorer =
  // summary + evidence; dashboard = summary only. The distribution collapses per-hypothesis directions.
  const hyps = Object.values(trend.hypotheses);
  const dist = pick => {
    const m = {};
    for (const h of hyps) { const d = pick(h); m[d] = (m[d] || 0) + 1; }
    return Object.entries(m).map(([d, n]) => (n > 1 ? `${esc(d)} ×${n}` : esc(d))).join(' · ');
  };
  const flips = Object.values(trend.stability || {}).reduce((n, s) => n + s.flips, 0);
  const summary = `<h3>Trend summary</h3><table><tbody>` +
    `<tr><td>Tracked hypotheses</td><td class="v mono">${hyps.length}</td></tr>` +
    `<tr><td>Implementation direction</td><td class="v">${dist(h => h.verdict.direction)}</td></tr>` +
    `<tr><td>Confidence quality</td><td class="v">${dist(h => h.ccw.direction)}</td></tr>` +
    `<tr><td>Fixed-specimen stability</td><td class="v">${flips === 0 ? 'stable' : `${flips} flip${flips === 1 ? '' : 's'}`}</td></tr>` +
    `</tbody></table>`;
  const hyp = table(
    ['hypothesis', 'verdict from → to', 'direction', 'ccw from → to', 'direction', 'observations'],
    Object.entries(trend.hypotheses).map(([h, x]) => `<tr><td class="mono"><b>${esc(h)}</b></td>` +
      `<td class="mono">${esc(x.verdict.from)} → ${esc(x.verdict.to)}</td><td>${esc(x.verdict.direction)}</td>` +
      `<td class="mono">${esc(x.ccw.from)} → ${esc(x.ccw.to)}</td><td>${esc(x.ccw.direction)}</td>` +
      `<td class="v mono">${esc(x.metadata.observations)}</td></tr>`).join(''));
  const stab = Object.keys(trend.stability || {}).length
    ? table(['fixed specimen (hypothesis · engine@version)', 'flips', 'observations'],
        Object.entries(trend.stability).map(([k, s]) => `<tr><td class="mono">${esc(k)}</td><td class="v mono">${esc(s.flips)}</td><td class="v mono">${esc(s.metadata.observations)}</td></tr>`).join(''))
    : `<p class="muted">No fixed-specimen series with ≥ 2 runs yet.</p>`;
  return `${summary}<h3>Per-hypothesis trajectory</h3>${hyp}<h3>Fixed-specimen stability</h3>${stab}`;
}

export function renderAnalyticsHtml(snapshot) {
  const { generated_at = '', overview = {}, benchmark = {}, review = {}, rule, trend } = snapshot;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AVF — Evidence Analytics</title><style>
:root{--bg:#0f1115;--card:#171a21;--fg:#e6e8ec;--mut:#9aa3af;--line:#262b34;--accent:#6ea8fe}
@media(prefers-color-scheme:light){:root{--bg:#f6f7f9;--card:#fff;--fg:#1b1f27;--mut:#5a6472;--line:#e5e8ee;--accent:#2f6feb}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1040px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:22px;margin:0 0 2px}.sub{color:var(--mut);margin:0 0 16px}
.principle{border-left:3px solid var(--accent);padding:10px 14px;background:var(--card);border-radius:8px;margin:0 0 22px;color:var(--fg)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:0 0 16px}
.card h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin:0 0 12px}
.card h3{font-size:12.5px;color:var(--mut);margin:16px 0 6px;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:var(--mut);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--line);padding:6px 8px}
td{padding:6px 8px;border-bottom:1px solid var(--line)}td.v{text-align:right}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}
.muted{color:var(--mut);font-size:13px}
.foot{color:var(--mut);font-size:12px;margin-top:26px;text-align:center}
.overview{display:flex;gap:26px;flex-wrap:wrap}.overview div{font-size:13px;color:var(--mut)}.overview b{display:block;font-size:22px;color:var(--fg)}
</style></head><body><div class="wrap">
<h1>Evidence Analytics</h1>
<p class="sub">A read-only projection over AVF's evidence · built from AnalyticsSnapshot alone</p>
<div class="principle"><b>The Proof Principle</b> — every evolvable transformation stands behind an invariant artifact and emits a verifiable proof.</div>

<div class="card"><h2>Overview</h2><div class="overview">
  <div><b>${esc(overview.reports)}</b>reports</div><div><b>${esc(overview.reviews)}</b>reviews</div>
  <div><b>${esc(overview.hypotheses)}</b>hypotheses</div><div><b>${esc(overview.engines)}</b>engines</div>
</div></div>

<div class="card"><h2>Benchmark</h2>
  <h3>Hypothesis verdict (benchmark-owned)</h3>${table(['hypothesis', 'verdict'], rows(benchmark.by_hypothesis))}
  <h3>Implementation verdict distribution</h3>${table(['verdict', 'runs'], rows(benchmark.verdict_distribution))}
  <h3>Engine distribution</h3>${table(['engine@version', 'runs'], rows(benchmark.engine_distribution))}
  <h3>Case-role totals</h3>${table(['role', 'count'], rows(benchmark.case_totals))}
</div>

<div class="card"><h2>Review — human oversight</h2>
  <div class="overview" style="margin-bottom:8px">
    <div><b>${esc(review.total)}</b>reviews</div><div><b>${esc(review.confirm)}</b>confirm</div>
    <div><b>${esc(review.override)}</b>override</div><div><b>${((review.override_rate || 0) * 100).toFixed(0)}%</b>override rate</div>
  </div>
  ${table(['hypothesis', 'confirm / override'], Object.entries(review.by_hypothesis || {}).map(([h, x]) => `<tr><td class="mono">${esc(h)}</td><td class="v mono">${esc(x.confirm)} / ${esc(x.override)}</td></tr>`).join(''))}
</div>

${rule ? `<div class="card"><h2>Rule — would-be gating (derived)</h2>
  <p class="muted">Under <b>${esc(rule.context?.env || '—')}</b>, this policy would block <b>${esc(rule.would_block)}</b> of ${esc(rule.evaluated)} reports.</p>
  <h3>Action distribution</h3>${table(['action', 'count'], rows(rule.action_distribution))}
  <h3>By rule</h3>${table(['rule', 'fired'], rows(rule.by_rule))}
</div>` : ''}

<div class="card"><h2>Trend (Local Machine) — direction over the run log</h2>
  <p class="muted">This describes the execution history in the current run log, not the project's evolution.</p>
  ${trendSection(trend)}
</div>

<p class="foot">Generated ${esc(generated_at)} · self-contained · regenerate with <span class="mono">node analytics/build.mjs</span></p>
</div></body></html>`;
}

// renderAnalyticsCard — a SUMMARY of the AnalyticsSnapshot for a composed dashboard: the few headline numbers a
// maintainer scans first. A SECOND renderer of the same DTO (the explorer above is the detail); it consumes the
// snapshot alone and returns a card BODY fragment — no page shell, no <h2>: the composition owns the frame and
// the title (docs/adr/0003 — a renderer owns one view of one DTO; the dashboard shell composes them).
export function renderAnalyticsCard(snapshot) {
  const { overview = {}, review = {}, rule, trend } = snapshot;
  const dirs = trend && trend.hypotheses ? [...new Set(Object.values(trend.hypotheses).map(h => h.verdict.direction))] : [];
  const headline = dirs.length ? dirs.join(' · ') : (trend?.status || 'no history yet');
  const block = rule ? `${esc(rule.would_block)}/${esc(rule.evaluated)}` : '—';
  return `<div class="kpis">` +
    `<div><b>${esc(overview.reports)}</b><span>reports</span></div>` +
    `<div><b>${esc(overview.reviews)}</b><span>reviews</span></div>` +
    `<div><b>${block}</b><span>would-block</span></div>` +
    `<div><b>${((review.override_rate || 0) * 100).toFixed(0)}%</b><span>override</span></div>` +
    `</div><p class="note">Implementation trend: ${esc(headline)}</p>`;
}
