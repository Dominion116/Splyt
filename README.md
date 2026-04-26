# Splyt
> Tagline: 'AI-powered bill splitting on Celo. Snap, split, settle.'

## What it does
Splyt is a MiniPay-first app that also works in regular browser wallets, turning any shared receipt into on-chain payment requests in seconds. A Claude vision agent parses the image, computes member shares, and direct contract calls handle settlement so each user pays only when they execute their payment step.

## Demo (gif placeholder or link)
- Demo link: _coming soon_
- GIF: _coming soon_

## Tech Stack
| Layer | Technology | Why |
| --- | --- | --- |
| Frontend | Next.js 16, TypeScript, Tailwind, shadcn/ui | Fast MiniPay-ready UX |
| Backend | Node.js, Express, Zod, Swagger | Strict APIs and docs |
| Smart Contracts | Solidity 0.8.24, Foundry | Deterministic settlement state |
| Payments | Direct contract calls | On-chain settlement |
| AI | Reliable receipt extraction |
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

## Deployment Checklist
Frontend and backend are deployed separately.

### Frontend
- Host: Vercel or any Next.js-capable platform.
- Build command: `npm run build -w apps/web`
- Start command: `npm run start -w apps/web`
- Required env vars: `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_CELO_RPC_URL`, `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_CUSD_ADDRESS`.

### Backend
- Host: Render, Fly.io, Railway, or a small Node VM/container.
- Build command: `npm run build -w apps/backend`
- Start command: `npm run start -w apps/backend`
- Required env vars: `PORT`, `THIRDWEB_SECRET_KEY`, `ANTHROPIC_API_KEY`, `HOST_WALLET_ADDRESS`, `HOST_WALLET_PRIVATE_KEY`, `SPLYT_SESSION_CONTRACT`, `CELO_RPC_URL`.

### Contracts
- Deploy the Solidity contract with Foundry.
- Update `NEXT_PUBLIC_CONTRACT_ADDRESS` and `SPLYT_SESSION_CONTRACT` to the deployed address.
- If you want on-chain verification, set `CELOSCAN_API_KEY`.

### Token
- Mainnet cUSD address: `0x765de816845861e75a25fca122bb6898b8b1282a`
- Use that value for `NEXT_PUBLIC_CUSD_ADDRESS` locally and in your frontend host.

### Before shipping
- Ensure CORS allows the frontend origin in the backend.
- Confirm the backend can reach the Celo RPC endpoint.
- Verify the frontend can call `/api/parse`, `/api/session`, `/api/pay`, and `/api/status` on the deployed backend.

## Architecture
See `docs/ARCHITECTURE.md`.

## Proof of Ship Tracks
- [x] MiniPay (mini-app detection, cUSD payments)
- [x] AI Agent (Split computation)
- [x] Direct payments (contract calls, per-member collection)

## License: MIT
