# Pull request: Phase A+B Celo AI agent

**Branch:** `feat/phase-b-erc8004-identity` → `main`  
**Open PR:** https://github.com/Dominion116/Splyt/pull/new/feat/phase-b-erc8004-identity

---

## Title

```
feat: Celo AI agent Phase A+B (dual-path design + ERC-8004 tooling)
```

## Body (paste into GitHub)

```markdown
## Summary

- **Phase A:** Lock dual payment architecture — humans settle bill shares in **USDm** via MiniPay/`SplytSession`; machine clients will use **x402 USDC** on a separate agent parse route (not the free UI parse).
- **Phase B:** Add ERC-8004-compliant agent metadata, offline validator, and on-chain registration script (Celo Sepolia/mainnet Identity Registry).
- **Tooling hygiene:** Ignore local Celopedia skills (`.agents/`, `skills-lock.json`, `.claude/skills/`) so they are installed per-dev with `npx skills add celo-org/celopedia-skills`.

## Dual payment path (design lock)

| Caller | Parse | Settlement |
|--------|-------|------------|
| MiniPay / browser UI | `POST /api/parse` (free, rate-limited) | USDm + `SplytSession` |
| Other agent / machine | `POST /api/v1/agent/parse` (Phase C, x402) | USDC via hosted facilitator |

Self Agent ID is intentionally out of scope.

## ERC-8004 (Phase B)

- `agent/metadata.json` — registration-v1 shape (`services` + `endpoint`, not deprecated fields)
- `npm run validate-agent-metadata -w apps/backend` — offline compliance check
- `npm run register-agent -w apps/backend` — `register(agentURI)` / `setAgentURI` via viem
- Operator still needs a funded key + optional IPFS pin to complete live registration (`agentId` left TBD in README)

## Docs

- `agent.md`, `docs/agent.md`, `docs/implementation.md`
- Updated `ARCHITECTURE.md`, `API.md`, `ENV.md`, `README.md`

## Test plan

- [x] `agent/metadata.json` parses and passes shape checks (type, services, no endpoints/url)
- [ ] `npm run validate-agent-metadata -w apps/backend` after `npm install`
- [ ] (Operator) Fund Sepolia wallet → `AGENT_OWNER_PRIVATE_KEY` + `--embed-metadata` → successful register tx
- [ ] Confirm `agentId` / explorer link; update README placeholders
- [ ] Confirm `.agents/` and `skills-lock.json` are **not** in the PR file list
- [ ] Existing product loop unchanged (no runtime behavior change to parse/pay UI)

## Out of scope (later phases)

- Phase C: x402 paid `/api/v1/agent/parse`
- Phase D: attribution tags / agent card
- Live mainnet registration (operator step after review)
```
