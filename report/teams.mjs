// Report view — Microsoft Teams MessageCard (post a verdict summary to a channel). If a gate Ruling is
// supplied it leads the facts, so a channel reader sees the action before the per-check breakdown.
import { classify, GATE } from './model.mjs';
const COLOR = { 0: '2ea043', 2: 'd29922', 3: 'd29922', 4: 'cf222e' };

export function toTeamsCard(report, ruling) {
  const facts = report.results.map(r => ({ name: `${r.hypothesis} · ${r.engine}`, value: `${classify(r.verdict).icon} ${r.verdict}` }));
  if (ruling) facts.unshift({ name: 'Gate', value: GATE[ruling.action] || ruling.action });
  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    summary: `AVF: ${report.overall}`,
    themeColor: COLOR[classify(report.overall).sev] || 'd29922',
    title: `${classify(report.overall).icon} AVF — Overall: ${report.overall}`,
    sections: [{ activitySubtitle: report.source, facts }],
  };
}
