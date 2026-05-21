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
    uint256 internal agentPk = 0xA9E47;
    address internal agentEoa;
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
}
