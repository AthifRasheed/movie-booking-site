// Movies.gs

function listMoviesPublic_() {
  const sheet = getSheet_(SHEET_MOVIES);
  return rowsToObjects_(sheet)
    .filter(function (m) {
      return String(m.status) === 'active' && (m.bookingsOpen === true || m.bookingsOpen === 'TRUE');
    })
    .map(function (m) {
      const capacity = Number(m.capacityTotal) || 0;
      const booked = Number(m.ticketsBooked) || 0;
      return {
        id: m.id,
        title: m.title,
        posterUrl: m.posterUrl,
        date: formatDateOnly_(m.date),
        time: formatTimeOnly_(m.time),
        venue: m.venue,
        trailerUrl: m.trailerUrl || '',
        pricePerTicket: Number(m.pricePerTicket) || 0,
        seatsRemaining: Math.max(0, capacity - booked)
      };
    });
}

function listMoviesAdmin_() {
  return rowsToObjects_(getSheet_(SHEET_MOVIES)).map(function (r) {
    const c = Object.assign({}, r);
    delete c._row;
    c.date = formatDateOnly_(c.date);
    c.time = formatTimeOnly_(c.time);
    return c;
  });
}

function addMovie_(payload) {
  const sheet = getSheet_(SHEET_MOVIES);
  const title = sanitizeText_(payload.title, 120);
  const price = Number(payload.pricePerTicket);
  const capacity = Number(payload.capacityTotal);
  if (!title) throw new Error('Title is required');
  if (!payload.date) throw new Error('Date is required');
  if (!payload.time) throw new Error('Time is required');
  if (!(price > 0)) throw new Error('Price must be greater than 0');
  if (!(capacity > 0)) throw new Error('Capacity must be greater than 0');

  const id = genId_('MOV');
  const now = nowIso_();
  sheet.appendRow([
    id, title,
    sanitizeText_(payload.posterUrl, 500),
    sanitizeText_(payload.posterPublicId, 200),
    payload.date, sanitizeText_(payload.time, 20), sanitizeText_(payload.venue, 80),
    price, capacity, 0, true, 'active', now, now,
    sanitizeText_(payload.trailerUrl, 300)
  ]);
  return { id: id };
}

function updateMovie_(payload) {
  const sheet = getSheet_(SHEET_MOVIES);
  const map = headerMap_(sheet);
  const target = rowsToObjects_(sheet).find(function (r) { return r.id === payload.id; });
  if (!target) throw new Error('Movie not found');

  const editable = ['title', 'posterUrl', 'posterPublicId', 'date', 'time', 'venue', 'trailerUrl', 'pricePerTicket', 'capacityTotal', 'bookingsOpen', 'status'];
  editable.forEach(function (field) {
    if (payload[field] === undefined) return;
    let value = payload[field];
    if (field === 'title' || field === 'venue' || field === 'time') value = sanitizeText_(value, 200);
    if (field === 'trailerUrl') value = sanitizeText_(value, 300);
    if (field === 'posterUrl' || field === 'posterPublicId') value = sanitizeText_(value, 500);
    if (field === 'pricePerTicket' || field === 'capacityTotal') value = Number(value);
    sheet.getRange(target._row, map[field] + 1).setValue(value);
  });
  sheet.getRange(target._row, map['updatedAt'] + 1).setValue(nowIso_());
  return { id: payload.id };
}
