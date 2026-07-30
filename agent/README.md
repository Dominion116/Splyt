# Splyt ERC-8004 agent identity

Phase B: register Splyt as an on-chain AI agent on Celo via the ERC-8004 Identity Registry.

## Compliant metadata

Source file: [`metadata.json`](./metadata.json)

| Field | Rule |
|-------|------|
| `type` | Must be `https://eips.ethereum.org/EIPS/eip-8004#registration-v1` (not `"Agent"`) |
| `services` | Array name must be `services` (not `endpoints`) |
| each service | `name` + `endpoint` (not `url`) |
| `agentURI` | Prefer `ipfs://…` or `data:…` (content-addressed) |

Update placeholders before mainnet registration:

- `image` → IPFS CID of logo  
- `services[web].endpoint` → production frontend URL  
- `services[MCP].endpoint` → production agent API base (Phase C)  

## Registries

| Network | Identity Registry |
|---------|-------------------|
| Celo Mainnet | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Celo Sepolia | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |

## Register (operator)

1. Fund the operator wallet with gas on the target network (CELO or fee currency).  
2. Pin `metadata.json` to IPFS (Pinata, web3.storage, etc.) **or** use the script’s `data:` embedding mode for a dry run.  
3. Set env (see root / backend `.env` — never commit keys):

```bash
AGENT_OWNER_PRIVATE_KEY=0x...
AGENT_NETWORK=sepolia          # sepolia | mainnet
AGENT_URI=ipfs://Qm...         # optional if using --embed-metadata
# optional overrides:
# ERC8004_IDENTITY_REGISTRY=0x...
# CELO_RPC_URL=https://...
```

4. Run:

```bash
# Register with an already-pinned IPFS URI
npm run register-agent -w apps/backend

# Or embed metadata.json as a data: URI (no IPFS required for testnet smoke)
npm run register-agent -w apps/backend -- --embed-metadata
```

5. Save printed `agentId` and `txHash` into `docs/ENV.md` / README agent section.  
6. Validate metadata on [8004 best practices](https://best-practices.8004scan.io) / explorer.  
7. If metadata changes later: pin new CID, then:

```bash
npm run register-agent -w apps/backend -- --set-uri --agent-id <ID>
```

## Env reference

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_OWNER_PRIVATE_KEY` | yes | Operator EOA that will own the agent NFT |
| `AGENT_URI` | yes* | `ipfs://…` or `data:…` (*not needed with `--embed-metadata`) |
| `AGENT_NETWORK` | no | `sepolia` (default) or `mainnet` |
| `ERC8004_IDENTITY_REGISTRY` | no | Override registry address |
| `CELO_RPC_URL` / `CELO_SEPOLIA_RPC_URL` | no | RPC overrides |
| `AGENT_ID` | for `--set-uri` | Existing token id |

## Related

- Plan: [`docs/implementation.md`](../docs/implementation.md) Phase B  
- Design: [`docs/agent.md`](../docs/agent.md) / [`agent.md`](../agent.md)  
- EIP-8004: https://eips.ethereum.org/EIPS/eip-8004  
