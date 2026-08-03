// Connector Test Fixtures harness — EVERY connector is tested the SAME way, regardless
// of whether it wraps HTML, JSON, Azure DevOps or Jira. A fixture carries canned `raw`
// (already fetched), so the pure pipeline — normalize()/materialize() — is tested with no
// network/file. An optional `expect_canonical` also pins the normalize() output.
import { validateConnector, checkPipelinePurity } from './validate.mjs';
import { transform, canonicalize } from './collect.mjs';
import { deepEqual } from './util.mjs';

// fixtures: [{ name, raw, expect, expect_canonical? }]  ->  [{ name, pass, err, got }]
export function runConnectorFixtures(connector, fixtures) {
  validateConnector(connector);
  return fixtures.map(f => {
    let err = null, got;
    try {
      checkPipelinePurity(connector, f.raw);                 // normalize + materialize obey the laws
      if (f.expect_canonical && !deepEqual(canonicalize(connector, f.raw), f.expect_canonical)) err = 'canonical != expect_canonical';
      got = transform(connector, f.raw);
      if (!err && !deepEqual(got, f.expect)) err = 'materialized output != expect';
    } catch (e) { err = e.message; }
    return { name: f.name, pass: !err, err, got };
  });
}
