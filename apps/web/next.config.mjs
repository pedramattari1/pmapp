/** @type {import('next').NextConfig} */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  // We live in a pnpm monorepo; pin file tracing to the repo root so Next doesn't
  // infer the wrong root from an unrelated lockfile elsewhere on the machine.
  outputFileTracingRoot: join(__dirname, "../../"),
  // Force Clerk (incl. the middleware) to use our on-domain sign-in/up pages
  // instead of the hosted accounts.dev Account Portal — avoids the dev-instance
  // cross-domain handshake redirect loop on the deployed domain.
  env: {
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: "/today",
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: "/today",
  },
};

export default nextConfig;
