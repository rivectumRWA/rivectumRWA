# SerraRWA CLI

Command-line interface for the SerraRWA vault protocol.

## Setup

```bash
cd cli
bun install
cp .env.example .env   # then edit .env with your values
```

## Quick Start

```bash
# Show top-level help
bun run cli --help

# Agent namespace (operator commands)
bun run cli agent status        # Vault snapshot
bun run cli agent decisions     # Recent agent decisions
bun run cli agent tick          # Dry-run rebalance (no tx)

# User namespace (vault-user commands)
bun run cli user preview --deposit 100     # Estimate shares
bun run cli user balance                   # Show balances
bun run cli user approve --max --yes       # Approve USDC
bun run cli user deposit --amount 100 --yes
bun run cli user withdraw --assets 50 --yes
```

## Namespaces

| Namespace | Role | Commands |
|-----------|------|----------|
| `agent` | Operator (AGENT_PRIVATE_KEY) | `status`, `decisions`, `tick` |
| `user` | Vault user (USER_PRIVATE_KEY) | `preview`, `balance`, `approve`, `deposit`, `withdraw` |

## Environment Variables

| Variable | Required For | Description |
|----------|-------------|-------------|
| `RPC_URL` | all | Base Sepolia RPC endpoint |
| `VAULT_ADDRESS` | all | SerraRWA vault contract |
| `USDC_ADDRESS` | user | USDC token on Base Sepolia |
| `AGENT_PRIVATE_KEY` | agent tick | Agent signer key |
| `USER_PRIVATE_KEY` | user write | User signer key |
| `UNDERLYING_1` | agent tick | First whitelisted underlying |
| `UNDERLYING_2` | agent tick | Second whitelisted underlying |
| `DB_PATH` | agent decisions | Path to agent.db |

## Key Safety

- Read-only commands (`status`, `decisions`, `preview`, `balance --address`) never load private keys.
- Agent commands only load `AGENT_PRIVATE_KEY`, never `USER_PRIVATE_KEY`.
- User commands only load `USER_PRIVATE_KEY`, never `AGENT_PRIVATE_KEY`.
- `agent tick` defaults to dry-run. Broadcasting requires explicit `--broadcast --yes`.

## Output

- Default: colored, human-readable tables.
- `--json`: single JSON object on stdout; human messages go to stderr.

## Error Codes

| Exit | Meaning |
|------|---------|
| 0 | Success |
| 1 | Generic error |
| 2 | User aborted / confirmation declined |
| 3 | Missing or invalid env variable |
| 4 | RPC error |
| 5 | Transaction reverted |

## Development

```bash
bun test          # Run tests
bun run typecheck # TypeScript check
```
