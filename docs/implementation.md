# Splyt — Celo AI Agent Implementation Plan

> **Status:** Product loop complete (MiniPay UI → parse → split → USDm settle).  
> **Out of scope:** Self Agent ID (not required).  
> **Goal:** Turn Splyt into a discoverable, machine-payable onchain agent on Celo without breaking the existing human UI payment flow.

---

## 0. Will payments differ for UI users vs other agents?

**Yes — two intentional payment paths.** They settle different things, with different tokens and signers.

| | **Human (MiniPay / browser UI)** | **Another agent (or any machine client)** |
|---|----------------------------------|-------------------------------------------|
| **Who pays** | End users with their own wallets | Calling agent’s wallet (or operator key) |
| **What they pay for** | Their share of the bill (group settlement) | Metered API use (e.g. receipt parse) |
| **Protocol** | Existing app flow: approve USDm → `SplytSession.markPaid` / host close | **x402** HTTP `402` → sign EIP-3009 → facilitator settles |
| **Token** | **USDm** (Mento) on your contract | **USDC** (or USDT) via hosted Celo facilitator |
| **Gas** | User (fee abstraction / MiniPay handles UX) | Facilitator sponsors settlement gas for the x402 transfer |
| **Backend role** | Orchestrate parse/session/status; verify chain | Sell a paid resource; never custody funds |
| **Identity needed** | Wallet address only | Prefer ERC-8004-registered caller later; not required for first x402 ship |

### Why not one payment system for both?

1. **MiniPay product constraint** — End users should stay on **USDm**, fee abstraction, and your existing non-custodial `SplytSession` flow. Changing that to x402-USDC would break MiniPay-first UX.
2. **x402 facilitator constraint** — Hosted Celo facilitator supports **EIP-3009 USDC/USDT only**. **USDm is not supported** (Mento has EIP-2612 permit, not EIP-3009). So agent-to-API micropayments cannot use USDm on the hosted facilitator.
3. **Different economic objects** — UI payment = *debt settlement among humans*. Agent payment = *pay-per-request for AI/API*. Mixing them creates wrong incentives (e.g. charging a diner USDC for “parse” when they only came to pay their share).

### Recommended product policy

```
┌─────────────────────────────────────────────────────────────────┐
│  UI (MiniPay / web)                                              │
│  POST /api/parse          → FREE (or rate-limited / session auth)│
│  createSession / markPaid → USDm via user wallet + SplytSession │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Agent / machine API                                             │
│  POST /api/v1/agent/parse → x402 PAID (USDC)                     │
│  (optional later) session APIs for agent orchestration           │
└─────────────────────────────────────────────────────────────────┘
```

**Do not put x402 on the UI’s existing `/api/parse`.** Keep the human path free (or soft-gated) and expose a **separate agent surface** that requires payment. That avoids:

- Browser wallets fighting 402 middleware on every photo upload  
- CORS / `X-PAYMENT` header complexity in MiniPay  
- Charging users twice (parse + bill share)

If you ever want humans to pay for parse, add an explicit “Premium scan” product later — not by forcing x402 on the default MiniPay path.

---

## 1. Current baseline (done — do not re-implement)

- [x] Next.js MiniPay-first UI with `isMiniPay` detection  
- [x] Express backend: parse, session, pay, status (SSE)  
- [x] Groq vision receipt parsing  
- [x] `SplytSession` + USDm settlement on Celo  
- [x] Env/docs for deploy and local run  
- [x] Ship-ready product loop  

**Remaining work** is agent protocol + discovery + dual-path payments, phased below.

---

## 2. Target end state

```
Application
  ├── Human UI  → free/rate-limited parse → USDm settle (unchanged)
  └── Agent API → x402 USDC pay-per-parse → same AI core
Trust
  └── ERC-8004 Identity (Reputation optional later)
Payment rails
  ├── USDm + SplytSession (humans)
  └── USDC + x402 facilitator (agents)
Ops
  └── Attribution tags on Splyt txs · live agentURI · docs · Proof of Ship data sources
```

**Done means:**

