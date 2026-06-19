# Deploying PeroTech to a Hostinger VPS

This guide takes the site live on a Hostinger VPS (Ubuntu) with your custom
domain and free HTTPS, in a way that lets you **keep shipping features without
ever losing live data** (subscribers, analytics, admin edits, uploads).

## How data is kept safe across updates
- **Code** lives in git.
- **Live data** (`subscribers`, `analytics`, admin-edited content) lives in
  `DATA_DIR`, and **uploads** live in `UPLOAD_DIR` — both set in `.env` to
  folders **outside** the repo (e.g. `/srv/perotech/...`).
- On first boot the server seeds `DATA_DIR` from `backend/seed/`. After that,
  `git pull` only changes code; it can never touch your live data or uploads.

---

## 1. One-time: put the code on GitHub
On your PC, in the project folder:
```bash
git init
git add .
git commit -m "PeroTech site"
git branch -M main
git remote add origin https://github.com/<you>/perotech-portfolio.git
git push -u origin main
```
(`.gitignore` already excludes `.env`, `node_modules`, live data and uploads.)

## 2. Create the VPS
In Hostinger: buy a **VPS** (1–2 GB RAM is plenty) and choose **Ubuntu 22.04**.
Note the server's **IP address**. SSH in:
```bash
ssh root@YOUR_SERVER_IP
```

## 3. Install the runtime
```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx
npm install -g pm2
```

## 4. Get the code + create persistent folders
```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/<you>/perotech-portfolio.git
cd perotech-portfolio

# Persistent storage that survives every deploy:
mkdir -p /srv/perotech/data /srv/perotech/uploads /srv/perotech/backups
mkdir -p logs
```

## 5. First-run: bring over your existing uploads (one time)
Your current portfolio media (blog covers, videos, downloads) lives in
`frontend/assets/uploads/` on your PC. Copy it to the server's upload folder
**once** (from your PC):
```bash
scp -r frontend/assets/uploads/* root@YOUR_SERVER_IP:/srv/perotech/uploads/
```
(New uploads you add later via the admin go straight into `/srv/perotech/uploads`.)

## 6. Configure environment
```bash
cd /var/www/perotech-portfolio/backend
cp .env.example .env
nano .env
```
Set at least:
- `PUBLIC_URL=https://yourdomain.com`
- `DATA_DIR=/srv/perotech/data`
- `UPLOAD_DIR=/srv/perotech/uploads`
- `ADMIN_USER`, `ADMIN_PASS`, and a long random `ADMIN_SECRET`
  (generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- Your `SMTP_*` mail settings (port **465**).

## 7. Install deps + start with PM2
```bash
cd /var/www/perotech-portfolio/backend && npm install --omit=dev && cd ..
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # run the command it prints, so the app survives reboots
```
Check it's up: `curl http://localhost:5000/api/health`

## 8. Point your domain at the VPS
In Hostinger's DNS panel for your domain, create/edit:
- `A` record: `@`  → `YOUR_SERVER_IP`
- `A` record: `www` → `YOUR_SERVER_IP`

## 9. Nginx reverse proxy
```bash
nano /etc/nginx/sites-available/perotech
```
Paste (replace the domain):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    client_max_body_size 30M;   # allow large uploads

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable it:
```bash
ln -s /etc/nginx/sites-available/perotech /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 10. Free HTTPS
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot adds HTTPS and auto-renews. Your site is now live at `https://yourdomain.com`.

---

## Shipping updates later
After you build new features on your PC and `git push`, update the live site:
```bash
cd /var/www/perotech-portfolio
bash scripts/deploy.sh
```
This pulls code, installs any new deps, and zero-downtime reloads — **live data
and uploads are left untouched.**

## Backups
Schedule a daily backup of data + uploads:
```bash
crontab -e
# add:
0 3 * * * DATA_DIR=/srv/perotech/data UPLOAD_DIR=/srv/perotech/uploads BACKUP_DIR=/srv/perotech/backups bash /var/www/perotech-portfolio/scripts/backup.sh
```

## Email note
You're using Gmail SMTP on port **465**. If the VPS provider blocks outbound
SMTP, switch to **Resend** or **SendGrid** in `.env` (see `.env.example`) — only
the 4 `SMTP_*` values change, no code edits. For best inbox delivery on your own
domain, verify the domain with Resend and send from `you@yourdomain.com`.
