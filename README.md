# RivectumRWA — Hackathon Demo

RivectumRWA is an autonomous RWA allocation demo on Base Sepolia. An off-chain TypeScript agent rebalances an ERC-4626 USDC vault across two ERC-4626 underlyings via signed intents, with a Next.js dashboard.

> ⚠️ Unaudited demo. Base Sepolia testnet only. Do not deposit real funds.

## What's in the box

```
contracts/   Foundry workspace — Vault.sol, Deploy.s.sol, 10 unit tests
agent/       Bun + TypeScript service — viem, drizzle, sqlite, cron loop
web/         Next.js 15 dashboard — wagmi + RainbowKit, deposit/withdraw/feed
docs/superpowers/specs/   Design spec
plan.md      18-task implementation plan (TDD)
```

## Architecture

1. **User** deposits USDC → receives ERC-4626 shares from `Vault`.
2. **Agent** (off-chain Bun service) periodically:
   - probes simulated APY of each whitelisted ERC-4626 underlying;
   - picks an allocation (60/40 split, 60 % cap per asset);
   - signs an `Intent { nonce, deadline, allocations }` with its EOA key;
   - calls `Vault.rebalance(intent, sig)`.
3. **Vault** verifies ECDSA signature against the configured `agentDid`, redeems all underlyings, and re-deposits per the new bps split.
4. **Dashboard** reads on-chain state via wagmi and the agent's decision log via `/api/decisions` (SQLite).

## Prerequisites

- [Foundry](https://book.getfoundry.sh/) (`forge`)
- [Bun](https://bun.sh/) ≥ 1.3
- Node.js ≥ 20
- pnpm ≥ 10
- Base Sepolia RPC URL (e.g. `https://sepolia.base.org`)
- A funded EOA on Base Sepolia (deployer)
- A second EOA — its address becomes the agent DID, its private key signs intents

## 1. Deploy contracts

```bash
cd contracts
cp .env.example .env
# Fill: DEPLOYER_PRIVATE_KEY, AGENT_DID_ADDRESS, USDC_ADDRESS,
#       UNDERLYING_1, UNDERLYING_2, BASE_SEPOLIA_RPC_URL
forge build
forge test -vv
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
```

Note the deployed `Vault` address from the script log.

> Pick two real ERC-4626 vaults on Base Sepolia for the underlyings. If none are deployed, deploy two of `MockERC4626` from `contracts/test/mocks/` first and use those addresses.

## 2. Run the agent

```bash
cd ../agent
cp .env.example .env
# Fill: VAULT_ADDRESS, USDC_ADDRESS, UNDERLYING_1, UNDERLYING_2,
#       AGENT_PRIVATE_KEY, RPC_URL
bun install
bun test          # 8 tests pass
bun run dev       # cron loop, default 5 min interval
```

Adjust frequency via `REBALANCE_INTERVAL_MS`.

## 3. Run the dashboard

```bash
cd ../web
cp .env.example .env.local
# Fill: NEXT_PUBLIC_VAULT_ADDRESS, NEXT_PUBLIC_USDC_ADDRESS,
#       NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_WC_PROJECT_ID,
#       AGENT_DB_PATH (defaults to ../agent/agent.db)
pnpm install
pnpm build
pnpm dev
```

Open <http://localhost:3000>.

## End-to-end demo flow

1. Connect wallet to Base Sepolia.
2. Acquire test USDC from the [Circle faucet](https://faucet.circle.com/).
3. Deposit 100 USDC through the dashboard.
4. Wait up to one rebalance interval — agent picks up new balance, signs an intent, submits `rebalance`.
5. Refresh the dashboard — allocation list and activity feed update with a new entry linking to BaseScan.
6. Withdraw 40 USDC — confirm USDC balance returns.

## Test commands

```bash
# Contracts
cd contracts && forge test -vv

# Agent
cd agent && bun test

# Web
cd web && pnpm exec tsc --noEmit && pnpm build
```

## Deviation from spec

ECDSA (secp256k1) is used for intent signing instead of Ed25519 / DID-native signatures, so the on-chain check is a single `ecrecover`. See [§10 of the design spec](docs/superpowers/specs/2026-05-21-agent-rwa-vault-design.md#10-deviations).

## Acceptance checklist

- [ ] Contracts deployed to Base Sepolia
- [ ] Agent rebalances within one interval of a deposit
- [ ] Dashboard shows allocation pie and activity feed
- [ ] All 10 Foundry tests pass
- [ ] All 8 agent unit tests pass
- [ ] `pnpm build` clean in `web/`
- [ ] README setup reproducible from a fresh clone

## Project layout

- `contracts/src/Vault.sol` — ERC-4626 + signed-intent rebalance executor
- `contracts/script/Deploy.s.sol` — single-shot Base Sepolia deploy
- `agent/src/agent.ts` — cron loop entrypoint
- `agent/src/strategy.ts` — allocation picker (60/40, 60 % cap)
- `agent/src/sign.ts` — keccak intent hash + ECDSA signer (matches `Vault._hashIntent`)
- `web/app/page.tsx` — dashboard shell
- `web/app/api/decisions/route.ts` — SQLite read for activity feed

## Hermes Skills

AI-powered agent skills for protocol explanation, user onboarding, troubleshooting, and CLI operations: [Agent-Skill Repo](https://github.com/rivectumRWA/Agent-Skill)

Available skills: `rivectum-protocol` (protocol guide), `rivectum-web` (dashboard guide), `rivectum-faq` (troubleshooting), `rivectum-rwa-cli` (CLI operator).

## License

MIT (demo).
