// tests/financials.test.js — the money math is the highest-risk part of this feature,
// so it gets real, specific tests. Run with: npm test  (or: node --test tests/)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import '../admin/js/financials.js';
const { computeMovieFinancials, roundMoney } = globalThis.MovieFinancials;

test('matches the worked example from the spec exactly', () => {
  const r = computeMovieFinancials({ paidRevenue: 10000, refundedRevenue: 0, expenses: 1200 });
  assert.equal(r.eligibleRevenue, 10000);
  assert.equal(r.ownerShare, 5000);
  assert.equal(r.ourShareBeforeExpenses, 5000);
  assert.equal(r.totalExpenses, 1200);
  assert.equal(r.netProfit, 3800);
});

test('expenses are deducted only from our half, never the owner\'s', () => {
  const r = computeMovieFinancials({ paidRevenue: 4000, refundedRevenue: 0, expenses: 3000 });
  assert.equal(r.ownerShare, 2000, 'owner share must not be touched by expenses');
  assert.equal(r.ourShareBeforeExpenses, 2000);
  assert.equal(r.netProfit, -1000, 'expenses can legitimately push our net profit negative');
});

test('refunds are subtracted before the 50/50 split, not after', () => {
  const r = computeMovieFinancials({ paidRevenue: 2000, refundedRevenue: 500, expenses: 0 });
  assert.equal(r.eligibleRevenue, 1500);
  assert.equal(r.ownerShare, 750);
  assert.equal(r.ourShareBeforeExpenses, 750);
});

test('owner share + our share always sum to exactly the eligible revenue, even on odd cents', () => {
  const cases = [10000.01, 999.99, 1.01, 33333.33, 0.01];
  for (const paidRevenue of cases) {
    const r = computeMovieFinancials({ paidRevenue, refundedRevenue: 0, expenses: 0 });
    assert.equal(
      roundMoney(r.ownerShare + r.ourShareBeforeExpenses),
      r.eligibleRevenue,
      `split mismatch for paidRevenue=${paidRevenue}`
    );
  }
});

test('zero revenue and zero expenses nets to exactly zero, not NaN or -0', () => {
  const r = computeMovieFinancials({ paidRevenue: 0, refundedRevenue: 0, expenses: 0 });
  assert.equal(r.netProfit, 0);
  assert.equal(Object.is(r.netProfit, -0), false);
});

test('missing/undefined fields default safely to zero instead of throwing or producing NaN', () => {
  const r = computeMovieFinancials({});
  assert.equal(r.paidRevenue, 0);
  assert.equal(r.netProfit, 0);
  assert.equal(computeMovieFinancials(undefined).netProfit, 0);
});

test('non-numeric input does not produce NaN downstream', () => {
  const r = computeMovieFinancials({ paidRevenue: 'not a number', refundedRevenue: null, expenses: undefined });
  assert.equal(Number.isNaN(r.netProfit), false);
  assert.equal(r.netProfit, 0);
});

test('roundMoney kills floating-point noise from repeated addition', () => {
  let total = 0;
  for (let i = 0; i < 3; i++) total += 0.1; // classic 0.30000000000000004 case
  assert.notEqual(total, 0.3);
  assert.equal(roundMoney(total), 0.3);
});

test('refunds larger than paid revenue produce a negative eligible revenue rather than throwing', () => {
  // Not expected in normal operation, but the function must not crash on bad data —
  // the UI is responsible for flagging this as unusual, not this pure function.
  const r = computeMovieFinancials({ paidRevenue: 100, refundedRevenue: 150, expenses: 0 });
  assert.equal(r.eligibleRevenue, -50);
  assert.equal(r.ownerShare, -25);
});

