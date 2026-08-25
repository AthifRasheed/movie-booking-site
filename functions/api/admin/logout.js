import { ok, clearSessionCookie } from '../../lib/utils.js';

export async function onRequestPost() {
  return ok({}, { headers: { 'Set-Cookie': clearSessionCookie() } });
}