1. Splyt is registered as an ERC-8004 agent with compliant IPFS metadata.  
2. Machine clients can call a paid parse endpoint via x402 and receive the same structured receipt schema.  
3. UI flow remains unchanged and free of x402.  
4. README/docs describe both paths; env vars documented.  
5. Optional: attribution tags on outbound contract txs; agent wallet listed in metadata.

---

## Phase A — Dual-path architecture & contracts (docs + design lock)

**Goal:** Freeze the payment model so implementation never conflates UI and agent money.

### A.1 Decisions (record in this file / ADR if you prefer)

| Decision | Choice |
|----------|--------|
| UI parse pricing | Free + existing IP rate limit |
| Agent parse pricing | x402 exact scheme, USDC, start at `$0.01` (`"10000"` base units) |
| Route split | Humans: `POST /api/parse` · Agents: `POST /api/v1/agent/parse` |
| Settlement for splits | Unchanged USDm + `SplytSession` |
| Self Agent ID | **Skipped** |
| Agent registration owner | Project operator wallet (EOA you control) |

### A.2 Architecture updates

Update docs when Phase B/C land (can draft stubs now):

| Doc | Change |
|-----|--------|
| `docs/ARCHITECTURE.md` | Add dual-path diagram (UI USDm vs agent x402) |
| `docs/API.md` | Document agent route, 402 semantics, payment headers |
| `docs/ENV.md` | `X402_*`, `SELLER_PAY_TO`, registry addresses |
| `README.md` | “AI agent on Celo” section + 8004 / services links |

### A.3 Acceptance criteria

- [x] Team agrees: **no x402 on MiniPay default parse**  
- [x] Token matrix documented (USDm human settle / USDC agent API)  
- [x] This file is the source of truth for phases  
- [x] `docs/agent.md` agent guide + Celopedia install instructions  
- [x] Dual-path stubs in `ARCHITECTURE.md`, `API.md`, `ENV.md`  
- [x] `npx skills add celo-org/celopedia-skills` installed in repo  

### A.4 Exit

**Phase A complete.** Proceed to Phase B (identity) and Phase C (x402) in parallel if desired; C does not block B.

---

## Phase B — ERC-8004 agent identity

**Goal:** Splyt has an on-chain agent identity other agents can discover and rate.

### B.1 Prerequisites

- Operator wallet with a little CELO (or fee currency) for registration gas on target network  
- Prefer **Celo Sepolia first**, then mainnet  
- IPFS pin provider (Pinata, web3.storage, NFT.Storage, etc.)  

### B.2 Registries

| Registry | Celo Mainnet | Celo Sepolia |
|----------|--------------|--------------|
| Identity | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

### B.3 Metadata file

Create `agent/metadata.json` (or `docs/agent/metadata.json`) and pin to IPFS.

**Compliant shape only** (validator-safe):

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Splyt",
  "description": "AI bill-splitting agent: parse receipts, compute shares, settle USDm splits on Celo MiniPay.",
  "image": "ipfs://YOUR_LOGO_CID",
  "services": [
    {
      "name": "web",
      "endpoint": "https://splytpay.vercel.app",
      "version": "1.0"
    },
    {
      "name": "MCP",
      "endpoint": "https://splyt.onrender.com/api/v1/agent",
      "version": "1.0"
    }
  ],
  "supportedTrust": ["reputation"]
}
```

**Hard rules:**

- `type` must be the `#registration-v1` URI — not `"Agent"`  
- Array name is `services` — not `endpoints`  
- Each entry uses `endpoint` — not `url`  
- `agentURI` for `register()` must be `ipfs://…` or `data:…` — not raw `https://`  

### B.4 Registration tooling

Add a one-shot script (suggested path: `scripts/register-agent.ts`):

1. Load operator private key from env (`AGENT_OWNER_PRIVATE_KEY` — never commit).  
2. `writeContract` Identity Registry `register(string agentURI)` with `ipfs://…`.  
3. Log `txHash`, and after receipt resolve `agentId` (token id) from logs/events.  
4. Optionally call `setAgentWallet` if you later run an agent payment wallet.  

Dependencies: `viem` (already in monorepo patterns).

Env additions (`docs/ENV.md`):

