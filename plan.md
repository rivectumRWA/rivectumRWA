# Agent RWA Vault — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working Base Sepolia demo of an ERC-4626 USDC vault that an off-chain TS agent rebalances across 2 ERC-4626 underlyings via signed intents, with a Next.js dashboard.

**Architecture:** Foundry contracts + Bun TS agent (cron + viem) + Next.js dashboard (wagmi/RainbowKit). SQLite via Drizzle for agent decision log. ECDSA secp256k1 for intent signing (native `ecrecover`).

**Tech Stack:** Solidity (OZ ERC4626 + Solady), Foundry, TypeScript, Bun, viem, Drizzle, SQLite, Next.js (App Router), wagmi, RainbowKit, Vercel.

**Spec:** [docs/superpowers/specs/2026-05-21-agent-rwa-vault-design.md](file:///D:/Develope/gitrwa/project/docs/superpowers/specs/2026-05-21-agent-rwa-vault-design.md)

---

## File Structure

```
project/
├── contracts/                  Foundry workspace
│   ├── foundry.toml
│   ├── remappings.txt
│   ├── lib/                    forge-std, openzeppelin-contracts, solady (git submodules)
│   ├── src/
│   │   ├── Vault.sol           ERC4626 vault, intent verification, rebalance executor
│   │   └── interfaces/IAllocator.sol   future-compat hook (interface only, no impl)
│   ├── test/Vault.t.sol        all 9 foundry tests
│   ├── test/mocks/MockERC4626.sol  mock underlying for unit tests
│   ├── test/mocks/MockUSDC.sol     6-decimal mock token
│   └── script/Deploy.s.sol     deploy script for Base Sepolia
│
├── agent/                      Bun + TS service
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── .env.example
│   ├── src/
│   │   ├── agent.ts            cron entrypoint
│   │   ├── strategy.ts         max-APY allocation selector
│   │   ├── sign.ts             ECDSA intent signing
│   │   ├── chain.ts            viem clients, ABI, address book
│   │   ├── db.ts               Drizzle schema + connection
│   │   ├── assets.ts           per-network underlying address book
│   │   └── types.ts            shared Allocation/Intent types
│   └── test/
│       ├── strategy.test.ts
│       ├── sign.test.ts
│       └── db.test.ts
│
├── web/                        Next.js App Router
│   ├── package.json
│   ├── next.config.mjs
│   ├── tsconfig.json
│   ├── .env.example
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            dashboard
│   │   ├── providers.tsx       wagmi + RainbowKit
│   │   └── api/decisions/route.ts   reads SQLite, returns last 50
│   ├── lib/
│   │   ├── wagmi.ts
│   │   └── abi.ts              vault ABI mirror
│   └── components/
│       ├── DepositCard.tsx
│       ├── WithdrawCard.tsx
│       ├── AllocationPie.tsx
│       └── ActivityFeed.tsx
│
├── docs/superpowers/specs/2026-05-21-agent-rwa-vault-design.md
├── plan.md                     this file
├── README.md                   user-facing setup + acceptance demo steps
└── .gitignore
```

---

## Conventions

- Solidity 0.8.24, optimizer 200 runs, via-ir off.
- Foundry tests use `forge-std/Test.sol`.
- TypeScript strict mode everywhere. No `any`.
- Commit message format: conventional (`feat:`, `test:`, `chore:`, `docs:`).
- One commit per task (after final step).
- All secrets in `.env`, never committed. `.env.example` checked in.
- Per-asset cap constant: `MAX_BPS_PER_ASSET = 6000` (60%).
- BPS sum invariant: allocations always sum to 10000 bps; remainder stays as idle USDC.

---

## Task 0: Repo bootstrap

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `contracts/foundry.toml`
- Create: `contracts/remappings.txt`

- [ ] **Step 1: Init git + .gitignore**

```gitignore
# build
contracts/out/
contracts/cache/
contracts/broadcast/
agent/node_modules/
agent/dist/
agent/*.db
agent/*.db-*
web/node_modules/
web/.next/

# secrets
**/.env
!**/.env.example

# os
.DS_Store
Thumbs.db
```

- [ ] **Step 2: Stub README**

```markdown
# Agent RWA Vault — Hackathon Demo

ERC-4626 USDC vault on Base Sepolia, rebalanced by a TypeScript agent via signed intents.

## Setup

1. `cd contracts && forge install && forge build`
2. `cd agent && bun install && cp .env.example .env && bun run db:migrate`
3. `cd web && pnpm install && cp .env.example .env.local`

(Full instructions appear after deployment.)
```

- [ ] **Step 3: Init Foundry workspace**

```bash
cd contracts
forge init --no-commit --force .
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install Vectorized/solady --no-commit
```

`contracts/foundry.toml`:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
test = "test"
script = "script"
solc = "0.8.24"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
base_sepolia = "${BASE_SEPOLIA_RPC_URL}"

[etherscan]
base_sepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }
```

`contracts/remappings.txt`:
```
@openzeppelin/=lib/openzeppelin-contracts/
solady/=lib/solady/src/
forge-std/=lib/forge-std/src/
```

- [ ] **Step 4: Verify build**

Run: `cd contracts && forge build`
Expected: `Compiler run successful` (no source files yet, so just toolchain check)

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: bootstrap repo, foundry workspace, oz/solady deps"
```

---

## Task 1: Mock USDC + Mock ERC-4626 underlying

**Files:**
- Create: `contracts/test/mocks/MockUSDC.sol`
- Create: `contracts/test/mocks/MockERC4626.sol`

- [ ] **Step 1: Write MockUSDC**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

