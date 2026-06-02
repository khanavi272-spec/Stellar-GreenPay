# Contributing to GreenPay

## Getting started

1. Fork and clone the repo.
2. Install dependencies: `pnpm install` (root workspace).
3. Copy `.env.example` to `.env` and fill in the required values.
4. Start the backend: `pnpm --filter backend dev`.
5. Start the mobile app: `pnpm --filter mobile start`.

## Branch & PR conventions

- Branch names: `feat/<short-description>`, `fix/<short-description>`.
- Keep PRs focused; one concern per PR.
- All PRs must pass CI before merge.

## Performance expectations

The donations API **must** sustain 100 concurrent users with a **p95 latency
under 500 ms**. This is validated by the k6 load test.

Before merging any change to `POST /api/donations` or the Stellar submission
pipeline:

```bash
# Requires k6 — brew install k6
k6 run scripts/load-test.js
```

The test enforces the p95 threshold as a hard check. A failed threshold means
the PR is not mergeable until the regression is resolved.

See [docs/performance.md](docs/performance.md) for the full target table and
how to record baseline numbers.

## Wallet & Stellar guidelines

- Never log or persist private keys anywhere in the codebase.
- Mobile: use `expo-secure-store` for all key-adjacent data (see
  `mobile/src/hooks/useWallet.ts`).
- Extension: use `window.freighter.signTransaction` — never ask the user for
  their secret key.
- All Stellar transactions target the **testnet** unless `NETWORK=mainnet` is
  explicitly set in the environment.

## Testing

```bash
pnpm test          # unit + integration
pnpm test:e2e      # end-to-end (requires running backend + Horizon testnet)
```
