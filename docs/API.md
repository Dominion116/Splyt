# API

Backend exposes:

## Human / UI (current)

- `POST /api/parse` (**free**, rate-limited): parse receipt image with Groq Vision
- `POST /api/session`: create split session
- `GET /api/session/:id`: read split session
- `GET /api/pay/:session/:member` (direct): settle member payment on-chain
- `GET /api/status/:session` (SSE): live payment status stream

## Agent / machine (planned — Phase C)

- `POST /api/v1/agent/parse` (**x402 paid**, USDC): same parse body/schema as free parse; requires stablecoin payment via Celo hosted facilitator

| Status | Meaning |
|--------|---------|
| `402` | Payment required — client must sign and retry with payment header |
| `200` | Payment settled; body is structured receipt JSON (same shape as free parse) |
| `415` / `422` | Invalid image or parse failure (after or without payment per middleware order) |
| `429` | Optional secondary rate limit |

**Payment headers:** follow current [x402 Celo skill](https://x402.celo.org/SKILL.md) (`X-PAYMENT` / facilitator response headers). Do not use bare dollar prices on Celo; use explicit USDC amount + asset + EIP-712 `extra`.

**Token:** agent path = **USDC**. Human bill settlement = **USDm** via UI/contract (not this endpoint).

See [`agent.md`](./agent.md) for the dual-path policy.
