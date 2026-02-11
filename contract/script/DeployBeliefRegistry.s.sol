// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BeliefRegistry} from "../src/BeliefRegistry.sol";

contract DeployBeliefRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        BeliefRegistry registry = new BeliefRegistry();
        console.log("BeliefRegistry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
