// Operationalization CLI — turn AVF verdicts into a PR comment + a CI gate.
//   node report/pr-report.mjs <kernelReport.json> [env]
// Reads a kernel verdict (reports/<h>_<engine>_<ver>.json), applies rules/default.json for the given
// env, prints the PR-comment Markdown, and EXITS non-zero if the gate says block (so CI can fail).
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromKernelVerdict } from './adapters.mjs';
import { toPrComment } from './pr-comment.mjs';
import { evaluateRules, exitCodeFor } from '../rules/engine.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [reportPath, env = 'sandbox'] = process.argv.slice(2);
if (!reportPath) { console.error('usage: node report/pr-report.mjs <kernelReport.json> [env]'); process.exit(2); }

const verdict = JSON.parse(await readFile(resolve(process.cwd(), reportPath), 'utf8'));
const rulesFile = JSON.parse(await readFile(resolve(ROOT, 'rules/default.json'), 'utf8'));
const report = fromKernelVerdict(verdict);
const gate = evaluateRules(report, rulesFile.rules, { env });

console.log(toPrComment(report, gate));
console.error(`\n[gate] env=${env} action=${gate.action}${gate.matched.length ? ` (${gate.matched.map(m => m.rule).join('; ')})` : ''}`);
process.exit(exitCodeFor(gate.action));
