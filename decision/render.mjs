// Decision — the EXPLORER renderer. A PURE function of a RecommendationSnapshot: it returns a self-contained
// HTML page and reads NOTHING else — no AnalyticsSnapshot, no evidence, no clock of its own (the snapshot
// carries its own `generated_at`, and `source` says which snapshot it reflects). Same snapshot → same HTML,
// byte for byte. This is the in-repo consumer the contract sanctions: it renders the RecommendationSnapshot
// OBJECT (a downstream tool parses decision.json instead) — a renderer consumes the model's DTO, never the
// serialized file, so it can never couple to an artifact's freshness (docs/adr/0001, the directional law).
//
// It makes AUDITABILITY visible: every recommendation renders its evidence as `signal = value`, so a reader
// walks each recommendation straight back to the snapshot field that produced it — no recommendation is a
// bare assertion. An empty snapshot renders "No actionable signal", never a hidden card: silence is a result.
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const PRI_CLASS = { HIGH: 'high', MEDIUM: 'med', LOW: 'low' };
const subjectLabel = s => s.scope ?? (s.engine ? `${s.hypothesis} · ${s.engine}` : s.hypothesis);

function recCard(r) {
  const ev = r.evidence.map(e =>
    `<div class="ev"><span class="sig mono">${esc(e.signal)}</span><span class="eq">=</span><span class="val mono">${esc(e.value)}</span></div>`).join('');
  return `<div class="rec">
  <div class="rec-head">
    <span class="badge ${PRI_CLASS[r.priority] || 'low'}">${esc(r.priority)}</span>
    <span class="badge kind">${esc(r.kind)}</span>
    <span class="subj mono">${esc(subjectLabel(r.subject))}</span>
    <span class="id mono">${esc(r.id)}</span>
  </div>
  <div class="because"><span class="lbl">because</span>${ev}</div>
</div>`;
}

export function renderDecisionHtml(snapshot) {
  const { generated_at = '', source = {}, recommendations = [] } = snapshot;
  const n = recommendations.length;
  const body = n
    ? recommendations.map(recCard).join('')
    : `<p class="muted">No actionable signal. The snapshot proves nothing that warrants attention right now — which is itself an answer, not an absence.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AVF — Decision</title><style>
:root{--bg:#0f1115;--card:#171a21;--fg:#e6e8ec;--mut:#9aa3af;--line:#262b34;--accent:#6ea8fe;--warn:#e57373;--amber:#e0a83a}
@media(prefers-color-scheme:light){:root{--bg:#f6f7f9;--card:#fff;--fg:#1b1f27;--mut:#5a6472;--line:#e5e8ee;--accent:#2f6feb;--warn:#c94a4a;--amber:#b5842a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1040px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:22px;margin:0 0 2px}.sub{color:var(--mut);margin:0 0 16px}
.principle{border-left:3px solid var(--accent);padding:10px 14px;background:var(--card);border-radius:8px;margin:0 0 22px;color:var(--fg)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:0 0 16px}
.card h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin:0 0 12px}
.rec{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:0 0 10px}
.rec-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.badge{font-size:11px;font-weight:700;letter-spacing:.04em;padding:2px 8px;border-radius:999px;text-transform:uppercase}
.badge.high{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}
.badge.med{background:color-mix(in srgb,var(--amber) 18%,transparent);color:var(--amber)}
.badge.low{background:var(--line);color:var(--mut)}
.badge.kind{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}
.subj{font-weight:600}.id{margin-left:auto;color:var(--mut);font-size:12px}
.because{margin-top:8px;font-size:12.5px;color:var(--mut)}
.because .lbl{margin-right:8px}
.ev{display:inline-flex;align-items:baseline;gap:6px;margin-right:14px}
.ev .sig{color:var(--fg)}.ev .eq{color:var(--mut)}.ev .val{color:var(--accent)}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}
.muted{color:var(--mut);font-size:13px}
.foot{color:var(--mut);font-size:12px;margin-top:26px;text-align:center}
</style></head><body><div class="wrap">
<h1>Decision</h1>
<p class="sub">What action follows from the evidence · built from RecommendationSnapshot alone</p>
<div class="principle"><b>The Proof Principle</b> — every evolvable transformation stands behind an invariant artifact and emits a verifiable proof. A recommendation advises; it never acts, and every one traces to a snapshot field.</div>

<div class="card"><h2>Recommendations — ${n} · what the maintainer should attend to</h2>
${body}
</div>

<p class="foot">Generated ${esc(generated_at)} · reflects snapshot ${esc(source.snapshot_generated_at ?? '—')} · self-contained · regenerate with <span class="mono">node decision/build.mjs</span></p>
</div></body></html>`;
}
