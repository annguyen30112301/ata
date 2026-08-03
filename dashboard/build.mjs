// Automation Validation Dashboard — the stakeholder-facing view. Scans the real repo state
// (hypotheses, engines, connectors, knowledge packages, oracle reviews) and emits a self-contained
// HTML file. Regenerate any time: node dashboard/build.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = p => resolve(ROOT, p);
const ls = async p => { try { return (await readdir(R(p), { withFileTypes: true })); } catch { return []; } };

// Scan the real repo state and (re)write dashboard/index.html. Public entry the CLI calls; returns a
// small summary of what was found. The file stays runnable directly via the main-guard below.
export async function buildDashboard() {
// hypotheses — known dimension + status (real results from the runs)
const HYP = [
  { id: 'H0', dim: 'Representation', status: 'SUPPORTED', live: 'research capture' },
  { id: 'H1', dim: 'Identity', status: 'SUPPORTED', live: '' },
  { id: 'H2', dim: 'Semantics', status: 'FRONTIER', live: '' },
  { id: 'H3', dim: 'Authority', status: 'SUPPORTED', live: '' },
  { id: 'H4', dim: 'Lifecycle / Transition', status: 'SUPPORTED', live: 'ADO updates → verdict' },
  { id: 'H5', dim: 'Reference / Relationship', status: 'SUPPORTED', live: 'ADO chain → honest DEFER' },
];
const engFamilies = (await ls('engines')).filter(d => d.isDirectory() && d.name !== 'contracts').map(d => d.name);
const engines = [];
for (const f of engFamilies) engines.push({ family: f, versions: (await ls(`engines/${f}`)).filter(e => e.isFile()).map(e => e.name.replace('.mjs', '').replace(/_/g, '.')) });
const connectors = ['html', 'json', 'azure-devops', 'jira'];
const kdirs = (await ls('knowledge')).filter(d => d.isDirectory() && d.name.startsWith('taggle-')).map(d => d.name);
let gated = 0, permissive = 0;
for (const d of kdirs) { try { const p = JSON.parse(await readFile(R(`knowledge/${d}/lifecycle.json`), 'utf8')); (p.lifecycle?.forbidden?.length ? gated++ : permissive++); } catch {} }
const reviews = await (async () => { try { return JSON.parse(await readFile(R('oracle/reviews.json'), 'utf8')); } catch { return []; } })();
const realityTests = [
  { name: 'Azure DevOps — H4 lifecycle (work item 9283)', status: 'VALID (live)' },
  { name: 'Azure DevOps — H5 referential (wit 9288 → PR 8182)', status: 'DEFER — honest (no published test run)' },
  { name: 'Jira — live', status: 'pending' },
  { name: 'GitHub — live', status: 'planned' },
];

const badge = s => `<span class="b ${/(SUPPORTED|VALID)/.test(s) ? 'ok' : /FRONTIER|DEFER|pending/.test(s) ? 'warn' : 'muted'}">${s}</span>`;
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
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
<div class="grid">
  <div class="card"><h2>Hypotheses — the knowledge map</h2>
    ${HYP.map(h => `<div class="row"><span class="k"><b>${h.id}</b> · ${h.dim}${h.live ? ` <span class="mono" style="color:var(--mut)">· live: ${esc(h.live)}</span>` : ''}</span><span class="v">${badge(h.status)}</span></div>`).join('')}
  </div>
  <div class="card"><h2>Engines (${engines.reduce((n, e) => n + e.versions.length, 0)} across ${engines.length} families)</h2>
    ${engines.map(e => `<div class="row"><span class="k mono">${e.family}</span><span class="v mono">${e.versions.join(' · ')}</span></div>`).join('')}
  </div>
  <div class="card"><h2>Evidence Sources / Connectors</h2>
    ${connectors.map(c => `<div class="row"><span class="k mono">${c}</span><span class="v">${badge('ready')}</span></div>`).join('')}
  </div>
  <div class="card"><h2>Reality Tests (real data)</h2>
    ${realityTests.map(t => `<div class="row"><span class="k">${esc(t.name)}</span><span class="v">${badge(t.status)}</span></div>`).join('')}
  </div>
  <div class="card"><h2>Knowledge Packages — Taggle (${kdirs.length})</h2>
    <div class="row"><span class="k">Gated (real policy)</span><span class="v">${badge(gated + ' gated')}</span></div>
    <div class="row"><span class="k">Permissive (no bans)</span><span class="v"><span class="b muted">${permissive}</span></span></div>
    <div class="row"><span class="k mono" style="color:var(--mut);font-size:12px">${kdirs.slice(0, 6).join(', ')}${kdirs.length > 6 ? ' …' : ''}</span><span class="v"></span></div>
  </div>
  <div class="card"><h2>Oracle Runtime — human reviews (${reviews.length})</h2>
    ${reviews.length ? reviews.map(r => `<div class="row"><span class="k">${esc(r.subject.hypothesis)} · ${esc(r.decision)} <span class="mono" style="color:var(--mut)">${esc(r.verdict)}</span><br><span style="color:var(--mut);font-size:12.5px">${esc(r.reason.slice(0, 120))}${r.reason.length > 120 ? '…' : ''}</span></span><span class="v mono" style="font-size:11px">${esc(r.reviewer)}</span></div>`).join('') : '<div class="row"><span class="k" style="color:var(--mut)">no reviews yet</span><span class="v"></span></div>'}
  </div>
</div>
<p class="foot">Generated ${new Date().toISOString()} · self-contained snapshot · regenerate with <span class="mono">node dashboard/build.mjs</span></p>
</div></body></html>`;

await writeFile(R('dashboard/index.html'), html);
return { path: R('dashboard/index.html'), hypotheses: HYP.length, engines: engines.reduce((n, e) => n + e.versions.length, 0), knowledge: kdirs.length, reviews: reviews.length };
}

// Runnable directly: node dashboard/build.mjs
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const r = await buildDashboard();
  console.log('wrote dashboard/index.html —', r.hypotheses, 'hypotheses ·', r.engines, 'engines ·', r.knowledge, 'knowledge packages ·', r.reviews, 'oracle reviews');
}
