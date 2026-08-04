// Decision artifact — package the RecommendationSnapshot that model.mjs produces as a STANDALONE artifact on
// disk (decision/decision.json). This is the first CONSUMER of Decision: once the recommendations are a file
// any tool can read (CI, a dashboard, another renderer), Decision has an output boundary that mirrors the
// AnalyticsSnapshot one hop upstream. This file owns only I/O; the recommendations and the `generated_at` stamp
// come from model.mjs, which reads NOTHING but the AnalyticsSnapshot it is handed.
//   node decision/build.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSnapshot } from '../analytics/model.mjs';
import { recommendationSnapshot } from './model.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Public entry the CLI calls; writes decision/decision.json and returns a small summary. The snapshot Decision
// reads is the AnalyticsSnapshot from disk — Decision itself reads no evidence, so the chain stays
// evidence → analytics → snapshot → decision, never read backward.
export async function buildDecision(root = ROOT) {
  const snapshot = await buildSnapshot(root);
  const recommendation = recommendationSnapshot(snapshot);
  const dir = resolve(root, 'decision');
  await mkdir(dir, { recursive: true }); // a foreign workspace may not have decision/ yet
  const jsonPath = resolve(dir, 'decision.json');
  await writeFile(jsonPath, JSON.stringify(recommendation, null, 2) + '\n');
  return { jsonPath, recommendations: recommendation.recommendations.length };
}

// Runnable directly: node decision/build.mjs. An empty list is a RESULT, not a failure — silence is honest, so
// the summary says so plainly rather than hiding it.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const r = await buildDecision();
  const n = r.recommendations;
  console.log(`wrote ${r.jsonPath} — ${n} recommendation${n === 1 ? '' : 's'}${n === 0 ? ' (silent — no actionable signal)' : ''}`);
}
