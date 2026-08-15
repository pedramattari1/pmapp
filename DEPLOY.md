# Deploy — The Fay PM Platform

Monorepo: `apps/web` → **Vercel**, `apps/api` → **Railway** (same Railway project
as the Postgres you already provisioned; the DB is already migrated + seeded).

Do it in this order (URLs depend on each other).

## 1. Railway — deploy the API

1. Railway project → **New → GitHub Repo → `pedramattari1/pmapp`**.
2. Service **Settings**:
   - **Root Directory:** `/` (repo root — pnpm workspace needs a root install)
   - **Build Command:** `pnpm install && pnpm --filter api build`
   - **Start Command:** `pnpm --filter api start:prod`
     (runs `prisma migrate deploy` then `node dist/index.js`)
   - **Health check path:** `/health`
3. Service **Variables** (use the **internal** DB URL here — faster, no egress):
   ```
   DATABASE_URL      = ${{Postgres.DATABASE_URL}}   # internal postgres.railway.internal
   CLERK_SECRET_KEY  = <your sk_test_… (or sk_live_ for prod Clerk)>
   WEB_ORIGIN        = https://<your-vercel-domain>   # set after step 2, then redeploy
   RESEND_API_KEY    = <optional; enables real emails>
   INTERNAL_RUN_SECRET = <invent a long random string>
   # PORT is provided by Railway automatically
   ```
4. **Settings → Networking → Generate Domain** → note the public API URL, e.g.
   `https://pmapp-api-production.up.railway.app`.

## 2. Vercel — deploy the web app

1. **Add New Project → Import `pedramattari1/pmapp`**.
2. **Root Directory:** `apps/web` (Framework auto-detected: Next.js).
3. **Environment Variables:**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_test_…            (your live-flea-3 key)
   CLERK_SECRET_KEY                  = <same sk_… as Railway>
   NEXT_PUBLIC_API_URL               = https://<railway-api-domain>   (from step 1.4)
   UPLOADTHING_TOKEN                 = <optional; unused today>
   ```
4. **Deploy** → note the web URL, e.g. `https://pmapp.vercel.app`.

## 3. Wire the two together

1. Back in **Railway → API → Variables**: set
   `WEB_ORIGIN = https://<your-vercel-domain>` and redeploy (fixes CORS).
2. **Clerk dashboard** → your instance → add the Vercel domain (and keep
   `http://localhost:3000`) to allowed origins / redirect URLs.

## 4. Verify live

- Open the Vercel URL, sign in, land on `/today`.
- As ADMIN you see Dashboard + Admin; create/flag a work order; export CSV/PDF.
- `curl -X POST -H "x-internal-secret: <INTERNAL_RUN_SECRET>" \
    https://<railway-api-domain>/internal/run-daily` → digest summary.

## Notes

- **Same database:** the Railway Postgres is already migrated + seeded (13 assets,
  29 templates) from local work, so no data setup is needed.
- **Clerk dev vs prod:** the `pk_test_`/`sk_test_` (development) instance works on
  the Vercel URL for testing. For real production, create a Clerk **production**
  instance (`pk_live_`/`sk_live_`) on your own domain and swap the keys.
- **Emails:** without `RESEND_API_KEY` the app runs fine; assignment/digest emails
  are logged and skipped until the key is set.
