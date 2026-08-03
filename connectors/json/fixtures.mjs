// Canned RAW (already-parsed JSON objects). The three "closed/high" variants differ only
// in FORMAT and must collapse to the SAME canonical + input; the "active/low" row is a
// genuinely different meaning and must stay distinct. That is the normalize proof.
export const fixtures = [
  {
    name: 'ADO-style keys + numeric priority -> canonical {closed, high}',
    raw: { 'System.State': 'Closed', 'System.Priority': 1 },
    expect_canonical: { state: 'closed', priority: 'high' },
    expect: { record: { state: 'closed', priority: 'high' } },
  },
  {
    name: 'plain keys + UPPER priority -> same canonical',
    raw: { state: 'closed', priority: 'HIGH' },
    expect_canonical: { state: 'closed', priority: 'high' },
    expect: { record: { state: 'closed', priority: 'high' } },
  },
  {
    name: 'mixed case -> same canonical',
    raw: { state: 'Closed', priority: 'High' },
    expect_canonical: { state: 'closed', priority: 'high' },
    expect: { record: { state: 'closed', priority: 'high' } },
  },
  {
    name: 'genuinely different meaning stays distinct (active, low)',
    raw: { state: 'Active', priority: 3 },
    expect_canonical: { state: 'active', priority: 'low' },
    expect: { record: { state: 'active', priority: 'low' } },
  },
];

// Semantic Equivalence Sets — the FIXTURE declares equivalence; the connector must collapse.
export const equivalenceSets = [
  {
    name: 'priority High == HIGH == 1 (state closed)',
    equivalent: [
      { 'System.State': 'Closed', 'System.Priority': 1 },
      { state: 'closed', priority: 'HIGH' },
      { state: 'Closed', priority: 'High' },
    ],
    canonical: { state: 'closed', priority: 'high' },
  },
];

// Distinct Sets — declared-different meanings must NOT collapse.
export const distinctSets = [
  {
    name: 'high vs low must stay distinct',
    members: [{ state: 'closed', priority: 'High' }, { state: 'active', priority: 3 }],
  },
];
