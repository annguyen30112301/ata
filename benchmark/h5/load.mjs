// Benchmark package loader for H5 — Referential Integrity. Each case's input IS a small reference
// graph (evidences that point at one another). The engine must resolve the references, not compare
// flat fields.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const yaml = createRequire(import.meta.url)('js-yaml');
const HERE = dirname(fileURLToPath(import.meta.url));

export async function load() {
  const m = yaml.load(await readFile(resolve(HERE, 'manifest.yaml'), 'utf8'));
  return {
    schema_version: m.schema_version,
    hypothesis: m.hypothesis,
    cases: m.cases.map(c => ({
      id: c.id, role: c.role, oracle: c.oracle, criticality: c.criticality, breaks: c.breaks,
      input: c.evidence,                              // the reference graph itself
    })),
  };
}
export default { load };
