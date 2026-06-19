# PeroTech — Portfolio

An exact clone of the original portfolio design, rebranded as **PeroTech**.
Built from the real site source: static **HTML + CSS (Next.js build output)** for the
frontend, and a **Node.js / Express** backend for the newsletter.

```
perotech-portfolio/
├── frontend/     # the website (index, newsletter, products, chat + assets)
└── backend/      # Express server: serves the site + newsletter API
```

## Run it

The backend serves both the website and the API on one port.

```bash
cd backend
npm install          # only needed the first time
node server.js
```

Then open **http://localhost:5000**

- Website: `http://localhost:5000/`
- Health check: `http://localhost:5000/api/health`
- Subscribe API: `POST http://localhost:5000/api/subscribe`  body: `{ "name": "...", "email": "..." }`

Subscribers are stored in `backend/subscribers.json`. Welcome emails are sent through a
test (Ethereal) SMTP account by default — the preview URL is printed in the console.
Swap the transporter in `backend/server.js` for real SMTP (Gmail / SendGrid / SES) to
send live emails.

## Admin dashboard (CMS)

A secured admin interface to manage the whole site:

- **URL:** http://localhost:5000/admin/
- **Login:** `ADMIN_USER` / `ADMIN_PASS` in `backend/.env` (default `admin` / `perotech123`
  — change before going live, and set a long random `ADMIN_SECRET`).

Features: **Dashboard** (visitor analytics, 7-day chart, top pages, recent activity),
**Blog Posts** (full block builder — text/headings/lists/quotes/images/video/code/files),
**Motion** & **Products** CRUD, **Subscribers** (view/delete/select),
**Bulk Email** (send to all/selected via the branded PeroTech template), and **Settings**.

Content is stored as JSON in `backend/data/`. Public pages (Blog, Motion, Products) read
live from the API, so admin changes appear on the site immediately.

## Customizing

- **Profile photo:** `frontend/assets/img/images/profile-large.webp`
- **Logo:** `frontend/assets/img/logo/logo-text.webp`
- **Page content / text:** edit `frontend/index.html`, `products.html`, `newsletter.html`
- **Social links:** in `frontend/index.html` (currently point to the original channels —
  replace with your own PeroTech URLs)
