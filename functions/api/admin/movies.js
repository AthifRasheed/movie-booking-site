// /api/admin/movies — GET all movies (incl. archived), POST to add one.
import { ok, fail, callAppsScript, cleanText } from '../../lib/utils.js';

export async function onRequestGet(context) {
  try {
    const movies = await callAppsScript(context.env, 'listMoviesAdmin', {}, 'GET');
    return ok(movies);
  } catch (err) {
    return fail(err.message || 'Could not load movies.', 502);
  }
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return fail('Invalid request.');
  }

  const title = cleanText(body.title, 120);
  const date = cleanText(body.date, 20);
  const time = cleanText(body.time, 20);
  const venue = cleanText(body.venue, 80);
  const posterUrl = cleanText(body.posterUrl, 500);
  const posterPublicId = cleanText(body.posterPublicId, 200);
  const pricePerTicket = Number(body.pricePerTicket);
  const capacityTotal = Number(body.capacityTotal);

  if (!title) return fail('Title is required.');
  if (!date) return fail('Date is required.');
  if (!time) return fail('Time is required.');
  if (!(pricePerTicket > 0)) return fail('Price must be greater than 0.');
  if (!(capacityTotal > 0)) return fail('Capacity must be greater than 0.');

  try {
    const data = await callAppsScript(context.env, 'addMovie', {
      title, date, time, venue, posterUrl, posterPublicId, pricePerTicket, capacityTotal,
    });
    return ok(data);
  } catch (err) {
    return fail(err.message || 'Could not add the movie.', 502);
  }
}
