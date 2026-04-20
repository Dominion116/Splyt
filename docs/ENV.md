# Environment Variables

## Frontend (apps/web/.env.local)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=     # thirdweb dashboard -> Projects
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_CONTRACT_ADDRESS=       # from deployment
NEXT_PUBLIC_CUSD_ADDRESS=0x765de816845861e75a25fca122bb6898b8b1282a

## Backend (apps/backend/.env)
PORT=3001
THIRDWEB_SECRET_KEY=               # thirdweb dashboard -> Secret Keys
ANTHROPIC_API_KEY=                 # console.anthropic.com
HOST_WALLET_ADDRESS=               # your Celo wallet address
HOST_WALLET_PRIVATE_KEY=           # NEVER commit this
SPLYT_SESSION_CONTRACT=            # deployed contract address
CELO_RPC_URL=https://forno.celo.org
MONGODB_URI=                       # MongoDB Atlas connection string
MONGODB_DB_NAME=splyt             # optional, defaults to splyt
REDIS_URL=redis://localhost:6379   # optional

## Contracts (contracts/.env)
PRIVATE_KEY=                       # deployer wallet key
CELOSCAN_API_KEY=                  # celoscan.io -> API Keys

## Tech Reference Table

| Resource | URL / Value |
| --- | --- |
| Celo RPC (mainnet) | https://forno.celo.org |
| Celo RPC (testnet) | https://forno.celo-sepolia.celo-testnet.org |
| Celo Chain ID (mainnet) | 42220 |
| Celo Chain ID (testnet) | 44787 |
| cUSD address (mainnet) | 0x765de816845861e75a25fca122bb6898b8b1282a |
| USDC adapter (mainnet) | 0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B |
| USDT address (mainnet) | 0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e |
| USDT adapter (mainnet) | 0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72 |
| Celoscan explorer | https://celoscan.io |
| thirdweb x402 docs | https://portal.thirdweb.com/x402 |
| x402 protocol | https://x402.org |
| MiniPay SDK | https://docs.celo.org/build-on-celo/build-with-ai/agent-skills |
| Celo Composer | https://github.com/celo-org/celo-composer |
