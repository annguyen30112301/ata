// Azure DevOps connector — proves exactly ONE new capability: EVIDENCE ACQUISITION (fetch).
// Everything downstream is DELEGATED to already-proven components, so no responsibility is
// duplicated:
//
//   raw (ADO payload) --toJson--> plain JSON --json.normalize--> canonical --json.materialize--> input
//        (ADO shape)                (JSON: value normalize)          (JSON: projection)
//
// normalize/materialize logic exists ONLY in the JSON connector. ADO contributes fetch + shape.
import { defineConnector } from '../sdk/contract.mjs';
import { connector as json } from '../json/index.mjs';
import { fetch, fetchFromFixture } from './fetch.mjs';
import { toJson } from './adapter.mjs';

export const connector = defineConnector({
  id: 'azure-devops',
  version: 'v0',
  fetch,                                             // Evidence Acquisition (fetch.mjs)
  fetchFromFixture,
  normalize: raw => json.normalize(toJson(raw)),     // ADO shape, then delegate value-normalize to JSON
  materialize: json.materialize,                     // reuse JSON projection — zero duplication
});
