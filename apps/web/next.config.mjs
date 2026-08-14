/** @type {import('next').NextConfig} */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  // We live in a pnpm monorepo; pin file tracing to the repo root so Next doesn't
  // infer the wrong root from an unrelated lockfile elsewhere on the machine.
  outputFileTracingRoot: join(__dirname, "../../"),
};

export default nextConfig;
