# Movie Booking Site

A lightweight, mobile-first movie ticket booking site.

- `/` — customer site (movie list, booking, confirmation)
- `/admin/` — admin site (login, dashboard, movies, bookings, settings)
- `/functions/` — Cloudflare Pages Functions (the API layer; the only thing that talks to Google Sheets and Cloudinary)

## Required environment variables (set in Cloudflare Pages → Settings → Environment variables)

| Variable | Purpose |
|---|---|
| `APPS_SCRIPT_URL` | The deployed Google Apps Script Web App URL (ends in `/exec`) |
| `APPS_SCRIPT_SECRET` | Must match the `API_SECRET` script property in Apps Script |
| `CLOUDINARY_CLOUD_NAME` | From your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard — mark as "secret" in Cloudflare |
| `SESSION_SECRET` | Random string used to sign admin login sessions — mark as "secret" |
| `ADMIN_USERNAME` | The admin login username |
| `ADMIN_PASSWORD_HASH` | `iterations:saltHex:hashHex` — generated, not typed by hand — mark as "secret" |

Optional: bind a KV namespace as `RATE_LIMIT_KV` to enable rate limiting on booking creation and admin login. The site works without it — rate limiting just won't be active.

No build step, no dependencies to install. This is plain HTML/CSS/JS plus Cloudflare Pages Functions.
