// Report view — SARIF 2.1.0 (so verdicts show up in code-scanning / PR "Checks" alongside linters).
import { classify } from './model.mjs';

export function toSarif(report, ruling) {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: { driver: { name: 'AVF', informationUri: 'about:blank', version: '0.1.0', rules: [] } },
      results: report.results.map(r => ({
        ruleId: `${r.hypothesis}/${r.engine}`,
        level: classify(r.verdict).level,
        message: { text: `${r.verdict}${r.reason ? ` — ${r.reason}` : ''}` },
        properties: { hypothesis: r.hypothesis, verdict: r.verdict },
      })),
      ...(ruling ? { properties: { gate: ruling.action, severity: ruling.severity } } : {}),
    }],
  };
}
