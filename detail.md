# SerraRWA — Detailed Project Documentation

> Autonomous RWA allocation agent on Base Sepolia. Full hackathon demo monorepo.

---

## 1. Project Overview

**SerraRWA** is an autonomous Real-World Asset (RWA) allocation demo running on **Base Sepolia** (Ethereum L2 testnet). An off-chain TypeScript agent rebalances an ERC-4626 USDC vault across two ERC-4626 underlying vaults via cryptographic signed intents (ECDSA secp256k1). A Next.js 15 dashboard provides real-time visibility into vault state, agent decisions, and allocation history.

### Core Flow

```
User deposits USDC
       │
       ▼
┌─────────────────┐     probes APY      ┌──────────────────┐
│   Vault.sol      │◄───────────────────│  Bun TS Agent     │
│  (ERC-4626)      │                    │  (cron + viem)    │
│                  │──── signed intent ─►│  • strategy.ts    │
│  verify ECDSA    │                    │  • sign.ts         │
│  rebalance funds │                    │  • db.ts (SQLite)  │
└────────┬─────────┘                    └────────┬───────────┘
         │                                       │
         ▼                                       ▼
┌─────────────────┐                    ┌──────────────────┐
│  Next.js 15      │◄─── API /decisions│  Decision Log DB  │
│  Dashboard       │                   │  (Drizzle ORM)    │
│  (wagmi+Privy)   │                   └──────────────────┘
└─────────────────┘
```

---

## 2. Repository Structure