- [ ] **Step 2: Write MockERC4626**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockERC4626 is ERC4626 {
    constructor(IERC20 asset_, string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
        ERC4626(asset_)
    {}

    /// @dev test helper to simulate yield accrual (donate underlying to vault)
    function simulateYield(uint256 amount) external {
        IERC20(asset()).transferFrom(msg.sender, address(this), amount);
    }
}
```

- [ ] **Step 3: Build**

Run: `cd contracts && forge build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add contracts/test/mocks/
git commit -m "test: add MockUSDC and MockERC4626 fixtures"
```

---

## Task 2: Vault skeleton + first failing test (deposit/mint)

**Files:**
- Create: `contracts/src/Vault.sol`
- Create: `contracts/src/interfaces/IAllocator.sol`
- Create: `contracts/test/Vault.t.sol`

- [ ] **Step 1: Write IAllocator interface (no impl yet)**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Forward-compat hook for swappable strategies. Not used in v0.
interface IAllocator {
    struct Allocation { address asset; uint16 bps; }
    function execute(Allocation[] calldata allocations) external;
}
```

- [ ] **Step 2: Write Vault skeleton**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC4626, IERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Vault is ERC4626, Ownable, ReentrancyGuard {
    struct Allocation { address asset; uint16 bps; }
    struct Intent {
        uint256 nonce;
        uint64 deadline;
        Allocation[] allocations;
    }

    address public agentDid;
    uint256 public nextNonce;
    bool public paused;

    uint16 public constant MAX_BPS_PER_ASSET = 6000; // 60%
    uint16 public constant TOTAL_BPS = 10000;

    mapping(address => bool) public isUnderlying;
    address[] public underlyings;

    event AllocationExecuted(bytes32 indexed intentHash, Allocation[] allocations);
    event AgentRotated(address indexed oldDid, address indexed newDid);
    event Paused(bool paused);
    event UnderlyingAdded(address indexed asset);

    error BadNonce();
    error Expired();
    error BadSig();
    error PausedErr();
    error CapExceeded();
    error NotWhitelisted();
    error BpsSumInvalid();

    constructor(IERC20 asset_, address owner_, address agentDid_)
        ERC20("Agent RWA Vault", "arwaUSDC")
        ERC4626(asset_)
        Ownable(owner_)
    {
        agentDid = agentDid_;
    }

    modifier whenNotPaused() {
        if (paused) revert PausedErr();
        _;
    }

    function setAgentDid(address newDid) external onlyOwner {
        emit AgentRotated(agentDid, newDid);
        agentDid = newDid;
    }

    function addUnderlying(address asset_) external onlyOwner {
        require(!isUnderlying[asset_], "exists");
        isUnderlying[asset_] = true;
        underlyings.push(asset_);
        emit UnderlyingAdded(asset_);
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit Paused(p);
    }

    // rebalance + _execute + _hashIntent + _verify implemented in later tasks
}
```

- [ ] **Step 3: Write failing test for deposit**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {Vault} from "../src/Vault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockERC4626} from "./mocks/MockERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VaultTest is Test {
    Vault internal vault;
    MockUSDC internal usdc;
    MockERC4626 internal under1;
    MockERC4626 internal under2;

    address internal owner = address(0xA11CE);
    address internal agentEoa;
    uint256 internal agentPk = 0xA9E47;
    address internal user = address(0xB0B);

    function setUp() public {
        agentEoa = vm.addr(agentPk);
        usdc = new MockUSDC();
        vm.prank(owner);
        vault = new Vault(IERC20(address(usdc)), owner, agentEoa);
        under1 = new MockERC4626(IERC20(address(usdc)), "U1", "U1");
        under2 = new MockERC4626(IERC20(address(usdc)), "U2", "U2");
        vm.startPrank(owner);
        vault.addUnderlying(address(under1));
        vault.addUnderlying(address(under2));
        vm.stopPrank();

        usdc.mint(user, 1_000_000e6);
    }

    function test_deposit_mints_shares() public {
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        uint256 shares = vault.deposit(100e6, user);
        vm.stopPrank();

        assertEq(shares, 100e6, "1:1 first deposit");
        assertEq(vault.balanceOf(user), 100e6);
        assertEq(usdc.balanceOf(address(vault)), 100e6);
    }
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `cd contracts && forge test --match-test test_deposit_mints_shares -vv`
Expected: PASS (OZ ERC4626 handles deposit out of the box)

- [ ] **Step 5: Commit**

```bash
git add contracts/src/ contracts/test/Vault.t.sol
git commit -m "feat(vault): scaffold Vault contract + deposit test"
```

---

## Task 3: Withdraw test

**Files:**
- Modify: `contracts/test/Vault.t.sol`

- [ ] **Step 1: Add withdraw test**

Append to `VaultTest`:
```solidity
function test_withdraw_burns_shares() public {
    vm.startPrank(user);
    usdc.approve(address(vault), 100e6);
    vault.deposit(100e6, user);

    uint256 assets = vault.withdraw(40e6, user, user);
    vm.stopPrank();

    assertEq(assets, 40e6);
    assertEq(vault.balanceOf(user), 60e6);
    assertEq(usdc.balanceOf(user), 1_000_000e6 - 100e6 + 40e6);
}
```

- [ ] **Step 2: Run**

Run: `forge test --match-test test_withdraw_burns_shares -vv`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add contracts/test/Vault.t.sol
git commit -m "test(vault): withdraw burns shares"
```

---

## Task 4: Intent hash + ECDSA verify

**Files:**
- Modify: `contracts/src/Vault.sol`

- [ ] **Step 1: Failing test for hashing**

Append to `VaultTest`:
```solidity
using stdStorage for StdStorage;

function _makeIntent(uint16 bps1, uint16 bps2)
    internal
    view
    returns (Vault.Intent memory)
{
    Vault.Allocation[] memory allocs = new Vault.Allocation[](2);
    allocs[0] = Vault.Allocation({asset: address(under1), bps: bps1});
    allocs[1] = Vault.Allocation({asset: address(under2), bps: bps2});
    return Vault.Intent({
        nonce: vault.nextNonce(),
        deadline: uint64(block.timestamp + 1 hours),
        allocations: allocs
    });
}

function _signIntent(Vault.Intent memory intent)
    internal
    view
    returns (bytes memory sig, bytes32 digest)
{
    digest = vault.hashIntent(intent);
    bytes32 ethSigned = keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32", digest)
    );
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentPk, ethSigned);
    sig = abi.encodePacked(r, s, v);
}

function test_hashIntent_isDeterministic() public {
    Vault.Intent memory i = _makeIntent(5000, 5000);
    bytes32 h1 = vault.hashIntent(i);
    bytes32 h2 = vault.hashIntent(i);
    assertEq(h1, h2);
}
```

- [ ] **Step 2: Run, expect FAIL (`hashIntent` undefined)**

Run: `forge test --match-test test_hashIntent_isDeterministic -vv`
Expected: FAIL (compile error)

- [ ] **Step 3: Implement hashIntent + _verify**

Add to `Vault.sol`:
```solidity
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// inside contract:
function hashIntent(Intent calldata intent) external view returns (bytes32) {
    return _hashIntent(intent);
}

function _hashIntent(Intent memory intent) internal view returns (bytes32) {
    bytes32 allocsHash;
    {
        bytes memory packed;
        for (uint256 i = 0; i < intent.allocations.length; i++) {
            packed = abi.encodePacked(
                packed,
                intent.allocations[i].asset,
                intent.allocations[i].bps
            );
        }
        allocsHash = keccak256(packed);
    }
    return keccak256(abi.encode(
        block.chainid,
        address(this),
        intent.nonce,
        intent.deadline,
        allocsHash
    ));
}

function _verify(bytes32 digest, bytes calldata sig) internal view returns (bool) {
    bytes32 ethSigned = MessageHashUtils.toEthSignedMessageHash(digest);
    address recovered = ECDSA.recover(ethSigned, sig);
    return recovered == agentDid;
}
```

Note: `_hashIntent` takes `memory` to allow internal helpers; `hashIntent` external uses `calldata`. Add overload:
```solidity
function _hashIntent(Intent calldata intent) internal view returns (bytes32) {
    Intent memory m = intent;
    return _hashIntent(m);
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `forge test --match-test test_hashIntent_isDeterministic -vv`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add contracts/src/Vault.sol contracts/test/Vault.t.sol
git commit -m "feat(vault): intent hashing + ECDSA verification"
```

---

## Task 5: Rebalance happy path

**Files:**
- Modify: `contracts/src/Vault.sol`
- Modify: `contracts/test/Vault.t.sol`

- [ ] **Step 1: Failing test**

```solidity
function test_rebalance_happy_path() public {
    vm.startPrank(user);
    usdc.approve(address(vault), 100e6);
    vault.deposit(100e6, user);
    vm.stopPrank();

    Vault.Intent memory intent = _makeIntent(5000, 4000); // 90% allocated, 10% idle
    (bytes memory sig, bytes32 digest) = _signIntent(intent);

    vault.rebalance(intent, sig);

    assertEq(under1.balanceOf(address(vault)) > 0, true);
    assertEq(under2.balanceOf(address(vault)) > 0, true);
    assertApproxEqAbs(usdc.balanceOf(address(vault)), 10e6, 1);
    assertEq(vault.nextNonce(), 1);
}
```

- [ ] **Step 2: Run, expect FAIL**

Run: `forge test --match-test test_rebalance_happy_path -vv`
Expected: FAIL (`rebalance` undefined)

- [ ] **Step 3: Implement rebalance + _execute**

Add to `Vault.sol`:
```solidity
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

using SafeERC20 for IERC20;

function rebalance(Intent calldata intent, bytes calldata sig)
    external
    whenNotPaused
    nonReentrant
{
    if (intent.nonce != nextNonce) revert BadNonce();
    if (block.timestamp > intent.deadline) revert Expired();

    bytes32 digest = _hashIntent(intent);
    if (!_verify(digest, sig)) revert BadSig();

    uint256 sumBps;
    for (uint256 i = 0; i < intent.allocations.length; i++) {
        Allocation calldata a = intent.allocations[i];
        if (!isUnderlying[a.asset]) revert NotWhitelisted();
        if (a.bps > MAX_BPS_PER_ASSET) revert CapExceeded();
        sumBps += a.bps;
    }
    if (sumBps > TOTAL_BPS) revert BpsSumInvalid();

    nextNonce++;
    _execute(intent.allocations);

    emit AllocationExecuted(digest, intent.allocations);
}

function _execute(Allocation[] calldata allocations) internal {
    // 1. Pull all funds back to vault as USDC
    for (uint256 i = 0; i < underlyings.length; i++) {
        IERC4626 u = IERC4626(underlyings[i]);
        uint256 bal = u.balanceOf(address(this));
        if (bal > 0) {
            u.redeem(bal, address(this), address(this));
        }
    }

    // 2. Allocate fresh
    uint256 totalUsdc = IERC20(asset()).balanceOf(address(this));
    for (uint256 i = 0; i < allocations.length; i++) {
        Allocation calldata a = allocations[i];
        uint256 amount = (totalUsdc * a.bps) / TOTAL_BPS;
        if (amount == 0) continue;
        IERC20(asset()).forceApprove(a.asset, amount);
        IERC4626(a.asset).deposit(amount, address(this));
    }
}

function totalAssets() public view override returns (uint256) {
    uint256 idle = IERC20(asset()).balanceOf(address(this));
    uint256 deployed;
    for (uint256 i = 0; i < underlyings.length; i++) {
        IERC4626 u = IERC4626(underlyings[i]);
        uint256 sh = u.balanceOf(address(this));
        if (sh > 0) deployed += u.previewRedeem(sh);
    }
    return idle + deployed;
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `forge test --match-test test_rebalance_happy_path -vv`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add contracts/src/Vault.sol contracts/test/Vault.t.sol
git commit -m "feat(vault): rebalance executes signed allocations"
```

---

## Task 6: Rebalance security tests (sig, replay, expiry, cap)

**Files:**
- Modify: `contracts/test/Vault.t.sol`

- [ ] **Step 1: Add 4 tests**

```solidity
function test_rebalance_rejects_bad_sig() public {
    Vault.Intent memory intent = _makeIntent(5000, 4000);
    bytes memory badSig = new bytes(65);
    vm.expectRevert(Vault.BadSig.selector);
    vault.rebalance(intent, badSig);
}

function test_rebalance_rejects_replay() public {
    vm.startPrank(user);
    usdc.approve(address(vault), 100e6);
    vault.deposit(100e6, user);
    vm.stopPrank();

    Vault.Intent memory intent = _makeIntent(5000, 4000);
    (bytes memory sig,) = _signIntent(intent);
    vault.rebalance(intent, sig);
    vm.expectRevert(Vault.BadNonce.selector);
    vault.rebalance(intent, sig);
}

function test_rebalance_rejects_expired() public {
    Vault.Intent memory intent = _makeIntent(5000, 4000);
    intent.deadline = uint64(block.timestamp - 1);
    (bytes memory sig,) = _signIntent(intent);
    vm.expectRevert(Vault.Expired.selector);
    vault.rebalance(intent, sig);
}

function test_rebalance_enforces_cap() public {
    Vault.Intent memory intent = _makeIntent(7000, 3000); // 70% > 60% cap
    (bytes memory sig,) = _signIntent(intent);
    vm.expectRevert(Vault.CapExceeded.selector);
    vault.rebalance(intent, sig);
}
```

- [ ] **Step 2: Run all 4, expect PASS**

Run: `forge test --match-contract VaultTest -vv`
Expected: 4 new tests PASS, all existing PASS

- [ ] **Step 3: Commit**

```bash
git add contracts/test/Vault.t.sol
git commit -m "test(vault): security tests for sig/replay/expiry/cap"
```

---

## Task 7: Pause + emergency withdraw

**Files:**
- Modify: `contracts/src/Vault.sol`
- Modify: `contracts/test/Vault.t.sol`

- [ ] **Step 1: Failing tests**

```solidity
function test_pause_blocks_rebalance() public {
    vm.prank(owner);
    vault.setPaused(true);
    Vault.Intent memory intent = _makeIntent(5000, 4000);
    (bytes memory sig,) = _signIntent(intent);
    vm.expectRevert(Vault.PausedErr.selector);
    vault.rebalance(intent, sig);
}

function test_emergency_withdraw_all() public {
    vm.startPrank(user);
    usdc.approve(address(vault), 100e6);
    vault.deposit(100e6, user);
    vm.stopPrank();

    Vault.Intent memory intent = _makeIntent(5000, 4000);
    (bytes memory sig,) = _signIntent(intent);
    vault.rebalance(intent, sig);

    vm.prank(owner);
    vault.emergencyWithdrawAll();

    assertEq(under1.balanceOf(address(vault)), 0);
    assertEq(under2.balanceOf(address(vault)), 0);
    assertGt(usdc.balanceOf(address(vault)), 99e6);
}
```

- [ ] **Step 2: Run, expect FAIL on emergencyWithdrawAll**

Run: `forge test --match-test test_emergency_withdraw_all -vv`
Expected: FAIL (`emergencyWithdrawAll` undefined)

- [ ] **Step 3: Implement emergencyWithdrawAll**

Add to `Vault.sol`:
```solidity
function emergencyWithdrawAll() external onlyOwner {
    for (uint256 i = 0; i < underlyings.length; i++) {
        IERC4626 u = IERC4626(underlyings[i]);
        uint256 bal = u.balanceOf(address(this));
        if (bal > 0) u.redeem(bal, address(this), address(this));
    }
}
```

- [ ] **Step 4: Run, expect both PASS**

Run: `forge test --match-contract VaultTest -vv`
Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add contracts/src/Vault.sol contracts/test/Vault.t.sol
git commit -m "feat(vault): pause + emergency withdraw"
```

---

## Task 8: Deploy script

**Files:**
- Create: `contracts/script/Deploy.s.sol`
- Create: `contracts/.env.example`

- [ ] **Step 1: Write deploy script**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {Vault} from "../src/Vault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address agentDid = vm.envAddress("AGENT_DID_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address und1 = vm.envAddress("UNDERLYING_1");
        address und2 = vm.envAddress("UNDERLYING_2");

        vm.startBroadcast(pk);
        address owner = vm.addr(pk);
        Vault v = new Vault(IERC20(usdc), owner, agentDid);
        v.addUnderlying(und1);
        v.addUnderlying(und2);
        vm.stopBroadcast();

        console2.log("Vault deployed at:", address(v));
    }
}
```

- [ ] **Step 2: Add .env.example**

```dotenv
# contracts/.env.example
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=
DEPLOYER_PRIVATE_KEY=0x...
AGENT_DID_ADDRESS=0x...
USDC_ADDRESS=0x...      # Base Sepolia USDC, e.g. 0x036CbD53842c5426634e7929541eC2318f3dCF7e
UNDERLYING_1=0x...      # e.g., Aave aUSDC equivalent on Base Sepolia
UNDERLYING_2=0x...      # e.g., Morpho USDC vault on Base Sepolia
```

- [ ] **Step 3: Compile-check**

Run: `cd contracts && forge build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add contracts/script/Deploy.s.sol contracts/.env.example
git commit -m "feat(deploy): deploy script for Base Sepolia"
```

---

## Task 9: Agent project init + types

**Files:**
- Create: `agent/package.json`
- Create: `agent/tsconfig.json`
- Create: `agent/src/types.ts`
- Create: `agent/src/assets.ts`
- Create: `agent/.env.example`

- [ ] **Step 1: package.json**

```json
{
  "name": "agent",
  "type": "module",
  "scripts": {
    "dev": "bun run src/agent.ts",
    "test": "bun test",
    "db:migrate": "drizzle-kit push"
  },
  "dependencies": {
    "viem": "^2.21.0",
    "drizzle-orm": "^0.36.0",
    "better-sqlite3": "^11.5.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/better-sqlite3": "^7.6.11",
    "drizzle-kit": "^0.28.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 3: types.ts**

```typescript
import type { Address } from "viem";

export interface Allocation {
  asset: Address;
  bps: number;
}

export interface Intent {
  nonce: bigint;
  deadline: bigint;
  allocations: Allocation[];
}

export interface AssetInfo {
  address: Address;
  symbol: string;
  decimals: number;
}
```

- [ ] **Step 4: assets.ts**

```typescript
import type { Address } from "viem";
import type { AssetInfo } from "./types";

// Base Sepolia. Verify on https://sepolia.basescan.org before running.
export const BASE_SEPOLIA_USDC: Address =
  (process.env.USDC_ADDRESS as Address) ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export const UNDERLYINGS: AssetInfo[] = [
  {
    address: (process.env.UNDERLYING_1 as Address),
    symbol: "U1",
    decimals: 6,
  },
  {
    address: (process.env.UNDERLYING_2 as Address),
    symbol: "U2",
    decimals: 6,
  },
];
```

- [ ] **Step 5: .env.example**

```dotenv
RPC_URL=https://sepolia.base.org
VAULT_ADDRESS=0x...
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
UNDERLYING_1=0x...
UNDERLYING_2=0x...
AGENT_PRIVATE_KEY=0x...
DB_PATH=./agent.db
REBALANCE_INTERVAL_MS=300000
```

- [ ] **Step 6: Install + typecheck**

```bash
cd agent && bun install
bunx tsc --noEmit
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add agent/
git commit -m "feat(agent): init Bun TS project + types + asset book"
```

---

## Task 10: Agent — Drizzle schema + db.ts

**Files:**
- Create: `agent/src/db.ts`
- Create: `agent/drizzle.config.ts`

- [ ] **Step 1: Schema**

```typescript
// agent/src/db.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const decisions = sqliteTable("decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ts: integer("ts").notNull(),
  intentHash: text("intent_hash").notNull(),
  nonce: integer("nonce").notNull(),
  allocationsJson: text("allocations_json").notNull(),
  txHash: text("tx_hash"),
  status: text("status").notNull(), // 'submitted' | 'confirmed' | 'failed'
  errorMsg: text("error_msg"),
});

