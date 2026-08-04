// Run Log store — the append-only IO for machine history (docs/run-log.contract.md §4-5). The log is an
// append SINK for the writer and a read-only SOURCE for readers; NO function here both reads and writes it.
//
// Format is JSONL — one entry per line — precisely so a write is a true append (appendFile, no
// read-modify-write) and a torn final line costs at most one entry. This is the deliberate divergence from
// oracle/store.mjs, which rewrites a whole JSON array on every append; for a machine log that grows per run,
// the append-only guarantee is worth more at the filesystem level (§4).
//
// run() is the SOLE writer of machine history; Analytics only ever reads. This module never judges an entry.
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const logPath = root => resolve(root, 'run-log', 'runs.jsonl');

// Append one entry as a single JSONL line. READ-FREE by construction: it never reads the log to write it
// (§2, invariant 3), so the bytes it appends depend only on `entry`, never on the log's current contents.
export async function appendEntry(entry, root = ROOT) {
  const path = logPath(root);
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, JSON.stringify(entry) + '\n');
  return path;
}

// A minimal shape guard — NOT a schema validator. It only separates a real RunLogEntry from a line that
// happens to be valid JSON but is not one of ours (e.g. `{"hello":123}`): every entry carries at least a
// run identity (run_id + timestamp). This mirrors analytics' isKernelReport — read what we recognize, skip
// the rest, never crash.
const isEntry = e => !!e && typeof e.run_id === 'string' && typeof e.timestamp === 'string';

// Read the whole log, oldest first. TOLERANT (§5): a MALFORMED line (bad JSON, a torn last line) and a
// FOREIGN line (valid JSON, wrong shape) are both skipped rather than fatal; a missing file reads as an
// empty history — Analytics never fails for the log's absence, exactly as loadEvidence never fails for a
// missing reports/ directory.
export async function loadRunLog(root = ROOT) {
  let raw;
  try { raw = await readFile(logPath(root), 'utf8'); } catch { return []; }
  const entries = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let parsed;
    try { parsed = JSON.parse(line); } catch { continue; }   // malformed: unparseable line, skip
    if (isEntry(parsed)) entries.push(parsed);               // foreign: parses but not a RunLogEntry, skip
  }
  return entries;
}
