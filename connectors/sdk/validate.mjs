// Connector Validation — a connector is well-formed and EVERY pure stage (normalize,
// materialize) obeys the same laws. This is the connector analogue of the kernel's
// benchmark `validate()`. normalize() must obey exactly the laws materialize() does.
import { deepEqual, deepFreeze } from './util.mjs';

export function validateConnector(c) {
  const errs = [];
  if (!c || typeof c !== 'object') errs.push('connector must be an object');
  if (!c?.id) errs.push('missing id');
  if (!c?.version) errs.push('missing version');
  if (typeof c?.fetch !== 'function') errs.push('fetch must be a function (source -> Fetched)');
  if (typeof c?.materialize !== 'function') errs.push('materialize must be a function (canonical -> input)');
  if (c && 'normalize' in c && typeof c.normalize !== 'function') errs.push('normalize, if present, must be a function (raw -> canonical)');
  if (errs.length) throw new Error(`connector ${c?.id || '?'}: ` + errs.join('; '));
  return true;
}

// A pure stage: deterministic AND does not mutate its input — the audit guarantee, so the
// same input always replays to the same output and the input is preserved for the record.
export function checkStagePure(fn, input, id, label) {
  const before = JSON.parse(JSON.stringify(input));
  const o1 = fn(input), o2 = fn(input);
  if (!deepEqual(o1, o2)) throw new Error(`connector ${id}: ${label} is non-deterministic`);
  if (!deepEqual(input, before)) throw new Error(`connector ${id}: ${label} mutated its input (must be pure)`);
  return true;
}

// Referential Transparency — stronger than the after-the-fact compare: the stage is run on
// a DEEP-FROZEN input. If it so much as tries to write, strict mode throws and the connector
// is rejected BEFORE it can do damage.
export function checkStageRefTransparent(fn, input, id, label) {
  const frozen = deepFreeze(structuredClone(input));
  try { fn(frozen); }
  catch (e) { throw new Error(`connector ${id}: ${label} is not referentially transparent (writes to its input) — ${e.message}`); }
  return true;
}

// Validate the whole pure pipeline: normalize (if present) on raw, then materialize on the
// canonical it produces. fetch() is NOT checked here — it is the IO stage by design.
export function checkPipelinePurity(connector, raw) {
  const id = connector.id;
  let canonical = raw;
  if (typeof connector.normalize === 'function') {
    checkStagePure(connector.normalize, raw, id, 'normalize');
    checkStageRefTransparent(connector.normalize, raw, id, 'normalize');
    canonical = connector.normalize(raw);
  }
  checkStagePure(connector.materialize, canonical, id, 'materialize');
  checkStageRefTransparent(connector.materialize, canonical, id, 'materialize');
  return true;
}
