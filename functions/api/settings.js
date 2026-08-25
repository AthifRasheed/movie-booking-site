// GET /api/settings — a small PUBLIC subset of settings for the customer site
// (just the cinema name for the page header). Bank details etc. are only ever
// sent back as part of a booking confirmation, never exposed as a general read.
import { ok, fail, callAppsScript } from '../lib/utils.js';

export async function onRequestGet(context) {
  try {
    const data = await callAppsScript(context.env, 'getSettings', {}, 'GET');
    return ok({ cinemaName: data.cinemaName || '' });
  } catch (err) {
    return fail(err.message || 'Could not load settings.', 502);
  }
}
