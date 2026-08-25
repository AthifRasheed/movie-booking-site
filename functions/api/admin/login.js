// POST /api/admin/login
import { ok, fail, verifyPassword, createSessionCookie, rateLimit, clientIp, cleanText } from '../../lib/utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // TEMPORARY DEBUG WRAPPER — remove once login works.
  // Reports the real error message back to the browser instead of a blank 500,
  // so we can see exactly what's failing.
  try {
    const { limited } = await rateLimit(env, `login:${clientIp(request)}`, 5, 15 * 60);
    if (limited) return fail('Too many login attempts. Please wait a while and try again.', 429);

    let body;
    try {
      body = await request.json();
    } catch {
      return fail('Invalid request.');
    }

    const username = cleanText(body.username, 100);
    const password = String(body.password || '');

    if (!username || !password) return fail('Please enter your username and password.');

    if (typeof env.ADMIN_USERNAME !== 'string') {
      return fail('DEBUG: ADMIN_USERNAME env var is missing or not a string. typeof=' + typeof env.ADMIN_USERNAME, 500);
    }
    if (typeof env.ADMIN_PASSWORD_HASH !== 'string' || !env.ADMIN_PASSWORD_HASH.includes(':')) {
      return fail('DEBUG: ADMIN_PASSWORD_HASH env var is missing or malformed. typeof=' + typeof env.ADMIN_PASSWORD_HASH + ' value_preview=' + String(env.ADMIN_PASSWORD_HASH || '').slice(0, 10), 500);
    }
    if (typeof env.SESSION_SECRET !== 'string' || env.SESSION_SECRET.length < 8) {
      return fail('DEBUG: SESSION_SECRET env var is missing or too short. typeof=' + typeof env.SESSION_SECRET, 500);
    }

    if (username !== env.ADMIN_USERNAME) return fail('Incorrect username or password.', 401);

    const valid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
    if (!valid) return fail('Incorrect username or password.', 401);

    const cookie = await createSessionCookie(env, username);
    return ok({ username }, { headers: { 'Set-Cookie': cookie } });
  } catch (err) {
    return fail('DEBUG: ' + (err && err.message ? err.message : String(err)) + ' | stack: ' + (err && err.stack ? err.stack.slice(0, 300) : 'none'), 500);
  }
}
