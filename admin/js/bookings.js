(function () {
  requireSession();

  const loading = document.getElementById('bookingsLoading');
  const errorEl = document.getElementById('bookingsError');
  const empty = document.getElementById('bookingsEmpty');
  const list = document.getElementById('bookingsList');
  const searchInput = document.getElementById('searchInput');
  const paymentFilter = document.getElementById('paymentFilter');
  const statusFilter = document.getElementById('statusFilter');

  let debounceTimer;

  function load() {
    loading.hidden = false;
    errorEl.hidden = true;
    empty.hidden = true;
    list.innerHTML = '';

    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('query', searchInput.value.trim());
    if (paymentFilter.value) params.set('paymentStatus', paymentFilter.value);
    if (statusFilter.value) params.set('bookingStatus', statusFilter.value);

    apiFetch('/api/admin/bookings?' + params.toString())
      .then((bookings) => {
        loading.hidden = true;
        if (!bookings.length) { empty.hidden = false; return; }
        bookings.forEach((b) => list.appendChild(renderRow(b)));
      })
      .catch(() => {
        loading.hidden = true;
        errorEl.hidden = false;
      });
  }

  function renderRow(booking) {
    const row = document.createElement('div');
    row.className = 'booking-row';

    row.innerHTML =
      '<div class="booking-row-top">' +
      '<span class="booking-id"></span>' +
      '<span class="muted small-date"></span>' +
      '</div>' +
      '<dl class="booking-row-grid">' +
      '<div><dt>Movie</dt><dd class="f-movie"></dd></div>' +
      '<div><dt>Customer</dt><dd class="f-name"></dd></div>' +
      '<div><dt>Phone</dt><dd class="f-phone"></dd></div>' +
      '<div><dt>Tickets / Total</dt><dd class="f-total"></dd></div>' +
      '</dl>' +
      '<div class="booking-controls">' +
      '<label class="visually-hidden" for="pay-' + booking.bookingId + '">Payment status</label>' +
      '<select class="f-payment" id="pay-' + booking.bookingId + '">' +
      '<option value="Pending">Payment: Pending</option>' +
      '<option value="Paid">Payment: Paid</option>' +
      '</select>' +
      '<label class="visually-hidden" for="status-' + booking.bookingId + '">Booking status</label>' +
      '<select class="f-status" id="status-' + booking.bookingId + '">' +
      '<option value="Confirmed">Confirmed</option>' +
      '<option value="Cancelled">Cancelled</option>' +
      '<option value="Expired">Expired</option>' +
      '</select>' +
      '</div>' +
      '<div class="field" style="margin-top:0.6rem;">' +
      '<label class="visually-hidden" for="notes-' + booking.bookingId + '">Notes</label>' +
      '<textarea class="f-notes" id="notes-' + booking.bookingId + '" placeholder="Notes (optional)"></textarea>' +
      '<button type="button" class="btn btn-secondary btn-sm f-save-notes" style="margin-top:0.5rem;">Save notes</button>' +
      '</div>';

    row.querySelector('.booking-id').textContent = booking.bookingId;
    row.querySelector('.small-date').textContent = formatDate(booking.createdAt);
    row.querySelector('.f-movie').textContent = booking.movieTitle;
    row.querySelector('.f-name').textContent = booking.customerName;
    row.querySelector('.f-phone').textContent = booking.customerPhone;
    row.querySelector('.f-total').textContent = booking.ticketCount + ' × MVR ' + Number(booking.pricePerTicket).toFixed(2) + ' = MVR ' + Number(booking.totalAmount).toFixed(2);

    const paySelect = row.querySelector('.f-payment');
    paySelect.value = booking.paymentStatus;
    paySelect.addEventListener('change', () => {
      apiFetch('/api/admin/bookings/' + encodeURIComponent(booking.bookingId), {
        method: 'PUT', body: JSON.stringify({ paymentStatus: paySelect.value }),
      }).then(() => showToast('Payment status updated.')).catch((err) => showToast(err.message, true));
    });

    const statusSelect = row.querySelector('.f-status');
    statusSelect.value = booking.bookingStatus;
    statusSelect.addEventListener('change', () => {
      apiFetch('/api/admin/bookings/' + encodeURIComponent(booking.bookingId), {
        method: 'PUT', body: JSON.stringify({ bookingStatus: statusSelect.value }),
      }).then(() => showToast('Booking status updated.')).catch((err) => showToast(err.message, true));
    });

    const notesField = row.querySelector('.f-notes');
    notesField.value = (booking.notes || '').replace(/^idempotencyKey:\S+\s*/, '');
    row.querySelector('.f-save-notes').addEventListener('click', () => {
      apiFetch('/api/admin/bookings/' + encodeURIComponent(booking.bookingId), {
        method: 'PUT', body: JSON.stringify({ notes: notesField.value }),
      }).then(() => showToast('Notes saved.')).catch((err) => showToast(err.message, true));
    });

    return row;
  }

  function formatDate(iso) {
    try { return new Date(iso).toLocaleString(); } catch { return iso || ''; }
  }

  [searchInput, paymentFilter, statusFilter].forEach((el) => {
    el.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(load, 300);
    });
  });

  load();
})();
