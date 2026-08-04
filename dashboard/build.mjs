// Automation Validation Dashboard — orchestrates the model↔render split: scan the repo into a
// DashboardSnapshot (model.mjs), render it to a self-contained HTML string (render.mjs), write the file.
// This file owns only I/O + the clock; it contains no scanning logic and no HTML. Regenerate any time:
//   node dashboard/build.mjs
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dashboardSnapshot } from './model.mjs';
import { renderDashboardHtml } from './render.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Public entry the CLI calls; returns a small summary of what was found. Runnable directly (main-guard).
export async function buildDashboard(root = ROOT) {
  const snapshot = await dashboardSnapshot(root);
  const html = renderDashboardHtml(snapshot, { generated_at: new Date().toISOString() });
  const path = resolve(root, 'dashboard', 'index.html');
  await writeFile(path, html);
  return {
    path,
    hypotheses: snapshot.hypotheses.length,
    engines: snapshot.engines.reduce((n, e) => n + e.versions.length, 0),
    knowledge: snapshot.knowledge.packages.length,
    reviews: snapshot.reviews.length,
  };
}

// Runnable directly: node dashboard/build.mjs
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const r = await buildDashboard();
  console.log('wrote dashboard/index.html —', r.hypotheses, 'hypotheses ·', r.engines, 'engines ·', r.knowledge, 'knowledge packages ·', r.reviews, 'oracle reviews');
}
