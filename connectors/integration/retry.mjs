// Shared Integration Runtime — retry. Reused by every live connector (ADO, Jira, …) so the
// backoff logic lives in ONE place. A stage marks a failure retryable by throwing TransientError;
// anything else (auth, 404, bad request) propagates immediately.
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export class TransientError extends Error {}

export async function withRetry(fn, { retries = 3, backoffMs = 200 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(attempt); }
    catch (e) {
      if (!(e instanceof TransientError) || attempt >= retries) throw e;
      await sleep(backoffMs * (attempt + 1));           // linear backoff
    }
  }
}
