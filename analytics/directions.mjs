// Direction vocabularies — the CLOSED enums TrendMetrics assigns to `direction`
// (docs/trend-metrics.contract.md §5). A LEAF module: it imports nothing and touches no I/O, so a consumer that
// needs only the vocabulary depends on this alone. That is what lets Decision read a `direction` value while
// CONSUMING the AnalyticsSnapshot only — its dependency graph reaches this leaf, never analytics/model.mjs with
// its evidence-reading code (docs/adr/0003, the Consumes row: Decision consumes the DTO, not the model).
export const VERDICT_DIRECTION = Object.freeze({ TOWARD: 'toward_supported', AWAY: 'away_from_supported', UNCHANGED: 'unchanged', INSUFFICIENT: 'insufficient' });
export const CCW_DIRECTION = Object.freeze({ FALLING: 'falling', RISING: 'rising', FLAT: 'flat', INSUFFICIENT: 'insufficient' });
