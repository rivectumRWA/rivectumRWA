---
name: serra-rwa-cli
description: >
  Use when operating the SerraRWA autonomous RWA allocation protocol from the command line —
  running agent rebalance cycles, checking vault state, managing deposits/withdrawals,
  or integrating SerraRWA into an automated pipeline on Base Sepolia.
version: "1.0.0"
author: project
license: MIT
platforms:
  - node
  - bun
required_environment_variables:
  - RPC_URL
  - VAULT_ADDRESS
  - USDC_ADDRESS
metadata:
  hermes:
    category: blockchain
    tags:
      - rwa
      - defi
      - vault
      - base-sepolia
      - on-chain
      - ethereum
      - autonomous-agent
    related_skills:
      - autonomous-ai-agent
    requires_toolsets:
      - bash
---

# SerraRWA CLI

> Autonomous RWA allocation on Base Sepolia — operated from the command line with agent and user namespaces.

## Overview

The SerraRWA CLI is a TypeScript command-line tool for interacting with the SerraRWA autonomous vault protocol. It exposes two namespaces:

- **`agent`** — Operator commands for running the autonomous rebalance loop, inspecting decisions, and managing the agent lifecycle.
- **`user`** — Vault participant commands for approving USDC, depositing, withdrawing, and checking balances.

Two execution modes are supported:

1. **Direct RPC mode** (default) — Signs and submits transactions directly to Base Sepolia via viem. Requires full `.env` configuration with private keys.
2. **Thin-client API mode** (`--api-key`) — Routes through the SerraRWA web API. Only needs an API key; no local private keys required.

## When to Use

- Running or inspecting agent rebalance cycles (`agent tick`, `agent status`, `agent decisions`)
- Managing vault user operations: deposit, withdraw, approve, balance, preview
- Querying vault state, share prices, underlying allocations
- Integrating SerraRWA into automation pipelines or Hermes operator workflows
- Debugging on-chain vault behavior via dry-run simulation

### Avoid When

- You need the web dashboard → use the Next.js app at `web/`
- You need smart contract development → use `forge` in `contracts/`
- You need to modify agent strategy logic → edit `agent/src/strategy.ts`

---

## Prerequisites

