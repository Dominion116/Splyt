# Environment Variables

## Frontend (apps/web/.env.local)

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_CONTRACT_ADDRESS=0xe51cA13D77E288d3c6a7B8AbcF6C14043a0803c3
NEXT_PUBLIC_USDM_ADDRESS=0x765de816845861e75a25fca122bb6898b8b1282a
```

## Backend (apps/backend/.env)

```bash
PORT=3001
GROQ_API_KEY=                      # console.groq.com -> API Keys
SPLYT_SESSION_CONTRACT=0xe51cA13D77E288d3c6a7B8AbcF6C14043a0803c3
CELO_RPC_URL=https://forno.celo.org
MONGODB_URI=                       # MongoDB Atlas connection string
MONGODB_DB_NAME=splyt             # optional, defaults to splyt
REDIS_URL=redis://localhost:6379   # optional
ALLOWED_ORIGINS=http://localhost:3000

# --- Agent / x402 (Phase C — server only, never NEXT_PUBLIC_*) ---
# Required on Render for paid agent parse:
# X402_API_KEY=                    # from https://x402.celo.org (shown once)
# X402_NETWORK=mainnet             # testnet | mainnet
# SELLER_PAY_TO=                   # wallet that receives agent USDC (your treasury)
# X402_PARSE_AMOUNT=10000          # optional; $0.01 USDC in 6-decimal base units
#
# Buyer smoke (local only):
# BUYER_PRIVATE_KEY=
# AGENT_PARSE_URL=https://splyt.onrender.com/api/v1/agent/parse

# --- ERC-8004 operator (Phase B — scripts only; never commit keys) ---
# AGENT_OWNER_PRIVATE_KEY=         # 0x… operator EOA that will own the agent NFT
# AGENT_NETWORK=sepolia            # sepolia | mainnet
# AGENT_URI=ipfs://...             # or use: npm run register-agent -- --embed-metadata
# ERC8004_IDENTITY_REGISTRY=       # optional override
# CELO_SEPOLIA_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
# AGENT_ID=9750                    # mainnet registration (2026-07-30)
# REGISTER_TX=0x30d1ff630302e18db2301d7edfec22a4d620cd7ec57c3460568adab6257f7941
```

### Register agent (Phase B)

```bash
# 1) Validate metadata shape (no keys)
npm run validate-agent-metadata -w apps/backend

# 2) Edit agent/metadata.json placeholders, pin to IPFS → set AGENT_URI
#    OR smoke-test with embedded data: URI:
npm run register-agent -w apps/backend -- --embed-metadata

# 3) Update URI later
npm run register-agent -w apps/backend -- --set-uri --agent-id <ID>
```

See [`agent/README.md`](../agent/README.md).

## Contracts (contracts/.env)

```bash
PRIVATE_KEY=                       # deployer wallet key
CELOSCAN_API_KEY=                  # celoscan.io -> API Keys
```

## Tech Reference Table

| Resource | URL / Value |
| --- | --- |
| Celo RPC (mainnet) | https://forno.celo.org |
| Celo RPC (testnet / Sepolia) | https://forno.celo-sepolia.celo-testnet.org |
| Celo Chain ID (mainnet) | 42220 |
| Celo Chain ID (Sepolia) | 11142220 |
| USDm address (mainnet) | 0x765de816845861e75a25fca122bb6898b8b1282a |
| USDC (mainnet, x402) | 0xcebA9300f2b948710d2653dD7B07f33A8B32118C |
| USDC (Sepolia, x402) | 0x01C5C0122039549AD1493B8220cABEdD739BC44E |
| USDC adapter (mainnet, fee currency) | 0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B |
| USDT address (mainnet) | 0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e |
| USDT adapter (mainnet) | 0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72 |
| ERC-8004 Identity (mainnet) | 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 |
| ERC-8004 Identity (Sepolia) | 0x8004A818BFB912233c491871b3d84c89A494BD9e |
| x402 facilitator (mainnet) | https://api.x402.celo.org |
| x402 facilitator (testnet) | https://api.x402.sepolia.celo.org |
| Celoscan explorer | https://celoscan.io |
| Celopedia skills | `npx skills add celo-org/celopedia-skills` |
| Celo Composer | https://github.com/celo-org/celo-composer |

Agent design: [`agent.md`](./agent.md). Implementation plan: [`implementation.md`](./implementation.md).