```
project/
├── contracts/              Foundry workspace (Solidity 0.8.24)
│   ├── foundry.toml
│   ├── remappings.txt
│   ├── lib/                forge-std, openzeppelin-contracts, solady
│   ├── src/
│   │   ├── Vault.sol                 ERC-4626 + signed-intent rebalance
│   │   └── interfaces/IAllocator.sol
│   ├── test/
│   │   ├── Vault.t.sol               Foundry unit tests (10 tests)
│   │   └── mocks/
│   │       ├── MockERC4626.sol
│   │       └── MockUSDC.sol
│   └── script/
│       └── Deploy.s.sol
│
├── agent/                  Bun + TypeScript service
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── .env.example
│   ├── src/
│   │   ├── agent.ts                  Cron loop entrypoint
│   │   ├── strategy.ts               Max-APY allocation picker (60/40)
│   │   ├── sign.ts                   ECDSA keccak intent signing
│   │   ├── chain.ts                  viem clients + ABI + address book
│   │   ├── db.ts                     Drizzle schema + SQLite connection
│   │   ├── assets.ts                 Per-network underlying address book
│   │   └── types.ts                  Shared types (Allocation, Intent)
│   └── test/
│       ├── agent.test.ts             Cron / entrypoint tests
│       ├── assets.test.ts            Address book tests
│       ├── chain.test.ts             Viem client tests
│       ├── db.test.ts                Drizzle schema tests
│       ├── sign.test.ts              ECDSA signing tests
│       ├── strategy.test.ts          Allocation logic tests
│       ├── failure.test.ts           Error / edge case tests
│       ├── integration.test.ts       Multi-component integration
│       └── smoke.test.ts             Quick sanity check
│
├── cli/                    Bun + TypeScript CLI tool
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── main.ts                   CLI entrypoint
│   │   ├── config.ts                 Env / address loading
│   │   ├── chain.ts                  Viem client setup
│   │   ├── commands/
│   │   │   ├── agent/                serra agent namespace (5 commands)
│   │   │   │   ├── tick.ts           Trigger rebalance cycle
│   │   │   │   ├── decisions.ts      List agent decisions
│   │   │   │   ├── status.ts         Show agent + vault state
│   │   │   │   ├── stake.ts          Stake tokens
│   │   │   │   └── unstake.ts        Unstake tokens
│   │   │   └── user/                 serra user namespace (5 commands)
│   │   │       ├── balance.ts        Check USDC balance
│   │   │       ├── approve.ts        Approve USDC spend
│   │   │       ├── deposit.ts        Deposit into vault
│   │   │       ├── withdraw.ts       Withdraw from vault
│   │   │       └── preview.ts        Preview deposit/withdraw
│   │   └── utils/
│   │       ├── format.ts             Output formatting
│   │       └── validate.ts           Input validation
│   └── test/                         CLI command tests
│
├── web/                    Next.js 15 App Router
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── .env.example
│   ├── app/
│   │   ├── layout.tsx                Root layout + PrivyProvider
│   │   ├── page.tsx                  Dashboard home (vault overview)
│   │   ├── vault/
│   │   │   ├── [address]/
│   │   │   │   └── page.tsx          Vault detail page
│   │   │   └── activity/
│   │   │       └── page.tsx          Activity feed page
│   │   ├── settings/
│   │   │   └── page.tsx              Settings page (CLI key mgmt)
│   │   └── api/
│   │       ├── vault/                Vault snapshot APIs
│   │       ├── decisions/            SQLite decision log endpoint
│   │       ├── stats/                Aggregated stats endpoint
│   │       ├── snapshot/             Snapshot queries
│   │       ├── preview/              Deposit/withdraw preview
│   │       ├── rebalance/            Trigger rebalance endpoint
│   │       ├── cli/                  CLI key management endpoints
│   │       ├── settings/             Settings CRUD endpoints
│   │       └── agent/                Agent control endpoints
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx           Navigation sidebar
│   │   │   └── Header.tsx            Top header bar
│   │   ├── dashboard/               Dashboard widgets
│   │   ├── vault/                    Vault-specific components
│   │   ├── activity/                 Activity feed components
│   │   ├── charts/                   Recharts-based charts
│   │   ├── settings/                 Settings components
│   │   └── ui/                       Shared UI primitives
│   └── lib/
│       ├── contracts.ts              ABI + address exports
│       ├── wagmi.ts                  Wagmi config
│       ├── privy.ts                  Privy auth config
│       ├── db.ts                     SQLite read access
│       ├── cli-auth.ts               CLI key authorization
│       ├── utils.ts                  Shared utilities
│       └── types.ts                  Frontend types
│
├── docs/
│   ├── superpowers/
│   │   └── specs/
│   │       └── 2026-05-21-agent-rwa-vault-design.md
│   └── superpowers/
│       └── handoff/
│           └── 2026-05-21-superpowers-handoff.md
│
├── openclaw/               OpenClaw AI agent personas
│   ├── SOUL.md                       Lobster agent soul/persona
│   └── persona.md                    Character configuration
│
├── skill/                  Agent skill packs
│   ├── vault-ops/                    Vault operations skill
│   └── rwa-allocator/                RWA allocation strategy
│
├── plan.md                 18-task implementation plan (2028 lines)
├── SESSION.md              Session log 2026-05-23 to 2026-05-25
├── blueprint-mvp.md        MVP blueprint (397 lines)
├── README.md               Project README (131 lines)
├── detail.md               This file — comprehensive docs
└── .gitignore
```

---

## 3. Technology Stack

### Contracts (`contracts/`)

| Category       | Technology                     |
|----------------|--------------------------------|
| Language       | Solidity 0.8.24                |
| Framework      | Foundry                        |
| Standard       | ERC-4626 (Tokenized Vault)     |
| Libraries      | OpenZeppelin Contracts, Solady |
| Signing        | ECDSA secp256k1 (ecrecover)    |
| Test Framework | Forge (Foundry tests)          |
| Network        | Base Sepolia (testnet)         |
| Token          | USDC (6 decimals)              |

### Agent (`agent/`)

| Category       | Technology                     |
|----------------|--------------------------------|
| Runtime        | Bun ≥ 1.3                      |
| Language       | TypeScript                     |
| Blockchain     | viem (lightweight)             |
| Database       | SQLite via Drizzle ORM         |
| Signing        | viem secp256k1 sign + keccak   |
| Scheduling     | setInterval cron loop          |
| Testing        | Bun test (native)              |

### CLI (`cli/`)

