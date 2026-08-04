// Dashboard model — scans the real repo state into a plain DashboardSnapshot DTO. It performs I/O but
// emits NO HTML; the renderer (render.mjs) consumes this DTO and knows nothing about the repo layout.
// This is the model↔render split — build.mjs orchestrates the two.
//
// NOTE: this DashboardSnapshot is the DASHBOARD's data model. It COMPOSES two projections:
//   - inventory: the dashboard's own view (repo scan + authored context — dimensions, reality-test log);
//   - analytics: the pure evidence projection (analytics/AnalyticsSnapshot), read-only.
// The analytics branch is obtained through the Analytics API (buildSnapshot) — the dashboard depends on
// WHAT Analytics returns, not on HOW it is built (which evidence + which default policy). So a later
// RuleMetrics/TrendMetrics enriches `analytics` with no change here and no change to the renderer.
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSnapshot } from '../analytics/model.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Authored context (not evidence-derived): the knowledge-map dimensions and the reality-test log.
const HYPOTHESES = [
  { id: 'H0', dim: 'Representation', status: 'SUPPORTED', live: 'research capture' },
  { id: 'H1', dim: 'Identity', status: 'SUPPORTED', live: '' },
  { id: 'H2', dim: 'Semantics', status: 'FRONTIER', live: '' },
  { id: 'H3', dim: 'Authority', status: 'SUPPORTED', live: '' },
  { id: 'H4', dim: 'Lifecycle / Transition', status: 'SUPPORTED', live: 'ADO updates → verdict' },
  { id: 'H5', dim: 'Reference / Relationship', status: 'SUPPORTED', live: 'ADO chain → honest DEFER' },
];
const CONNECTORS = ['html', 'json', 'azure-devops', 'jira'];
const REALITY_TESTS = [
  { name: 'Azure DevOps — H4 lifecycle (work item 9283)', status: 'VALID (live)' },
  { name: 'Azure DevOps — H5 referential (wit 9288 → PR 8182)', status: 'DEFER — honest (no published test run)' },
  { name: 'Jira — live', status: 'pending' },
  { name: 'GitHub — live', status: 'planned' },
];

export async function dashboardSnapshot(root = ROOT) {
  const R = p => resolve(root, p);
  const ls = async p => { try { return await readdir(R(p), { withFileTypes: true }); } catch { return []; } };

  const engFamilies = (await ls('engines')).filter(d => d.isDirectory() && d.name !== 'contracts').map(d => d.name);
  const engines = [];
  for (const f of engFamilies) engines.push({ family: f, versions: (await ls(`engines/${f}`)).filter(e => e.isFile()).map(e => e.name.replace('.mjs', '').replace(/_/g, '.')) });

  const packages = (await ls('knowledge')).filter(d => d.isDirectory() && d.name.startsWith('taggle-')).map(d => d.name);
  let gated = 0, permissive = 0;
  for (const d of packages) { try { const p = JSON.parse(await readFile(R(`knowledge/${d}/lifecycle.json`), 'utf8')); (p.lifecycle?.forbidden?.length ? gated++ : permissive++); } catch {} }

  // Analytics via the API (owns its own evidence + default policy). The inventory keeps its own review
  // read so the two projections stay independent — either can be built or fail without the other.
  const analytics = await buildSnapshot(root);
  let reviews = [];
  try { reviews = JSON.parse(await readFile(R('oracle/reviews.json'), 'utf8')); } catch { /* none */ }

  const inventory = {
    hypotheses: HYPOTHESES,
    engines,
    connectors: CONNECTORS,
    realityTests: REALITY_TESTS,
    knowledge: { packages, gated, permissive },
    reviews,
  };
  return { inventory, analytics };
}
