// PUT /api/admin/bookings/:id — update payment status, booking status, or notes.
import { ok, fail, callAppsScript, cleanText } from '../../../lib/utils.js';

const PAYMENT_STATUSES = ['Pending', 'Paid'];
const BOOKING_STATUSES = ['Confirmed', 'Cancelled', 'Expired'];

export async function onRequestPut(context) {
  const bookingId = context.params.id;
  let body;
  try {
    body = await context.request.json();
  } catch {
    return fail('Invalid request.');
  }

  const payload = { bookingId };
  if (body.paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(body.paymentStatus)) return fail('Invalid payment status.');
    payload.paymentStatus = body.paymentStatus;
  }
  if (body.bookingStatus !== undefined) {
    if (!BOOKING_STATUSES.includes(body.bookingStatus)) return fail('Invalid booking status.');
    payload.bookingStatus = body.bookingStatus;
  }
  if (body.notes !== undefined) payload.notes = cleanText(body.notes, 500);

  try {
    const data = await callAppsScript(context.env, 'updateBookingStatus', payload);
    return ok(data);
  } catch (err) {
    return fail(err.message || 'Could not update the booking.', 502);
  }
}
