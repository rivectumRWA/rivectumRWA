# Agent RWA Vault — Design Spec (Hackathon Mode)

**Date:** 2026-05-21
**Status:** Approved — ready for implementation plan
**Mode:** Hackathon-tight portfolio piece. No real deadline; "hackathon mode" = operating style only (ship fast, scope ruthlessly, demo-grade quality).

---

## 1. Goal

Working end-to-end demo of an **agent-managed RWA-style yield vault on Base**:

- Users deposit USDC into an ERC-4626 vault.
- An off-chain TypeScript agent reads APYs from 2 ERC-4626 underlyings, signs an allocation intent (ECDSA / secp256k1 — see §10), and submits an on-chain `rebalance` call.
- The vault verifies the signature and rebalances within per-asset caps.
- A dashboard shows vault state, allocation pie, and recent agent decisions.

Demo target: judge / viewer on Twitter/Farcaster sees a deposit → automatic rebalance → withdrawal flow within ~10 minutes of opening the dashboard.

---

## 2. Non-goals (explicitly cut)

- ❌ Multi-agent factory / multi-vault deployment
- ❌ FeeToken / agent-labor-stream RWA (interpretation D) — pitched as roadmap only, no contract
- ❌ Real multisig (single EOA owner is fine for demo)
- ❌ External audit (Slither + foundry tests + 1 self-review)
- ❌ gitlawb integration (dropped — was stretch goal when hackathon assumed; now portfolio piece, no narrative requirement)
- ❌ IPFS allocation log mirroring
- ❌ Risk-weighted allocation mode (v0 = pure max-APY only)
- ❌ Mainnet deploy as launch target (testnet only; mainnet is stretch)
- ❌ Yearn V3 fork (too heavy for scope; OZ ERC4626 + Solady utils is enough)

---

## 3. Architecture

```
User wallet ──deposit USDC──▶ Vault.sol (ERC-4626)
                                    │
                                    ├── totalAssets() reads underlying balances
                                    │
Agent (TS cron) ─sign intent──▶ Vault.rebalance(intent, sig)
                                    │
                                    ├──▶ Underlying A (e.g., aUSDC on Aave Base)
                                    └──▶ Underlying B (e.g., Morpho USDC vault)

Agent ──log──▶ SQLite ──read──▶ Next.js API ──▶ Dashboard UI
```

### 3.1 Components

| # | Component | Tech | Responsibility |
|---|---|---|---|
| 1 | `Vault.sol` | Solidity, OZ ERC4626 + Solady | Custody USDC, mint/burn shares, verify agent intent signatures, enforce caps, execute deposits/withdraws on underlyings |
| 2 | `IAllocator` interface | Solidity | Forward-compat hook for future strategy swaps without contract redeploy (interface-only; no impl in v0) |
| 3 | Agent service | Bun + TypeScript, viem | Cron every 5 min: read APYs, pick allocation, ECDSA sign intent, submit tx, log to SQLite |
| 4 | Storage | SQLite via Drizzle ORM | Local persistence of agent decisions and tx receipts |
| 5 | Dashboard | Next.js (App Router) + wagmi + RainbowKit | Connect wallet, deposit/withdraw, render vault state + decision log, deploy to Vercel |

### 3.2 Data flow

1. **Deposit:** User calls `vault.deposit(usdcAmount, receiver)`. USDC pulled, shares minted at current `pricePerShare`. USDC sits in vault until next rebalance.
2. **Rebalance (agent loop):**
   1. Agent reads current underlying APYs (via `previewDeposit` rate-change probing or hardcoded view calls).
   2. Agent computes target allocation `[{asset, bps}, ...]` summing to 10000 bps.
   3. Agent constructs intent `{nonce, deadline, allocations[]}`, hashes it, ECDSA-signs (secp256k1).
   4. Agent calls `vault.rebalance(intent, sig)`.
   5. Vault recovers signer pubkey, checks `== agentDid`, checks nonce + deadline, enforces per-asset cap (e.g., max 60% per underlying), executes deposits/withdraws on underlyings, emits `AllocationExecuted(intentHash, allocations)`.
   6. Agent logs result to SQLite.
