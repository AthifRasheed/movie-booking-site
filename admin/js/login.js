(function () {
  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  // If already logged in, skip straight to the dashboard.
  apiFetch('/api/admin/session').then(() => { location.href = '/admin/dashboard.html'; }).catch(() => {});

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Logging in…';

    try {
      await apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('username').value.trim(),
          password: document.getElementById('password').value,
        }),
      });
      location.href = '/admin/dashboard.html';
    } catch (err) {
      errorEl.textContent = err.message || 'Could not log in.';
      errorEl.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Log In';
    }
  });
})();
