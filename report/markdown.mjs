// Report view — Markdown (a human document). Optionally shows the gate Ruling below the overall verdict.
import { classify, GATE } from './model.mjs';

export function toMarkdown(report, ruling) {
  const rows = report.results.map(r =>
    `| ${r.hypothesis} | \`${r.engine}\` | ${classify(r.verdict).icon} ${r.verdict} | ${(r.reason || '').replace(/\|/g, '\\|')} |`).join('\n');
  const gate = ruling ? `\n\n**Gate: ${GATE[ruling.action] || ruling.action}** — ${ruling.reason}` : '';
  return `# ${report.title}
_${report.source} · ${report.generated_at}_

**Overall: ${classify(report.overall).icon} ${report.overall}**${gate}

| Hypothesis | Engine | Verdict | Reason |
|------------|--------|---------|--------|
${rows}
`;
}