```bash
# Operator only — never ship to frontend
AGENT_OWNER_PRIVATE_KEY=
ERC8004_IDENTITY_REGISTRY=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
AGENT_URI=ipfs://...
AGENT_ID=                 # filled after registration
```

### B.5 Discovery surfaces

After mainnet registration:

- [ ] Confirm on 8004scan / explorer that metadata validates  
- [ ] Put `agentId` + Celoscan NFT link in `README.md`  
- [ ] If metadata changes, pin new CID and call `setAgentURI`  

### B.6 Acceptance criteria

- [x] Compliant `agent/metadata.json` + offline validator script  
- [x] Registration tooling: `apps/backend/scripts/register-agent.ts`  
- [x] Env + operator docs (`docs/ENV.md`, `agent/README.md`, README)  
- [x] Metadata written for production (`agent/metadata.json`; agentURI embedded as `data:` on register)  
- [x] Registration tx confirmed on **Celo Mainnet** — agentId **9750**, tx `0x30d1ff630302e18db2301d7edfec22a4d620cd7ec57c3460568adab6257f7941`  
- [x] `agentId` recorded in README + ENV  
- [x] No deprecated metadata fields (validator clean)  
- [ ] Optional later: pin metadata to IPFS and `setAgentURI` for easier off-chain browsing  

### B.7 Exit

**Phase B complete on mainnet** (agentId 9750). Optional: re-pin to IPFS. Reputation feedback can wait until after agent API has real callers (Phase E).

---

## Phase C — Agent API + x402 (machine payments)

**Goal:** Other agents pay USDC per request to use Splyt’s AI parse. Human UI path stays free.

### C.1 Package install (backend workspace)

Use **v2 scoped packages only** (legacy `x402-express` has no Celo network enum):

```bash
npm i @x402/express @x402/core @x402/evm -w apps/backend
```

Re-fetch integration details before coding:

- `https://x402.celo.org/SKILL.md`  
- Live config: `https://x402.celo.org/api/config`  
- Supported: `curl https://api.x402.sepolia.celo.org/supported`  

### C.2 Human one-time facilitator setup

