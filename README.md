# Splyt
> Tagline: 'AI-powered bill splitting on Celo. Snap, split, settle.'

## What it does
Splyt is a MiniPay-native app that turns any shared receipt into on-chain payment requests in seconds. A Claude vision agent parses the image, computes member shares, and x402 enforces per-call settlement so each user pays only when they execute their payment step.

## Demo (gif placeholder or link)
- Demo link: _coming soon_
- GIF: _coming soon_

## Tech Stack
| Layer | Technology | Why |
| --- | --- | --- |
| Frontend | Next.js 15, TypeScript, Tailwind, shadcn/ui | Fast MiniPay-ready UX |
| Backend | Node.js, Express, Zod, Swagger | Strict APIs and docs |
| Smart Contracts | Solidity 0.8.24, Foundry | Deterministic settlement state |
| Payments | thirdweb x402 | Per-request stablecoin gating |
| AI | Claude Sonnet vision | Reliable receipt extraction |
| Chain | Celo L2 + viem | Low fees and fee abstraction |

## Quick Start
### Prerequisites
- Node.js 20+
- Foundry (`forge`, `cast`, `anvil`)

### Installation
1. `npm install`
2. Configure env files from `docs/ENV.md`

### Run locally
1. `forge test` in `contracts`
2. `npm run dev -w apps/backend`
3. `npm run dev -w apps/web`

## Contract Addresses
| Network | Contract | Address | Verified |
| --- | --- | --- | --- |
| Celo Mainnet | SplytSession | TBD | No |
| Celo Sepolia | SplytSession | TBD | No |

## API Reference
Swagger UI: `http://localhost:3001/docs`

## Architecture
See `docs/ARCHITECTURE.md`.

## Proof of Ship Tracks
- [x] MiniPay (mini-app detection, USDC payments)
- [x] AI Agent (Claude vision, split computation)
- [x] x402 (payment-gated endpoints, per-member collection)

## License: MIT
