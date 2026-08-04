#!/usr/bin/env node
// avf — the command-line surface of AVF. It is a THIN dispatcher: it parses argv and calls AVF's
// existing public functions, then formats their output. It owns no evaluation, no rules, no rendering
// logic of its own — every subcommand is a projection of a function that already exists and is tested.
//
//   avf run <hypothesis> <engine@version>     evaluate an engine against a benchmark
//   avf report <report.json> [--format …]     render a kernel report as md|pr|json|sarif|teams (+ optional --gate)
//   avf dashboard                             regenerate the self-contained HTML dashboard
//   avf analytics                             package the AnalyticsSnapshot as analytics/analytics.json
//   avf decision                              package the RecommendationSnapshot as decision/decision.json
//   avf review --reviewer … --decision …      submit a human review of a verdict (append-only oracle)
//   avf simulate [--verdict … --env …]        run a fake verdict through the rule engine (no CI, no connector)
//   avf help
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../framework/run.mjs';
import { buildDashboard } from '../dashboard/build.mjs';
import { buildAnalytics } from '../analytics/build.mjs';
import { buildDecision } from '../decision/build.mjs';
import { submitReview, suggestLearning } from '../oracle/review.mjs';
import { makeReport } from '../report/model.mjs';
import { fromKernelVerdict } from '../report/adapters.mjs';
import { toMarkdown } from '../report/markdown.mjs';
import { toPrComment } from '../report/pr-comment.mjs';
import { toJson } from '../report/json.mjs';
import { toSarif } from '../report/sarif.mjs';
import { toTeamsCard } from '../report/teams.mjs';
import { evaluateRules, exitCodeFor } from '../rules/engine.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Tiny flag parser: `--k v` -> { k: 'v' }, bare `--flag` -> { flag: true }; everything else is positional.
function parseArgs(argv) {
  const flags = {}, positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) flags[a.slice(2)] = true;
      else { flags[a.slice(2)] = next; i++; }
    } else positional.push(a);
  }
  return { flags, positional };
}

// The renderers, keyed by --format. Object renderers are stringified so every format prints as text.
const RENDER = {
  md: (report, ruling) => toMarkdown(report, ruling),
  pr: (report, ruling) => toPrComment(report, ruling),
  json: (report, ruling) => toJson(report, ruling),
  sarif: (report, ruling) => JSON.stringify(toSarif(report, ruling), null, 2),
  teams: (report, ruling) => JSON.stringify(toTeamsCard(report, ruling), null, 2),
};

async function loadRules(path) {
  const file = path ? resolve(process.cwd(), path) : resolve(ROOT, 'rules', 'default.json');
  return JSON.parse(await readFile(file, 'utf8')).rules || [];
}

const USAGE = `avf — Automation Validation Framework

  avf run <hypothesis> <engine@version>     e.g. avf run h3 resolution@v0.2
  avf report <report.json> [options]        render a kernel report
      --format md|pr|json|sarif|teams       (default: md)
      --gate [--env <env>] [--rules <path>] also compute the rule-engine Ruling
  avf dashboard                             regenerate dashboard/index.html
  avf analytics                             write analytics/analytics.json (the snapshot as an artifact)
  avf decision                              write decision/decision.json (recommendations from the snapshot)
  avf review --reviewer <name> --decision confirm|override
             --hypothesis <H> --verdict <V> --reason <text>
             [--human-verdict <V>] [--engine <e>] [--case <id>] [--dry-run]
  avf simulate [--hypothesis <H>] [--verdict <V>] [--env <env>] [--rules <path>] [--format <f>]
  avf help`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags, positional } = parseArgs(rest);

  switch (cmd) {
    case 'run': {
      const { txt } = await run(positional[0], positional[1]);
      console.log(txt);
      return 0;
    }

    case 'report': {
      const path = positional[0];
      if (!path) throw new Error('usage: avf report <report.json> [--format md|pr|json|sarif|teams] [--gate]');
      const raw = JSON.parse(await readFile(resolve(process.cwd(), path), 'utf8'));
      const report = fromKernelVerdict(raw);
      let ruling;
      if (flags.gate) ruling = evaluateRules(report, await loadRules(flags.rules), { env: flags.env });
      const render = RENDER[flags.format === true || !flags.format ? 'md' : flags.format];
      if (!render) throw new Error(`unknown --format '${flags.format}'. one of: ${Object.keys(RENDER).join(', ')}`);
      console.log(render(report, ruling));
      return ruling ? exitCodeFor(ruling) : 0;
    }

    case 'dashboard': {
      const r = await buildDashboard();
      console.log(`wrote ${r.path} — ${r.hypotheses} hypotheses · ${r.engines} engines · ${r.knowledge} knowledge packages · ${r.reviews} oracle reviews`);
      return 0;
    }

    case 'analytics': {
      const r = await buildAnalytics();
      const gate = r.would_block !== null ? ` · ${r.would_block} would-block` : '';
      console.log(`wrote ${r.jsonPath} + analytics.html — ${r.reports} reports · ${r.reviews} reviews${gate}`);
      return 0;
    }

    case 'decision': {
      const r = await buildDecision();
      const n = r.recommendations;
      console.log(`wrote ${r.jsonPath} + decision.html — ${n} recommendation${n === 1 ? '' : 's'}${n === 0 ? ' (silent — no actionable signal)' : ''}`);
      return 0;
    }

    case 'review': {
      const review = await submitReview({
        reviewer: flags.reviewer, decision: flags.decision, reason: flags.reason,
        verdict: flags.verdict, human_verdict: flags['human-verdict'],
        subject: { hypothesis: flags.hypothesis, engine: flags.engine, case_id: flags.case },
      }, { store: !flags['dry-run'] });
      console.log(`${flags['dry-run'] ? 'validated (not stored)' : 'recorded'} review ${review.id.slice(0, 8)} — ${review.decision} ${review.verdict}`);
      console.log('learning suggestion:', JSON.stringify(suggestLearning(review)));
      return 0;
    }

    case 'simulate': {
      // A fabricated verdict straight into the rule engine — the cheapest way to test a gating policy.
      // No connector, no CI, no dashboard: just Verdict → Report → Ruling → render.
      const report = makeReport({
        source: 'simulate',
        results: [{ hypothesis: flags.hypothesis || 'H5', engine: flags.engine || 'simulate', verdict: flags.verdict || 'DEFER', reason: flags.reason || 'simulated verdict' }],
      });
      const ruling = evaluateRules(report, await loadRules(flags.rules), { env: flags.env || 'production' });
      const render = RENDER[flags.format === true || !flags.format ? 'md' : flags.format];
      if (!render) throw new Error(`unknown --format '${flags.format}'. one of: ${Object.keys(RENDER).join(', ')}`);
      console.log(render(report, ruling));
      console.error(`\ngate: ${ruling.action.toUpperCase()} (exit ${exitCodeFor(ruling)}) — ${ruling.reason}`);
      return exitCodeFor(ruling);
    }

    case 'help': case undefined: case '--help': case '-h':
      console.log(USAGE);
      return 0;

    default:
      console.error(`unknown command '${cmd}'\n\n${USAGE}`);
      return 1;
  }
}

main().then(code => process.exit(code)).catch(e => { console.error(e.message); process.exit(1); });
