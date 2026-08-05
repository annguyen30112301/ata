// Dashboard SHELL — the page chrome (head, styles, header, the grid frame, footer) and NOTHING else. It OWNS
// NO DATA: it consumes an array of already-rendered card fragments and places them in the grid verbatim; it does
// not know what a card is about. It IMPORTS NOTHING — the structural proof of "owns no data" (docs/adr/0003, the
// Dashboard row): a module with no imports cannot read a snapshot or touch disk. The legacy dashboard predates
// the registry; this is its convergence — same HTML, byte for byte, but the shell no longer owns the inventory.
export function composeDashboard({ generated_at = '', cards = [] } = {}) {
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
<div class="grid">${cards.join('')}
</div>
<p class="foot">Generated ${generated_at} · self-contained snapshot · regenerate with <span class="mono">node dashboard/build.mjs</span></p>
</div></body></html>`;
}
