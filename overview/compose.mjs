// Overview — the dashboard SHELL, a composition of renderers (docs/adr/0003, the Presentation rows). It owns
// layout, navigation, and cross-links, and it OWNS NO DATA: it consumes already-rendered cards (opaque HTML
// fragments) and never a DTO. It IMPORTS NOTHING — no model, no build, no fs — which is the *structural* proof
// of "owns no data": a module with no imports cannot read a snapshot or touch disk. (overview.test.mjs asserts
// the source has no import statement.) A new subsystem adds one card; the shell does not grow, it gains a child.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// cards: [{ id, title, html }] — `html` is an opaque, ALREADY-RENDERED fragment; the shell places it verbatim
// and never inspects it (it is presentation, not data). `id`/`title` are labels the shell turns into nav.
export function composeDashboard({ generated_at = '', cards = [] } = {}) {
  const nav = cards.map(c => `<a href="#${esc(c.id)}">${esc(c.title)}</a>`).join('');
  const sections = cards.map(c => `<section class="card" id="${esc(c.id)}"><h2>${esc(c.title)}</h2>${c.html}</section>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AVF — Overview</title><style>
:root{--bg:#0f1115;--card:#171a21;--fg:#e6e8ec;--mut:#9aa3af;--line:#262b34;--accent:#6ea8fe}
@media(prefers-color-scheme:light){:root{--bg:#f6f7f9;--card:#fff;--fg:#1b1f27;--mut:#5a6472;--line:#e5e8ee;--accent:#2f6feb}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif}
.wrap{max-width:960px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:22px;margin:0 0 2px}.sub{color:var(--mut);margin:0 0 16px}
nav{display:flex;gap:14px;margin:0 0 20px;font-size:13px}nav a{color:var(--accent);text-decoration:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:0 0 16px;scroll-margin-top:16px}
.card h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin:0 0 12px}
.kpis{display:flex;gap:26px;flex-wrap:wrap}.kpis div{font-size:13px;color:var(--mut)}.kpis b{display:block;font-size:22px;color:var(--fg)}
.note{color:var(--mut);font-size:13px;margin:12px 0 0}.muted{color:var(--mut);font-size:13px}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}
.foot{color:var(--mut);font-size:12px;margin-top:26px;text-align:center}
</style></head><body><div class="wrap">
<h1>Overview</h1>
<p class="sub">A composition of subsystem cards · the shell owns layout, not data</p>
<nav>${nav}</nav>
${sections}
<p class="foot">Generated ${esc(generated_at)} · composed from rendered cards · regenerate with <span class="mono">node overview/build.mjs</span></p>
</div></body></html>`;
}
