// GET /api/admin/session — lets the admin pages check "am I still logged in?"
// _middleware.js already rejects this route with 401 if the cookie is missing/invalid,
// so simply reaching this handler means the session is valid.
import { ok } from '../../lib/utils.js';

export async function onRequestGet(context) {
  return ok({ loggedIn: true });
}
