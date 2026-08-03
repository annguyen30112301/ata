// Rule Engine — a NEW layer, fully separate from benchmarks and engines. It never changes reasoning
// (a verdict is a verdict); it decides the ACTION taken on a verdict, per context. The same DEFER can
// block a production PR and merely warn on a sandbox one — that is policy, not reasoning.
//
//   rule = { name, when: { hypothesis?, verdict?, verdict_in?[], env?, env_in?[] }, then: 'block'|'warn'|'allow' }
export const ACTION = { BLOCK: 'block', WARN: 'warn', ALLOW: 'allow' };
const RANK = { block: 3, warn: 2, allow: 1 };
// The gate's own severity — a stable label a renderer can badge without re-deriving it from `action`.
export const SEVERITY = { block: 'high', warn: 'medium', allow: 'none' };

function matches(rule, result, context) {
  const w = rule.when || {};
  if (w.hypothesis && w.hypothesis !== result.hypothesis) return false;
  if (w.verdict && String(w.verdict) !== String(result.verdict)) return false;
  if (w.verdict_in && !w.verdict_in.map(String).includes(String(result.verdict))) return false;
  if (w.env && w.env !== context.env) return false;
  if (w.env_in && !w.env_in.includes(context.env)) return false;
  return true;
}

// A RULING is the Rule Engine's OUTPUT CONTRACT — the machine's gating decision on a report.
// It is deliberately NOT called "Decision": the Oracle already owns DECISION (a HUMAN's confirm/override
// of a verdict, see oracle/contract.mjs). Different actor, different meaning — the Ruling is what the
// MACHINE does with a verdict; the DECISION is what a PERSON does with it. Renderers consume a Ruling;
// they never see a raw matched-rule list. Shape: { action, severity, reason, matched }.
export function makeRuling(action, matched = []) {
  const decisive = matched.filter(m => m.action === action).map(m => m.rule);
  const reason = matched.length === 0
    ? 'no rule matched — default allow'
    : `${matched.length} rule(s) matched; ${action} from: ${decisive.join(', ')}`;
  return { action, severity: SEVERITY[action], reason, matched };
}

// Report -> Ruling. Action = the MOST SEVERE matched rule (default allow). Pure: no I/O, no rendering —
// which is exactly what makes `avf simulate` a thin wrapper over it.
export function evaluateRules(report, rules = [], context = {}) {
  const matched = [];
  for (const r of report.results)
    for (const rule of rules)
      if (matches(rule, r, context)) matched.push({ rule: rule.name, subject: `${r.hypothesis}:${r.verdict}`, action: rule.then });
  const action = matched.reduce((a, m) => (RANK[m.action] > RANK[a] ? m.action : a), ACTION.ALLOW);
  return makeRuling(action, matched);
}

// For CI: block -> non-zero exit so a pipeline can gate on it. Accepts a Ruling or a raw action string.
export const exitCodeFor = x => ((typeof x === 'string' ? x : x?.action) === ACTION.BLOCK ? 1 : 0);
