// POST /api/admin/login
import { ok, fail, verifyPassword, createSessionCookie, rateLimit, clientIp, cleanText } from '../../lib/utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;

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
  if (username !== env.ADMIN_USERNAME) return fail('Incorrect username or password.', 401);

  const valid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  if (!valid) return fail('Incorrect username or password.', 401);

  const cookie = await createSessionCookie(env, username);
  return ok({ username }, { headers: { 'Set-Cookie': cookie } });
}
