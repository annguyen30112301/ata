// Jira connector — proves ONE thing: Source Substitution #2. A second, independent source that
// reduces to the SAME canonical through the SAME pipeline below its adapter. It adds only a Jira
// vocabulary adapter + a Jira fetch (over the Integration Kernel); normalize and materialize ARE
// the JSON connector's — literally the same function objects. Zero duplication.
//
//   raw (Jira issue) --toJson--> { state, priority } --json.normalize--> canonical --json.materialize--> input
import { defineConnector } from '../sdk/contract.mjs';
import { connector as json } from '../json/index.mjs';
import { fetch, fetchFromFixture } from './fetch.mjs';
import { toJson } from './adapter.mjs';

export const connector = defineConnector({
  id: 'jira',
  version: 'v0',
  fetch,
  fetchFromFixture,
  normalize: raw => json.normalize(toJson(raw)),   // Jira shape, then delegate value-normalize to JSON
  materialize: json.materialize,                   // SAME function object as ADO — one proof pipeline
});
