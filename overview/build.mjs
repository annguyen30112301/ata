// Overview build — the ORCHESTRATION layer. Unlike the shell (compose.mjs, which owns no data and imports
// nothing), the orchestrator is ALLOWED to do I/O: it reads the snapshots, hands each to its single-DTO card
// renderer, and passes the resulting STRINGS to the shell. This is the "bytes arrive by I/O" concern the
// registry keeps separate from capability — the shell still never sees a DTO.
//   node overview/build.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSnapshot } from '../analytics/model.mjs';
import { renderAnalyticsCard } from '../analytics/render.mjs';
import { recommendationSnapshot } from '../decision/model.mjs';
import { renderDecisionCard } from '../decision/render.mjs';
import { composeDashboard } from './compose.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Each card is a pure projection of exactly one DTO; the shell composes their strings. Decision consumes the
// AnalyticsSnapshot (via recommendationSnapshot) — the chain stays evidence → analytics → decision → presentation.
export async function buildOverview(root = ROOT) {
  const analytics = await buildSnapshot(root);
  const decision = recommendationSnapshot(analytics);
  const cards = [
    { id: 'analytics', title: 'Analytics', html: renderAnalyticsCard(analytics) },
    { id: 'decision', title: 'Decision', html: renderDecisionCard(decision) },
  ];
  const html = composeDashboard({ generated_at: new Date().toISOString(), cards });
  const dir = resolve(root, 'overview');
  await mkdir(dir, { recursive: true });
  const path = resolve(dir, 'index.html');
  await writeFile(path, html);
  return { path, cards: cards.length, recommendations: decision.recommendations.length };
}

// Runnable directly: node overview/build.mjs
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const r = await buildOverview();
  console.log(`wrote ${r.path} — ${r.cards} cards · ${r.recommendations} recommendation${r.recommendations === 1 ? '' : 's'}`);
}
