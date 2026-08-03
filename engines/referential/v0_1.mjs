// referential@v0.1 — resolves the reference chain. It FOLLOWS test -> build -> commit and checks
// that commit is the one the PR merged, and that the PR targets the given work item. A dangling
// reference (a referenced evidence not in the set) means it cannot resolve -> DEFER. Only when the
// whole chain converges on one object -> CONSISTENT; a resolved-but-divergent reference -> MISMATCH.
// This is the new primitive: reference resolution across evidence, not flat field equality.
export const engine = {
  id: 'referential', version: 'v0.1', kind: 'reference-resolution', capabilities: ['referential', 'lineage'],
  evaluate({ target_work_item, pr, build, test }) {
    if (!pr || !build || !test) return { decision: 'DEFER', version: 'v0.1' };          // missing core evidence
    if (test.ref_build !== build.id) return { decision: 'DEFER', version: 'v0.1' };     // dangling: test -> build unresolved
    const testCommit = build.ref_commit;                                                // resolve test -> build -> commit
    if (testCommit == null || pr.ref_commit == null) return { decision: 'DEFER', version: 'v0.1' };
    if (testCommit !== pr.ref_commit) return { decision: 'MISMATCH', version: 'v0.1' }; // test built a different commit than the PR
    if (pr.ref_work_item !== target_work_item) return { decision: 'MISMATCH', version: 'v0.1' };  // PR targets a different work item
    return { decision: 'CONSISTENT', version: 'v0.1' };                                 // references converge on one object
  },
};