3. **Withdraw:** User calls `vault.withdraw(shares, receiver, owner)`. Vault may need to pull from underlyings if vault USDC balance insufficient. Burns shares.

---

## 4. Key contract surface (sketch)

```solidity
// Vault.sol
contract Vault is ERC4626, Owned {
    address public agentDid;        // ECDSA signer address (secp256k1)
    uint256 public nextNonce;       // monotonic, prevents replay
    uint16 public constant MAX_BPS_PER_ASSET = 6000;  // 60%
    address[] public underlyings;   // whitelisted ERC-4626 USDC vaults
    bool public paused;

    struct Allocation { address asset; uint16 bps; }
    struct Intent { uint256 nonce; uint64 deadline; Allocation[] allocations; }

    event AllocationExecuted(bytes32 indexed intentHash, Allocation[] allocations);
    event AgentRotated(address indexed oldDid, address indexed newDid);
    event Paused(bool paused);

    function rebalance(Intent calldata intent, bytes calldata sig) external whenNotPaused {
        require(intent.nonce == nextNonce, "BAD_NONCE");
        require(block.timestamp <= intent.deadline, "EXPIRED");
        bytes32 h = _hashIntent(intent);
        require(_verify(h, sig, agentDid), "BAD_SIG");
        nextNonce++;
        _execute(intent.allocations);
        emit AllocationExecuted(h, intent.allocations);
    }

    // owner-only: setAgentDid, setUnderlyings, pause, unpause, emergencyWithdrawAll
}
```

Notes:
- `_verify` uses native `ecrecover` (secp256k1). See §10 for why we deviate from the earlier Ed25519 framing.
- Per-asset cap is a static constant in v0; owner-tunable in v1.

---

## 5. Underlying asset selection

**Final picks deferred to implementation time** — verify on Basescan before coding:

| Slot | Candidate (priority order) |
|---|---|
| A | Aave V3 aUSDC on Base · Morpho Blue USDC vault · sUSDS |
| B | Morpho Blue USDC vault · sDAI bridged · Sky USDS |

**Acceptance criteria per pick:**
- Verified contract on Base Sepolia (or Base mainnet if Sepolia equivalent missing)
- Standard ERC-4626 surface (`deposit`, `withdraw`, `previewRedeem`, `convertToAssets`)
- Non-zero TVL or active testnet liquidity
- USDC as underlying (no decimal mismatch handling in v0)

If only 1 viable underlying exists on Base Sepolia at code time → demo runs with 1 underlying + idle USDC as the "second slot." Document.

---

## 6. File layout

```
project/
├── contracts/                  Foundry
│   ├── foundry.toml
│   ├── src/
│   │   ├── Vault.sol
│   │   └── interfaces/IAllocator.sol
│   ├── test/Vault.t.sol
│   └── script/Deploy.s.sol
│
├── agent/                      Bun + TypeScript
│   ├── package.json
│   ├── src/
│   │   ├── agent.ts            cron entrypoint
│   │   ├── strategy.ts         max-APY selector
│   │   ├── sign.ts             intent signing
│   │   ├── chain.ts            viem clients + abi
│   │   ├── db.ts               Drizzle + SQLite schema
│   │   └── assets.ts           underlying address book per network
│   └── drizzle.config.ts
│
├── web/                        Next.js (App Router)
│   ├── package.json
│   ├── app/
│   │   ├── page.tsx            dashboard
│   │   ├── api/decisions/route.ts
│   │   └── layout.tsx
│   ├── lib/wagmi.ts
│   └── components/
│       ├── DepositCard.tsx
│       ├── AllocationPie.tsx
│       └── ActivityFeed.tsx
│
├── docs/superpowers/specs/2026-05-21-agent-rwa-vault-design.md   (this file)
└── README.md
```

---

## 7. Test plan (hackathon-tight)

### 7.1 Foundry (`contracts/test/Vault.t.sol`)

