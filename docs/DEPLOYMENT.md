# Deployment (single VPS)

The production stack is `deploy/docker-compose.yml`. Only Caddy is reachable from the internet.

```
internet ──443/80──▶ caddy ──▶ web (Next standalone :3000) ──/api/*──▶ api (Hono :8787) ──▶ db (Postgres 18)
                                                        release (one-off: migrate → import NT → seed)
```

- **caddy:** TLS with automatic Let's Encrypt certificates, HTTP→HTTPS redirect, HSTS.
- **web:** the Next.js standalone server. The browser only talks to this origin; `/api/*` is
  rewritten to the API, so the session cookie is first-party (`Secure` in production).
- **api:** the Hono API, not published.
- **release:** runs on every `up`, before the new API starts. It applies migrations, re-imports the
  pinned NT data and upserts the curated content. Every step is idempotent (about 12s on an
  existing database, 20s on an empty one). If it fails, the API is not replaced.
- **db:** Postgres 18 in a named volume, not published.

## Server requirements

- A Linux VPS with Docker Engine and the Compose plugin. 2 GB RAM is comfortable: `next build`
  runs on the server during `--build`. At run time the stack needs well under 1 GB.
- DNS `A`/`AAAA` records for your domain pointing at the server.
- A firewall allowing only 22, 80 and 443 (443/udp too, for HTTP/3).

## First deploy

```bash
git clone <repo> /srv/greek-bible-teacher && cd /srv/greek-bible-teacher
cp deploy/.env.example deploy/.env
# Edit deploy/.env: DOMAIN, ACME_EMAIL and a URL-safe password (openssl rand -hex 32).
docker compose -f deploy/docker-compose.yml up -d --build --wait
docker compose -f deploy/docker-compose.yml logs release   # "[release] seeded …"
```

`--wait` returns once web and API report healthy. Caddy requests the certificate on the first
HTTPS request; check it with `docker compose -f deploy/docker-compose.yml logs caddy`.

## Updating

```bash
cd /srv/greek-bible-teacher
./deploy/backup.sh                 # a fresh backup before migrations run
git pull
IMAGE_TAG=$(git rev-parse --short HEAD) docker compose -f deploy/docker-compose.yml up -d --build --wait
```

The release step runs again, and then API and web are recreated. The old API keeps serving until
release has finished, so **migrations must stay compatible with the running version** (add
columns and tables first, remove them in a later deploy).

**Rollback:** redeploy the previous tag (`git checkout <sha>` and the same `up` command). Code
rolls back; migrations do not. If a migration has to be undone, restore the backup taken before
the update (below).

## Backups

`deploy/backup.sh` writes a compressed `pg_dump` (custom format) to `deploy/backups/` and keeps
14 days (`KEEP_DAYS`). Schedule it nightly and copy the dumps off the server:

```cron
15 3 * * * /srv/greek-bible-teacher/deploy/backup.sh >> /var/log/gbt-backup.log 2>&1
```

What matters most is the learner data (`users`, `user_*_progress`, `review_events`,
`reading_events`). The NT text and curated content can always be rebuilt by the release step,
but a dump includes everything, and restoring it is simplest.

**Restore** (this replaces the current data):

```bash
cd /srv/greek-bible-teacher/deploy
docker compose stop api web
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < backups/greek-<timestamp>.dump
docker compose up -d --wait
```

Test the restore now and then, into a scratch database:

```bash
docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" restore_check'
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d restore_check --no-owner' < backups/<file>.dump
docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" restore_check'
```

## Using Nginx instead of Caddy

If the server already runs Nginx, leave Caddy out and publish the web container on localhost
only. `deploy/docker-compose.override.yml` (not committed):

```yaml
services:
  web:
    ports:
      - "127.0.0.1:3000:3000"
```

Then start `docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.override.yml up
-d --build --wait db release api web`. Nginx site (TLS via certbot or similar):

```nginx
server {
    listen 443 ssl;
    http2 on;  # Nginx 1.25.1+; older versions: listen 443 ssl http2;
    server_name greek.example.org;
    # ssl_certificate / ssl_certificate_key from your ACME client

    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Next streams responses (loading states); Nginx buffering would hold them back.
        proxy_buffering off;
    }
}
server {
    listen 80;
    server_name greek.example.org;
    return 301 https://$host$request_uri;
}
```

`DOMAIN` must still be set in `deploy/.env`: the API allows `https://$DOMAIN` as its CORS origin.
(Compose also requires `ACME_EMAIL` to be set, even though Caddy isn't started.)

## Rate limits

The API limits each client IP to 600 requests a minute and 60 new anonymous users an hour
(DECISIONS 025). Over the limit it answers `429` with `Retry-After`. If many learners share one
address (a school or an office), raise `NEW_SESSIONS_PER_HOUR` (and, if needed,
`RATE_LIMIT_PER_MINUTE`) in `deploy/.env` and run `up -d` again. `0` turns a limit off. The
limits rely on the proxy writing the client address into `X-Forwarded-For`, which both Caddy and
the Nginx config above do.

## Operations

- Logs: `docker compose -f deploy/docker-compose.yml logs -f api web caddy`. The API logs each
  request except `/health`, and errors with context.
- Health: `docker compose -f deploy/docker-compose.yml ps` shows the container health checks
  (`/health` pings the DB; web checks its manifest).
- Postgres shell: `docker compose -f deploy/docker-compose.yml exec db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'`.
- Verified locally with `DOMAIN=localhost` on ports 8080/8443 (Caddy's internal CA): the whole
  Playwright suite passed through Caddy, and a backup restored into a scratch database with
  matching row counts.
