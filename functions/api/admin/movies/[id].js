// PUT /api/admin/movies/:id — edit a movie, or flip archive/bookingsOpen flags.
// Same endpoint handles all three because they're all "change some fields on
// this movie row" — the admin UI just sends whichever fields changed.
import { ok, fail, callAppsScript, cleanText } from '../../../lib/utils.js';

const EDITABLE_TEXT = ['title', 'posterUrl', 'posterPublicId', 'date', 'time', 'venue'];
const EDITABLE_NUMBER = ['pricePerTicket', 'capacityTotal'];

export async function onRequestPut(context) {
  const id = context.params.id;
  let body;
  try {
    body = await context.request.json();
  } catch {
    return fail('Invalid request.');
  }

  const payload = { id };
  EDITABLE_TEXT.forEach((field) => {
    if (body[field] !== undefined) payload[field] = cleanText(body[field], field === 'posterUrl' || field === 'posterPublicId' ? 500 : 200);
  });
  EDITABLE_NUMBER.forEach((field) => {
    if (body[field] !== undefined) payload[field] = Number(body[field]);
  });
  if (body.bookingsOpen !== undefined) payload.bookingsOpen = Boolean(body.bookingsOpen);
  if (body.status !== undefined && ['active', 'archived'].includes(body.status)) payload.status = body.status;

  try {
    const data = await callAppsScript(context.env, 'updateMovie', payload);
    return ok(data);
  } catch (err) {
    return fail(err.message || 'Could not update the movie.', 502);
  }
}
