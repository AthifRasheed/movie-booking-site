(function () {
  requireSession();

  const CATEGORIES = ['venue', 'marketing', 'equipment', 'staff', 'transport', 'refreshments', 'other'];
  const CATEGORY_LABELS = {
    venue: 'Venue', marketing: 'Marketing', equipment: 'Equipment', staff: 'Staff',
    transport: 'Transport', refreshments: 'Refreshments', other: 'Other',
  };

  const movieSelect = document.getElementById('movieSelect');
  const dateFilters = document.getElementById('dateFilters');
  const dateFilterHint = document.getElementById('dateFilterHint');
  const dateFromInput = document.getElementById('dateFromInput');
  const dateToInput = document.getElementById('dateToInput');
  const applyDateFilterBtn = document.getElementById('applyDateFilterBtn');
  const clearDateFilterBtn = document.getElementById('clearDateFilterBtn');

  const noMovieMessage = document.getElementById('noMovieMessage');
  const financeContent = document.getElementById('financeContent');

  const manualPaidRevenueInput = document.getElementById('manualPaidRevenueInput');
  const manualRefundedInput = document.getElementById('manualRefundedInput');
  const saveRevenueBtn = document.getElementById('saveRevenueBtn');
  const revenueSaveError = document.getElementById('revenueSaveError');

  const financeLoading = document.getElementById('financeLoading');
  const financeStats = document.getElementById('financeStats');
  const financeBreakdown = document.getElementById('financeBreakdown');

  const expensesLoading = document.getElementById('expensesLoading');
  const expensesError = document.getElementById('expensesError');
  const expensesEmpty = document.getElementById('expensesEmpty');
  const expensesList = document.getElementById('expensesList');
  const addExpenseBtn = document.getElementById('addExpenseBtn');

  const panel = document.getElementById('expenseFormPanel');
  const form = document.getElementById('expenseForm');
  const formTitle = document.getElementById('expenseFormTitle');
  const formMovieLabel = document.getElementById('expenseFormMovieLabel');
  const formError = document.getElementById('expenseFormError');
  const saveBtn = document.getElementById('saveExpenseBtn');
  const receiptPreview = document.getElementById('receiptPreview');
  const receiptUploadProgress = document.getElementById('receiptUploadProgress');

  let allMovies = [];
  let selectedMovie = null;
  let dateFrom = '';
  let dateTo = '';
  let currentTotalExpenses = 0;

  function money(n) {
    return 'MVR ' + (Number(n) || 0).toFixed(2);
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  // ---- Movie picker ----

  apiFetch('/api/admin/movies')
    .then((movies) => {
      allMovies = movies;
      movies.forEach((movie) => {
        const opt = document.createElement('option');
        opt.value = movie.id;
        opt.textContent = movie.title + (movie.status === 'archived' ? ' (Archived)' : '');
        movieSelect.appendChild(opt);
      });

      const preselect = new URLSearchParams(location.search).get('movie');
      if (preselect && movies.some((m) => m.id === preselect)) {
        movieSelect.value = preselect;
        onMovieChange();
      }
    })
    .catch(() => showToast('Could not load the movie list.', true));

  movieSelect.addEventListener('change', onMovieChange);

  function onMovieChange() {
    const id = movieSelect.value;
    selectedMovie = allMovies.find((m) => m.id === id) || null;

    const url = new URL(location.href);
    if (id) url.searchParams.set('movie', id); else url.searchParams.delete('movie');
    history.replaceState(null, '', url);

    if (!selectedMovie) {
      dateFilters.hidden = true;
      dateFilterHint.hidden = true;
      noMovieMessage.hidden = false;
      financeContent.hidden = true;
      return;
    }

    dateFilters.hidden = false;
    dateFilterHint.hidden = false;
    noMovieMessage.hidden = true;
    financeContent.hidden = false;
    revenueSaveError.hidden = true;
    manualPaidRevenueInput.value = Number(selectedMovie.manualPaidRevenue) || 0;
    manualRefundedInput.value = Number(selectedMovie.manualRefundedAmount) || 0;
    loadAll();
  }

  applyDateFilterBtn.addEventListener('click', () => {
    dateFrom = dateFromInput.value || '';
    dateTo = dateToInput.value || '';
    loadAll();
  });
  clearDateFilterBtn.addEventListener('click', () => {
    dateFrom = ''; dateTo = '';
    dateFromInput.value = ''; dateToInput.value = '';
    loadAll();
  });

  function loadAll() {
    loadFinancials();
    loadExpenses();
  }

  // ---- Financial summary ----
  // Revenue (changed 2026-09-22): paid ticket revenue and refunded amount are now entered
  // by hand per movie (stored on the Movie row as manualPaidRevenue / manualRefundedAmount,
  // saved via the existing 'updateMovie' action) instead of being summed from bookings.
  // Everything else — eligible revenue, owner's share, our share, net profit — still
  // calculates automatically from those two numbers plus the logged expenses.

  function loadFinancials() {
    financeLoading.hidden = false;
    financeStats.hidden = true;
    financeBreakdown.hidden = true;

    const params = new URLSearchParams({ movieId: selectedMovie.id });
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    apiFetch('/api/admin/expenses?' + params.toString())
      .then((expenses) => {
        currentTotalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        recalcFromInputs();
        financeLoading.hidden = true;
        financeStats.hidden = false;
        financeBreakdown.hidden = false;
      })
      .catch((err) => {
        financeLoading.textContent = err.message || 'Could not load the financial summary.';
      });
  }

  function recalcFromInputs() {
    const paidRevenue = Number(manualPaidRevenueInput.value) || 0;
    const refundedRevenue = Number(manualRefundedInput.value) || 0;
    const result = MovieFinancials.computeMovieFinancials({
      paidRevenue, refundedRevenue, expenses: currentTotalExpenses,
    });
    renderFinancials(result);
  }

  manualPaidRevenueInput.addEventListener('input', recalcFromInputs);
  manualRefundedInput.addEventListener('input', recalcFromInputs);

  saveRevenueBtn.addEventListener('click', () => {
    revenueSaveError.hidden = true;
    const paidRevenue = Number(manualPaidRevenueInput.value);
    const refundedRevenue = Number(manualRefundedInput.value);
    if (!(paidRevenue >= 0)) return showRevenueError('Paid revenue must be zero or more.');
    if (!(refundedRevenue >= 0)) return showRevenueError('Refunded amount must be zero or more.');

    saveRevenueBtn.disabled = true;
    saveRevenueBtn.textContent = 'Saving…';
    apiFetch('/api/admin/movies/' + encodeURIComponent(selectedMovie.id), {
      method: 'PUT',
      body: JSON.stringify({ manualPaidRevenue: paidRevenue, manualRefundedAmount: refundedRevenue }),
    })
      .then(() => {
        selectedMovie.manualPaidRevenue = paidRevenue;
        selectedMovie.manualRefundedAmount = refundedRevenue;
        const cached = allMovies.find((m) => m.id === selectedMovie.id);
        if (cached) {
          cached.manualPaidRevenue = paidRevenue;
          cached.manualRefundedAmount = refundedRevenue;
        }
        showToast('Revenue figures saved.');
      })
      .catch((err) => showRevenueError(err.message || 'Could not save.'))
      .finally(() => {
        saveRevenueBtn.disabled = false;
        saveRevenueBtn.textContent = 'Save revenue figures';
      });
  });

  function showRevenueError(message) {
    revenueSaveError.textContent = message;
    revenueSaveError.hidden = false;
  }

  function renderFinancials(r) {
    document.getElementById('statEligible').textContent = money(r.eligibleRevenue);
    document.getElementById('statOwnerShare').textContent = money(r.ownerShare);
    document.getElementById('statOurShare').textContent = money(r.ourShareBeforeExpenses);
    document.getElementById('statTotalExpenses').textContent = money(r.totalExpenses);

    const netProfitEl = document.getElementById('statNetProfit');
    const netProfitTile = document.getElementById('statNetProfitTile');
    netProfitEl.textContent = money(r.netProfit);
    netProfitTile.classList.remove('stat-tile-green', 'stat-tile-red');
    netProfitTile.classList.add(r.netProfit >= 0 ? 'stat-tile-green' : 'stat-tile-red');

    financeBreakdown.innerHTML =
      'Paid ticket revenue of <strong>' + money(r.paidRevenue) + '</strong> minus refunds of <strong>' + money(r.refundedRevenue) + '</strong> ' +
      'leaves eligible revenue of <strong>' + money(r.eligibleRevenue) + '</strong>. The movie owner receives half — ' +
      '<strong>' + money(r.ownerShare) + '</strong>. Our half, before expenses, is also <strong>' + money(r.ourShareBeforeExpenses) + '</strong>. ' +
      'After deducting <strong>' + money(r.totalExpenses) + '</strong> in expenses (only ever from our half, never the owner\'s), ' +
      'our net profit is <strong>' + money(r.netProfit) + '</strong>.';
  }

  // ---- Expense list ----

  function loadExpenses() {
    expensesLoading.hidden = false;
    expensesError.hidden = true;
    expensesEmpty.hidden = true;
    expensesList.innerHTML = '';

    const params = new URLSearchParams({ movieId: selectedMovie.id });
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    apiFetch('/api/admin/expenses?' + params.toString())
      .then((expenses) => {
        expensesLoading.hidden = true;
        if (!expenses.length) { expensesEmpty.hidden = false; return; }
        expenses.forEach((e) => expensesList.appendChild(renderExpenseRow(e)));
      })
      .catch(() => {
        expensesLoading.hidden = true;
        expensesError.hidden = false;
      });
  }

  function renderExpenseRow(expense) {
    const row = document.createElement('div');
    row.className = 'expense-row';

    const body = document.createElement('div');
    body.className = 'expense-row-body';
    body.innerHTML =
      '<div class="expense-row-top">' +
      '<span class="pill pill-neutral"></span>' +
      '<span class="expense-date"></span>' +
      '</div>' +
      '<p class="expense-description"></p>' +
      '<div class="expense-reference"></div>' +
      '<div class="expense-meta"></div>' +
      '<div class="expense-row-actions"></div>';

    body.querySelector('.pill-neutral').textContent = CATEGORY_LABELS[expense.category] || expense.category;
    body.querySelector('.expense-date').textContent = expense.date;
    body.querySelector('.expense-description').textContent = expense.description || '(no description)';

    const refEl = body.querySelector('.expense-reference');
    if (expense.reference) refEl.textContent = 'Ref: ' + expense.reference; else refEl.remove();

    const metaParts = [];
    if (expense.createdBy) metaParts.push('Added by ' + expense.createdBy);
    if (expense.updatedBy && expense.updatedAt && expense.updatedAt !== expense.createdAt) {
      metaParts.push('edited by ' + expense.updatedBy);
    }
    body.querySelector('.expense-meta').textContent = metaParts.join(', ');

    if (expense.receiptUrl) {
      const link = document.createElement('a');
      link.href = expense.receiptUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'receipt-preview';
      link.textContent = 'View receipt';
      body.querySelector('.expense-meta').after(link);
    }

    const actions = body.querySelector('.expense-row-actions');
    const editBtn = document.createElement('button');
    editBtn.type = 'button'; editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openForm(expense));
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button'; deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteExpense(expense, deleteBtn));
    actions.appendChild(deleteBtn);

    const amount = document.createElement('div');
    amount.className = 'expense-row-amount';
    amount.textContent = money(expense.amount);

    row.appendChild(body);
    row.appendChild(amount);
    return row;
  }

  function deleteExpense(expense, btn) {
    if (!confirm('Delete this ' + money(expense.amount) + ' expense? This cannot be undone.')) return;
    btn.disabled = true;
    apiFetch('/api/admin/expenses/' + encodeURIComponent(expense.id), { method: 'DELETE' })
      .then(() => { showToast('Expense deleted.'); loadAll(); })
      .catch((err) => { showToast(err.message || 'Could not delete.', true); btn.disabled = false; });
  }

  // ---- Add / edit form ----

  addExpenseBtn.addEventListener('click', () => openForm(null));
  document.getElementById('closeExpenseFormBtn').addEventListener('click', () => { panel.hidden = true; });

  function openForm(expense) {
    form.reset();
    formError.hidden = true;
    receiptPreview.hidden = true;
    receiptUploadProgress.hidden = true;
    document.getElementById('receiptUrl').value = '';
    document.getElementById('receiptPublicId').value = '';
    formMovieLabel.textContent = selectedMovie.title;

    if (expense) {
      formTitle.textContent = 'Edit Expense';
      document.getElementById('expenseId').value = expense.id;
      document.getElementById('amountInput').value = expense.amount;
      document.getElementById('dateInput').value = expense.date;
      document.getElementById('categoryInput').value = expense.category;
      document.getElementById('descriptionInput').value = expense.description || '';
      document.getElementById('referenceInput').value = expense.reference || '';
      document.getElementById('receiptUrl').value = expense.receiptUrl || '';
      document.getElementById('receiptPublicId').value = expense.receiptPublicId || '';
      if (expense.receiptUrl) {
        receiptPreview.src = expense.receiptUrl;
        receiptPreview.hidden = false;
      }
    } else {
      formTitle.textContent = 'Add Expense';
      document.getElementById('expenseId').value = '';
      document.getElementById('dateInput').value = todayIso();
      document.getElementById('categoryInput').value = 'other';
    }
    panel.hidden = false;
  }

  document.getElementById('receiptInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    receiptUploadProgress.hidden = false;
    receiptUploadProgress.textContent = 'Uploading… 0%';
    try {
      const result = await uploadReceipt(file, (pct) => { receiptUploadProgress.textContent = 'Uploading… ' + pct + '%'; });
      document.getElementById('receiptUrl').value = result.receiptUrl;
      document.getElementById('receiptPublicId').value = result.receiptPublicId;
      receiptPreview.src = result.receiptUrl;
      receiptPreview.hidden = false;
      receiptUploadProgress.textContent = 'Receipt uploaded.';
      setTimeout(() => { receiptUploadProgress.hidden = true; }, 1500);
    } catch (err) {
      receiptUploadProgress.textContent = err.message || 'Upload failed.';
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    formError.hidden = true;

    const payload = {
      movieId: selectedMovie.id,
      amount: Number(document.getElementById('amountInput').value),
      date: document.getElementById('dateInput').value,
      category: document.getElementById('categoryInput').value,
      description: document.getElementById('descriptionInput').value.trim(),
      reference: document.getElementById('referenceInput').value.trim(),
      receiptUrl: document.getElementById('receiptUrl').value,
      receiptPublicId: document.getElementById('receiptPublicId').value,
    };

    if (!(payload.amount > 0)) return showFormError('Amount must be greater than 0.');
    if (!payload.date) return showFormError('Date is required.');
    if (CATEGORIES.indexOf(payload.category) === -1) return showFormError('Please choose a category.');

    const id = document.getElementById('expenseId').value;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    const request = id
      ? apiFetch('/api/admin/expenses/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(payload) })
      : apiFetch('/api/admin/expenses', { method: 'POST', body: JSON.stringify(payload) });

    request
      .then(() => {
        panel.hidden = true;
        showToast('Saved.');
        loadAll();
      })
      .catch((err) => showFormError(err.message || 'Could not save.'))
      .finally(() => { saveBtn.disabled = false; saveBtn.textContent = 'Save Expense'; });
  });

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }
})();
