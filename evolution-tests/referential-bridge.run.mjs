// Go-live referential bridge — H5 on real ADO. Structure discovered from real data: a parent work
// item usually has NO PR; the PRs live on its CHILD tasks (each handling a part). So this runner
// fans out ONE level: tested item + its direct children -> every PR on them -> a chain per PR
//   (PR -> validation build via refs/pull/{prId}/merge -> test run) -> a per-PR verdict, plus an
// aggregate. Related/child items without a PR are simply skipped. PAT scopes: Work Items, Code,
// Build, Test (all Read).
//   PowerShell:  $env:AZDO_PAT="<pat>"; node evolution-tests/referential-bridge.run.mjs <org> <project> <workItemId>
import { requireEnv, basicAuth, jsonHeaders, get } from '../connectors/integration/index.mjs';
import { toReferenceGraph, prRefsFromWorkItem, linkedIdsFromWorkItem } from '../connectors/azure-devops/references.mjs';
import { engine as referential } from '../engines/referential/v0_3.mjs';

const [org, project, a3, a4, a5, a6] = process.argv.slice(2);
if (!org || !project || !a3) {
  console.error('usage: AZDO_PAT=<pat> node evolution-tests/referential-bridge.run.mjs <org> <project> <workItemId>');
  console.error('   or: ... <org> <project> pr <prId> <repoGuid> [prProjectGuid]   (validate one PR directly)');
  process.exit(1);
}
const prDirect = a3 === 'pr';
const workItemId = prDirect ? undefined : a3;
const H = jsonHeaders(basicAuth(requireEnv(process.env, 'AZDO_PAT')));
const orgBase = `https://dev.azure.com/${encodeURIComponent(org)}/_apis`;
const witBase = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_apis`;
const tryGet = async url => { try { return (await get(url, H)).json; } catch { return undefined; } };
const fetchWi = id => tryGet(`${witBase}/wit/workItems/${encodeURIComponent(id)}?$expand=relations&api-version=7.0`);

// Assemble PR -> validation build (by sourceBranch refs/pull/{prId}/merge) -> test run, then judge.
async function judgeChain(ownerWiId, prRef, opts = {}) {
  const prBase = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(prRef.project)}/_apis`;
  const pull_request = await tryGet(`${orgBase}/git/repositories/${encodeURIComponent(prRef.repo)}/pullRequests/${encodeURIComponent(prRef.prId)}?api-version=7.0`);
  if (pull_request && !pull_request.workItemRefs) pull_request.workItemRefs = [{ id: String(ownerWiId) }];
  const branch = `refs/pull/${prRef.prId}/merge`;
  // Query the PR's branch directly (finds an old build even beyond the recent page — unless retention purged it).
  let build = (await tryGet(`${prBase}/build/builds?api-version=7.0&branchName=${encodeURIComponent(branch)}&$top=1&queryOrder=finishTimeDescending`))?.value?.[0];
  let branchSamples;
  if (!build) {                                    // diagnose: what branches DO exist (retention? no PR-CI?)
    const recent = await tryGet(`${prBase}/build/builds?api-version=7.0&repositoryId=${encodeURIComponent(prRef.repo)}&repositoryType=TfsGit&$top=200&queryOrder=finishTimeDescending`);
    branchSamples = [...new Set((recent?.value || []).map(b => b.sourceBranch))].slice(0, 6);
  }
  let test_run;
  if (opts.testRunId) {                            // manual override: settles "no tests" vs "discovery gap"
    test_run = await tryGet(`${prBase}/test/runs/${encodeURIComponent(opts.testRunId)}?api-version=7.0`);
  } else if (build?.id) {
    // buildIds= filter is unreliable (returns an arbitrary run); buildUri= actually scopes to the build.
    const buildUri = build.uri || `vstfs:///Build/Build/${build.id}`;
    const runs = await tryGet(`${prBase}/test/runs?api-version=7.0&buildUri=${encodeURIComponent(buildUri)}`);
    const match = (runs?.value || []).find(r => String(r.build?.id) === String(build.id)) || runs?.value?.[0];
    test_run = match?.id ? await tryGet(`${prBase}/test/runs/${match.id}?api-version=7.0`) : undefined;
  }
  const graph = toReferenceGraph({ work_item: { id: ownerWiId }, pull_request, build, test_run });
  const verdict = referential.evaluate(graph).decision;
  const reason = !pull_request ? 'PR not fetched (Code:Read scope?)'
    : !build ? `no build for ${branch} — likely purged by retention (old PR) or the repo has no PR-CI; see available_build_branches`
    : !test_run ? 'no test run for that build (Test:Read scope?)'
    : null;
  return { owner_work_item: String(ownerWiId), prId: prRef.prId, buildId: build?.id, buildBranch: build?.sourceBranch, testRunId: test_run?.id, verdict, ...(reason ? { reason } : {}), ...(branchSamples ? { available_build_branches: branchSamples } : {}) };
}

try {
  if (prDirect) {                                  // validate one PR's chain directly (owner = the PR's work item)
    const prRef = { project: a6 || project, repo: a5, prId: a4 };
    if (!prRef.repo || !prRef.prId) { console.error('pr mode: need <prId> <repoGuid>'); process.exit(1); }
    const wis = await tryGet(`${orgBase}/git/repositories/${encodeURIComponent(prRef.repo)}/pullRequests/${encodeURIComponent(prRef.prId)}/workitems?api-version=7.0`);
    const ownerWiId = wis?.value?.[0]?.id || 'unknown';
    const chain = await judgeChain(ownerWiId, prRef, { testRunId: process.argv[8] });   // optional trailing testRunId override
    console.log(JSON.stringify({ mode: 'pr-direct', hypothesis: 'H5', engine: 'referential@v0.3', chain }, null, 2));
    process.exit(0);
  }

  const target = await fetchWi(workItemId);
  // one level out: the tested item + its child tasks (Hierarchy-Forward) + related items (Related)
  const owners = [{ id: workItemId, wi: target }];
  for (const lid of linkedIdsFromWorkItem(target)) { const l = await fetchWi(lid); if (l) owners.push({ id: lid, wi: l }); }

  const chains = [];
  for (const o of owners) for (const prRef of prRefsFromWorkItem(o.wi)) chains.push(await judgeChain(o.id, prRef));

  const verdicts = chains.map(c => c.verdict);
  const overall = !chains.length ? 'DEFER'
    : verdicts.includes('MISMATCH') ? 'MISMATCH'
    : verdicts.every(v => v === 'CONSISTENT') ? 'CONSISTENT'
    : 'DEFER';   // some parts unresolved
  console.log(JSON.stringify({
    source: `azure-devops:${org}/${project}/wit/${workItemId}`, hypothesis: 'H5', engine: 'referential@v0.3',
    tested_work_item: String(workItemId), linked: owners.slice(1).map(o => o.id),
    chains, overall,
    ...(chains.length ? {} : { note: 'no PR found on the item or its child/related items (nothing to validate)' }),
  }, null, 2));
} catch (e) {
  console.error('REFERENTIAL LIVE FAILED:', e.message);
  process.exit(1);
}
