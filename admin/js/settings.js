(function () {
  requireSession();

  const loading = document.getElementById('settingsLoading');
  const form = document.getElementById('settingsForm');
  const errorEl = document.getElementById('settingsError');
  const saveBtn = document.getElementById('saveSettingsBtn');

  const fields = ['cinemaName', 'bankAccountName', 'bankAccountNumber', 'bankName', 'whatsappNumber', 'viberNumber'];

  apiFetch('/api/admin/settings')
    .then((data) => {
      fields.forEach((f) => { document.getElementById(f).value = data[f] || ''; });
      loading.hidden = true;
      form.hidden = false;
    })
    .catch((err) => {
      loading.textContent = err.message || 'Could not load settings.';
    });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const payload = {};
    fields.forEach((f) => { payload[f] = document.getElementById(f).value.trim(); });

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    apiFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) })
      .then(() => showToast('Settings saved.'))
      .catch((err) => { errorEl.textContent = err.message || 'Could not save.'; errorEl.hidden = false; })
      .finally(() => { saveBtn.disabled = false; saveBtn.textContent = 'Save Settings'; });
  });
})();
