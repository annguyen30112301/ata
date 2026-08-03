// ADO Reference Adapter — assembles the H5 reference graph from raw ADO payloads across the
// wit/git/build/test APIs. It knows only ADO's VOCABULARY (where each reference lives: a work item's
// ArtifactLink -> PR, a PR's lastMergeCommit -> commit, a build's sourceVersion -> commit, a test
// run's build -> build). It does NOT decide consistency — that is the engine's reference-resolution
// primitive. Missing pieces stay undefined so the engine DEFERs (a real chain is often incomplete).

// Parse a Pull Request id out of a work item's ArtifactLink (vstfs:///Git/PullRequestId/proj%2Frepo%2FprId).
export function prIdFromWorkItem(wi) {
  return prRefFromWorkItem(wi)?.prId;
}

// The ArtifactLink encodes {projectId}/{repositoryId}/{pullRequestId} — so repo + PR id come FROM the
// work item; the caller does not have to know them. (repositoryId is a GUID, which the git API accepts.)
export function prRefFromWorkItem(wi) {
  return prRefsFromWorkItem(wi)[0];
}

// ALL PR ArtifactLinks on a work item (an item may fix via several PRs).
export function prRefsFromWorkItem(wi) {
  return (wi?.relations || [])
    .filter(r => /PullRequestId/.test(r?.url || ''))
    .map(r => {
      const parts = decodeURIComponent(r.url.split('/').pop()).split('/');   // [project, repo, prId]
      return { project: parts[0], repo: parts[1], prId: parts[parts.length - 1] };
    });
}

// Directly-linked work-item ids (one level): child tasks (Hierarchy-Forward) AND related items
// (Related). A parent's PRs live on its child tasks; some items instead carry the work on a Related
// item. Either way we look exactly one level out. Deduplicated, target excluded by the caller.
export function linkedIdsFromWorkItem(wi) {
  const rels = new Set(['System.LinkTypes.Hierarchy-Forward', 'System.LinkTypes.Related']);
  return [...new Set((wi?.relations || []).filter(r => rels.has(r.rel)).map(r => r.url.split('/').pop()))];
}
// (kept for back-compat)
export const childIdsFromWorkItem = wi =>
  (wi?.relations || []).filter(r => r.rel === 'System.LinkTypes.Hierarchy-Forward').map(r => r.url.split('/').pop());

// A PR-validation build runs on refs/pull/{prId}/merge (a merge-preview commit that equals NEITHER
// the PR's source nor its merge commit). So the reliable build->PR link is the PR id in sourceBranch,
// not a commit SHA.
export function prIdFromBranch(sourceBranch) {
  const m = String(sourceBranch || '').match(/refs\/pull\/(\d+)\//);
  return m ? m[1] : undefined;
}

// A test run's pass/fail — from a simple `outcome` (fixture) or real ADO run counts. (Note: the
// referential verdict itself does not depend on pass/fail; only the weak v0 engine reads it.)
function deriveResult(run) {
  if (run.outcome) return run.outcome === 'Passed' ? 'PASS' : 'FAIL';
  const passed = run.passedTests || 0;
  const failedish = (run.totalTests || 0) - passed - (run.notApplicableTests || 0);
  return (passed > 0 && failedish <= 0 && !(run.unanalyzedTests > 0)) ? 'PASS' : 'FAIL';
}

export function toReferenceGraph({ work_item, pull_request, build, test_run } = {}) {
  return {
    target_work_item: work_item ? String(work_item.id) : undefined,
    pr: pull_request ? {
      id: String(pull_request.pullRequestId),
      ref_work_item: pull_request.workItemRefs?.[0]?.id != null ? String(pull_request.workItemRefs[0].id) : undefined,
      ref_commit: pull_request.lastMergeCommit?.commitId,                 // the final merged commit
      ref_source_commit: pull_request.lastMergeSourceCommit?.commitId,    // the source tip a PR-validation build usually tests
    } : undefined,
    build: build ? { id: String(build.id), ref_commit: build.sourceVersion, ref_pr: prIdFromBranch(build.sourceBranch) } : undefined,
    test: test_run ? {
      id: String(test_run.id),
      ref_build: test_run.build?.id != null ? String(test_run.build.id) : undefined,
      result: deriveResult(test_run),
    } : undefined,
  };
}
