# DevBox

Disposable temporary email service with multi-domain support and community domain contributions.

## Tech Stack

- **Backend:** Go (SMTP server + REST API)
- **Frontend:** Next.js + Tailwind CSS
- **Database:** Redis (inbox with TTL auto-expire + domain management)
- **Infra:** Docker Compose, Cloudflare Tunnel

## Architecture

```
[Internet] ─── MX record ──→ [devbox-app :25] (SMTP direct)
[Browser]  ─── CF Tunnel ──→ [devbox-web :3000] ──rewrite──→ [devbox-app :8080]
```

- SMTP (port 25) exposed langsung ke internet via IP publik VPS
- Web diakses melalui Cloudflare Tunnel (network `cloudflared`)
- Next.js proxy `/api/*` ke Go backend secara internal

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
│   │   └── contribute/       # Domain contribution page
│   └── public/names/         # Name datasets for email generation
├── docker-compose.yml
├── Dockerfile                # Go backend
└── .env.example
```

## Setup

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env sesuai kebutuhan
```

### 2. DNS Records

| Record | Name | Value | Proxy |
|--------|------|-------|-------|
| MX | yourdomain.com | mail.yourdomain.com (priority 10) | — |
| A | mail.yourdomain.com | IP VPS | DNS only ☁️ |

### 3. Cloudflare Tunnel

Arahkan public hostname ke `http://devbox-web:3000` di CF Tunnel dashboard.

Pastikan network `cloudflared` sudah ada:

```bash
docker network create cloudflared
```

### 4. Deploy

```bash
docker compose up -d --build
```

## Services

| Container | Port | Fungsi |
|-----------|------|--------|
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
| `SERVER_IP` | Public IP VPS (for DNS verification) |
| `INBOX_TTL` | Inbox expiry duration (e.g. `72h`) |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret key (backend) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (frontend, build-time) |

## Anti-Spam (Cloudflare Turnstile)

Turnstile challenge ditampilkan saat user pertama kali generate email baru. User yang sudah punya inbox di localStorage tidak perlu solve ulang.

Setup:
1. Buat widget di [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Tambahkan ke `.env`:
   ```
   TURNSTILE_SECRET=0x4AAAAAAA...
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   ```
3. Rebuild: `docker compose up -d --build`

Jika env kosong, Turnstile di-skip (backward compatible).

## Adding a New Domain

Domain ditambahkan melalui halaman `/contribute` di web:

1. Buka `/contribute`
2. Setup DNS records sesuai instruksi (MX + A record)
3. Submit domain
4. Jika DNS sudah benar → domain langsung aktif
5. Jika belum → masuk pending, dicek otomatis tiap 5 menit

Domain yang DNS-nya sudah tidak valid akan otomatis di-deactivate.
