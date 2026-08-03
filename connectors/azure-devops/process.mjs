// ADO Process extractor — seeds a Knowledge Package from the ORG's real work-item-type config:
// states + their stateCategory (Proposed / InProgress / Resolved / Completed / Removed). This makes
// the oracle rest on the system's actual configuration, not on memory. But extraction is only a
// DRAFT (confirmed:false); a human must review the allowed transitions and ratify (confirmed:true).
import { requireEnv, basicAuth, jsonHeaders, get } from '../integration/index.mjs';
import { connector as json } from '../json/index.mjs';

const normState = v => json.normalize({ state: v }).state;   // reuse the one normalize (lowercase)
export const slug = name => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// fetch (IO) — the list of work-item types in the project.
export async function fetchWorkItemTypes(source, opts = {}) {
  const { org, project } = source;
  if (!org || !project) throw new Error('ado.fetchWorkItemTypes: needs { org, project }');
  const headers = jsonHeaders(basicAuth(requireEnv(opts.env || process.env, 'AZDO_PAT')));
  const url = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_apis/wit/workitemtypes?api-version=7.0`;
  const { json: body } = await get(url, headers, opts);
  return body;
}

// PURE — the type names from the types response.
export const parseWorkItemTypes = raw => (raw.value || []).map(t => t.name).filter(Boolean);

// fetch (IO) — every work-item type's lifecycle in one pass. Returns one DRAFT package per type.
export async function fetchAll(source, opts = {}) {
  const types = parseWorkItemTypes(await fetchWorkItemTypes(source, opts));
  const drafts = [];
  for (const type of types) {
    const raw = await fetchStates({ ...source, type }, opts);
    drafts.push(toLifecycleDraft(raw, { id: `${slug(source.org)}-${slug(type)}`, type, org: source.org, project: source.project }));
  }
  return drafts;
}

// fetch (IO) — the states of one work-item type, via the project-scoped states API.
export async function fetchStates(source, opts = {}) {
  const { org, project, type } = source;
  if (!org || !project || !type) throw new Error('ado.fetchStates: needs { org, project, type }');
  const headers = jsonHeaders(basicAuth(requireEnv(opts.env || process.env, 'AZDO_PAT')));
  const url = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_apis/wit/workitemtypes/${encodeURIComponent(type)}/states?api-version=7.0`;
  const { json: body } = await get(url, headers, opts);
  return body;
}

// PURE — turn the raw states response into a DRAFT Knowledge Package. `states` + `categories` are
// FACTS from config. `allowed` is deliberately LEFT EMPTY: Azure DevOps has no static allowed-transition
// table (transitions are effectively any->any, gated at write time by revision/rules/permissions), so
// `allowed` is not extractable data — it is ORGANIZATION POLICY that only a human can declare.
// `observed.transitions` (optional, derived from item history) is EVIDENCE that a transition has
// happened — which is not the same as it being permitted. confirmed:false until a human ratifies.
export function toLifecycleDraft(rawStates, { id = 'extracted', type, org, project, observed = [] } = {}) {
  const states = (rawStates.value || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const names = states.map(s => normState(s.name));
  const categories = Object.fromEntries(states.map(s => [normState(s.name), s.stateCategory]));
  return {
    id,
    dimension: 'lifecycle',
    source: `azure-devops:${org || '?'}/${project || '?'}`,
    confirmed: false,
    provenance: { method: 'ado-process-api', extracted_from: `wit/workitemtypes/${type || '?'}/states` },
    policy: { mode: 'permissive' },                         // ADO is permissive (any->any); the human declares only what is FORBIDDEN
    lifecycle: { states: names, forbidden: [] },            // forbidden = ORACLE knowledge — a human declares the policy bans
    categories,
    observed: { states: names, transitions: observed },     // EVIDENCE from history — observed != forbidden/allowed
    note: "DRAFT from ADO config. `states` are facts. ADO has no static allowed-transitions (any->any, gated by revision/rules), so this uses policy.mode=permissive: everything is VALID EXCEPT edges you list in lifecycle.forbidden. Declare the few forbidden edges (organization policy), set confirmed:true, rename to lifecycle.json. Cases are generated. `observed.transitions` are transitions seen in history: evidence, not permission.",
  };
}
