// POST /api/admin/upload-signature — the browser never sees the Cloudinary
// API secret. Instead we sign a short-lived upload request here, and the
// browser uploads the poster directly to Cloudinary using that signature.
import { ok, fail } from '../../lib/utils.js';

const UPLOAD_FOLDER = 'movie-posters';

export async function onRequestPost(context) {
  const { env } = context;
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return fail('Server misconfigured: Cloudinary keys not set.', 500);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${UPLOAD_FOLDER}&timestamp=${timestamp}`;
  const signature = await sha1Hex(paramsToSign + env.CLOUDINARY_API_SECRET);

  return ok({
    timestamp,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder: UPLOAD_FOLDER,
  });
}

async function sha1Hex(message) {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
