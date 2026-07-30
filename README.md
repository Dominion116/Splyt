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

Dual payment paths and system notes: [`agent.md`](agent.md). Multi-phase plan: [`agent/implementation.md`](agent/implementation.md).

## AI agent on Celo

Splyt uses a **dual payment path**: humans settle bill shares in **USDm** via MiniPay; other agents pay for parse via **x402 USDC**.

| Doc | Purpose |
| --- | --- |
| [`agent.md`](agent.md) | Agent design lock + Celopedia install |
| [`agent/metadata.json`](agent/metadata.json) | ERC-8004 registration metadata |
| [`agent/README.md`](agent/README.md) | How to pin metadata and register on-chain |
| [`agent/implementation.md`](agent/implementation.md) | Multi-phase implementation plan |

```bash
# Load Celo ecosystem skills for agent work (local only; gitignored)
npx skills add celo-org/celopedia-skills

# Validate ERC-8004 metadata shape
npm run validate-agent-metadata -w apps/backend

# Register agent NFT (needs AGENT_OWNER_PRIVATE_KEY; see agent/README.md)
npm run register-agent -w apps/backend -- --embed-metadata
```

### ERC-8004 identity

| | Value |
| --- | --- |
| Metadata | [`agent/metadata.json`](agent/metadata.json) |
| Identity registry (mainnet) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Identity registry (Sepolia) | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Owner | `0x70f77A5C36eBD667360F6021bF4A95d274B3530e` |
| `agentId` | **9750** |
| Registration tx | [`0x30d1ff63…7941`](https://celoscan.io/tx/0x30d1ff630302e18db2301d7edfec22a4d620cd7ec57c3460568adab6257f7941) |
| Metadata update tx | [`0x6b80d7d4…1d29`](https://celoscan.io/tx/0x6b80d7d47dbc9a21af95a7bf8f155e2596e05d10aae0a4199bc6d85fb0fb1d29) (Render API host) |
| Web service | https://splytpay.vercel.app |
| Backend / agent host | https://splyt.onrender.com |
| Agent base URL (machine API) | https://splyt.onrender.com/api/v1/agent |

| Free UI parse | `POST /api/parse` |
| Paid agent parse | `POST /api/v1/agent/parse` (x402 USDC) |
| Agent health / quote | `GET /api/v1/agent/health` |

Humans use the Vercel app; agents call the Render API. Agent base URL = machine root (`…/api/v1/agent`).

### x402 seller env (Render backend)

```bash
X402_API_KEY=x402_...          # https://x402.celo.org (shown once)
X402_NETWORK=mainnet           # or testnet
SELLER_PAY_TO=0x...            # wallet that receives agent USDC
# X402_PARSE_AMOUNT=10000      # optional, $0.01 default
```

```bash
# Local smoke: unpaid agent parse should return 402 when x402 is configured
curl -i -X POST https://splyt.onrender.com/api/v1/agent/parse \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\":\"...\",\"mimeType\":\"image/jpeg\"}"

# Buyer script (needs BUYER_PRIVATE_KEY + USDC)
npm run x402-buyer-parse -w apps/backend
```

View identity on [Celoscan registration tx](https://celoscan.io/tx/0x30d1ff630302e18db2301d7edfec22a4d620cd7ec57c3460568adab6257f7941) or [8004scan](https://www.8004scan.io).

## Proof of Ship Tracks

- [x] MiniPay (mini-app detection, USDm payments)
- [x] AI Agent (split computation via Groq vision)
- [x] Direct payments (contract calls, per-member collection)

## Links

- X / Twitter: [x.com/_splyt](https://x.com/_splyt)
- GitHub: [github.com/Dominion116/Splyt](https://github.com/Dominion116/Splyt)

## License

MIT
