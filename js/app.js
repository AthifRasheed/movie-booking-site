(function () {
  'use strict';

  const els = {
    cinemaName: document.getElementById('cinemaName'),
    viewList: document.getElementById('view-list'),
    viewBooking: document.getElementById('view-booking'),
    viewConfirmation: document.getElementById('view-confirmation'),
    listLoading: document.getElementById('listLoading'),
    listError: document.getElementById('listError'),
    listEmpty: document.getElementById('listEmpty'),
    movieGrid: document.getElementById('movieGrid'),
    retryListBtn: document.getElementById('retryListBtn'),
    backToListBtn: document.getElementById('backToListBtn'),
    bookingPoster: document.getElementById('bookingPoster'),
    bookingTitle: document.getElementById('bookingTitle'),
    bookingWhen: document.getElementById('bookingWhen'),
    bookingSeats: document.getElementById('bookingSeats'),
    bookingForm: document.getElementById('bookingForm'),
    decrementBtn: document.getElementById('decrementBtn'),
    incrementBtn: document.getElementById('incrementBtn'),
    ticketCount: document.getElementById('ticketCount'),
    customerName: document.getElementById('customerName'),
    customerPhone: document.getElementById('customerPhone'),
    formError: document.getElementById('formError'),
    totalAmount: document.getElementById('totalAmount'),
    bookNowBtn: document.getElementById('bookNowBtn'),
    confBookingId: document.getElementById('confBookingId'),
    confMovie: document.getElementById('confMovie'),
    confWhen: document.getElementById('confWhen'),
    confTickets: document.getElementById('confTickets'),
    confTotal: document.getElementById('confTotal'),
    confBankName: document.getElementById('confBankName'),
    confBankNumber: document.getElementById('confBankNumber'),
    copyAccountBtn: document.getElementById('copyAccountBtn'),
    whatsappBtn: document.getElementById('whatsappBtn'),
    viberBtn: document.getElementById('viberBtn'),
    bookAnotherBtn: document.getElementById('bookAnotherBtn'),
  };

  let selectedMovie = null;
  let ticketCount = 1;
  let submitting = false;

  function money(n) {
    return 'MVR ' + Number(n).toFixed(2);
  }

  // Applies a light Cloudinary transformation so posters are served as
  // compressed, appropriately-sized, auto-format (WebP where supported) images.
  function posterVariant(url, width) {
    if (!url || url.indexOf('/upload/') === -1) return url;
    return url.replace('/upload/', '/upload/f_auto,q_auto,w_' + width + '/');
  }

  function showView(view) {
    [els.viewList, els.viewBooking, els.viewConfirmation].forEach((v) => {
      v.hidden = v !== view;
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // ---- Movie list ----

  async function loadMovies() {
    els.listLoading.hidden = false;
    els.listError.hidden = true;
    els.listEmpty.hidden = true;
    els.movieGrid.hidden = true;
    els.movieGrid.innerHTML = '';

    try {
      const res = await fetch('/api/movies');
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || 'Failed to load movies');

      els.listLoading.hidden = true;

      if (!body.data.length) {
        els.listEmpty.hidden = false;
        return;
      }

      body.data.forEach((movie) => els.movieGrid.appendChild(renderMovieCard(movie)));
      els.movieGrid.hidden = false;
    } catch (err) {
      els.listLoading.hidden = true;
      els.listError.hidden = false;
    }
  }

  function renderMovieCard(movie) {
    const li = document.createElement('li');
    li.className = 'movie-card';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'movie-card-btn';
    btn.disabled = movie.seatsRemaining <= 0;

    const img = document.createElement('img');
    img.className = 'movie-poster';
    img.src = posterVariant(movie.posterUrl, 400) || '';
    img.alt = movie.title + ' poster';
    img.loading = 'lazy';
    btn.appendChild(img);

    const info = document.createElement('div');
    info.className = 'movie-info';
    info.innerHTML =
      '<h3></h3><p class="movie-meta"></p><p class="movie-price"></p>';
    info.querySelector('h3').textContent = movie.title;
    info.querySelector('.movie-meta').textContent = formatWhen(movie.date, movie.time) + (movie.venue ? ' · ' + movie.venue : '');
    info.querySelector('.movie-price').textContent = money(movie.pricePerTicket);

    if (movie.seatsRemaining <= 0) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-soldout';
      badge.textContent = 'Sold out';
      info.appendChild(badge);
    } else if (movie.seatsRemaining <= 10) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-low';
      badge.textContent = movie.seatsRemaining + ' left';
      info.appendChild(badge);
    }

    btn.appendChild(info);
    btn.addEventListener('click', () => openBooking(movie));
    li.appendChild(btn);
    return li;
  }

  function formatWhen(date, time) {
    return date + ' at ' + time;
  }

  // ---- Booking view ----

  function openBooking(movie) {
    selectedMovie = movie;
    ticketCount = 1;

    els.bookingPoster.src = posterVariant(movie.posterUrl, 600) || '';
    els.bookingPoster.alt = movie.title + ' poster';
    els.bookingTitle.textContent = movie.title;
    els.bookingWhen.textContent = formatWhen(movie.date, movie.time) + (movie.venue ? ' · ' + movie.venue : '');
    els.bookingSeats.textContent = movie.seatsRemaining + ' seat(s) remaining';
    els.customerName.value = '';
    els.customerPhone.value = '';
    els.formError.hidden = true;
    updateTicketCount();
    showView(els.viewBooking);
  }

  function maxTickets() {
    return Math.min(10, selectedMovie ? selectedMovie.seatsRemaining : 1);
  }

  function updateTicketCount() {
    els.ticketCount.textContent = String(ticketCount);
    els.decrementBtn.disabled = ticketCount <= 1;
    els.incrementBtn.disabled = ticketCount >= maxTickets();
    const total = selectedMovie ? selectedMovie.pricePerTicket * ticketCount : 0;
    els.totalAmount.textContent = money(total);
  }

  els.decrementBtn.addEventListener('click', () => {
    if (ticketCount > 1) { ticketCount -= 1; updateTicketCount(); }
  });
  els.incrementBtn.addEventListener('click', () => {
    if (ticketCount < maxTickets()) { ticketCount += 1; updateTicketCount(); }
  });

  els.backToListBtn.addEventListener('click', () => {
    showView(els.viewList);
    loadMovies();
  });

  els.bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;

    const name = els.customerName.value.trim();
    const phone = els.customerPhone.value.trim();

    if (name.length < 2) {
      showFormError('Please enter your full name.');
      return;
    }
    if (!/^[0-9+()\-\s]{6,20}$/.test(phone)) {
      showFormError('Please enter a valid phone number.');
      return;
    }

    els.formError.hidden = true;
    submitting = true;
    els.bookNowBtn.disabled = true;
    els.bookNowBtn.textContent = 'Booking…';

    const idempotencyKey = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: selectedMovie.id,
          ticketCount,
          customerName: name,
          customerPhone: phone,
          idempotencyKey,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || 'Booking failed. Please try again.');
      showConfirmation(body.data);
    } catch (err) {
      showFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      submitting = false;
      els.bookNowBtn.disabled = false;
      els.bookNowBtn.textContent = 'Book Now';
    }
  });

  function showFormError(message) {
    els.formError.textContent = message;
    els.formError.hidden = false;
  }

  // ---- Confirmation view ----

  function showConfirmation(data) {
    els.confBookingId.textContent = data.bookingId;
    els.confMovie.textContent = data.movieTitle;
    els.confWhen.textContent = formatWhen(data.date, data.time);
    els.confTickets.textContent = String(data.ticketCount);
    els.confTotal.textContent = money(data.totalAmount);
    els.confBankName.textContent = data.bankAccountName || '—';
    els.confBankNumber.textContent = data.bankAccountNumber || '—';

    const message =
      'Hi! I just booked ' + data.ticketCount + ' ticket(s) for "' + data.movieTitle + '". ' +
      'Booking ID: ' + data.bookingId + '. Total: ' + money(data.totalAmount) + '. ' +
      'Here is my payment slip:';
    const encoded = encodeURIComponent(message);

    if (data.whatsappNumber) {
      const digits = data.whatsappNumber.replace(/[^0-9]/g, '');
      els.whatsappBtn.href = 'https://wa.me/' + digits + '?text=' + encoded;
      els.whatsappBtn.hidden = false;
    } else {
      els.whatsappBtn.hidden = true;
    }

    if (data.viberNumber) {
      els.viberBtn.href = 'viber://forward?text=' + encoded;
      els.viberBtn.hidden = false;
    } else {
      els.viberBtn.hidden = true;
    }

    showView(els.viewConfirmation);
  }

  els.copyAccountBtn.addEventListener('click', async () => {
    const text = els.confBankNumber.textContent;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      els.copyAccountBtn.textContent = 'Copied!';
      els.copyAccountBtn.classList.add('copied');
      setTimeout(() => {
        els.copyAccountBtn.textContent = 'Copy';
        els.copyAccountBtn.classList.remove('copied');
      }, 1600);
    } catch (e) {
      /* clipboard blocked; the number is still visible to select manually */
    }
  });

  els.bookAnotherBtn.addEventListener('click', () => {
    showView(els.viewList);
    loadMovies();
  });

  els.retryListBtn.addEventListener('click', loadMovies);

  // ---- Header ----

  async function loadCinemaName() {
    try {
      const res = await fetch('/api/settings');
      const body = await res.json();
      if (body.ok && body.data.cinemaName) {
        els.cinemaName.textContent = body.data.cinemaName;
        document.title = body.data.cinemaName + ' — Book Tickets';
      }
    } catch (e) {
      /* keep the default header text */
    }
  }

  loadCinemaName();
  loadMovies();
})();
