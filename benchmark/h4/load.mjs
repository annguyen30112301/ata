// Benchmark package loader for H4 — pairs the lifecycle-agnostic H4 logic with a Knowledge Package:
//   Executable Benchmark  =  H4 (benchmark logic)  +  Knowledge Package (lifecycle + cases)
// The package is chosen by AVF_KNOWLEDGE (default from manifest). The kernel is untouched: run.mjs
// still calls load(); knowledge selection is this package's own concern.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadKnowledge, toEngineLifecycle } from '../../knowledge/loader.mjs';
import { generateCases } from '../../knowledge/generator.mjs';
const yaml = createRequire(import.meta.url)('js-yaml');
const HERE = dirname(fileURLToPath(import.meta.url));

export async function loadWith(knowledgeName) {
  const m = yaml.load(await readFile(resolve(HERE, 'manifest.yaml'), 'utf8'));
  const k = await loadKnowledge(knowledgeName || m.default_knowledge);
  // Hand-written cases if the package has them; otherwise GENERATE from confirmed knowledge.
  const authored = (k.cases && k.cases.length) ? k.cases : generateCases(k);
  // The lifecycle the engine receives carries the declared policy mode; the engine only reads it.
  const lifecycle = toEngineLifecycle(k);
  return {
    schema_version: m.schema_version,
    hypothesis: m.hypothesis,
    knowledge: k.id,                                  // which Knowledge Package produced these cases (audit)
    cases: authored.map(c => ({
      id: c.id, role: c.role,
      oracle: c.expected ?? c.oracle,                 // knowledge authoring uses `expected`; kernel contract uses `oracle`
      criticality: c.criticality, breaks: c.breaks,
      dimension: c.dimension, knowledge: c.knowledge, knowledge_source: c.knowledge_source,
      input: { from: c.from, to: c.to, lifecycle },   // benchmark-owned lifecycle (+ policy mode) injected
    })),
  };
}

// The kernel calls this. Knowledge Package = AVF_KNOWLEDGE or the manifest default.
export async function load() { return loadWith(process.env.AVF_KNOWLEDGE); }
export default { load, loadWith };
