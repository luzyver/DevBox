# DevBox

Disposable temporary email service with multi-domain support and community domain contributions.

## Tech Stack

- **Backend:** Go (SMTP server + REST API)
- **Frontend:** Next.js + Tailwind CSS
- **Database:** Redis (inbox with TTL auto-expire + domain management)
- **Icons:** Phosphor Icons (duotone)
- **Infra:** Cloudflare Pages, Docker Compose, Nginx on VM

## Architecture

```
[Internet] ─── MX record ──→ [devbox-app :25] (SMTP direct)
[Browser] ──HTTPS──→ [Cloudflare Pages: static frontend]
[Browser] ──HTTPS──→ [api.d-box.tech] ──→ [Nginx on VM] ──→ [devbox-app :8080]
[SSE client] ──HTTPS──→ [sse.d-box.tech] ──→ [Nginx on VM] ──→ [devbox-app :8081]
```

- SMTP (port 25) exposed directly to the internet via VPS public IP
- Cloudflare Pages serves the static frontend at `d-box.tech`
- Nginx on the VM proxies API and SSE traffic to the Go backend

## Project Structure

```
├── cmd/server/main.go        # Entry point
├── internal/
│   ├── config/               # Environment config
│   ├── dns/                  # DNS verification + periodic checker
│   ├── smtp/                 # SMTP server (go-smtp)
│   ├── store/                # Redis (inbox + domain management)
│   └── web/                  # HTTP API (Fiber)
├── web/                      # Frontend (Next.js)
│   ├── app/
│   │   ├── components/       # UI components
│   │   ├── contribute/       # Domain contribution page
│   │   ├── domains/          # Active domains listing
│   │   ├── faq/              # FAQ page
│   │   └── privacy/          # Privacy policy page
│   └── public/names/         # Name datasets for email generation
├── docker-compose.yml
├── Dockerfile                # Go backend
└── .env.example
```

## Setup

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env with your values
```

### 2. DNS Records

For the primary domain:

| Record | Name | Value | Proxy |
|--------|------|-------|-------|
| MX | yourdomain.com | mail.yourdomain.com (priority 10) | — |
| A | mail.yourdomain.com | VPS IP | DNS only |

Also point `api.d-box.tech` and `sse.d-box.tech` to the VPS public IP as DNS-only A records. Additional mail domains only need an MX record pointing to `mail.yourdomain.com`.

### 3. Cloudflare Pages

Create a Pages project from this repository with root directory `web`, build command `npm run build`, and output directory `out`. Copy the values from `web/.env.example` into the Pages project’s build environment variables; these stay separate from the VM’s root `.env`.

Add `d-box.tech` as the Pages custom domain.

### 4. Nginx on the VM

Install Nginx on the VM and issue Let’s Encrypt certificates for `api.d-box.tech` and `sse.d-box.tech` at:

```text
/etc/letsencrypt/live/api.d-box.tech/fullchain.pem
/etc/letsencrypt/live/api.d-box.tech/privkey.pem
/etc/letsencrypt/live/sse.d-box.tech/fullchain.pem
/etc/letsencrypt/live/sse.d-box.tech/privkey.pem
```

Enable the included host configuration:

```bash
sudo install -m 644 nginx/tempmail.conf /etc/nginx/sites-available/tempmail
sudo ln -s /etc/nginx/sites-available/tempmail /etc/nginx/sites-enabled/tempmail
sudo nginx -t && sudo systemctl reload nginx
```

Nginx listens on ports 80 and 443, redirects HTTP to HTTPS, and proxies API and SSE traffic. Ensure both ports are open on the VPS firewall.

### 5. Deploy the backend

```bash
docker compose up -d --build
```

## Services

| Component | Port | Function |
|-----------|------|----------|
| Cloudflare Pages | `d-box.tech` | Static frontend |
| Nginx (VM) | 80, 443 | HTTPS reverse proxy for API and SSE |
| devbox-app | 25, 127.0.0.1:8080, 127.0.0.1:8081 | SMTP, REST API, SSE |
| devbox-redis | internal 6379 | Inbox storage + domain management |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SMTP_PORT` | SMTP listen port |
| `HTTP_PORT` | API listen port |
| `REDIS_URL` | Redis connection string |
| `HMAC_SECRET` | Secret for inbox token signing |
| `SERVER_IP` | VPS public IP (for DNS verification) |
| `INBOX_TTL` | Inbox expiry duration (e.g. `72h`) |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret key (backend) |
| `GOOGLE_BASE_EMAIL` | Gmail parent address accepted by the backend for alias claims |
| `GOOGLE_IMAP_USER` | Gmail account used by the backend IMAP poller |
| `GOOGLE_IMAP_APP_PASSWORD` | Gmail app password for IMAP login |
| `GOOGLE_IMAP_HOST` | IMAP host, e.g. `imap.gmail.com:993` |
| `GOOGLE_IMAP_POLL_INTERVAL` | Gmail poll interval, e.g. `30s` |

Cloudflare Pages build variables are listed separately in `web/.env.example` and configured in the Pages project settings.

## Anti-Spam (Cloudflare Turnstile)

Turnstile challenge is shown when a user generates a new email for the first time. Users who already have an inbox in localStorage do not need to solve it again.

Setup:
1. Create a widget at [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Add `TURNSTILE_SECRET` to the VM `.env` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to Cloudflare Pages build variables:
   ```
   TURNSTILE_SECRET=0x4AAAAAAA...
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   ```
3. Redeploy the Pages project and restart the backend: `docker compose up -d --build`

If the env vars are empty, Turnstile is skipped (backward compatible).

## Google Temporary Email

DevBox can generate Gmail plus-address aliases like `devbox+onljnk12@gmail.com` from one parent Gmail inbox and import matching messages through IMAP.

The `/temporary-google-email` page uses the same inbox UI as the main page, but keeps only one active Gmail alias. On the first visit it runs Turnstile and generates an alias; later visits restore the saved alias from the `google_alias` localStorage key without another challenge. Clicking `New` runs Turnstile again and replaces the active alias.

Setup guide: [google-temporary-email.md](google-temporary-email.md)

## Address History

Up to 10 addresses are saved in history (localStorage). Access them by clicking the current address bar — a modal picker opens.

- **Lock** — lock an address to prevent it from being removed when history reaches the 10-item limit. Locked items are always kept; unlocked items at the tail are trimmed first.
- **Delete** — removes an address from history. If the active address is deleted, it switches to the next available one. Locked addresses cannot be deleted.
- **All locked** — if all 10 slots are locked, a toast warning is shown and generating a new inbox is blocked until one is unlocked.
- **Domain change** — clicking the domain opens a modal picker. Changing domain with an active address shows a confirmation modal, then generates a new inbox.

## Adding a New Domain

Domains are added via the `/contribute` page:

1. Open `/contribute`
2. Set up the MX record as instructed (point to `mail.d-box.tech`)
3. Submit the domain
4. If DNS is correct → domain is activated immediately
5. If not → enters pending state, checked automatically every 5 minutes

Pending domains that remain unverified for 24 hours are automatically removed. Active domains with invalid DNS are automatically deactivated.

## Pages

| Path | Description |
|------|-------------|
| `/` | Main inbox |
| `/temporary-google-email` | Gmail plus-address alias inbox |
| `/contribute` | Add your domain |
| `/domains` | List of active domains |
| `/faq` | Frequently asked questions |
| `/privacy` | Privacy policy |
