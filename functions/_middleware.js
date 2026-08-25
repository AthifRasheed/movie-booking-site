// functions/_middleware.js — runs on every request to the site.
// Adds security headers to every response, and gates /api/admin/* routes
// (other than login) behind a valid session cookie.

import { fail, verifySession } from './lib/utils.js';

const PUBLIC_ADMIN_PATHS = ['/api/admin/login'];

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/admin/') && !PUBLIC_ADMIN_PATHS.includes(url.pathname)) {
    const session = await verifySession(request, context.env);
    if (!session) {
      return withSecurityHeaders(fail('Please log in again.', 401));
    }
  }

  const response = await next();
  return withSecurityHeaders(response);
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' https://res.cloudinary.com data:; " +
    "script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.cloudinary.com; " +
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
