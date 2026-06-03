# Google Temporary Email Setup

This feature generates Gmail plus-address aliases from one parent mailbox.

Example:

```text
Parent mailbox: devbox@gmail.com
Generated alias: devbox+onljnk12@gmail.com
```

All messages still arrive in the parent Gmail inbox. DevBox polls Gmail over IMAP, finds messages sent to plus-address aliases, then stores them in Redis so they can be read from `/temporary-google-email`.

The page uses the same inbox UI as the main temporary email page, but it keeps only one active Gmail alias at a time.

## Requirements

- A dedicated Gmail account, for example `devbox@gmail.com`
- 2-Step Verification enabled on that Google account
- A Gmail app password
- IMAP enabled in Gmail
- Cloudflare Turnstile env configured if bot protection is enabled

Do not use a personal Gmail account for this. Use a disposable operational mailbox dedicated to DevBox.

## 1. Enable 2-Step Verification

1. Open the Google account used as the parent mailbox.
2. Go to Google Account -> Security.
3. Open 2-Step Verification.
4. Enable it and complete Google's setup flow.

Google only allows app passwords after 2-Step Verification is enabled.

## 2. Create an App Password

1. Open Google Account -> Security.
2. Open App passwords.
3. Create a new app password for Mail.
4. Copy the generated 16-character password.

Google may display the password with spaces, like:

```text
abcd efgh ijkl mnop
```

Use it without spaces in `.env`:

```text
abcdefghijklmnop
```

## 3. Check IMAP in Gmail

1. Open Gmail.
2. Click Settings -> See all settings.
3. Open Forwarding and POP/IMAP.

For personal Gmail accounts, Google no longer shows an Enable IMAP / Disable IMAP switch in many accounts because IMAP is enabled by default. If the switch is visible, enable IMAP and save changes. If it is not visible, continue with the setup.

## 4. Configure DevBox

Add these values to `.env`:

```env
NEXT_PUBLIC_GOOGLE_BASE_EMAIL=devbox@gmail.com
GOOGLE_BASE_EMAIL=devbox@gmail.com
GOOGLE_IMAP_USER=devbox@gmail.com
GOOGLE_IMAP_APP_PASSWORD=abcdefghijklmnop
GOOGLE_IMAP_HOST=imap.gmail.com:993
GOOGLE_IMAP_POLL_INTERVAL=30s
```

Variable meanings:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_BASE_EMAIL` | Parent email used by the frontend to generate aliases at build time; it is not displayed in the UI |
| `GOOGLE_BASE_EMAIL` | Parent Gmail address allowed by the backend |
| `GOOGLE_IMAP_USER` | Gmail account used for IMAP login |
| `GOOGLE_IMAP_APP_PASSWORD` | Gmail app password, not the normal account password |
| `GOOGLE_IMAP_HOST` | Gmail IMAP host, usually `imap.gmail.com:993` |
| `GOOGLE_IMAP_POLL_INTERVAL` | How often DevBox checks Gmail for unread alias messages |

`NEXT_PUBLIC_GOOGLE_BASE_EMAIL` is used by Next.js, so rebuild the web container after changing it.

With Docker Compose, this value must be present in the root `.env` before building because it is passed as a `devbox-web` build argument.

## 5. Restart or Rebuild

For Docker Compose:

```bash
docker compose up -d --build
```

For local development, restart both backend and frontend processes.

## 6. Test the Flow

1. Open `/temporary-google-email`.
2. On the first visit, complete Turnstile. DevBox generates one active alias, for example `devbox+onljnk12@gmail.com`.
3. Send a test email to that alias from another email account.
4. Wait up to `GOOGLE_IMAP_POLL_INTERVAL`.
5. Click Refresh if the message has not appeared yet.

## How It Works

DevBox logs in to Gmail using IMAP and searches unread messages sent to the parent local part, for example `devbox`.

When it finds a message addressed to a plus alias such as `devbox+onljnk12@gmail.com`, it stores the message in Redis under that exact alias address. The frontend claims a signed token for the alias through `/api/google-alias/claim`, then reads it through the normal inbox API.

If `TURNSTILE_SECRET` is set, `/api/google-alias/claim` requires a valid Turnstile token. The frontend gets this token using `NEXT_PUBLIC_TURNSTILE_SITE_KEY` when generating a new alias. On first visit, the page runs Turnstile and creates the first alias automatically. Later visits restore the claimed alias from the `google_alias` localStorage key without another Turnstile challenge. Clicking `New` runs Turnstile again and replaces the active alias.

After DevBox imports a Gmail message, it marks the Gmail message as seen to avoid importing it repeatedly.

## Alias Routing Safety

DevBox routes each Gmail message to exactly one Redis inbox.

Recipient detection uses these rules:

1. Prefer delivery headers: `Delivered-To`, then `X-Original-To`.
2. Use `To` and `Cc` only if no delivery header contains a valid alias.
3. Import only when exactly one alias is found.
4. Skip the message if multiple different aliases are found in the same header group.

This prevents one message from being copied into both `devbox+123@gmail.com` and `devbox+321@gmail.com` when the headers are ambiguous.

## Troubleshooting

If messages do not appear:

- Confirm the email arrived in the parent Gmail inbox.
- Confirm IMAP is enabled in Gmail settings.
- Confirm `GOOGLE_IMAP_APP_PASSWORD` is an app password, not the normal Gmail password.
- Confirm `GOOGLE_BASE_EMAIL`, `GOOGLE_IMAP_USER`, and `NEXT_PUBLIC_GOOGLE_BASE_EMAIL` use the same parent account.
- Confirm the alias starts with the parent local part, for example `devbox+anything@gmail.com`.
- Check backend logs for `google imap poll error`.

If Google rejects login:

- Regenerate the app password.
- Make sure 2-Step Verification is enabled.
- Make sure there are no spaces in `GOOGLE_IMAP_APP_PASSWORD`.

If the frontend shows the wrong parent Gmail:

- Update `NEXT_PUBLIC_GOOGLE_BASE_EMAIL`.
- Rebuild the frontend, because `NEXT_PUBLIC_*` values are embedded at build time.