| Test | Asserts |
|---|---|
| `test_deposit_mints_shares` | 1:1 share mint on first deposit |
| `test_withdraw_burns_shares` | full + partial withdrawal works |
| `test_rebalance_happy_path` | valid sig + valid allocations → executes, emits event |
| `test_rebalance_rejects_bad_sig` | wrong signer → revert `BAD_SIG` |
| `test_rebalance_rejects_replay` | reused nonce → revert `BAD_NONCE` |
| `test_rebalance_rejects_expired` | past deadline → revert `EXPIRED` |
| `test_rebalance_enforces_cap` | allocation > 60% to one asset → revert |
| `test_pause_blocks_rebalance` | paused → revert |
| `test_emergency_withdraw_all` | owner can yank all funds back to vault USDC |

### 7.2 Agent unit tests (`agent/test/`)

- Strategy picker: given mock APY array → returns expected allocation
- Sign/verify roundtrip: sign intent → recover same signer
- DB writes: insert decision → read back

### 7.3 E2E manual (documented in README)

```
1. forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
2. cd agent && bun run dev
3. cd web && pnpm dev
4. Open http://localhost:3000 → connect wallet → deposit 100 USDC test
5. Wait 5 min → observe AllocationExecuted event in agent logs
6. Refresh dashboard → see allocation pie shift
7. Withdraw → confirm balance returns
```

### 7.4 What we're not testing

- Cross-chain bridging (none)
- Reentrancy attacks beyond OZ defaults (low surface)
- Gas optimization (acceptable: testnet)
- Frontend visual regression (manual eye check)

---

## 8. Risks accepted

| Risk | Mitigation | Why acceptable |
|---|---|---|
| Agent key in `.env` | Single point of compromise | Testnet only; rotation via owner-only `setAgentDid` |
| No upgrade pattern | Bug fix = redeploy | Demo scope; users would re-deposit |
| Naive APY signal | `previewDeposit` rate change may mislead | Document caveat in README; viewers understand demo |
| Sepolia liquidity thin | Underlying may behave oddly | Pick underlyings with verified active testnet, fallback to mocked underlying for demo |
| Single agent DID | No fallback if agent down | Owner can `pause` + `emergencyWithdrawAll` |
| ECDSA not Ed25519 | Deviation from initial framing | Cheaper on-chain verify; document explicitly in README §Architecture-deviations |

---

## 9. Out-of-scope future work (roadmap mentions only)

- Multi-vault factory + per-strategy isolated vaults
- FeeToken (D): tokenize agent's protocol-fee stream as standalone ERC-4626
- gitlawb commit-signing of allocation history → public auditable repo
- IPFS mirror of intent + receipt
- Risk-aware mode 2 (peg health, attestation freshness, drawdown limits)
- Real multisig (Safe) ownership
- Live mainnet deploy with audit

---

## 10. Architecture deviations from earlier discussion

Locked during brainstorming, deviated during scope-cut to hackathon mode:

1. **Triple-mode storage** (gitlawb + IPFS + VPS) → **single-mode SQLite local**. Rationale: all 3 are demo-irrelevant; SQLite + Next API gives same UX with zero infra.
2. **Ed25519 agent DID** → **ECDSA / secp256k1**. Rationale: cheap native `ecrecover` on EVM; Ed25519 needs precompile or library bytecode. DID concept preserved (same key = same identity), curve changes only.
3. **2-of-3 multisig** → **single EOA owner**. Rationale: testnet demo, no real value at risk, Safe setup is half a day we don't have.
4. **Tier-1 + Tier-2 four assets (USDY, USDM, sDAI, sUSDe)** → **2 ERC-4626 USDC underlyings TBD at code time**. Rationale: most original picks are not native on Base or have weak Sepolia presence; switching to "pick best 2 verifiable USDC ERC-4626 vaults on Base Sepolia" makes integration tractable.

---

## 11. Acceptance criteria for "demo done"

- [ ] Vault deployed to Base Sepolia, address pinned in README
- [ ] Agent service running locally, rebalances within 10 min of deposit
- [ ] Dashboard live on Vercel, connectable via Coinbase Wallet / MetaMask / RainbowKit
- [ ] All 9 Foundry tests passing
- [ ] README has 5-step reproducible setup
- [ ] One recorded screen capture (gif or mp4) of full deposit → rebalance → withdraw flow

When all 6 boxes ticked → "demo done." Anything beyond is bonus.
