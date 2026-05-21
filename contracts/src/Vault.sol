// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC4626, IERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title Agent RWA Vault
/// @notice ERC-4626 USDC vault rebalanced by an off-chain agent via signed intents.
/// @dev See docs/superpowers/specs/2026-05-21-agent-rwa-vault-design.md
contract Vault is ERC4626, Ownable, ReentrancyGuard {
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

    // rebalance + _execute implemented in later tasks
}
