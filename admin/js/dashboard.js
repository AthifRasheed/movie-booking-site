(function () {
  requireSession();

  const loading = document.getElementById('dashLoading');
  const errorEl = document.getElementById('dashError');
  const empty = document.getElementById('dashEmpty');
  const list = document.getElementById('dashList');

  const statActiveBookings = document.getElementById('statActiveBookings');
  const movieSelect = document.getElementById('statsMovieSelect');
  const statsLoading = document.getElementById('statsLoading');
  const movieStats = document.getElementById('movieStats');
  const statPaidCount = document.getElementById('statPaidCount');
  const statPaidAmount = document.getElementById('statPaidAmount');
  const statUnpaidCount = document.getElementById('statUnpaidCount');
  const statUnpaidAmount = document.getElementById('statUnpaidAmount');

  function money(n) {
    return 'MVR ' + (Number(n) || 0).toFixed(2);
  }

  function sumAmount(bookings) {
    return bookings.reduce((total, b) => total + (Number(b.totalAmount) || 0), 0);
  }

  // ---- Total active tickets (sum of ticket counts, not booking rows) ----
  apiFetch('/api/admin/bookings?bookingStatus=Confirmed')
    .then((bookings) => {
      const totalTickets = bookings.reduce((total, b) => total + (Number(b.ticketCount) || 0), 0);
      statActiveBookings.textContent = totalTickets;
    })
    .catch(() => {
      statActiveBookings.textContent = '—';
    });

  // ---- Movie picker for paid / non-paid breakdown ----
  apiFetch('/api/admin/movies')
    .then((movies) => {
      movies.forEach((movie) => {
        const opt = document.createElement('option');
        opt.value = movie.id;
        opt.textContent = movie.title + (movie.status === 'archived' ? ' (Archived)' : '');
        movieSelect.appendChild(opt);
      });
    })
    .catch(() => { /* movie picker just stays empty; the capacity list below still shows its own error */ });

  movieSelect.addEventListener('change', () => {
    const movieId = movieSelect.value;
    movieStats.hidden = true;

    if (!movieId) return;

    statsLoading.hidden = false;

    Promise.all([
      apiFetch('/api/admin/bookings?movieId=' + encodeURIComponent(movieId) + '&bookingStatus=Confirmed&paymentStatus=Paid'),
      apiFetch('/api/admin/bookings?movieId=' + encodeURIComponent(movieId) + '&bookingStatus=Confirmed&paymentStatus=Pending'),
    ])
      .then(([paid, unpaid]) => {
        statsLoading.hidden = true;
        statPaidCount.textContent = paid.length;
        statPaidAmount.textContent = money(sumAmount(paid)) + ' collected';
        statUnpaidCount.textContent = unpaid.length;
        statUnpaidAmount.textContent = money(sumAmount(unpaid)) + ' outstanding';
        movieStats.hidden = false;
      })
      .catch((err) => {
        statsLoading.hidden = true;
        showToast(err.message || 'Could not load stats for that movie.', true);
      });
  });

  // ---- Movie capacity list (unchanged) ----
  apiFetch('/api/admin/movies')
    .then((movies) => {
      loading.hidden = true;
      const active = movies.filter((m) => m.status !== 'archived');
      if (!active.length) { empty.hidden = false; return; }

      active.forEach((movie) => {
        const capacity = Number(movie.capacityTotal) || 0;
        const booked = Number(movie.ticketsBooked) || 0;
        const pct = capacity ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;

        const row = document.createElement('div');
        row.className = 'movie-row';
        row.innerHTML =
          '<div class="movie-row-body">' +
          '<h3></h3>' +
          '<div class="movie-row-meta"></div>' +
          '<div class="capacity-bar"><div class="capacity-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="movie-row-meta"></div>' +
          '</div>';
        row.querySelector('h3').textContent = movie.title;
        row.querySelectorAll('.movie-row-meta')[0].textContent = movie.date + ' at ' + movie.time;
        row.querySelectorAll('.movie-row-meta')[1].textContent = booked + ' booked / ' + capacity + ' total (' + Math.max(0, capacity - booked) + ' remaining)';
        list.appendChild(row);
      });
    })
    .catch(() => {
      loading.hidden = true;
      errorEl.hidden = false;
    });
})();
