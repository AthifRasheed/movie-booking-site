// GET /api/admin/bookings?query=&bookingStatus=&paymentStatus=&movieId=
import { ok, fail, callAppsScript, cleanText } from '../../lib/utils.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const params = {
    query: cleanText(url.searchParams.get('query') || '', 100),
    bookingStatus: cleanText(url.searchParams.get('bookingStatus') || '', 20),
    paymentStatus: cleanText(url.searchParams.get('paymentStatus') || '', 20),
    movieId: cleanText(url.searchParams.get('movieId') || '', 50),
  };
  try {
    const data = await callAppsScript(context.env, 'listBookingsAdmin', params, 'GET');
    return ok(data);
  } catch (err) {
    return fail(err.message || 'Could not load bookings.', 502);
  }
}
