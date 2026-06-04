---
name: serra-rwa-cli
description: "Operate the SerraRWA autonomous RWA allocation protocol via CLI. Two namespaces: `agent` (tick, decisions, status) and `user` (balance, approve, deposit, withdraw, preview). Supports direct RPC mode and thin-client API mode. Use when managing the SerraRWA vault, running agent rebalance cycles, checking vault state, or executing user operations on Base Sepolia."
origin: project
---

# SerraRWA CLI

> Autonomous RWA allocation on Base Sepolia — from the command line.

## When to Use

- Running or inspecting agent rebalance cycles (`agent tick`, `agent status`, `agent decisions`)
- Managing vault user operations: deposit, withdraw, approve, balance, preview
- Querying vault state, share prices, underlying allocations
- Integrating SerraRWA into automation pipelines or agent workflows
- Debugging on-chain vault behavior via dry-run simulation

### Avoid When

- You need the web dashboard UI → use the Next.js app at `web/`
- You need smart contract development → use `forge` in `contracts/`
- You need to modify agent strategy logic → edit `agent/src/strategy.ts`

## Prerequisites

- **Bun** runtime (v1.0+)
- **Node.js** 18+ (for compatibility)
- `.env` file in `cli/` directory with required variables (see Environment section)

## Skill Directory Convention

**Agent Execution**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. The CLI lives at `${SKILL_DIR}/../../cli/` relative to this skill (or use `CLI_ROOT` env var)
3. Replace all `${CLI_ROOT}` below with the actual CLI path

## Setup

```bash
cd ${CLI_ROOT}
bun install
cp .env.example .env   # Edit with your values
```

## Command Reference

### Agent Namespace (Operator)

Requires: `AGENT_PRIVATE_KEY`, `RPC_URL`, `VAULT_ADDRESS`, `UNDERLYING_1`, `UNDERLYING_2`

| Command | Description | Risk Level |
|---------|-------------|------------|
| `agent status` | Vault snapshot: totalAssets, totalSupply, paused, underlyings | Read-only |
| `agent decisions` | Recent agent decisions from SQLite DB | Read-only |
| `agent tick` | Probe → pick → sign → submit rebalance | Dry-run default |
| `agent tick --broadcast --yes` | Execute actual on-chain rebalance tx | **Write** |

### User Namespace (Vault User)

Requires: `USER_PRIVATE_KEY`, `RPC_URL`, `VAULT_ADDRESS`, `USDC_ADDRESS`

| Command | Description | Risk Level |
|---------|-------------|------------|
| `user preview --deposit <amt>` | Estimate shares for deposit | Read-only |
| `user preview --redeem <amt>` | Estimate assets for redemption | Read-only |
| `user balance` | Show USDC, shares, redeemable | Read-only |
| `user balance --address <addr>` | Check any address (no key needed) | Read-only |
| `user approve --max --yes` | Approve unlimited USDC spending | **Write** |
| `user deposit --amount <amt> --yes` | Deposit USDC into vault | **Write** |
| `user withdraw --assets <amt> --yes` | Withdraw by asset amount | **Write** |
| `user withdraw --shares <amt> --yes` | Withdraw by share amount | **Write** |

### Global Flags

| Flag | Effect |
|------|--------|
| `--json` | Output single JSON object on stdout; human messages to stderr |
| `--yes` | Skip confirmation prompts (required for write operations) |
| `--help` | Show command-specific help |
| `--broadcast` | Enable actual tx broadcast (agent tick only) |
| `--api-key <key>` | Use thin-client mode via SerraRWA web API |
| `--api-url <url>` | Override API base URL |

## Execution Modes

### Direct RPC Mode (Default)

All commands read/write directly to Base Sepolia via `viem`. Requires full `.env` config with private keys.

```bash
bun run cli agent status
bun run cli user deposit --amount 100 --yes
```

### Thin-Client API Mode (`--api-key`)

Routes through the SerraRWA web API. Only needs `--api-key` and optionally `--api-url`. No private keys in local env.

```bash
bun run cli --api-key sk_live_xxx agent status
bun run cli --api-key sk_live_xxx user deposit --amount 100 --yes
```

## Key Safety Model

- Read-only commands (`status`, `decisions`, `preview`, `balance --address`) **never load private keys**
- Agent commands only load `AGENT_PRIVATE_KEY`, never `USER_PRIVATE_KEY`
- User commands only load `USER_PRIVATE_KEY`, never `AGENT_PRIVATE_KEY`
- `agent tick` defaults to **dry-run**. Broadcasting requires `--broadcast --yes`
- `user approve/deposit/withdraw` require explicit `--yes` flag

## Common Workflows

### Check vault health
```bash
bun run cli agent status --json
```

### Run agent rebalance (dry-run first)
```bash
bun run cli agent tick              # dry-run, see what would happen
bun run cli agent tick --broadcast --yes  # execute for real
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

| Exit | Meaning |
|------|---------|
| 0 | Success |
| 1 | Generic error |
| 2 | User aborted / confirmation declined |
| 3 | Missing or invalid env variable |
| 4 | RPC error |
| 5 | Transaction reverted |

## Environment Variables

| Variable | Required For | Description |
|----------|-------------|-------------|
| `RPC_URL` | all | Base Sepolia RPC endpoint |
| `VAULT_ADDRESS` | all | SerraRWA vault contract address |
| `USDC_ADDRESS` | user | USDC token on Base Sepolia |
| `AGENT_PRIVATE_KEY` | agent tick | Agent signer private key (hex) |
| `USER_PRIVATE_KEY` | user write | User signer private key (hex) |
| `UNDERLYING_1` | agent tick | First whitelisted underlying address |
| `UNDERLYING_2` | agent tick | Second whitelisted underlying address |
| `DB_PATH` | agent decisions | Path to agent.db SQLite file |

## Output Format

Default mode: colored ANSI tables and boxes for human reading.
JSON mode (`--json`): single JSON object on stdout, human messages on stderr.

```bash
# Human-friendly
bun run cli agent status

# Machine-readable
bun run cli agent status --json | jq '.totalAssets'
```

## Integration with Agent Frameworks

### As ECC Skill

This SKILL.md is designed for Claude Code / ECC integration. The agent loads this skill and executes CLI commands via `bash` tool.

### As MCP Tool

The CLI can be wrapped as MCP tools by mapping each command to a tool definition. Use `--json` flag for structured output.

### As Hermes Operator Workflow

The agent namespace (`tick`, `status`, `decisions`) maps to a Hermes operator loop:
1. `agent status` → probe
2. `agent tick` → decide + execute
3. `agent decisions` → audit trail

## Development

```bash
cd ${CLI_ROOT}
bun test          # Run test suite
bun run typecheck # TypeScript check
```
