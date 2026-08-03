import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const yaml = createRequire(import.meta.url)('js-yaml');
const HERE = dirname(fileURLToPath(import.meta.url));
export async function load() {
  const m = yaml.load(await readFile(resolve(HERE, 'manifest.yaml'), 'utf8'));
  return { schema_version: m.schema_version, hypothesis: m.hypothesis, cases: m.cases };   // input is inline
}
export default { load };
