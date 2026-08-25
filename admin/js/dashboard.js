(function () {
  requireSession();

  const loading = document.getElementById('dashLoading');
  const errorEl = document.getElementById('dashError');
  const empty = document.getElementById('dashEmpty');
  const list = document.getElementById('dashList');

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
