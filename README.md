# DevBox

Disposable temporary email service with multi-domain support and community domain contributions.

## Tech Stack

- **Backend:** Go (SMTP server + REST API)
- **Frontend:** Next.js + Tailwind CSS
- **Database:** Redis (inbox with TTL auto-expire + domain management)
- **Icons:** Phosphor Icons (duotone)
- **Infra:** Docker Compose, Cloudflare Tunnel

## Architecture

```
[Internet] ─── MX record ──→ [devbox-app :25] (SMTP direct)
[Browser]  ─── CF Tunnel ──→ [devbox-web :3000] ──rewrite──→ [devbox-app :8080]
```

- SMTP (port 25) exposed directly to the internet via VPS public IP
- Web accessed through Cloudflare Tunnel (network `cloudflared`)
- Next.js proxies `/api/*` to Go backend internally

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

Additional domains only need an MX record pointing to `mail.yourdomain.com`.

### 3. Cloudflare Tunnel

Point the public hostname to `http://devbox-web:3000` in the CF Tunnel dashboard.

Ensure the `cloudflared` network exists:

```bash
docker network create cloudflared
```

### 4. Deploy

```bash
cd web && npm install && cd ..
docker compose up -d --build
```

## Services

| Container | Port | Function |
|-----------|------|----------|
| devbox-app | 25, 8080 | SMTP server + REST API |
| devbox-web | 3000 | Frontend (Next.js) |
| devbox-redis | 6379 | Inbox storage + domain management |

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
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (frontend, build-time) |

## Anti-Spam (Cloudflare Turnstile)

Turnstile challenge is shown when a user generates a new email for the first time. Users who already have an inbox in localStorage do not need to solve it again.

Setup:
1. Create a widget at [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Add to `.env`:
   ```
   TURNSTILE_SECRET=0x4AAAAAAA...
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   ```
3. Rebuild: `docker compose up -d --build`

If the env vars are empty, Turnstile is skipped (backward compatible).

## Google Temporary Email

DevBox can generate Gmail plus-address aliases like `devbox+onljnk12@gmail.com` from one parent Gmail inbox and import matching messages through IMAP.

Setup guide: [docs/google-temporary-email.md](docs/google-temporary-email.md)

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
| `/contribute` | Add your domain |
| `/domains` | List of active domains |
| `/faq` | Frequently asked questions |
| `/privacy` | Privacy policy |
