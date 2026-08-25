// admin/js/nav.js — injects the shared admin nav into <div id="adminNav">.
(function () {
  const mount = document.getElementById('adminNav');
  if (!mount) return;
  const current = document.body.getAttribute('data-page') || '';

  const links = [
    { href: '/admin/dashboard.html', label: 'Dashboard', key: 'dashboard' },
    { href: '/admin/movies.html', label: 'Movies', key: 'movies' },
    { href: '/admin/bookings.html', label: 'Bookings', key: 'bookings' },
    { href: '/admin/settings.html', label: 'Settings', key: 'settings' },
  ];

  mount.innerHTML =
    '<div class="admin-topbar">' +
    '<span class="admin-brand">Admin</span>' +
    '<button type="button" id="navToggle" class="nav-toggle" aria-expanded="false" aria-controls="navMenu">Menu</button>' +
    '</div>' +
    '<nav id="navMenu" class="admin-nav" hidden>' +
    links.map((l) =>
      '<a href="' + l.href + '"' + (l.key === current ? ' aria-current="page" class="active"' : '') + '>' + l.label + '</a>'
    ).join('') +
    '<button type="button" id="logoutBtn" class="admin-nav-logout">Log out</button>' +
    '</nav>';

  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  toggle.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });

  wireLogout();
})();
