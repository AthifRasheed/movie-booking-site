// POST /api/admin/upload-signature — the browser never sees the Cloudinary
// API secret. Instead we sign a short-lived upload request here, and the
// browser uploads the file directly to Cloudinary using that signature.
//
// Used for movie posters (the original use) and now also expense receipts — the
// caller picks which via `kind` in the request body; anything unrecognized falls
// back to 'poster' so the existing poster-upload call (which sends no body) is
// unaffected.
import { ok, fail } from '../../lib/utils.js';

const UPLOAD_FOLDERS = {
  poster: 'movie-posters',
  receipt: 'expense-receipts',
};

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return fail('Server misconfigured: Cloudinary keys not set.', 500);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // No body (or an empty one) is fine — it just means "poster", same as before.
  }
  const kind = Object.prototype.hasOwnProperty.call(UPLOAD_FOLDERS, body.kind) ? body.kind : 'poster';
  const folder = UPLOAD_FOLDERS[kind];

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = await sha1Hex(paramsToSign + env.CLOUDINARY_API_SECRET);

  return ok({
    timestamp,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder,
  });
}

async function sha1Hex(message) {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

