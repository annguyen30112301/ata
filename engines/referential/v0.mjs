// referential@v0 — weak: trusts the test result and never follows any reference. The classic
// "green test = good" mistake, ignoring WHETHER the test built the right commit for the right work
// item. The H5 benchmark refutes exactly this: a PASS on a different commit / different work item /
// dangling build must NOT read as CONSISTENT.
export const engine = {
  id: 'referential', version: 'v0', kind: 'trust-the-result', capabilities: ['referential'],
  evaluate({ test }) {
    return { decision: test?.result === 'PASS' ? 'CONSISTENT' : 'MISMATCH', version: 'v0' };
  },
};
