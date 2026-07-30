# Splyt Agent Guide

Splyt is becoming a **Celo onchain AI agent**: humans split bills in MiniPay with **USDm**, while other agents call a machine API with **x402 / USDC**.

This document is the Phase A design lock for the dual-path agent model. Full phased plan: [`agent/implementation.md`](./agent/implementation.md).

---

## Install Celo skills (required for agent work)

Coding agents in this repo should load Celopedia before changing agent identity, x402, MiniPay, or Celo contracts.

```bash
npx skills add celo-org/celopedia-skills
```

That installs:

| Skill | Role |
|-------|------|
| `celopedia-skill` | Ecosystem, MiniPay, ERC-8004, x402, contracts, Proof of Ship |
| `docs-watch` | Docs freshness helpers |

Skills live under `.agents/skills/` (and symlinks for Grok / Claude / etc.). After install, prefer live guides when coding payments:

- Agent stack: `.agents/skills/celopedia-skill/references/ai-agents.md`
- x402 facilitator (always re-fetch before code): https://x402.celo.org/SKILL.md

---

## Dual payment paths (locked)

| | **Human UI (MiniPay / browser)** | **Another agent / machine client** |
|---|----------------------------------|-------------------------------------|
| **Pays for** | Share of the group bill | Metered API (receipt parse) |
| **Route** | `POST /api/parse` (free, rate-limited) | `POST /api/v1/agent/parse` (x402 paid) |
| **Settlement** | User wallet → **USDm** → `SplytSession` | Buyer wallet → **USDC** via hosted x402 facilitator |
| **Gas UX** | MiniPay / fee abstraction | Facilitator sponsors x402 settlement gas |
| **Who signs** | End user | Calling agent (or its operator key) |

### Why two rails?

1. MiniPay users stay on **USDm** and the existing non-custodial session contract.  
2. Hosted Celo x402 facilitator settles **USDC/USDT only** (EIP-3009). **USDm is not supported** there.  
3. Bill share ≠ API meter: do not charge diners USDC for parse when they only came to pay their split.

### Policy

- **Do not** attach x402 to the default UI `POST /api/parse`.  
- **Do** expose a separate agent surface for machine clients.  
- Shared AI core: both routes call the same `parseReceipt` service.  
- Self Agent ID: **out of scope**.

```
Human UI ──► POST /api/parse (free) ──► createSession / markPaid (USDm)
Agent    ──► POST /api/v1/agent/parse (x402 USDC) ──► same parseReceipt()
```

---

## Phase A decisions

| Decision | Choice |
|----------|--------|
| UI parse pricing | Free + existing IP rate limit |
| Agent parse pricing | x402 `exact`, USDC, start `$0.01` (`"10000"` base units, 6 decimals) |
| Route split | Humans: `/api/parse` · Agents: `/api/v1/agent/parse` |
| Split settlement | Unchanged USDm + `SplytSession` |
| Self Agent ID | Skipped |
| ERC-8004 owner | Project operator EOA (Phase B) |
| Agent registration | After metadata pin + Identity Registry `register(agentURI)` |

---

## Target agent stack

```
Application
  ├── Human UI  → free parse → USDm settle
  └── Agent API → x402 USDC pay-per-parse
Trust
  └── ERC-8004 Identity (Reputation later)
Payment rails
  ├── USDm + SplytSession (humans)
  └── USDC + x402.celo.org facilitator (agents)
Ops
  └── Attribution tags · agentURI · public docs
```

---

## Planned agent API (not implemented in Phase A)

### `POST /api/v1/agent/parse` (Phase C — implemented)

- **Body:** same as UI parse (`imageBase64`, `mimeType`: jpeg | png | webp).  
- **Without payment:** HTTP **402** + machine-readable payment requirements (`payment-required` header).  
- **With payment:** client signs EIP-3009 USDC authorization; retries with `X-PAYMENT`; facilitator verifies/settles; response matches free parse JSON.  
- **Seller env:** `X402_API_KEY`, `X402_NETWORK`, `SELLER_PAY_TO`, optional `X402_PARSE_AMOUNT`.  
- **Health:** `GET /api/v1/agent/health` — config + price quote (no payment).  
- **Buyer smoke:** `npm run x402-buyer-parse -w apps/backend`

### Identity (Phase B)

| Network | Identity Registry |
|---------|-------------------|
| Celo Mainnet | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Celo Sepolia | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |

Metadata must use EIP-8004 registration v1 shape (`type` = `#registration-v1` URI, `services` + `endpoint`, content-addressed `ipfs://` agentURI).

---

## Decision tree

```
Who is calling?
├── Human in MiniPay / browser
│   ├── Parse  → POST /api/parse (free)
│   └── Pay    → USDm + SplytSession (user signs)
└── Agent / script
    ├── Parse  → POST /api/v1/agent/parse + x402 USDC
    └── Human bill pay → still USDm UI (or future agent-session API)
```

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [`implementation.md`](./implementation.md) | Full multi-phase implementation plan |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System diagrams including dual path |
| [`API.md`](./API.md) | HTTP surface (human + planned agent) |
| [`ENV.md`](./ENV.md) | Env vars including agent/x402 stubs |
| [`CONTRACT.md`](./CONTRACT.md) | `SplytSession` notes |

---

## Phase status

| Phase | Name | Status |
|-------|------|--------|
| — | Product loop | Done |
| — | Self Agent ID | Skipped |
| **A** | Dual-path architecture lock + this guide | **Done** |
| **B** | ERC-8004 identity | Pending |
| **C** | x402 agent API | **Done** (set env on Render to go live) |
| **D** | Attribution / agent card | Pending |
| **E** | Public ship & verification | Pending |
