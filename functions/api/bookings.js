// POST /api/bookings — create a booking. This is the one true "buy" action
// on the whole site, so every check here is deliberate: rate-limited,
// validated, and passed to Apps Script which does the real locking.
import { ok, fail, callAppsScript, cleanText, isValidName, isValidPhone, isValidTicketCount, rateLimit, clientIp } from '../lib/utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const { limited } = await rateLimit(env, `booking:${clientIp(request)}`, 5, 60);
  if (limited) return fail('Too many attempts. Please wait a minute and try again.', 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const customerName = cleanText(body.customerName, 100);
  const customerPhone = cleanText(body.customerPhone, 30);
  const movieId = cleanText(body.movieId, 50);
  const ticketCount = Number(body.ticketCount);
  const idempotencyKey = cleanText(body.idempotencyKey, 100);

  if (!isValidName(customerName)) return fail('Please enter your full name.');
  if (!isValidPhone(customerPhone)) return fail('Please enter a valid phone number.');
  if (!movieId) return fail('Please choose a movie.');
  if (!isValidTicketCount(ticketCount)) return fail('Ticket count must be between 1 and 10.');

  try {
    const data = await callAppsScript(env, 'createBooking', {
      customerName, customerPhone, movieId, ticketCount, idempotencyKey,
    });
    return ok(data);
  } catch (err) {
    return fail(err.message || 'Could not complete your booking.', 502);
  }
}
