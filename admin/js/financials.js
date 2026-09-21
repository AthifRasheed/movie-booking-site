// admin/js/financials.js — the one place the owner/our-share/expense math lives.
//
// Loaded as a plain classic <script> on admin pages (defines window.MovieFinancials),
// and also loadable directly by the Node test runner (tests/financials.test.js) since
// it exports itself via module.exports when `module` exists. No build step either way.

(function (global) {
  'use strict';

  // Rounds to the nearest MVR cent. Every sum/split in this file goes through this,
  // so results never carry raw floating-point noise (e.g. 5000.000000000001).
  function roundMoney(n) {
    const num = Number(n);
    if (!isFinite(num)) return 0;
    return Math.round(num * 100) / 100;
  }

  // Business rule (confirmed with the cinema owner 2026-09-21):
  //   eligibleRevenue = paidRevenue - refundedRevenue
  //   ownerShare = eligibleRevenue * 50%
  //   ourShareBeforeExpenses = eligibleRevenue - ownerShare   (NOT eligibleRevenue * 50%
  //     computed separately — deriving it by subtraction guarantees ownerShare +
  //     ourShareBeforeExpenses always sums to exactly eligibleRevenue, even on an odd
  //     number of cents where a straight 50/50 split would round to two halves that are
  //     0.01 apart)
  //   netProfit = ourShareBeforeExpenses - totalExpenses
  //
  // Refunds are not tracked anywhere in this app yet (no "Refunded" booking status
  // exists), so refundedRevenue is always 0 today. It's a real input here, not a
  // constant, so wiring in real refund data later is a one-line change at the call site
  // — nothing here needs to change.
  function computeMovieFinancials(input) {
    input = input || {};
    const paidRevenue = roundMoney(input.paidRevenue);
    const refundedRevenue = roundMoney(input.refundedRevenue);
    const totalExpenses = roundMoney(input.expenses);

    const eligibleRevenue = roundMoney(paidRevenue - refundedRevenue);
    const ownerShare = roundMoney(eligibleRevenue * 0.5);
    const ourShareBeforeExpenses = roundMoney(eligibleRevenue - ownerShare);
    const netProfit = roundMoney(ourShareBeforeExpenses - totalExpenses);

    return {
      paidRevenue: paidRevenue,
      refundedRevenue: refundedRevenue,
      eligibleRevenue: eligibleRevenue,
      ownerShare: ownerShare,
      ourShareBeforeExpenses: ourShareBeforeExpenses,
      totalExpenses: totalExpenses,
      netProfit: netProfit,
    };
  }

  const api = { roundMoney: roundMoney, computeMovieFinancials: computeMovieFinancials };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.MovieFinancials = api;
})(typeof window !== 'undefined' ? window : globalThis);

