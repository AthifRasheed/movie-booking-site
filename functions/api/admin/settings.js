// /api/admin/settings — GET current cinema/bank/WhatsApp/Viber settings, PUT to change them.
import { ok, fail, callAppsScript, cleanText } from '../../lib/utils.js';

const ALLOWED_KEYS = ['cinemaName', 'bankAccountName', 'bankAccountNumber', 'bankName', 'whatsappNumber', 'viberNumber'];

export async function onRequestGet(context) {
  try {
    const data = await callAppsScript(context.env, 'getSettings', {}, 'GET');
    return ok(data);
  } catch (err) {
    return fail(err.message || 'Could not load settings.', 502);
  }
}

export async function onRequestPut(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return fail('Invalid request.');
  }

  const payload = {};
  ALLOWED_KEYS.forEach((key) => {
    if (body[key] !== undefined) payload[key] = cleanText(body[key], 200);
  });

  try {
    const data = await callAppsScript(context.env, 'updateSettings', payload);
    return ok(data);
  } catch (err) {
    return fail(err.message || 'Could not save settings.', 502);
  }
}
