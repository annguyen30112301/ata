// Shared Integration Runtime — auth. Credential shapes reused by every live connector.
// Secrets come from the environment only, never hard-coded, never logged.
export const basicAuth = secret => 'Basic ' + Buffer.from(':' + secret).toString('base64');
export const basicAuthUser = (user, secret) => 'Basic ' + Buffer.from(`${user}:${secret}`).toString('base64');
export const bearer = token => 'Bearer ' + token;
export const jsonHeaders = authorization => ({ Authorization: authorization, Accept: 'application/json' });

export function requireEnv(env, name) {
  const v = env[name];
  if (!v) throw new Error(`integration: ${name} not set in environment`);
  return v;
}
