// admin/js/shared.js — loaded on every admin page.

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = { ok: false, error: 'Unexpected server response.' };
  }
  if (res.status === 401 && !location.pathname.endsWith('/admin/') && !location.pathname.endsWith('/admin/index.html')) {
    location.href = '/admin/';
    return Promise.reject(new Error('Session expired'));
  }
  if (!body.ok) throw new Error(body.error || 'Something went wrong.');
  return body.data;
}

async function requireSession() {
  try {
    await apiFetch('/api/admin/session');
  } catch {
    location.href = '/admin/';
  }
}

function wireLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try { await apiFetch('/api/admin/logout', { method: 'POST' }); } catch { /* ignore */ }
    location.href = '/admin/';
  });
}

function showToast(message, isError) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.toggle('toast-error', Boolean(isError));
  toast.classList.add('toast-visible');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('toast-visible'), 2600);
}

// Applies a light Cloudinary transformation for compressed, responsive WebP-capable delivery.
function posterVariant(url, width) {
  if (!url || url.indexOf('/upload/') === -1) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto,w_' + width + '/');
}

// Uploads a poster file directly to Cloudinary using a signature fetched from our own
// backend — the browser never sees the Cloudinary API secret.
async function uploadPoster(file, onProgress) {
  const sig = await apiFetch('/api/admin/upload-signature', { method: 'POST', body: JSON.stringify({}) });

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', sig.timestamp);
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + sig.cloudName + '/image/upload');
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
          resolve({ posterUrl: res.secure_url, posterPublicId: res.public_id });
        } else {
          reject(new Error((res.error && res.error.message) || 'Poster upload failed.'));
        }
      } catch {
        reject(new Error('Poster upload failed.'));
      }
    };
    xhr.onerror = () => reject(new Error('Poster upload failed. Check your connection.'));
    xhr.send(form);
  });
}
