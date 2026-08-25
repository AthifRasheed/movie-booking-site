(function () {
  requireSession();

  const loading = document.getElementById('moviesLoading');
  const errorEl = document.getElementById('moviesError');
  const empty = document.getElementById('moviesEmpty');
  const list = document.getElementById('moviesList');
  const tabs = document.querySelectorAll('.tab-btn');

  const panel = document.getElementById('movieFormPanel');
  const form = document.getElementById('movieForm');
  const formTitle = document.getElementById('formTitle');
  const formError = document.getElementById('formError');
  const saveBtn = document.getElementById('saveMovieBtn');
  const posterPreview = document.getElementById('posterPreview');
  const uploadProgress = document.getElementById('uploadProgress');

  let allMovies = [];
  let currentTab = 'active';

  function load() {
    loading.hidden = false;
    errorEl.hidden = true;
    empty.hidden = true;
    list.innerHTML = '';

    apiFetch('/api/admin/movies')
      .then((movies) => {
        allMovies = movies;
        loading.hidden = true;
        render();
      })
      .catch(() => {
        loading.hidden = true;
        errorEl.hidden = false;
      });
  }

  function render() {
    list.innerHTML = '';
    const filtered = allMovies.filter((m) => (currentTab === 'archived' ? m.status === 'archived' : m.status !== 'archived'));
    if (!filtered.length) { empty.hidden = false; return; }
    empty.hidden = true;
    filtered.forEach((movie) => list.appendChild(renderRow(movie)));
  }

  function renderRow(movie) {
    const capacity = Number(movie.capacityTotal) || 0;
    const booked = Number(movie.ticketsBooked) || 0;
    const open = movie.bookingsOpen === true || movie.bookingsOpen === 'TRUE';

    const row = document.createElement('div');
    row.className = 'movie-row';

    const img = document.createElement('img');
    img.src = posterVariant(movie.posterUrl, 160) || '';
    img.alt = '';
    row.appendChild(img);

    const body = document.createElement('div');
    body.className = 'movie-row-body';
    body.innerHTML =
      '<h3></h3>' +
      '<div class="movie-row-meta"></div>' +
      '<div class="movie-row-meta"></div>' +
      '<span class="pill"></span>' +
      '<div class="movie-row-actions"></div>';
    body.querySelector('h3').textContent = movie.title;
    body.querySelectorAll('.movie-row-meta')[0].textContent = movie.date + ' at ' + movie.time + (movie.venue ? ' · ' + movie.venue : '');
    body.querySelectorAll('.movie-row-meta')[1].textContent = 'MVR ' + Number(movie.pricePerTicket).toFixed(2) + ' · ' + booked + '/' + capacity + ' booked';

    const pill = body.querySelector('.pill');
    if (movie.status === 'archived') {
      pill.textContent = 'Archived'; pill.classList.add('pill-archived');
    } else if (open) {
      pill.textContent = 'Bookings open'; pill.classList.add('pill-open');
    } else {
      pill.textContent = 'Bookings closed'; pill.classList.add('pill-closed');
    }

    const actions = body.querySelector('.movie-row-actions');

    const editBtn = document.createElement('button');
    editBtn.type = 'button'; editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openForm(movie));
    actions.appendChild(editBtn);

    if (movie.status !== 'archived') {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button'; toggleBtn.className = 'btn btn-secondary btn-sm';
      toggleBtn.textContent = open ? 'Close bookings' : 'Reopen bookings';
      toggleBtn.addEventListener('click', () => updateMovie(movie.id, { bookingsOpen: !open }, toggleBtn));
      actions.appendChild(toggleBtn);
    }

    const archiveBtn = document.createElement('button');
    archiveBtn.type = 'button'; archiveBtn.className = 'btn btn-danger btn-sm';
    archiveBtn.textContent = movie.status === 'archived' ? 'Unarchive' : 'Archive';
    archiveBtn.addEventListener('click', () => updateMovie(movie.id, { status: movie.status === 'archived' ? 'active' : 'archived' }, archiveBtn));
    actions.appendChild(archiveBtn);

    row.appendChild(body);
    return row;
  }

  function updateMovie(id, patch, btn) {
    if (btn) btn.disabled = true;
    apiFetch('/api/admin/movies/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(patch) })
      .then(() => { showToast('Updated.'); load(); })
      .catch((err) => { showToast(err.message || 'Could not update.', true); if (btn) btn.disabled = false; });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.getAttribute('data-status');
      render();
    });
  });

  // ---- Add / Edit form ----

  function openForm(movie) {
    form.reset();
    formError.hidden = true;
    posterPreview.hidden = true;
    uploadProgress.hidden = true;
    document.getElementById('posterUrl').value = '';
    document.getElementById('posterPublicId').value = '';

    if (movie) {
      formTitle.textContent = 'Edit Movie';
      document.getElementById('movieId').value = movie.id;
      document.getElementById('titleInput').value = movie.title || '';
      document.getElementById('dateInput').value = movie.date || '';
      document.getElementById('timeInput').value = movie.time || '';
      document.getElementById('venueInput').value = movie.venue || '';
      document.getElementById('priceInput').value = movie.pricePerTicket || '';
      document.getElementById('capacityInput').value = movie.capacityTotal || '';
      document.getElementById('posterUrl').value = movie.posterUrl || '';
      document.getElementById('posterPublicId').value = movie.posterPublicId || '';
      if (movie.posterUrl) {
        posterPreview.src = posterVariant(movie.posterUrl, 240);
        posterPreview.hidden = false;
      }
    } else {
      formTitle.textContent = 'Add Movie';
      document.getElementById('movieId').value = '';
    }
    panel.hidden = false;
  }

  document.getElementById('addMovieBtn').addEventListener('click', () => openForm(null));
  document.getElementById('closeFormBtn').addEventListener('click', () => { panel.hidden = true; });

  document.getElementById('posterInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadProgress.hidden = false;
    uploadProgress.textContent = 'Uploading… 0%';
    try {
      const result = await uploadPoster(file, (pct) => { uploadProgress.textContent = 'Uploading… ' + pct + '%'; });
      document.getElementById('posterUrl').value = result.posterUrl;
      document.getElementById('posterPublicId').value = result.posterPublicId;
      posterPreview.src = posterVariant(result.posterUrl, 240);
      posterPreview.hidden = false;
      uploadProgress.textContent = 'Poster uploaded.';
      setTimeout(() => { uploadProgress.hidden = true; }, 1500);
    } catch (err) {
      uploadProgress.textContent = err.message || 'Upload failed.';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.hidden = true;

    const payload = {
      title: document.getElementById('titleInput').value.trim(),
      date: document.getElementById('dateInput').value,
      time: document.getElementById('timeInput').value,
      venue: document.getElementById('venueInput').value.trim(),
      pricePerTicket: Number(document.getElementById('priceInput').value),
      capacityTotal: Number(document.getElementById('capacityInput').value),
      posterUrl: document.getElementById('posterUrl').value,
      posterPublicId: document.getElementById('posterPublicId').value,
    };

    if (!payload.title) return showFormError('Title is required.');
    if (!payload.date) return showFormError('Date is required.');
    if (!payload.time) return showFormError('Time is required.');
    if (!(payload.pricePerTicket > 0)) return showFormError('Price must be greater than 0.');
    if (!(payload.capacityTotal > 0)) return showFormError('Capacity must be greater than 0.');

    const id = document.getElementById('movieId').value;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    const request = id
      ? apiFetch('/api/admin/movies/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(payload) })
      : apiFetch('/api/admin/movies', { method: 'POST', body: JSON.stringify(payload) });

    request
      .then(() => {
        panel.hidden = true;
        showToast('Saved.');
        load();
      })
      .catch((err) => showFormError(err.message || 'Could not save.'))
      .finally(() => { saveBtn.disabled = false; saveBtn.textContent = 'Save Movie'; });
  });

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  load();
})();
