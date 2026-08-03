// Report view — a compact PR comment (Markdown for GitHub / Azure DevOps). Includes the gate Ruling
// if one was computed, so a reviewer sees both the verdict and what it means for the PR.
import { classify, GATE } from './model.mjs';

export function toPrComment(report, ruling) {
  const rows = report.results.map(r =>
    `| ${classify(r.verdict).icon} ${r.hypothesis} | ${r.verdict} | ${(r.reason || '').slice(0, 90).replace(/\|/g, '\\|')} |`).join('\n');
  const gate = ruling ? `\n\n**Gate: ${GATE[ruling.action] || ruling.action}**` : '';
  return `### 🤖 AVF — Automation Validation

**${classify(report.overall).icon} Overall: ${report.overall}**${gate}

| Check | Verdict | Reason |
|-------|---------|--------|
${rows}

<sub>${report.source} · evidence → benchmark → engine → verdict. A DEFER means "not enough evidence to decide", not a failure.</sub>`;
}
