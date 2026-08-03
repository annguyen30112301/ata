// Oracle review store — APPEND-ONLY. A review, once recorded, is never mutated or deleted: that is the
// audit trail the Oracle Contract requires (oracles change only WITH history). history() reconstructs
// the full trail for a subject, newest last.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FILE = resolve(HERE, 'reviews.json');

export async function all(file = DEFAULT_FILE) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return []; }
}

export async function record(review, file = DEFAULT_FILE) {
  const log = await all(file);
  log.push(review);                                   // append-only: existing entries are never touched
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(log, null, 2) + '\n');
  return review;
}

const sameSubject = (a, b) =>
  !!a && !!b && a.hypothesis === b.hypothesis && (a.engine || null) === (b.engine || null) && (a.case_id || null) === (b.case_id || null);

export const history = (log, subject) => log.filter(r => sameSubject(r.subject, subject));
