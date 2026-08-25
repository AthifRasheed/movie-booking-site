// functions/lib/utils.js — shared helpers for every Cloudflare Pages Function.

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });
}

export function ok(data, init = {}) {
  return json({ ok: true, data }, init);
}

export function fail(message, status = 400) {
  return json({ ok: false, error: message }, { status });
}

// ---- Calling the Google Apps Script backend ----

export async function callAppsScript(env, action, payload = {}, method = 'POST') {
  if (!env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_SECRET) {
    throw new Error('Server misconfigured: Apps Script URL/secret not set.');
  }
  let res;
  if (method === 'GET') {
    const params = new URLSearchParams({ action, secret: env.APPS_SCRIPT_SECRET });
    Object.entries(payload).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    res = await fetch(`${env.APPS_SCRIPT_URL}?${params.toString()}`);
  } else {
    res = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, secret: env.APPS_SCRIPT_SECRET, payload }),
    });
  }
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || 'Backend error');
  return body.data;
}

// ---- Input validation / sanitization ----

// Strips ASCII control characters (codes 0-31 and 127) by filtering char codes
// directly, rather than a regex literal with unicode escapes.
export function cleanText(value, maxLen = 200) {
  if (value === undefined || value === null) return '';
  let s = String(value).trim().slice(0, maxLen);
  s = Array.from(s).filter((ch) => {
    const code = ch.charCodeAt(0);
    return code > 31 && code !== 127;
  }).join('');
  return s;
}

export function isValidName(name) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100;
}

export function isValidPhone(phone) {
  return typeof phone === 'string' && /^[0-9+()\-\s]{6,20}$/.test(phone.trim());
}

export function isValidTicketCount(n) {
  const num = Number(n);
  return Number.isInteger(num) && num >= 1 && num <= 10;
}

// ---- Sessions (signed cookie, HMAC-SHA256) ----

const encoder = new TextEncoder();

function toBase64Url(bytes) {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

export async function createSessionCookie(env, username) {
  const exp = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
  const payload = JSON.stringify({ u: username, exp });
  const payloadB64 = toBase64Url(encoder.encode(payload));
  const key = await hmacKey(env.SESSION_SECRET);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(sig));
  const value = `${payloadB64}.${sigB64}`;
  return `mb_session=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${12 * 60 * 60}`;
}

export function clearSessionCookie() {
  return 'mb_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySession(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)mb_session=([^;]+)/);
  if (!match) return null;
  const [payloadB64, sigB64] = match[1].split('.');
  if (!payloadB64 || !sigB64) return null;
  const key = await hmacKey(env.SESSION_SECRET);
  const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const expectedSigB64 = toBase64Url(new Uint8Array(expectedSig));
  if (!safeEqual(sigB64, expectedSigB64)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---- Password verification (PBKDF2-SHA256) ----
// ADMIN_PASSWORD_HASH format: "iterations:saltHex:hashHex"

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

export async function verifyPassword(password, stored) {
  const [iterStr, saltHex, hashHex] = String(stored || '').split(':');
  const iterations = parseInt(iterStr, 10);
  if (!iterations || !saltHex || !hashHex) return false;
  const salt = hexToBytes(saltHex);
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256
  );
  const derivedHex = Array.from(new Uint8Array(derived)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return safeEqual(derivedHex, hashHex);
}

// ---- Simple KV-backed rate limiter (no-ops gracefully if KV isn't bound) ----

export async function rateLimit(env, key, limit, windowSeconds) {
  if (!env.RATE_LIMIT_KV) return { limited: false };
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds);
  const bucketKey = `${key}:${windowStart}`;
  const current = parseInt((await env.RATE_LIMIT_KV.get(bucketKey)) || '0', 10);
  if (current >= limit) return { limited: true };
  await env.RATE_LIMIT_KV.put(bucketKey, String(current + 1), { expirationTtl: windowSeconds + 5 });
  return { limited: false };
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}
