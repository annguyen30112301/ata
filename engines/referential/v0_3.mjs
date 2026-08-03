// referential@v0.3 — reality-hardened again. Live ADO (9288/9634/9060) showed PR-validation builds run
// on refs/pull/{prId}/merge, a merge-preview commit equal to NEITHER the PR's source nor merge commit.
// So commit-SHA matching (v0.1/v0.2) cannot work; the reliable build->PR link is the PR id carried in
// build.sourceBranch. v0.3 follows THAT reference: the test's build must belong to the PR that the work
// item links. (Commit matching is kept only as a fallback for the abstract fixture, which has no PR-ref.)
export const engine = {
  id: 'referential', version: 'v0.3', kind: 'reference-resolution (pr-ref)',
  capabilities: ['referential', 'lineage', 'pr-ref'],
  evaluate({ target_work_item, pr, build, test }) {
    if (!pr || !build || !test) return { decision: 'DEFER', version: 'v0.3' };
    if (test.ref_build !== build.id) return { decision: 'DEFER', version: 'v0.3' };     // dangling test -> build
    // Primary, reliable ADO link: the build belongs to a PR (via sourceBranch).
    if (build.ref_pr != null) {
      if (String(build.ref_pr) !== String(pr.id)) return { decision: 'MISMATCH', version: 'v0.3' };   // built for a different PR
      if (pr.ref_work_item !== target_work_item) return { decision: 'MISMATCH', version: 'v0.3' };
      return { decision: 'CONSISTENT', version: 'v0.3' };
    }
    // Fallback (abstract fixture, no PR-ref): commit membership in the PR's merge/source commits.
    const testCommit = build.ref_commit;
    if (testCommit == null) return { decision: 'DEFER', version: 'v0.3' };
    const prCommits = new Set([pr.ref_commit, pr.ref_source_commit].filter(Boolean));
    if (!prCommits.size) return { decision: 'DEFER', version: 'v0.3' };
    if (!prCommits.has(testCommit)) return { decision: 'MISMATCH', version: 'v0.3' };
    if (pr.ref_work_item !== target_work_item) return { decision: 'MISMATCH', version: 'v0.3' };
    return { decision: 'CONSISTENT', version: 'v0.3' };
  },
};
