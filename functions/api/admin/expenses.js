// /api/admin/expenses — GET list (filterable), POST to add one.
// Gated by functions/_middleware.js (everything under /api/admin/* requires a valid
// session) — that's the actual security boundary, not anything in this file.
import { ok, fail, callAppsScript, cleanText, verifySession } from '../../lib/utils.js';

const CATEGORIES = ['venue', 'marketing', 'equipment', 'staff', 'transport', 'refreshments', 'other'];

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const params = {
    movieId: cleanText(url.searchParams.get('movieId') || '', 50),
    category: cleanText(url.searchParams.get('category') || '', 40),
    dateFrom: cleanText(url.searchParams.get('dateFrom') || '', 20),
    dateTo: cleanText(url.searchParams.get('dateTo') || '', 20),
    query: cleanText(url.searchParams.get('query') || '', 100),
  };
  try {
    const data = await callAppsScript(context.env, 'listExpensesAdmin', params, 'GET');
    return ok(data);
  } catch (err) {
    return fail(err.message || 'Could not load expenses.', 502);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Apps Script only trusts the shared secret — it has no idea who's logged in. The
  // session is what tells us that, so we resolve it here and pass the username through
  // explicitly as part of the payload (this is also how "createdBy" gets recorded).
  const session = await verifySession(request, env);
  if (!session) return fail('Please log in again.', 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const movieId = cleanText(body.movieId, 50);
  const amount = Number(body.amount);
  const date = cleanText(body.date, 20);
  const category = cleanText(body.category, 40);
  const description = cleanText(body.description, 500);
  const reference = cleanText(body.reference, 200);
  const receiptUrl = cleanText(body.receiptUrl, 500);
  const receiptPublicId = cleanText(body.receiptPublicId, 200);

  if (!movieId) return fail('Please choose a movie.');
  if (!(amount > 0)) return fail('Amount must be greater than 0.');
  if (!date) return fail('Date is required.');
  if (!CATEGORIES.includes(category)) return fail('Please choose a valid category.');

  try {
    const data = await callAppsScript(env, 'addExpense', {
      movieId, amount, date, category, description, reference, receiptUrl, receiptPublicId,
      adminUsername: session.u,
    });
    return ok(data);
  } catch (err) {
    return fail(err.message || 'Could not add the expense.', 502);
  }
}

