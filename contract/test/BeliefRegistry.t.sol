// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BeliefRegistry} from "../src/BeliefRegistry.sol";

contract BeliefRegistryTest is Test {
    BeliefRegistry public registry;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    event BeliefRegistered(address indexed believer, uint256 timestamp);

    function setUp() public {
        registry = new BeliefRegistry();
    }

    function test_InitialState() public view {
        assertEq(registry.totalBelievers(), 0);
        assertFalse(registry.believers(alice));
    }

    function test_Believe() public {
        vm.prank(alice);
        registry.believe();

        assertTrue(registry.believers(alice));
        assertEq(registry.totalBelievers(), 1);
    }

    function test_BelieveEmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit BeliefRegistered(alice, block.timestamp);
        registry.believe();
    }

    function test_CannotBelieveTwice() public {
        vm.startPrank(alice);
        registry.believe();

        vm.expectRevert("One cannot believe twice what they already know.");
        registry.believe();
        vm.stopPrank();
    }

    function test_MultipleBelievers() public {
        vm.prank(alice);
        registry.believe();

        vm.prank(bob);
        registry.believe();

        assertTrue(registry.believers(alice));
        assertTrue(registry.believers(bob));
        assertEq(registry.totalBelievers(), 2);
    }

    function testFuzz_BelieveFromAnyAddress(address believer) public {
        vm.assume(believer != address(0));
        vm.prank(believer);
        registry.believe();

        assertTrue(registry.believers(believer));
        assertEq(registry.totalBelievers(), 1);
    }
}