1. Open [https://x402.celo.org](https://x402.celo.org), connect wallet, create API key.  
2. Store as `X402_API_KEY` (server only).  
3. Set `SELLER_PAY_TO` to the wallet that receives USDC (can be same as operator).  
4. Start on **testnet** (`X402_NETWORK=testnet`).  

### C.3 New route surface

| Route | Auth / payment | Used by |
|-------|----------------|---------|
| `POST /api/parse` | Rate limit only (existing) | MiniPay / web UI |
| `POST /api/v1/agent/parse` | **x402 required** | Agents, scripts, bots |

**Suggested files:**

| File | Responsibility |
|------|----------------|
| `apps/backend/src/x402/facilitator.ts` | `HTTPFacilitatorClient` + `X-API-Key` |
| `apps/backend/src/x402/config.ts` | Network, USDC address, price object |
| `apps/backend/src/routes/agentParse.ts` | Paid parse handler (reuse `parseReceipt`) |
| `apps/backend/src/index.ts` | Mount middleware + route; CORS header allowlist |
| `apps/backend/src/swagger.ts` | Document 402 + agent operation |

### C.4 Price config (Celo-safe)

Never use bare `price: "$0.01"` on Celo (no default asset in package table). Always:

```ts
// amounts are strings in USDC 6-decimal base units
const price = {
  amount: process.env.X402_PARSE_AMOUNT ?? "10000", // $0.01
  asset: USDC, // mainnet or sepolia address
  extra: { name: "USDC", version: "2" },
};
```

| Network | CAIP-2 | USDC |
|---------|--------|------|
| Celo Sepolia | `eip155:11142220` | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` |
| Celo Mainnet | `eip155:42220` | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |

Facilitator URLs:

| Network | API |
|---------|-----|
| Testnet | `https://api.x402.sepolia.celo.org` |
| Mainnet | `https://api.x402.celo.org` |

### C.5 Middleware wiring (Express)

Pattern (verify against current `x402.celo.org/SKILL.md` at implement time):

1. Build `HTTPFacilitatorClient` with `createAuthHeaders` → `{ "X-API-Key": process.env.X402_API_KEY }`.  
2. Build `x402ResourceServer`, register `ExactEvmScheme` for `eip155:*`.  
3. Define routes map for `POST /api/v1/agent/parse` with `accepts: [{ scheme: "exact", network, payTo, price }]`.  
4. `app.use(paymentMiddleware(routes, server))` **before** the agent handler.  
5. Handler body: same validation + `parseReceipt` as `/api/parse`; return identical JSON shape.

### C.6 CORS and headers

Update `apps/backend/src/index.ts` CORS `allowedHeaders` to include payment headers used by x402 clients, e.g.:

- `Content-Type`  
- `X-PAYMENT` / `PAYMENT-SIGNATURE` (match whatever `@x402/*` and facilitator expect at implement time)  
- Any `payment-required` response header exposure if browsers call the agent API  

Agent-to-server calls often omit browser CORS; still fix headers for tooling that runs in browser-based agent UIs.

### C.7 Shared AI core (no duplication)

```
parseReceipt()  ←── POST /api/parse          (UI)
                 ←── POST /api/v1/agent/parse (x402)
```

Keep magic-byte checks, Zod schema, rate limits:

- UI route: keep IP rate limit (protect free tier).  
- Agent route: x402 is the economic rate limit; optional lighter secondary limit against abuse with free credits edge cases.

### C.8 Buyer test client

Add `scripts/x402-buyer-parse.ts` (or `apps/backend/scripts/`):

1. Fund buyer with **testnet USDC** ([Circle faucet](https://faucet.circle.com) → Celo Sepolia).  
2. Use `@x402/fetch` + `ExactEvmScheme` + `wrapFetchWithPayment`.  
3. POST a sample receipt image to agent parse.  
4. Assert `200` + parsed JSON + payment-response header.  

Buyer does **not** need `X402_API_KEY` (seller only). Buyer does **not** need CELO for settlement gas (facilitator sponsors).

### C.9 Env vars

```bash
# apps/backend/.env
X402_API_KEY=x402_...
X402_NETWORK=testnet          # testnet | mainnet
SELLER_PAY_TO=0x...           # receives USDC
X402_PARSE_AMOUNT=10000       # optional override ($0.01)
```

### C.10 Acceptance criteria

- [ ] `curl -i POST /api/v1/agent/parse` without payment → **402** + machine-readable requirements  
- [ ] Buyer script with USDC → **200** + same schema as UI parse  
- [ ] UI `POST /api/parse` still works **without** payment headers  
- [ ] Facilitator credit decrements on settle; dashboard reflects usage  
- [ ] No USDm in x402 path; no x402 on default UI path  
- [ ] Swagger/OpenAPI documents agent route and 402  
- [ ] `docs/API.md` + `docs/ENV.md` updated  

### C.11 Exit

Agents can pay to parse. Humans still free. Ready to advertise `services` endpoint in ERC-8004 metadata (update CID + `setAgentURI` if Phase B already shipped).

---

## Phase D — Agent wallet, attribution, and optional agent services

**Goal:** Operational polish so Splyt looks and acts like an onchain agent, not only an app with a paid endpoint.

### D.1 Agent wallet policy

| Role | Wallet | Holds |
|------|--------|--------|
| Human users | Their MiniPay / injected wallets | USDm for bill share |
| Seller (`SELLER_PAY_TO`) | Operator treasury | Incoming x402 USDC |
| Optional agent key | Dedicated EOA for future automation | Small USDC for *outbound* x402 if Splyt ever *calls* other agents |

**Do not** put user funds or session escrow in the agent key. `SplytSession` remains non-custodial.

If you set an agent payment wallet on ERC-8004:

- [ ] Use Identity `setAgentWallet` with correct signature flow  
- [ ] Document address in metadata / README  

### D.2 ERC-8021 attribution tags

Apply early on **Splyt-originated** contract interactions where you control the client (`createSession`, `markPaid`, `closeSession` from web) or any backend-submitted txs.

- Package: `@celo/attribution-tags`  
- Append calldata suffix per [celopedia `attribution-tags.md`](../.agents/skills/celopedia-skill/references/attribution-tags.md)  
- Touch points: `apps/web/lib/chain.ts` write helpers (and any backend `contract.ts` writers)

Acceptance:

- [ ] At least one mainnet tagged tx type verified on explorer / tooling  
- [ ] Documented in `docs/ARCHITECTURE.md` or CONTRACT notes  

### D.3 Optional discovery endpoints

Nice-to-have after C:

| Endpoint | Purpose |
|----------|---------|
| `GET /.well-known/agent.json` | Static agent card (name, skills, payment, 8004 id) |
| `GET /api/v1/agent/health` | Liveness + network + price quote |
| `GET /api/v1/agent/skills` | Machine-readable skill list (“parse_receipt”, “split_session”) |

Keep payloads small; point ERC-8004 `services` at the agent base URL.

### D.4 Optional: agent-initiated session helpers

Only if product needs machine hosts (not required for MVP agent):

- Authenticated agent creates a session draft after paid parse  
- Still require human signatures for on-chain `createSession` / pay unless you redesign custody  

**Recommendation:** defer; paid parse alone is enough for “functioning AI agent” narrative.

### D.5 Acceptance criteria

- [ ] Wallet roles documented; keys not in frontend  
- [ ] Attribution tags on primary write path (or explicit deferral note)  
- [ ] Optional agent card live and linked from metadata  

### D.6 Exit

Agent is operable, attributable, and discoverable beyond a single paid POST.

---

## Phase E — Ship checklist, programs, and verification

**Goal:** Public proof that Splyt is a Celo AI agent (without Self Agent ID).

### E.1 Public surfaces

- [ ] Live frontend URL  
- [ ] Live backend URL  
- [ ] Mainnet `SplytSession` address (verified if possible)  
- [ ] ERC-8004 `agentId` + metadata CID  
- [ ] Agent parse URL + example buyer snippet in README  
- [ ] Public GitHub with ongoing commits  

### E.2 Proof of Ship / Talent

Per celopedia Proof of Ship (AI Agents prize historically wanted 8004 + Self + wallet txs — **Self skipped**):

- [ ] Project page on [talent.app](https://talent.app) with GitHub, contract, live URL  
- [ ] Data sources include MiniPay hook path if tracked  
- [ ] Real on-chain activity from users (USDm settles) **and** at least some agent/x402 or operator txs  

Note in project description: agent payments via **x402 USDC**; consumer settlement via **USDm**.

### E.3 Agent Visa (optional)

- **Tourist** tier: ≥1 Celo tx — automatic; no Self required  
- Work Visa / Citizenship: Self Agent ID required — **out of scope** unless you reverse that decision later  

### E.4 Regression matrix

| Case | Expected |
|------|----------|
| MiniPay: free parse → create session → member pay USDm → close | Pass |
| Browser wallet same flow | Pass |
| Agent parse no payment | 402 |
| Agent parse with x402 USDC | 200 + receipt JSON |
| Wrong network / empty facilitator credits | Clear 401/402; no silent free AI |
| Rate limit free parse | 429 as today |

### E.5 Docs final pass

- [ ] `docs/implementation.md` — mark phases complete with dates  
- [ ] `docs/ARCHITECTURE.md` — dual path  
- [ ] `docs/API.md` — agent + 402  
- [ ] `docs/ENV.md` — all secrets listed  
- [ ] `README.md` — agent section, addresses, demo  

### E.6 Exit

Project is publicly verifiable as a dual-path Celo agent product.

---

## Phase F — Post-MVP (backlog; not blocking “fully functioning”)

Prioritize only after A–E:

1. **Reputation registry** — solicit feedback tags (`starred`, `successRate`) after real agent usage.  
2. **Agent session API** — paid create/status for fully automated hosts.  
3. **Premium human parse** — optional UI upsell (still prefer non-x402 UX for MiniPay; could use in-app USDm fee or free tier).  
4. **MCP server** — expose parse/split tools to coding agents.  
5. **Multi-stablecoin agent pricing** — if you need USDm micropayments, use a facilitator that supports EIP-2612 (e.g. thirdweb path); hosted Celo facilitator will not settle USDm.  
6. **Onchain Agents Hackathon** submission (when in season) via Celo Builders skill.  

---

## 3. Suggested timeline

| Phase | Effort (solo) | Depends on |
|-------|----------------|------------|
| **A** Design lock + doc stubs | 0.5 day | — |
| **B** ERC-8004 metadata + register | 1–2 days | IPFS + gas |
| **C** x402 agent parse + buyer script | 2–4 days | Facilitator key + testnet USDC |
| **D** Attribution + agent card | 1–2 days | B/C |
| **E** Public ship + regression | 1 day | B+C live |
| **F** Backlog | ongoing | E |

**Parallelism:** B and C can run in parallel after A. Update metadata `services` once C’s public URL is stable.

---

## 4. File touch map (implementation checklist)

### New

- [ ] `docs/implementation.md` (this file)  
- [ ] `agent/metadata.json`  
- [ ] `scripts/register-agent.ts`  
- [ ] `scripts/x402-buyer-parse.ts`  
- [ ] `apps/backend/src/x402/facilitator.ts`  
- [ ] `apps/backend/src/x402/config.ts`  
- [ ] `apps/backend/src/routes/agentParse.ts`  
- [ ] Optional: `apps/backend/src/routes/agentCard.ts` or static `public/.well-known/agent.json` on web  

### Modify

- [ ] `apps/backend/src/index.ts` — mount agent routes, CORS headers, optional x402 middleware  
- [ ] `apps/backend/src/swagger.ts` — agent + 402  
- [ ] `apps/backend/package.json` — `@x402/*` deps  
- [ ] `apps/web/lib/chain.ts` — attribution tags (Phase D)  
- [ ] `docs/API.md`, `docs/ENV.md`, `docs/ARCHITECTURE.md`, `README.md`  

### Do not change for agent work (unless bugfix)

- Core USDm pay UI components  
- `SplytSession.sol` economics (unless separate product change)  
- Free `POST /api/parse` contract with the web app  

---

## 5. Security & ops notes

1. **`X402_API_KEY` and `AGENT_OWNER_PRIVATE_KEY` never go in `NEXT_PUBLIC_*` or client bundles.**  
2. **`payTo` is your treasury**, not the facilitator address.  
3. **Facilitator credits** depleting → agent parse fails with payment errors; monitor dashboard.  
4. **Keep free parse rate-limited** — UI path remains an abuse surface.  
5. **Image size limits** stay enforced on both parse routes (Groq cost).  
6. **Mainnet x402** only after Sepolia buyer script is green.  
7. **Metadata mutability** — prefer IPFS + `setAgentURI` over mutable HTTPS agentURI.  

---

## 6. Quick reference: payment decision tree

```
Who is calling?
├── Human in MiniPay / browser UI
│   ├── Parse receipt     → POST /api/parse (free, rate-limited)
│   └── Pay share / host  → USDm + SplytSession (user wallet signs)
│
└── Another agent / script / bot
    ├── Parse receipt     → POST /api/v1/agent/parse + x402 USDC
    └── Pay a human split → out of band: that human still uses USDm UI
                            (or future agent-session API — Phase F)
```

---

## 7. Phase status tracker

| Phase | Name | Status |
|-------|------|--------|
| — | Product loop (baseline) | **Done** |
| — | Self Agent ID | **Skipped** |
| **A** | Dual-path architecture lock | **Done** |
| **B** | ERC-8004 identity tooling | **Done** (live register = operator; branch `feat/phase-b-erc8004-identity`) |
| **C** | x402 agent API | Pending |
| **D** | Wallet roles, attribution, agent card | Pending |
| **E** | Public ship & verification | Pending |
| **F** | Post-MVP backlog | Not started |

---

## 8. References

- Celopedia skill: `.agents/skills/celopedia-skill/references/ai-agents.md`  
- x402 Celo facilitator skill: https://x402.celo.org/SKILL.md  
- EIP-8004: https://eips.ethereum.org/EIPS/eip-8004  
- 8004 best practices: https://best-practices.8004scan.io  
- Attribution: `.agents/skills/celopedia-skill/references/attribution-tags.md`  
- Splyt architecture: `docs/ARCHITECTURE.md`  
- Splyt env: `docs/ENV.md`  
