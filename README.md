# Splyt

> AI-powered bill splitting on Celo. Snap, split, settle.

[![X (Twitter)](https://img.shields.io/badge/X-@_splyt-black?logo=x)](https://x.com/_splyt)
[![GitHub](https://img.shields.io/badge/GitHub-Splyt-181717?logo=github)](https://github.com/Dominion116/Splyt)

## What it does

Splyt is a MiniPay-first app that also works in regular browser wallets, turning any shared receipt into on-chain payment requests in seconds. A Groq vision agent parses the image, computes member shares, and direct contract calls handle settlement so each user pays only when they execute their payment step.

## Demo

- Demo link: _coming soon_
- GIF: _coming soon_

## Tech Stack

| Layer | Technology | Why |
| --- | --- | --- |
| Frontend | Next.js 16, TypeScript, Tailwind, shadcn/ui | Fast MiniPay-ready UX |
| Backend | Node.js, Express, Zod, Swagger | Strict APIs and docs |
| Smart Contracts | Solidity 0.8.24, Foundry | Deterministic settlement state |
| Payments | Direct contract calls | On-chain settlement |
| AI | Groq vision | Reliable receipt extraction |
| Chain | Celo L2 + viem | Low fees and simple on-chain settlement |

## Quick Start

### Prerequisites

- Node.js 20+
- Foundry (`forge`, `cast`, `anvil`)

### Installation

```bash
npm install
```

Configure env files — see [`docs/ENV.md`](docs/ENV.md).

### Run locally

```bash
# 1. Run contract tests
forge test --root contracts

# 2. Start backend
npm run dev -w apps/backend

# 3. Start frontend
npm run dev -w apps/web
```

## Contract Addresses

| Network | Contract | Address | Verified |
| --- | --- | --- | --- |
| Celo Mainnet | SplytSession | TBD | No |
| Celo Sepolia | SplytSession | TBD | No |

## API Reference

Swagger UI available at `http://localhost:3001/docs` when the backend is running.  
Full reference: [`docs/API.md`](docs/API.md)

## Deployment

Frontend and backend are deployed independently.

### Frontend

- Host: Vercel or any Next.js-capable platform
- Build: `npm run build -w apps/web`
- Start: `npm run start -w apps/web`
- Required env vars: `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_CELO_RPC_URL`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_USDM_ADDRESS`

### Backend

- Host: Render, Fly.io, Railway, or a Node VM/container
- Build: `npm run build -w apps/backend`
- Start: `npm run start -w apps/backend`
- Required env vars: `PORT`, `GROQ_API_KEY`, `SPLYT_SESSION_CONTRACT`, `CELO_RPC_URL`, `MONGODB_URI`

### Contracts

```bash
forge script contracts/script/Deploy.s.sol --broadcast --rpc-url $CELO_RPC_URL
```

After deploy, update `NEXT_PUBLIC_CONTRACT_ADDRESS` and `SPLYT_SESSION_CONTRACT`. Set `CELOSCAN_API_KEY` for on-chain verification.

### Tokens

- Mainnet USDm: `0x765de816845861e75a25fca122bb6898b8b1282a`

### Pre-ship checklist

- [ ] CORS configured to allow the frontend origin
- [ ] Backend can reach the Celo RPC endpoint
- [ ] Frontend can call `/api/parse`, `/api/session`, `/api/pay`, and `/api/status` on the deployed backend

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Proof of Ship Tracks

- [x] MiniPay (mini-app detection, USDm payments)
- [x] AI Agent (split computation via Groq vision)
- [x] Direct payments (contract calls, per-member collection)

## Links

- X / Twitter: [x.com/_splyt](https://x.com/_splyt)
- GitHub: [github.com/Dominion116/Splyt](https://github.com/Dominion116/Splyt)

## License

MIT
