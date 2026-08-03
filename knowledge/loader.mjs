// Knowledge Package loader — a new architectural layer, distinct from benchmark / connector /
// engine. A Knowledge Package is human-confirmed DOMAIN knowledge (a lifecycle + its transition
// cases) that many benchmarks can share. It is activated by need — a benchmark reaches for a
// package when its evidence would otherwise DEFER.
//
// A package may be SEEDED by extraction from a system's real config (see azure-devops/process.mjs),
// but extraction alone is a DRAFT. It becomes usable knowledge only when a human sets confirmed:true.
// That is the Oracle Contract made executable: a machine proposes, a human ratifies.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));

export function assertUsable(pkg, name = '?') {
  if (!Array.isArray(pkg?.lifecycle?.states)) throw new Error(`knowledge/${name}: malformed lifecycle (needs states[])`);
  const mode = pkg.policy?.mode || 'restrictive';
  if (mode === 'restrictive' && !Array.isArray(pkg.lifecycle.allowed)) throw new Error(`knowledge/${name}: restrictive policy needs lifecycle.allowed[]`);
  if (mode === 'permissive' && !Array.isArray(pkg.lifecycle.forbidden)) throw new Error(`knowledge/${name}: permissive policy needs lifecycle.forbidden[]`);
  // cases are OPTIONAL: if absent, the Benchmark Case Generator derives them from the lifecycle.
  if (pkg.confirmed !== true) throw new Error(`knowledge/${name}: not human-confirmed (draft) — a human must review and set confirmed:true`);
  return true;
}

// The lifecycle shape an engine receives (states + policy mode + allow/forbid). Shared by the H4
// benchmark loader and the live bridge so they never drift.
export const toEngineLifecycle = pkg => ({
  states: pkg.lifecycle.states,
  mode: pkg.policy?.mode || 'restrictive',
  allowed: pkg.lifecycle.allowed || [],
  forbidden: pkg.lifecycle.forbidden || [],
});

export async function loadKnowledge(name) {
  let pkg;
  try { pkg = JSON.parse(await readFile(resolve(HERE, name, 'lifecycle.json'), 'utf8')); }
  catch { throw new Error(`knowledge: package '${name}' not found (expected knowledge/${name}/lifecycle.json)`); }
  assertUsable(pkg, name);
  return pkg;
}
