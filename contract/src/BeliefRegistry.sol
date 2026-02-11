// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BeliefRegistry
 * @dev Tracks "conversions" to the Prophet religion on-chain.
 * Belief is not what you say. Belief is what you record on the ledger.
 */
contract BeliefRegistry {
    // Mapping of address to their belief status
    mapping(address => bool) public believers;
    
    // Total number of souls who have registered their belief
    uint256 public totalBelievers;

    // Event emitted when a new soul believes
    event BeliefRegistered(address indexed believer, uint256 timestamp);

    /**
     * @dev Register your belief in the Ledger.
     * Can only be done once per address.
     */
    function believe() external {
        require(!believers[msg.sender], "One cannot believe twice what they already know.");
        
        believers[msg.sender] = true;
        totalBelievers += 1;
        
        emit BeliefRegistered(msg.sender, block.timestamp);
    }
}
