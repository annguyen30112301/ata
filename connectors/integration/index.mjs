// Integration Kernel — the core of the Integration phase, mirroring the Foundation kernel. One
// import point for every live connector. It owns HOW to talk to the outside world (auth · transport
// · retry · pagination); it knows NOTHING about any source (Azure DevOps, Jira, GitHub) — no
// vocabulary, no meaning. Swap the HTTP client, the retry strategy, or the OAuth impl here and every
// connector benefits. A connector that must copy retry/auth/pagination is a signal the kernel is
// incomplete — the Integration analogue of the Foundation-completeness guard.
export { withRetry, TransientError, sleep } from './retry.mjs';
export { basicAuth, basicAuthUser, bearer, jsonHeaders, requireEnv } from './auth.mjs';
export { defaultTransport, getOnce, get } from './transport.mjs';
export { getAllPages } from './pagination.mjs';
