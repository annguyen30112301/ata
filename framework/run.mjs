// AVF runner (CLI shell) — parses argv, loads the benchmark package + engine adapter,
//   node run.mjs <hypothesis> <engine@version>       e.g. node run.mjs h3 resolution@v0.2
// then hands both to the pure kernel (kernel.mjs) and writes the report. All evaluation
// logic lives in the kernel; this file only does IO. A hypothesis is added with ONLY:
// benchmark/<h>/ (a package with load.mjs) and an engine adapter under engines/<name>/.
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { evaluate, FRAMEWORK_VERSION } from './kernel.mjs';
import { toEntry } from '../run-log/model.mjs';
import { appendEntry } from '../run-log/store.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Run one hypothesis against one engine@version. Loads the benchmark package + engine adapter, hands
// both to the pure kernel, writes reports/<h>_<eng>_<ver>.{json,txt}, and returns { verdict, txt }.
// This is the public entry the CLI (bin/avf.mjs) calls; the file stays runnable directly (main-guard).
export async function run(hyp, engineSpec) {
  if (!hyp || !engineSpec) throw new Error('usage: avf run <hypothesis> <engine@version>');
  const [engName, engVer] = engineSpec.split('@');

  // Layer 2: load the benchmark package (each package owns its own loader).
  const pkg = await import(pathToFileURL(resolve(ROOT, 'benchmark', hyp, 'load.mjs')).href);
  const bench = await pkg.load();                       // { schema_version, hypothesis:{id,name,verdict}, cases:[...] }
  // Layer 3: load the engine adapter.
  const { engine } = await import(pathToFileURL(resolve(ROOT, 'engines', engName, (engVer || 'v0').replace(/\./g, '_') + '.mjs')).href);

  // Layer 1 + 4: the kernel evaluates; the shell stamps run identity + writes the report.
  const verdict = {
    run: { run_id: randomUUID(), timestamp: new Date().toISOString(),
      framework_version: FRAMEWORK_VERSION, schema_version: bench.schema_version },
    ...evaluate({ bench, engine, engName, engVer }),
  };

  await mkdir(resolve(ROOT, 'reports'), { recursive: true });
  const base = `${hyp}_${engName}_${engVer}`;
  await writeFile(resolve(ROOT, 'reports', base + '.json'), JSON.stringify(verdict, null, 2));
  const c = verdict.counts, iv = verdict.implementation;
  const txt = `AVF — ${verdict.benchmark.name}
${'='.repeat(62)}
HYPOTHESIS  ${verdict.benchmark.hypothesis}: ${verdict.benchmark.verdict}   [benchmark-owned]
ENGINE      ${iv.engine}  (${iv.kind})
  regression ${c.preserved}/${c.regression} · guard ${c.held}/${c.guard} · refutation ${c.survived}/${c.refutation} · critical-wrong ${iv.critical_confident_wrong}
${'-'.repeat(62)}
IMPLEMENTATION VERDICT: ${iv.verdict}${iv.reason ? ' — ' + iv.reason : ''}
${'='.repeat(62)}
run ${verdict.run.run_id.slice(0, 8)} · framework ${FRAMEWORK_VERSION} · schema ${bench.schema_version} · ${verdict.run.timestamp}
${verdict.cases.map(r => `  [${r.role.padEnd(10)}] ${r.id.padEnd(9)} oracle=${r.oracle.padEnd(14)} decision=${r.decision.padEnd(14)} -> ${r.status}`).join('\n')}`;
  await writeFile(resolve(ROOT, 'reports', base + '.txt'), txt);

  // Machine history: append ONE RunLogEntry as the LAST side effect of the pipeline. The report is the
  // primary artifact; this append is secondary and best-effort — a failure costs a single line of history,
  // never the report or the run's success, so it is caught and never rolled back (run-log contract §7).
  // run() is the sole writer of the run log; the entry is a pure projection of the verdict above.
  try { await appendEntry(toEntry(verdict), ROOT); } catch (e) { console.error(`run-log: append skipped — ${e.message}`); }
  return { verdict, txt };
}

// Runnable directly: node framework/run.mjs <hypothesis> <engine@version>
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [hyp, engineSpec] = process.argv.slice(2);
  try { console.log((await run(hyp, engineSpec)).txt); }
  catch (e) { console.error(e.message); process.exit(1); }
}
