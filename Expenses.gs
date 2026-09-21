// Expenses.gs — movie expense tracking. Mirrors the Movies.gs pattern exactly: same
// shared helpers (getSheet_, rowsToObjects_, headerMap_, sanitizeText_, genId_,
// nowIso_) that already live in Utils.gs and are proven working by Movies.gs.
//
// IMPORTANT — two manual steps after pasting this file into the Apps Script editor:
//   1. Run `setupExpensesSheet_` once (pick it from the function dropdown, click Run)
//      to create the Expenses tab. Safe to run more than once — it only creates the
//      tab when it's missing.
//   2. Wire the four new action names below into your existing action dispatcher
//      (the doGet/doPost function that already routes 'addMovie', 'updateMovie', etc.
//      to their functions) exactly the way those are wired — then Deploy → Manage
//      deployments → New version, same as any other .gs change.
//
// New action names to wire up: listExpensesAdmin, addExpense, updateExpense, deleteExpense

const SHEET_EXPENSES = 'Expenses';
const EXPENSE_HEADERS = [
  'id', 'movieId', 'amount', 'date', 'category', 'description', 'reference',
  'receiptUrl', 'receiptPublicId', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt'
];
// Suggested categories from the spec. To add/rename one: edit this array here AND the
// matching CATEGORIES array in admin/js/expenses.js — that's the only place both sides
// need to agree.
const EXPENSE_CATEGORIES = ['venue', 'marketing', 'equipment', 'staff', 'transport', 'refreshments', 'other'];

function setupExpensesSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(SHEET_EXPENSES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_EXPENSES);
    sheet.appendRow(EXPENSE_HEADERS);
    sheet.setFrozenRows(1);
  }
  return { ok: true, message: 'Expenses sheet ready.' };
}

function listExpensesAdmin_(params) {
  params = params || {};
  const sheet = getSheet_(SHEET_EXPENSES);
  let rows = rowsToObjects_(sheet).map(function (r) {
    const c = Object.assign({}, r);
    delete c._row;
    c.amount = Number(c.amount) || 0;
    return c;
  });

  if (params.movieId) {
    rows = rows.filter(function (r) { return r.movieId === params.movieId; });
  }
  if (params.category) {
    rows = rows.filter(function (r) { return r.category === params.category; });
  }
  if (params.dateFrom) {
    rows = rows.filter(function (r) { return String(r.date) >= String(params.dateFrom); });
  }
  if (params.dateTo) {
    rows = rows.filter(function (r) { return String(r.date) <= String(params.dateTo); });
  }
  if (params.query) {
    const q = String(params.query).toLowerCase();
    rows = rows.filter(function (r) {
      return (String(r.description || '').toLowerCase().indexOf(q) !== -1) ||
             (String(r.reference || '').toLowerCase().indexOf(q) !== -1);
    });
  }

  rows.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return rows;
}

function addExpense_(payload) {
  payload = payload || {};
  const movieId = sanitizeText_(payload.movieId, 50);
  if (!movieId) throw new Error('Movie is required.');

  // An expense must belong to a valid movie.
  const movie = rowsToObjects_(getSheet_(SHEET_MOVIES)).find(function (m) { return m.id === movieId; });
  if (!movie) throw new Error('That movie no longer exists.');

  const amount = Number(payload.amount);
  if (!(amount > 0)) throw new Error('Amount must be greater than 0.');

  const date = sanitizeText_(payload.date, 20);
  if (!date) throw new Error('Date is required.');

  const category = sanitizeText_(payload.category, 40);
  if (EXPENSE_CATEGORIES.indexOf(category) === -1) throw new Error('Invalid category.');

  const sheet = getSheet_(SHEET_EXPENSES);
  const id = genId_('EXP');
  const now = nowIso_();
  const adminUsername = sanitizeText_(payload.adminUsername, 100);

  sheet.appendRow([
    id, movieId, amount, date, category,
    sanitizeText_(payload.description, 500),
    sanitizeText_(payload.reference, 200),
    sanitizeText_(payload.receiptUrl, 500),
    sanitizeText_(payload.receiptPublicId, 200),
    adminUsername, now,
    adminUsername, now
  ]);
  return { id: id };
}

function updateExpense_(payload) {
  payload = payload || {};
  const sheet = getSheet_(SHEET_EXPENSES);
  const map = headerMap_(sheet);
  const target = rowsToObjects_(sheet).find(function (r) { return r.id === payload.id; });
  if (!target) throw new Error('Expense not found.');

  if (payload.movieId !== undefined) {
    const movieId = sanitizeText_(payload.movieId, 50);
    const movie = rowsToObjects_(getSheet_(SHEET_MOVIES)).find(function (m) { return m.id === movieId; });
    if (!movie) throw new Error('That movie no longer exists.');
    sheet.getRange(target._row, map['movieId'] + 1).setValue(movieId);
  }
  if (payload.amount !== undefined) {
    const amount = Number(payload.amount);
    if (!(amount > 0)) throw new Error('Amount must be greater than 0.');
    sheet.getRange(target._row, map['amount'] + 1).setValue(amount);
  }
  if (payload.date !== undefined) {
    const date = sanitizeText_(payload.date, 20);
    if (!date) throw new Error('Date is required.');
    sheet.getRange(target._row, map['date'] + 1).setValue(date);
  }
  if (payload.category !== undefined) {
    const category = sanitizeText_(payload.category, 40);
    if (EXPENSE_CATEGORIES.indexOf(category) === -1) throw new Error('Invalid category.');
    sheet.getRange(target._row, map['category'] + 1).setValue(category);
  }
  if (payload.description !== undefined) {
    sheet.getRange(target._row, map['description'] + 1).setValue(sanitizeText_(payload.description, 500));
  }
  if (payload.reference !== undefined) {
    sheet.getRange(target._row, map['reference'] + 1).setValue(sanitizeText_(payload.reference, 200));
  }
  if (payload.receiptUrl !== undefined) {
    sheet.getRange(target._row, map['receiptUrl'] + 1).setValue(sanitizeText_(payload.receiptUrl, 500));
  }
  if (payload.receiptPublicId !== undefined) {
    sheet.getRange(target._row, map['receiptPublicId'] + 1).setValue(sanitizeText_(payload.receiptPublicId, 200));
  }

  sheet.getRange(target._row, map['updatedBy'] + 1).setValue(sanitizeText_(payload.adminUsername, 100));
  sheet.getRange(target._row, map['updatedAt'] + 1).setValue(nowIso_());
  return { id: payload.id };
}

function deleteExpense_(payload) {
  payload = payload || {};
  const sheet = getSheet_(SHEET_EXPENSES);
  const target = rowsToObjects_(sheet).find(function (r) { return r.id === payload.id; });
  if (!target) throw new Error('Expense not found.');
  sheet.deleteRow(target._row);
  return { id: payload.id };
}