| Category       | Technology                     |
|----------------|--------------------------------|
| Runtime        | Bun ≥ 1.3                      |
| Language       | TypeScript                     |
| Blockchain     | viem                           |
| CLI Framework  | Commander.js                   |
| Architecture   | 2 namespaces (agent / user)    |
| Commands       | 10 commands total              |

### Web (`web/`)

| Category       | Technology                     |
|----------------|--------------------------------|
| Framework      | Next.js 15 (App Router)        |
| Runtime        | Node.js ≥ 20                   |
| Language       | TypeScript                     |
| Styling        | Tailwind CSS v4                |
| Auth           | Privy (embedded wallets)       |
| Blockchain     | wagmi + viem                   |
| Charts         | Recharts                       |
| Data Fetching  | SWR                            |
| Database       | better-sqlite3 (read-only)     |
| Package Mgr    | pnpm ≥ 10                      |

---

## 4. Architecture Details

### 4.1 Smart Contract (`Vault.sol`)

Standard **ERC-4626** vault with custom **signed-intent rebalance mechanism**:

- **`deposit()` / `mint()`** — Standard ERC-4626 entry
- **`withdraw()` / `redeem()`** — Standard ERC-4626 exit
- **`rebalance(Intent, bytes signature)`** — Agent-signed reallocation:
  1. Recover signer via `ecrecover(keccak(Intent), signature)`
  2. Verify signer == `agentDid` (agent's EOA address)
  3. Redeem all shares from current underlyings
  4. Re-deposit per new bps allocation

**Intent struct:**
```solidity
struct Intent {
    uint256 nonce;
    uint256 deadline;
    Allocation[] allocations; // {asset, bps}
}
```

**Security invariants:**
- Replay protection via nonce
- Deadline-bounded intents
- Single ECDSA recovery (no replay across chains)
- Allocator interface hook (future extension point)

### 4.2 Agent Service (`agent/src/`)

Runs as a Bun cron loop (default 5-minute interval):

1. **Probe**: Read `totalAssets()` and simulate APY for each whitelisted ERC-4626 underlying
2. **Strategy** (`strategy.ts`): Pick allocation — max 60% per asset, remaining to next best. Min 2 assets.
3. **Sign** (`sign.ts`): Build `Intent` struct → keccak256 hash → ECDSA sign with agent's private key
4. **Submit**: Call `Vault.rebalance(intent, sig)` on-chain
5. **Log** (`db.ts`): Write decision to SQLite via Drizzle

**Database schema (`Drizzle`):**
- `decisions` table: id, txHash, blockNumber, timestamp, allocations, signature, status

### 4.3 CLI Tool (`cli/src/`)

Two namespaces under the `serra` command:

#### `serra agent` — Agent operations
| Command      | Description                          | Safety    |
|-------------|--------------------------------------|-----------|
| `tick`      | Trigger a single rebalance cycle     | dry-run   |
| `decisions` | List past agent decisions            | read-only |
| `status`    | Show vault + agent state             | read-only |
| `stake`     | Stake tokens (future)                | --yes req |
| `unstake`   | Unstake tokens (future)              | --yes req |

#### `serra user` — User operations
| Command    | Description                          | Safety    |
|-----------|--------------------------------------|-----------|
| `balance` | Check USDC balance                   | read-only |
| `approve` | Approve USDC spend for vault         | --yes req |
| `deposit` | Deposit USDC into vault              | --yes req |
| `withdraw`| Withdraw shares from vault           | --yes req |
| `preview` | Preview deposit/withdraw outcome     | read-only |

**Safety constraints:**
- Default dry-run mode for state-changing commands
- `--yes` flag required for broadcast
- Key isolation by role (agent key ≠ user key)

### 4.4 Web Dashboard (`web/app/`)

Pages and their data sources:

| Page                  | Route               | Data Source              |
|-----------------------|---------------------|--------------------------|
| Dashboard Home        | `/`                 | Vault on-chain (wagmi)   |
| Vault Detail          | `/vault/[address]`  | wagmi + API stats        |
| Activity Feed         | `/vault/activity`   | `/api/decisions` (SQLite)|
| Settings              | `/settings`         | `/api/settings` (DB)     |

**API Routes (18 total):**
- `/api/vault/` — Vault contract state
- `/api/decisions/` — Agent decision log from SQLite
- `/api/stats/` — Aggregated statistics
- `/api/snapshot/` — Historical snapshots
- `/api/preview/` — Withdrawal preview
- `/api/rebalance/` — Trigger rebalance
- `/api/cli/` — CLI key management
- `/api/settings/` — User settings CRUD
- `/api/agent/` — Agent control

**Components (29 total):**
- Layout: Sidebar, Header
- Dashboard: Stats cards, vault overview widgets
- Vault: Detail views, performance charts
- Activity: Decision table, status filters, expandable rows
- Charts: APY charts, allocation pie via Recharts
- Settings: Key management, env config
- UI: Shared primitives (buttons, cards, modals, inputs)

---

## 5. Environment Variables

### Contracts (`.env` in `contracts/`)

| Variable                 | Description                        |
|--------------------------|------------------------------------|
| `DEPLOYER_PRIVATE_KEY`   | EOA key for contract deployment    |
| `AGENT_DID_ADDRESS`      | Agent's EOA address (intent signer)|
| `USDC_ADDRESS`           | USDC token on Base Sepolia         |
| `UNDERLYING_1`           | First ERC-4626 underlying address  |
| `UNDERLYING_2`           | Second ERC-4626 underlying address |
| `BASE_SEPOLIA_RPC_URL`   | RPC endpoint for Base Sepolia      |

### Agent (`.env` in `agent/`)

| Variable                 | Description                        |
|--------------------------|------------------------------------|
| `VAULT_ADDRESS`          | Deployed Vault.sol address         |
| `USDC_ADDRESS`           | USDC token address                 |
| `UNDERLYING_1`           | First underlying address           |
| `UNDERLYING_2`           | Second underlying address          |
| `AGENT_PRIVATE_KEY`      | Agent EOA key for intent signing   |
| `RPC_URL`                | Base Sepolia RPC URL               |
| `REBALANCE_INTERVAL_MS`  | Rebalance loop interval (default 300000) |

### Web (`.env.local` in `web/`)

| Variable                    | Description                     |
|-----------------------------|---------------------------------|
| `NEXT_PUBLIC_VAULT_ADDRESS` | Vault contract address          |
| `NEXT_PUBLIC_USDC_ADDRESS`  | USDC token address              |
| `NEXT_PUBLIC_RPC_URL`       | Base Sepolia RPC URL            |
| `NEXT_PUBLIC_WC_PROJECT_ID` | WalletConnect project ID        |
| `AGENT_DB_PATH`             | Path to agent's SQLite DB       |

### CLI (`.env` in `cli/`)

| Variable              | Description                        |
|-----------------------|------------------------------------|
| `RPC_URL`             | Base Sepolia RPC URL               |
| `VAULT_ADDRESS`       | Vault contract address             |
| `USDC_ADDRESS`        | USDC token address                 |
| `AGENT_PRIVATE_KEY`   | Agent key (for agent commands)     |
| `USER_PRIVATE_KEY`    | User key (for user commands)       |

---

## 6. Build & Test Commands

```bash
# === Contracts ===
cd contracts
forge build                # Compile Solidity
forge test -vv             # Run 10 Foundry tests
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast

# === Agent ===
cd agent
bun install                # Install dependencies
bun test                   # Run all 18 tests (unit + integration + smoke)
bun run dev                # Start cron loop

# === CLI ===
cd cli
bun install
bun test
bun run build
serra agent status         # Read-only status check
serra user balance         # Check balance

# === Web ===
cd web
pnpm install
pnpm exec tsc --noEmit     # Type check
pnpm build                 # Production build
pnpm dev                   # Dev server (localhost:3000)
```

---

## 7. Test Coverage

### Agent Tests — 18 passing, 0 failing (434ms)

| File                     | Tests | Description                          |
|--------------------------|-------|--------------------------------------|
| `agent.test.ts`          |   3   | Cron loop entrypoint behavior        |
| `assets.test.ts`         |   2   | Address book per-network resolution  |
| `chain.test.ts`          |   2   | Viem client + ABI validation         |
| `db.test.ts`             |   3   | Drizzle schema, CRUD operations      |
| `sign.test.ts`           |   3   | ECDSA signing + intent hashing       |
| `strategy.test.ts`       |   3   | Allocation logic (60/40 cap)         |
| `failure.test.ts`        |   2   | Error / edge case handling           |
| `integration.test.ts`    |   1   | Multi-component integration          |
| `smoke.test.ts`          |   1   | Quick sanity check                   |

### Contract Tests — 10 Foundry tests

Covers: deposit, withdraw, rebalance (happy + revert paths), share calculation, intent verification, nonce replay protection.

---

## 8. Current Status (2026-06-04)

### Last Commit
```
e5c5679 feat(web): Risk Center + Copilot Analytics + Demo Readiness + sidebar reorganization
```

### Modified Files (unstaged)
- `.gitignore` — Updated ignore rules
- `SESSION.md` — Session log entries
- `agent/src/agent.ts` — Agent cron loop updates
- `agent/src/chain.ts` — Chain config changes
- `web/.env.example` — New env var additions
- `web/.gitignore` — Web ignore updates
- `web/app/settings/page.tsx` — Settings page
- `web/components/layout/Sidebar.tsx` — Sidebar reorg

### New Untracked Files
- `agent/test/failure.test.ts` — Failure mode tests
- `agent/test/integration.test.ts` — Integration test
- `agent/test/smoke.test.ts` — Smoke test
- `cli/` — Complete CLI tool (26 files)
- `openclaw/` — OpenClaw AI agent personas (2 files)
- `skill/` — Agent skill packs (2 directories)
- `web/app/api/cli/` — CLI key management API
- `web/app/api/settings/` — Settings CRUD API
- `web/components/settings/` — Settings UI components
- `web/lib/cli-auth.ts` — CLI auth library
- `web/lib/db.ts` — Database access library

### Diagnostics
- **agent/**: `tsc --noEmit` clean, LSP clean
- **web/**: LSP clean on Sidebar.tsx, settings/page.tsx

---

## 9. Design Decisions

1. **ECDSA over Ed25519**: Chose secp256k1 for native `ecrecover` compatibility vs Ed25519 DID-native flow. Single on-chain recovery call, no precompile dependency.

2. **60/40 allocation cap**: Maximum 60% to any single underlying prevents concentration risk even under strategy changes.

3. **Kill switch**: `Vault.pause()` / `Vault.unpause()` controlled by vault owner for emergency shutdown.

4. **Agent key isolation**: Agent signing key is separate from deploy key, user key, and vault owner. Compromise of agent key only allows submitting intents (still bounded by nonce + deadline).

5. **SQLite for decision log**: Lightweight, zero-config persistence. No server dependency. Dashboard reads directly from agent's DB file.

6. **Monorepo structure**: Colocated contracts, agent, CLI, and web for single checkout + demo workflow.

---

## 10. Roadmap (from plan.md)

The [plan.md](./plan.md) contains 18 tasks organized as:

| Phase     | Tasks | Status         |
|-----------|-------|----------------|
| 0. Setup  | 1-2   | ✅ Complete    |
| 1. Core   | 3-7   | ✅ Complete    |
| 2. Agent  | 8-12  | ✅ Complete    |
| 3. Web    | 13-16 | ✅ Complete    |
| 4. Deploy | 17-18 | 🚧 In Progress |

Current focus: CLI toolship, demo readiness, settings page, risk center + copilot analytics.

---

## 11. Key Contract Addresses (Base Sepolia)

Deployed contract addresses (populate after deployment):

| Contract        | Address |
|-----------------|---------|
| Vault.sol       | TBD     |
| USDC            | TBD     |
| Underlying 1    | TBD     |
| Underlying 2    | TBD     |
| Agent DID       | TBD     |

---

## 12. License

MIT — Unaudited demo. Base Sepolia testnet only.
