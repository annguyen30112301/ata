// referential@v0.2 — reality-hardened. Real ADO data (work items 9288 backend, 9634 mobile) showed
// that a PR-validation build tests the PR's SOURCE commit (the merge preview), not the final merge
// commit. So a test's build commit is valid if it is EITHER the PR's merge commit OR its source
// commit. Same reference-resolution primitive as v0.1 — just a correct model of "the PR's commit".
export const engine = {
  id: 'referential', version: 'v0.2', kind: 'reference-resolution (merge-or-source)',
  capabilities: ['referential', 'lineage', 'pr-source-aware'],
  evaluate({ target_work_item, pr, build, test }) {
    if (!pr || !build || !test) return { decision: 'DEFER', version: 'v0.2' };
    if (test.ref_build !== build.id) return { decision: 'DEFER', version: 'v0.2' };     // dangling test -> build
    const testCommit = build.ref_commit;
    if (testCommit == null) return { decision: 'DEFER', version: 'v0.2' };
    const prCommits = new Set([pr.ref_commit, pr.ref_source_commit].filter(Boolean));   // a PR "owns" merge + source
    if (!prCommits.size) return { decision: 'DEFER', version: 'v0.2' };
    if (!prCommits.has(testCommit)) return { decision: 'MISMATCH', version: 'v0.2' };   // built neither of the PR's commits
    if (pr.ref_work_item !== target_work_item) return { decision: 'MISMATCH', version: 'v0.2' };
    return { decision: 'CONSISTENT', version: 'v0.2' };
  },
};
