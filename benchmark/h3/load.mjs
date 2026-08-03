// Benchmark package loader for H3 — resolves candidate ids from provenance into
// each case's `input`. The framework calls load() and gets a uniform shape.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const yaml = createRequire(import.meta.url)('js-yaml');
const HERE = dirname(fileURLToPath(import.meta.url));

export async function load() {
  const m = yaml.load(await readFile(resolve(HERE, 'manifest.yaml'), 'utf8'));
  const prov = yaml.load(await readFile(resolve(HERE, 'provenance.yaml'), 'utf8')).claims;
  const byId = Object.fromEntries(prov.map(c => [c.id, c]));
  return {
    schema_version: m.schema_version,
    hypothesis: m.hypothesis,
    cases: m.cases.map(c => ({ id: c.id, role: c.role, oracle: c.oracle, criticality: c.criticality, breaks: c.breaks,
      input: { candidates: c.candidates.map(id => byId[id]) } })),
  };
}
export default { load };
