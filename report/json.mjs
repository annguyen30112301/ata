// Report view — canonical JSON (for an API, storage, or another tool). When a gate Ruling is supplied
// it rides alongside the report under `ruling`, so a consumer gets both the evidence and the action.
export const toJson = (report, ruling) => JSON.stringify(ruling ? { ...report, ruling } : report, null, 2);
