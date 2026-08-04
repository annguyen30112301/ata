// Analytics artifact — package the AnalyticsSnapshot that model.mjs produces as a STANDALONE artifact on
// disk (analytics/analytics.json). This is the `json` output the contract already sanctions
// (docs/evidence-analytics.md §3) as a sibling of the dashboard: once the snapshot is a file any consumer
// can read (an API, CI, another renderer), the dashboard becomes ONE consumer of Analytics rather than its
// only destination. This file owns only I/O; the numbers and the `generated_at` stamp come from model.mjs.
//   node analytics/build.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSnapshot } from './model.mjs';
import { renderAnalyticsHtml } from './render.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Public entry the CLI calls; writes analytics/analytics.{json,html} and returns a small summary. Both
// artifacts come from ONE snapshot: the JSON is it serialized, the HTML is it rendered — so the page provably
// needs nothing but the snapshot (renderAnalyticsHtml is pure over it, reads no evidence of its own).
export async function buildAnalytics(root = ROOT) {
  const snapshot = await buildSnapshot(root);
  const dir = resolve(root, 'analytics');
  await mkdir(dir, { recursive: true }); // a foreign workspace may not have analytics/ yet
  const jsonPath = resolve(dir, 'analytics.json');
  const htmlPath = resolve(dir, 'analytics.html');
  await writeFile(jsonPath, JSON.stringify(snapshot, null, 2) + '\n');
  await writeFile(htmlPath, renderAnalyticsHtml(snapshot));
  return {
    jsonPath, htmlPath,
    reports: snapshot.overview.reports,
    reviews: snapshot.overview.reviews,
    would_block: snapshot.rule?.would_block ?? null,
  };
}

// Runnable directly: node analytics/build.mjs
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const r = await buildAnalytics();
  const gate = r.would_block !== null ? ` · ${r.would_block} would-block` : '';
  console.log(`wrote ${r.jsonPath} + analytics.html — ${r.reports} reports · ${r.reviews} reviews${gate}`);
}