const sqlite = new Database(process.env.DB_PATH ?? "./agent.db");
export const db = drizzle(sqlite);
```

- [ ] **Step 2: drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: process.env.DB_PATH ?? "./agent.db" },
});
```

- [ ] **Step 3: Test db**

Create `agent/test/db.test.ts`:
```typescript
import { describe, it, expect } from "bun:test";
import { db, decisions } from "../src/db";

describe("db", () => {
  it("inserts and reads a decision", () => {
    const row = {
      ts: Date.now(),
      intentHash: "0xabc",
      nonce: 0,
      allocationsJson: JSON.stringify([{ asset: "0x1", bps: 5000 }]),
      txHash: null,
      status: "submitted" as const,
      errorMsg: null,
    };
    db.insert(decisions).values(row).run();
    const all = db.select().from(decisions).all();
    expect(all.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run migrate + test**

```bash
cd agent
bun run db:migrate
bun test test/db.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/db.ts agent/drizzle.config.ts agent/drizzle/ agent/test/db.test.ts
git commit -m "feat(agent): drizzle sqlite schema for decision log"
```

---

## Task 11: Agent — strategy.ts (max-APY picker)

**Files:**
- Create: `agent/src/strategy.ts`
- Create: `agent/test/strategy.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "bun:test";
import { pickAllocation } from "../src/strategy";

