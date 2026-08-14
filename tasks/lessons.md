# Lessons

Patterns learned from corrections, so the same mistake isn't repeated.

## Environment
- **pnpm via corepack was broken** on this machine: `/opt/homebrew/bin/pnpm`
  symlinked to Node 23's corepack, which threw a signature-verification error
  ("Cannot find matching keyid"). Fix: remove the shim and
  `npm i -g pnpm@9`. Prevention: verify `pnpm -v` returns a real version before
  relying on it; don't trust a corepack shim.

<!-- Append new lessons below as: pattern → preventing rule -->
