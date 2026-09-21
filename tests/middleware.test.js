// tests/middleware.test.js — verifies the actual security boundary that protects the
// new expense endpoints: every route under /api/admin/* must be rejected without a
// valid session cookie. This is the real enforcement point (functions/_middleware.js),
// not something each new endpoint has to reimplement.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { onRequest } from '../functions/_middleware.js';

function makeContext(path, options = {}) {
  let nextCalled = false;
  return {
    request: new Request('https://example.test' + path, {
      headers: options.cookie ? { Cookie: options.cookie } : {},
    }),
    next: async () => { nextCalled = true; return new Response(JSON.stringify({ ok: true }), { status: 200 }); },
    env: { SESSION_SECRET: 'test-secret-only-used-in-this-test' },
    wasNextCalled: () => nextCalled,
  };
}

test('a new admin expense route is rejected (401) without a session cookie', async () => {
  const ctx = makeContext('/api/admin/expenses');
  const res = await onRequest(ctx);
  assert.equal(res.status, 401);
  assert.equal(ctx.wasNextCalled(), false, 'the real handler must never run for an unauthenticated request');
});

test('a new admin expense sub-route ([id]) is also rejected without a session cookie', async () => {
  const ctx = makeContext('/api/admin/expenses/EXP123');
  const res = await onRequest(ctx);
  assert.equal(res.status, 401);
  assert.equal(ctx.wasNextCalled(), false);
});

test('a garbage/forged cookie is rejected the same way as no cookie at all', async () => {
  const ctx = makeContext('/api/admin/expenses', { cookie: 'mb_session=not.a.real.session' });
  const res = await onRequest(ctx);
  assert.equal(res.status, 401);
  assert.equal(ctx.wasNextCalled(), false);
});

test('public routes (customer booking/movies) are not gated by the admin session check', async () => {
  const ctx = makeContext('/api/movies');
  await onRequest(ctx);
  assert.equal(ctx.wasNextCalled(), true, 'public routes must still work without a session');
});

test('the admin login route itself stays reachable without a session (or nobody could log in)', async () => {
  const ctx = makeContext('/api/admin/login');
  await onRequest(ctx);
  assert.equal(ctx.wasNextCalled(), true);
});