describe("pickAllocation", () => {
  it("allocates 60% to highest APY, 40% to second", () => {
    const result = pickAllocation([
      { address: "0xAAA", apyBps: 500 },
      { address: "0xBBB", apyBps: 300 },
    ]);
    expect(result).toEqual([
      { asset: "0xAAA", bps: 6000 },
      { asset: "0xBBB", bps: 4000 },
    ]);
  });

  it("respects 60% cap even with one asset", () => {
    const result = pickAllocation([
      { address: "0xAAA", apyBps: 1000 },
    ]);
    expect(result).toEqual([{ asset: "0xAAA", bps: 6000 }]);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `cd agent && bun test test/strategy.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement strategy**

```typescript
// agent/src/strategy.ts
import type { Address } from "viem";
import type { Allocation } from "./types";

export interface ApySample {
  address: Address;
  apyBps: number;
}

const MAX_BPS_PER_ASSET = 6000;
const TOTAL_BPS = 10000;

export function pickAllocation(samples: ApySample[]): Allocation[] {
  if (samples.length === 0) return [];
  const sorted = [...samples].sort((a, b) => b.apyBps - a.apyBps);

  // Single-asset case: apply cap, leave rest idle
  if (sorted.length === 1) {
    return [{ asset: sorted[0].address, bps: MAX_BPS_PER_ASSET }];
  }

  // Two-asset: top gets cap, second gets remainder
  const top = MAX_BPS_PER_ASSET;
  const rest = TOTAL_BPS - top;
  return [
    { asset: sorted[0].address, bps: top },
    { asset: sorted[1].address, bps: rest },
  ];
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `bun test test/strategy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/strategy.ts agent/test/strategy.test.ts
git commit -m "feat(agent): max-APY allocation strategy"
```

---

## Task 12: Agent — sign.ts (intent signing)

**Files:**
- Create: `agent/src/sign.ts`
- Create: `agent/test/sign.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// agent/test/sign.test.ts
import { describe, it, expect } from "bun:test";
import { hashIntent, signIntent } from "../src/sign";
import { privateKeyToAccount } from "viem/accounts";
import { recoverMessageAddress } from "viem";

describe("intent signing", () => {
  const acc = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

  it("hash matches across runs", () => {
    const intent = {
      nonce: 0n,
      deadline: 1700000000n,
      allocations: [{ asset: "0x0000000000000000000000000000000000000001" as `0x${string}`, bps: 6000 }],
    };
    const h1 = hashIntent(intent, "0x9999999999999999999999999999999999999999", 84532);
    const h2 = hashIntent(intent, "0x9999999999999999999999999999999999999999", 84532);
    expect(h1).toBe(h2);
  });

  it("signs and recovers signer", async () => {
    const intent = {
      nonce: 0n,
      deadline: 1700000000n,
      allocations: [{ asset: "0x0000000000000000000000000000000000000001" as `0x${string}`, bps: 6000 }],
    };
    const digest = hashIntent(intent, "0x9999999999999999999999999999999999999999", 84532);
    const sig = await signIntent(acc, digest);
    const recovered = await recoverMessageAddress({ message: { raw: digest }, signature: sig });
    expect(recovered.toLowerCase()).toBe(acc.address.toLowerCase());
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `bun test test/sign.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// agent/src/sign.ts
import {
  encodeAbiParameters,
  keccak256,
  encodePacked,
  type Address,
  type Hex,
} from "viem";
import type { LocalAccount } from "viem/accounts";
import type { Intent } from "./types";

export function hashIntent(intent: Intent, vault: Address, chainId: number): Hex {
  const packed = intent.allocations
    .map((a) => encodePacked(["address", "uint16"], [a.asset, a.bps]))
    .reduce<Hex>((acc, cur) => (acc === "0x" ? cur : (("0x" + acc.slice(2) + cur.slice(2)) as Hex)), "0x");
  const allocsHash = keccak256(packed);
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" }, // chainId
        { type: "address" }, // vault
        { type: "uint256" }, // nonce
        { type: "uint64" },  // deadline
        { type: "bytes32" }, // allocsHash
      ],
      [BigInt(chainId), vault, intent.nonce, intent.deadline, allocsHash],
    ),
  );
}

export async function signIntent(account: LocalAccount, digest: Hex): Promise<Hex> {
  return account.signMessage({ message: { raw: digest } });
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `bun test test/sign.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/sign.ts agent/test/sign.test.ts
git commit -m "feat(agent): intent signing + hash"
```

---

## Task 13: Agent — chain.ts (viem clients + ABI)

**Files:**
- Create: `agent/src/chain.ts`
- Create: `agent/src/abi.ts`

- [ ] **Step 1: ABI mirror**

```typescript
// agent/src/abi.ts
export const VAULT_ABI = [
  { type: "function", name: "rebalance", stateMutability: "nonpayable",
    inputs: [
      { name: "intent", type: "tuple", components: [
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint64" },
        { name: "allocations", type: "tuple[]", components: [
          { name: "asset", type: "address" },
          { name: "bps", type: "uint16" },
        ]},
      ]},
      { name: "sig", type: "bytes" },
    ],
    outputs: [],
  },
  { type: "function", name: "nextNonce", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const ERC4626_ABI = [
  { type: "function", name: "previewRedeem", stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "convertToAssets", stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;
```

- [ ] **Step 2: chain.ts**

```typescript
// agent/src/chain.ts
import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

const RPC = process.env.RPC_URL!;
const PK = process.env.AGENT_PRIVATE_KEY as Hex;

export const account = privateKeyToAccount(PK);
export const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
export const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
export const CHAIN_ID = baseSepolia.id;
```

- [ ] **Step 3: Typecheck**

Run: `cd agent && bunx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add agent/src/chain.ts agent/src/abi.ts
git commit -m "feat(agent): viem clients + vault ABI"
```

---

## Task 14: Agent — APY probe + main loop

**Files:**
- Create: `agent/src/agent.ts`

- [ ] **Step 1: Implement loop**

```typescript
// agent/src/agent.ts
import "dotenv/config";
import { publicClient, walletClient, account, CHAIN_ID } from "./chain";
import { VAULT_ABI, ERC4626_ABI } from "./abi";
import { UNDERLYINGS } from "./assets";
import { pickAllocation, type ApySample } from "./strategy";
import { hashIntent, signIntent } from "./sign";
import { db, decisions } from "./db";
import type { Address, Hex } from "viem";

const VAULT = process.env.VAULT_ADDRESS as Address;
const INTERVAL_MS = Number(process.env.REBALANCE_INTERVAL_MS ?? 300_000);

async function probeApy(asset: Address): Promise<number> {
  // Naive proxy: previewRedeem(1e18) over time would yield rate-of-return.
  // For demo we read previewRedeem at two points 30s apart? Too slow.
  // Use a one-shot: read convertToAssets(1e18) and treat the value above 1e18
  // as a proxy for accumulated yield. For two underlyings we just compare
  // convertToAssets values; higher = better.
  const v = await publicClient.readContract({
    address: asset, abi: ERC4626_ABI, functionName: "convertToAssets",
    args: [10n ** 18n],
  });
  return Number(v);
}

async function tick() {
  console.log("[agent] tick", new Date().toISOString());
  const samples: ApySample[] = await Promise.all(
    UNDERLYINGS.map(async (u) => ({ address: u.address, apyBps: await probeApy(u.address) })),
  );
  const allocations = pickAllocation(samples);

  const nonce = (await publicClient.readContract({
    address: VAULT, abi: VAULT_ABI, functionName: "nextNonce",
  })) as bigint;

  const intent = {
    nonce,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    allocations,
  };

  const digest = hashIntent(intent, VAULT, CHAIN_ID);
  const sig = await signIntent(account, digest);

  let txHash: Hex | null = null;
  let status: "submitted" | "confirmed" | "failed" = "submitted";
  let errorMsg: string | null = null;
  try {
    txHash = await walletClient.writeContract({
      address: VAULT, abi: VAULT_ABI, functionName: "rebalance",
      args: [intent, sig],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    status = "confirmed";
  } catch (e) {
    status = "failed";
    errorMsg = e instanceof Error ? e.message : String(e);
    console.error("[agent] rebalance failed", errorMsg);
  }

  db.insert(decisions).values({
    ts: Date.now(),
    intentHash: digest,
    nonce: Number(nonce),
    allocationsJson: JSON.stringify(allocations),
    txHash,
    status,
    errorMsg,
  }).run();

  console.log("[agent] result", { status, txHash, allocations });
}

async function main() {
  console.log("[agent] starting, account=", account.address);
  await tick();
  setInterval(tick, INTERVAL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

Run: `cd agent && bunx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add agent/src/agent.ts
git commit -m "feat(agent): cron loop probes APY, signs, submits rebalance"
```

---

## Task 15: Web — Next.js init + providers

**Files:**
- Create: `web/package.json`
- Create: `web/next.config.mjs`
- Create: `web/tsconfig.json`
- Create: `web/.env.example`
- Create: `web/app/layout.tsx`
- Create: `web/app/providers.tsx`
- Create: `web/lib/wagmi.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "viem": "^2.21.0",
    "wagmi": "^2.12.0",
    "@rainbow-me/rainbowkit": "^2.2.0",
    "@tanstack/react-query": "^5.59.0",
    "better-sqlite3": "^11.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.12",
    "@types/better-sqlite3": "^7.6.11",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: tsconfig + next.config**

`web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "incremental": true,
    "noEmit": true,
    "allowJs": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`web/next.config.mjs`:
```javascript
/** @type {import('next').NextConfig} */
export default { reactStrictMode: true };
```

- [ ] **Step 3: wagmi config**

```typescript
// web/lib/wagmi.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Agent RWA Vault",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "demo",
  chains: [baseSepolia],
  ssr: true,
});
```

- [ ] **Step 4: providers**

```tsx
// web/app/providers.tsx
"use client";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

- [ ] **Step 5: layout**

```tsx
// web/app/layout.tsx
import { Providers } from "./providers";
import type { ReactNode } from "react";

export const metadata = { title: "Agent RWA Vault" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
```

- [ ] **Step 6: .env.example**

```dotenv
NEXT_PUBLIC_WC_PROJECT_ID=
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
AGENT_DB_PATH=../agent/agent.db
```

- [ ] **Step 7: Install + build**

```bash
cd web && pnpm install && pnpm build
```

Expected: build succeeds (no pages yet, but framework wires up)

- [ ] **Step 8: Commit**

```bash
git add web/
git commit -m "feat(web): Next.js init + wagmi/RainbowKit providers"
```

---

## Task 16: Web — dashboard page

**Files:**
- Create: `web/app/page.tsx`
- Create: `web/lib/abi.ts`
- Create: `web/components/DepositCard.tsx`
- Create: `web/components/WithdrawCard.tsx`
- Create: `web/components/AllocationPie.tsx`
- Create: `web/components/ActivityFeed.tsx`

- [ ] **Step 1: ABI mirror**

```typescript
// web/lib/abi.ts
export const VAULT_ABI = [
  { type: "function", name: "deposit", stateMutability: "nonpayable",
    inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }],
    outputs: [{ type: "uint256" }] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" }, { name: "receiver", type: "address" }, { name: "owner", type: "address" }
    ],
    outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view",
    inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export const USDC_ABI = [
  { type: "function", name: "approve", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view",
    inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
```

- [ ] **Step 2: DepositCard**

```tsx
// web/components/DepositCard.tsx
"use client";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { USDC_ABI, VAULT_ABI } from "@/lib/abi";
import { useState } from "react";

const VAULT = process.env.NEXT_PUBLIC_VAULT_ADDRESS as Address;
const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS as Address;

export function DepositCard() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("100");

  const { data: allowance } = useReadContract({
    address: USDC, abi: USDC_ABI, functionName: "allowance",
    args: address ? [address, VAULT] : undefined,
    query: { enabled: !!address },
  });

  const handleDeposit = async () => {
    if (!address) return;
    const amt = parseUnits(amount, 6);
    if (!allowance || allowance < amt) {
      await writeContractAsync({
        address: USDC, abi: USDC_ABI, functionName: "approve", args: [VAULT, amt],
      });
    }
    await writeContractAsync({
      address: VAULT, abi: VAULT_ABI, functionName: "deposit", args: [amt, address],
    });
  };

  return (
    <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      <h3>Deposit USDC</h3>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button onClick={handleDeposit}>Deposit</button>
    </div>
  );
}
```

- [ ] **Step 3: WithdrawCard**

```tsx
// web/components/WithdrawCard.tsx
"use client";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { VAULT_ABI } from "@/lib/abi";
import { useState } from "react";

const VAULT = process.env.NEXT_PUBLIC_VAULT_ADDRESS as Address;

export function WithdrawCard() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("10");

  const handleWithdraw = async () => {
    if (!address) return;
    const amt = parseUnits(amount, 6);
    await writeContractAsync({
      address: VAULT, abi: VAULT_ABI, functionName: "withdraw",
      args: [amt, address, address],
    });
  };

  return (
    <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      <h3>Withdraw USDC</h3>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button onClick={handleWithdraw}>Withdraw</button>
    </div>
  );
}
```

- [ ] **Step 4: AllocationPie (text-based, no chart lib for hackathon)**

```tsx
// web/components/AllocationPie.tsx
"use client";
import { useEffect, useState } from "react";

interface Decision {
  id: number;
  ts: number;
  allocationsJson: string;
  status: string;
}

export function AllocationPie() {
  const [latest, setLatest] = useState<Decision | null>(null);

  useEffect(() => {
    fetch("/api/decisions").then(r => r.json()).then((rows: Decision[]) => {
      setLatest(rows[0] ?? null);
    });
  }, []);

  if (!latest) return <div>No allocation yet.</div>;
  const allocs = JSON.parse(latest.allocationsJson) as { asset: string; bps: number }[];
  return (
    <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      <h3>Current Allocation</h3>
      <ul>
        {allocs.map((a) => (
          <li key={a.asset}>{a.asset.slice(0, 10)}…  {(a.bps / 100).toFixed(1)}%</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: ActivityFeed**

```tsx
// web/components/ActivityFeed.tsx
"use client";
import { useEffect, useState } from "react";

interface Decision {
  id: number;
  ts: number;
  intentHash: string;
  nonce: number;
  status: string;
  txHash: string | null;
}

export function ActivityFeed() {
  const [rows, setRows] = useState<Decision[]>([]);
  useEffect(() => {
    const load = () => fetch("/api/decisions").then(r => r.json()).then(setRows);
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      <h3>Agent Activity</h3>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            #{r.nonce} · {new Date(r.ts).toLocaleTimeString()} · {r.status}
            {r.txHash && (
              <a href={`https://sepolia.basescan.org/tx/${r.txHash}`} target="_blank" rel="noreferrer">
                {" "}↗
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: page.tsx**

```tsx
// web/app/page.tsx
"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { DepositCard } from "@/components/DepositCard";
import { WithdrawCard } from "@/components/WithdrawCard";
import { AllocationPie } from "@/components/AllocationPie";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function Home() {
  return (
    <main style={{ maxWidth: 800, margin: "40px auto", fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Agent RWA Vault</h1>
        <ConnectButton />
      </header>
      <p style={{ color: "orange" }}>Unaudited demo. Base Sepolia. Do not deposit real funds.</p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <DepositCard />
        <WithdrawCard />
        <AllocationPie />
        <ActivityFeed />
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Build**

Run: `cd web && pnpm build`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add web/
git commit -m "feat(web): dashboard with deposit/withdraw/allocation/activity"
```

---

## Task 17: Web — /api/decisions reads SQLite

**Files:**
- Create: `web/app/api/decisions/route.ts`

- [ ] **Step 1: Implement**

```typescript
// web/app/api/decisions/route.ts
import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: number;
  ts: number;
  intent_hash: string;
  nonce: number;
  allocations_json: string;
  tx_hash: string | null;
  status: string;
  error_msg: string | null;
}

export async function GET() {
  const dbPath = process.env.AGENT_DB_PATH ?? path.join(process.cwd(), "..", "agent", "agent.db");
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const rows = db.prepare(
      "SELECT id, ts, intent_hash, nonce, allocations_json, tx_hash, status, error_msg FROM decisions ORDER BY id DESC LIMIT 50"
    ).all() as Row[];
    return NextResponse.json(rows.map(r => ({
      id: r.id, ts: r.ts, intentHash: r.intent_hash,
      nonce: r.nonce, allocationsJson: r.allocations_json,
      txHash: r.tx_hash, status: r.status, errorMsg: r.error_msg,
    })));
  } catch {
    return NextResponse.json([]);
  }
}
```

- [ ] **Step 2: Build**

Run: `cd web && pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add web/app/api/decisions/route.ts
git commit -m "feat(web): /api/decisions reads agent SQLite"
```

---

## Task 18: README + manual E2E

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Final README**

```markdown
# Agent RWA Vault — Hackathon Demo

ERC-4626 USDC vault on Base Sepolia. An off-chain TypeScript agent rebalances across 2 ERC-4626 underlyings via signed intents.

⚠️ Unaudited demo. Do not deposit real funds.

## Prerequisites

- Foundry, Node.js 20+, Bun, pnpm
- Base Sepolia RPC URL (e.g., https://sepolia.base.org)
- A funded EOA on Base Sepolia (for deployment)
- A second EOA for the agent (we treat its address as the agent DID)

## 1. Deploy contracts

```bash
cd contracts
cp .env.example .env
# fill DEPLOYER_PRIVATE_KEY, AGENT_DID_ADDRESS, USDC_ADDRESS, UNDERLYING_1, UNDERLYING_2
forge build
forge test -vv
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
```

Note the deployed Vault address.

## 2. Run agent

```bash
cd ../agent
cp .env.example .env
# fill VAULT_ADDRESS, AGENT_PRIVATE_KEY, RPC_URL, etc.
bun install
bun run db:migrate
bun run dev
```

Agent rebalances every 5 minutes (configurable via `REBALANCE_INTERVAL_MS`).

## 3. Run dashboard

```bash
cd ../web
cp .env.example .env.local
# fill NEXT_PUBLIC_VAULT_ADDRESS, NEXT_PUBLIC_WC_PROJECT_ID, AGENT_DB_PATH
pnpm install
pnpm dev
```

Open http://localhost:3000.

## E2E demo flow

1. Connect wallet (Base Sepolia)
2. Acquire test USDC from Circle faucet
3. Deposit 100 USDC
4. Wait up to 5 min — agent picks up new balance, signs intent, submits rebalance
5. Refresh dashboard — see allocation pie + activity feed update with a new entry
6. Withdraw 40 USDC — confirm balance returns

## Architecture

- `contracts/` — Vault.sol (ERC-4626 + signed-intent rebalance)
- `agent/` — Bun + TS cron service (probes APY, signs, submits)
- `web/` — Next.js + wagmi dashboard

## Deviation from spec

ECDSA (secp256k1) instead of Ed25519 for cheap on-chain `ecrecover`. See [design spec §10](docs/superpowers/specs/2026-05-21-agent-rwa-vault-design.md).

## Acceptance checklist

- [ ] Vault deployed to Base Sepolia
- [ ] Agent rebalances within 10 min of deposit
- [ ] Dashboard live (Vercel)
- [ ] All 9 Foundry tests passing
- [ ] README setup reproducible
- [ ] Demo recording (gif/mp4) of deposit → rebalance → withdraw
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: setup + E2E demo flow"
```

---

## Self-Review

**Spec coverage:**
- §1 Goal → Tasks 0–18 cover end-to-end ✓
- §2 Non-goals → confirmed not implemented (no factory, no FeeToken, no gitlawb, no IPFS, no Yearn fork) ✓
- §3 Architecture → Tasks 2–7 (vault), 9–14 (agent), 15–17 (web) ✓
- §4 Contract surface → Tasks 2, 4, 5, 7 ✓
- §5 Underlying selection → addresses parameterized via `.env`; verification deferred to deploy time per spec ✓
- §6 File layout → matches Task 0 + per-task file maps ✓
- §7 Test plan → 9 foundry tests in Tasks 2–7; agent unit tests in Tasks 10–12; manual E2E in Task 18 ✓
- §8 Risks → README warns "unaudited demo"; pause + emergencyWithdrawAll in Task 7 ✓
- §10 Deviations → ECDSA used throughout ✓
- §11 Acceptance criteria → README has the 6-item checklist ✓

**Placeholder scan:** No TBD/TODO. Underlying addresses left as env vars by design. ✓

**Type consistency:** `Allocation`, `Intent`, `pickAllocation`, `hashIntent`, `signIntent` — names consistent across Solidity/TS. `MAX_BPS_PER_ASSET = 6000`, `TOTAL_BPS = 10000` consistent. ABI in `agent/src/abi.ts` and `web/lib/abi.ts` mirror the contract surface. ✓

Plan is implementation-ready.