- **Bun** runtime (v1.0+) or **Node.js** 18+
- `.env` file in the `cli/` directory with required variables (see [Environment](#environment))

## Environment Discovery

The CLI lives at `${SKILL_DIR}/../../cli/` relative to this SKILL.md, where `${SKILL_DIR}` is the directory containing this file.

```bash
# Resolve CLI root from skill directory
CLI_ROOT="$(dirname "$SKILL_DIR")/../../cli"
cd "$CLI_ROOT"
bun install
cp .env.example .env   # Edit with your values
```

## Command Reference

### Agent Namespace (Operator)

| Command | Description | Side Effects |
|---|---|---|
| `agent status` | Vault snapshot: totalAssets, totalSupply, whitelisted underlyings | **Read-only** |
| `agent decisions` | Recent agent decisions from local SQLite DB | **Read-only** |
| `agent tick` | Probe → pick → sign → submit rebalance (dry-run by default) | **Dry-run** |
| `agent tick --broadcast --yes` | Execute actual on-chain rebalance transaction | **Write** |

### User Namespace (Vault Participant)

| Command | Description | Side Effects |
|---|---|---|
| `user preview --deposit <amt>` | Estimate shares receivable for a deposit | **Read-only** |
| `user preview --redeem <amt>` | Estimate assets receivable for a redemption | **Read-only** |
| `user balance` | Show USDC balance, vault shares, redeemable amount | **Read-only** |
| `user balance --address <addr>` | Check any address (no private key needed) | **Read-only** |
| `user approve --max --yes` | Approve unlimited USDC spending to vault | **Write** |
| `user deposit --amount <amt> --yes` | Deposit USDC into the vault | **Write** |
| `user withdraw --assets <amt> --yes` | Withdraw by asset amount | **Write** |
| `user withdraw --shares <amt> --yes` | Withdraw by share amount | **Write** |

### Global Flags

| Flag | Effect |
|---|---|
| `--json` | Output single JSON object on stdout; human messages to stderr |
| `--yes` | Skip confirmation prompts (required for write operations) |
| `--help` | Show command-specific help |
| `--broadcast` | Enable actual transaction broadcast (agent tick only) |
| `--api-key <key>` | Use thin-client mode via SerraRWA web API |
| `--api-url <url>` | Override API base URL |

## Output Format

- **Default**: Colored ANSI tables and boxes for human reading.
- **JSON mode** (`--json`): Single JSON object on stdout, human messages on stderr. Use for pipeline integration.

```bash
# Human-friendly output
bun run cli agent status

# Machine-readable output (pipe to jq)
bun run cli agent status --json | jq '.totalAssets'
```

## Key Safety Model

- Read-only commands (`status`, `decisions`, `preview`, `balance --address`) **never load private keys**
- Agent commands only access `AGENT_PRIVATE_KEY`, never `USER_PRIVATE_KEY`
- User commands only access `USER_PRIVATE_KEY`, never `AGENT_PRIVATE_KEY`
- `agent tick` defaults to **dry-run** — broadcasting requires explicit `--broadcast --yes`
- User write operations (`approve`, `deposit`, `withdraw`) require explicit `--yes` flag

## Common Workflows

### Check vault health

```bash
bun run cli agent status --json
```

### Run agent rebalance (dry-run first)

```bash
bun run cli agent tick                    # Dry-run: see what would happen
bun run cli agent tick --broadcast --yes  # Execute on-chain for real
```

### Deposit into vault

```bash
bun run cli user approve --max --yes
bun run cli user deposit --amount 100 --yes
bun run cli user balance
```

### Withdraw from vault

```bash
bun run cli user withdraw --assets 50 --yes
```

### Check share price

```bash
bun run cli user preview --deposit 100 --json
```

## Error Codes

| Exit Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Generic error |
| 2 | User aborted / confirmation declined |
| 3 | Missing or invalid environment variable |
| 4 | RPC error |
| 5 | Transaction reverted |

## Environment Variables

| Variable | Required For | Description |
|---|---|---|
| `RPC_URL` | all commands | Base Sepolia RPC endpoint |
| `VAULT_ADDRESS` | all commands | SerraRWA vault contract address |
| `USDC_ADDRESS` | user commands | USDC token address on Base Sepolia |
| `AGENT_PRIVATE_KEY` | `agent tick` | Agent signer private key (hex) |
| `USER_PRIVATE_KEY` | user write ops | User signer private key (hex) |
| `UNDERLYING_1` | `agent tick` | First whitelisted underlying token address |
| `UNDERLYING_2` | `agent tick` | Second whitelisted underlying token address |
| `DB_PATH` | `agent decisions` | Path to agent.db SQLite file |

## Hermes Operator Integration

The agent namespace maps directly to a Hermes operator loop:

1. **Probe** — `agent status` reads current vault state
2. **Decide + Execute** — `agent tick` runs the strategy and optionally broadcasts
3. **Audit** — `agent decisions` reads the decision log for learning

For autonomous operation, wrap in a cron-like schedule:

```bash
# Hourly status probe
bun run cli agent status --json >> vault_history.jsonl

# Daily rebalance with dry-run first
bun run cli agent tick && bun run cli agent tick --broadcast --yes
```

---

## Common Pitfalls

1. **Forgetting `--yes` on write operations** — The CLI will prompt for confirmation and exit with code 2 unless `--yes` is provided. Write operations always require it; read operations ignore it.
2. **Direct RPC vs thin-client confusion** — Direct RPC mode requires full `.env` with private keys. Thin-client mode (`--api-key`) only needs an API key and routes through the web backend. Mixing them produces confusing errors.
3. **Broadcasting without dry-run** — Always run `agent tick` without `--broadcast` first to review the proposed rebalance before committing on-chain.
4. **Wrong USDC address for Base Sepolia** — The CLI targets Base Sepolia testnet. Mainnet USDC addresses will fail or interact with the wrong contracts.
5. **RPC endpoint reliability** — Public Base Sepolia RPCs can be unreliable. Use a dedicated RPC provider for production agent loops.
6. **Private key exposure in shell history** — Never pass private keys as CLI arguments. Always use the `.env` file and ensure it is in `.gitignore`.

## Verification Checklist

- [ ] `.env` file exists in `cli/` with all required variables populated
- [ ] `bun install` ran successfully in the CLI directory
- [ ] `bun run cli agent status` returns valid vault data
- [ ] `bun run cli user balance` returns non-error output
- [ ] Dry-run `agent tick` completes without RPC errors
- [ ] `--json` flag produces valid, parseable JSON
- [ ] Write operations always use `--yes` flag explicitly
- [ ] Private key files and `.env` are excluded from version control
