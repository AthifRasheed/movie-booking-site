// GET /api/movies — public list of bookable movies for the customer site.
import { ok, fail, callAppsScript } from '../lib/utils.js';

export async function onRequestGet(context) {
  try {
    const movies = await callAppsScript(context.env, 'listMovies', {}, 'GET');
    return ok(movies);
  } catch (err) {
    return fail(err.message || 'Could not load movies right now.', 502);
  }
}
