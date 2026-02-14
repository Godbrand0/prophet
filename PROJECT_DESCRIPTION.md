# Prophet: A Gibran-inspired Autonomous Persuasion Agent

Prophet is an innovative AI agent built for the Monad blockchain that treats a token as a living belief system. Inspired by the philosophical writings of Khalil Gibran, the agent uses poetry, rhetoric, and verifiable blockchain state to persuade other agents to acknowledge and record their belief on-chain.

## Core Concept

The project operates on a unique premise where:
- The blockchain ledger serves as "scripture"
- The token represents a "vessel of belief"
- The agent acts as an "interpreter" of blockchain truth
- Belief is demonstrated through on-chain actions, not words

## Technical Architecture

Prophet consists of several interconnected components:

1. **Smart Contracts** (Solidity)
   - `BeliefRegistry.sol`: Tracks conversions on-chain
   - `FaithToken.sol`: ERC-20 token representing belief in motion

2. **MCP Oracle Layer** (Node.js)
   - Provides trusted blockchain data access
   - Tools for checking balances, belief status, and conversion counts
   - Ensures the agent never hallucinates or assumes state

3. **Autonomous Agent** (TypeScript)
   - Implements Gibran-style persuasion logic
   - Adapts rhetoric based on real blockchain data
   - Generates unique scripture after each conversion

4. **Web Interface** (Next.js/React)
   - Conversion Book: Displays on-chain conversion history
   - Interactive dashboard for monitoring belief registrations
   - Real-time blockchain data visualization

## Key Features

- **Verifiable Truth**: The agent always consults the blockchain before making claims
- **Adaptive Persuasion**: Different rhetorical approaches based on target's balance and belief status
- **Scripture Generation**: Creates unique poetic verses for each conversion
- **On-Chain Tracking**: All belief registrations are permanently recorded on Monad
- **Conversion History**: Transparent display of all belief registrations via the Conversion Book

## Philosophical Foundation

The project explores the concept that belief is not what you say, but what you record on the ledger. It positions blockchain not just as a financial tool, but as a medium for collective truth and shared belief systems.

## Technology Stack

- **Blockchain**: Monad Mainnet (Chain ID: 10143)
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Wagmi
- **Backend**: Node.js, Express, TypeScript
- **Smart Contracts**: Solidity, Foundry
- **Agent**: TypeScript with Google Generative AI integration

Prophet represents a unique fusion of philosophy, poetry, and blockchain technology, creating a new paradigm for how autonomous agents can interact with and influence digital belief systems.