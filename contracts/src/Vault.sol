// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC4626, IERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

/// @title Agent RWA Vault
/// @notice ERC-4626 USDC vault rebalanced by an off-chain agent via signed intents.
/// @dev See docs/superpowers/specs/2026-05-21-agent-rwa-vault-design.md
contract Vault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Allocation {
        address asset;
        uint16 bps;
    }

    struct Intent {
        uint256 nonce;
        uint64 deadline;
        Allocation[] allocations;
    }

    /// @notice Address recovered from intent signatures must equal this.
    address public agentDid;

    /// @notice Monotonic nonce; prevents replay.
    uint256 public nextNonce;

    /// @notice Pause flag. When true, rebalance reverts.
    bool public paused;

    uint16 public constant MAX_BPS_PER_ASSET = 6000; // 60%
    uint16 public constant TOTAL_BPS = 10000;

    /// @notice Whitelist of underlying ERC-4626 vaults.
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
    error AlreadyUnderlying();

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
        if (isUnderlying[asset_]) revert AlreadyUnderlying();
        isUnderlying[asset_] = true;
        underlyings.push(asset_);
        emit UnderlyingAdded(asset_);
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit Paused(p);
    }

    /// @notice Compute the digest signed by the agent. Domain-separated by chainid + vault address.
    function hashIntent(Intent calldata intent) external view returns (bytes32) {
        return _hashIntent(intent);
    }

    function _hashIntent(Intent calldata intent) internal view returns (bytes32) {
        bytes memory packed;
        for (uint256 i = 0; i < intent.allocations.length; i++) {
            packed = abi.encodePacked(
                packed,
                intent.allocations[i].asset,
                intent.allocations[i].bps
            );
        }
        bytes32 allocsHash = keccak256(packed);
        return keccak256(
            abi.encode(
                block.chainid,
                address(this),
                intent.nonce,
                intent.deadline,
                allocsHash
            )
        );
    }

    function _verify(bytes32 digest, bytes calldata sig) internal view returns (bool) {
        bytes32 ethSigned = MessageHashUtils.toEthSignedMessageHash(digest);
        address recovered = ECDSA.recover(ethSigned, sig);
        return recovered == agentDid;
    }

    /// @notice Submit a signed allocation intent. Pulls all funds back, then redeploys per `intent.allocations`.
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
        // 1. Pull all funds back to vault as USDC.
        uint256 len = underlyings.length;
        for (uint256 i = 0; i < len; i++) {
            IERC4626 u = IERC4626(underlyings[i]);
            uint256 bal = u.balanceOf(address(this));
            if (bal > 0) {
                u.redeem(bal, address(this), address(this));
            }
        }

        // 2. Allocate fresh based on requested bps.
        IERC20 a = IERC20(asset());
        uint256 totalUsdc = a.balanceOf(address(this));
        for (uint256 i = 0; i < allocations.length; i++) {
            Allocation calldata alloc = allocations[i];
            uint256 amount = (totalUsdc * alloc.bps) / TOTAL_BPS;
            if (amount == 0) continue;
            a.forceApprove(alloc.asset, amount);
            IERC4626(alloc.asset).deposit(amount, address(this));
        }
    }

    /// @notice Reports total USDC under management (idle + deployed).
    function totalAssets() public view override returns (uint256) {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        uint256 deployed;
        uint256 len = underlyings.length;
        for (uint256 i = 0; i < len; i++) {
            IERC4626 u = IERC4626(underlyings[i]);
            uint256 sh = u.balanceOf(address(this));
            if (sh > 0) deployed += u.previewRedeem(sh);
        }
        return idle + deployed;
    }

    /// @notice Owner-only: redeem all shares from underlyings back into the vault as USDC.
    /// @dev Use with `setPaused(true)` for full emergency stop.
    function emergencyWithdrawAll() external onlyOwner {
        uint256 len = underlyings.length;
        for (uint256 i = 0; i < len; i++) {
            IERC4626 u = IERC4626(underlyings[i]);
            uint256 bal = u.balanceOf(address(this));
            if (bal > 0) u.redeem(bal, address(this), address(this));
        }
    }
}
