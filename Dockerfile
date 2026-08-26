# Builds the Express API (apps/api) from the pnpm monorepo.
# Used by Railway (see railway.json) so the buildpack doesn't have to guess pnpm.
FROM node:20-bookworm-slim

# Prisma needs openssl; ca-certificates for outbound TLS.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# pnpm via corepack, pinned to the repo's packageManager version.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Source only (node_modules/.next/dist are excluded via .dockerignore).
COPY . .

# Fail early with a clear message if the build context is wrong (must be repo root).
RUN test -f pnpm-workspace.yaml || (echo "ERROR: build context is not the repo root (no pnpm-workspace.yaml). Set the Railway service Root Directory to empty/'/'." && exit 1)

# Install the whole workspace, then build the api (prisma generate + tsc).
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter api build

ENV NODE_ENV=production
EXPOSE 8080

# Runs `prisma migrate deploy` then `node dist/index.js` (see apps/api start:prod).
CMD ["pnpm", "--filter", "api", "start:prod"]
