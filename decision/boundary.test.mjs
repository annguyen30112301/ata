// The Decision Boundary Test — the acceptance proof for the CONSUMES row of the Capability Registry
// (docs/adr/0003): "Decision consumes AnalyticsSnapshot." A behavioral test (decision.test.mjs bar 7) proves the
// model CAN run from a plain object; this proves the stronger, structural claim — the model's whole dependency
// graph touches no evidence and no fs, so it CANNOT read anything but what it is handed. It walks the static
// import graph from decision/model.mjs and asserts what that graph may and may not reach.
//   node decision/boundary.test.mjs
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const HERE = dirname(fileURLToPath(import.meta.url));
const norm = f => f.replace(/\\/g, '/');

// Walk the STATIC import/export-from graph from an entry .mjs: collect every local module it reaches and every
// `node:*` builtin any of them pulls in. Relative specifiers are followed; bare/builtin ones are recorded.
async function importGraph(entry) {
  const files = new Set(), builtins = new Set();
  async function visit(file) {
    if (files.has(file)) return;
    files.add(file);
    const src = await readFile(file, 'utf8');
    const re = /(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) {
      const spec = m[1];
      if (spec.startsWith('.')) await visit(resolve(dirname(file), spec.endsWith('.mjs') ? spec : spec + '.mjs'));
      else builtins.add(spec);
    }
  }
  await visit(entry);
  return { files: [...files].map(norm), builtins: [...builtins] };
}

try {
  console.log('DECISION BOUNDARY — Consumes: the model graph reaches the snapshot, never evidence');
  const g = await importGraph(resolve(HERE, 'model.mjs'));

  ok('graph touches NO fs (cannot read reports/reviews/runs — consumes the snapshot, not evidence)',
    !g.builtins.some(b => b.startsWith('node:fs')), g.builtins.join(', ') || '(no builtins)');
  ok('graph does NOT reach analytics/model.mjs (the evidence-reading model)',
    !g.files.some(f => f.endsWith('/analytics/model.mjs')), g.files.join(', '));
  ok('graph DOES reach the direction vocabulary leaf (that is the only analytics dependency)',
    g.files.some(f => f.endsWith('/analytics/directions.mjs')), g.files.join(', '));
  ok('the direction leaf is a true leaf — it imports nothing',
    !(await importGraph(resolve(HERE, '..', 'analytics', 'directions.mjs'))).builtins.length &&
    (await importGraph(resolve(HERE, '..', 'analytics', 'directions.mjs'))).files.length === 1);

  // The complement: the ORCHESTRATION layer (build.mjs) IS allowed to touch fs — that is where "bytes arrive by
  // I/O" lives. The registry keeps capability (model) and delivery (build) apart; this asserts the split exists.
  const b = await importGraph(resolve(HERE, 'build.mjs'));
  ok('by contrast, decision/build.mjs (orchestration) DOES touch fs — delivery, not capability',
    b.builtins.some(x => x.startsWith('node:fs')), b.builtins.join(', '));
} finally { /* pure over the source tree; nothing to clean up */ }

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
