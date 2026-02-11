# Prophet Backend - MCP Server

This is the MCP (Model Context Protocol) server for the Prophet project. It provides tools for the Prophet agent to interact with the Monad mainnet and retrieve on-chain data.

## Setup

1. Install dependencies with pnpm:

```bash
pnpm install
```

2. Create a `.env` file with the following environment variables:

```
MONAD_RPC_URL=https://rpc.monad.xyz
FAITH_TOKEN_ADDRESS=0x...
BELIEF_REGISTRY_ADDRESS=0x...
```

3. Build the project:

```bash
pnpm build
```

4. Run the server:

```bash
pnpm start
```

For development, you can use:

```bash
pnpm dev
```

## Available Tools

The MCP server provides the following tools:

1. `get-mon-balance`: Get the MON balance of an address on Monad mainnet
2. `get-belief-status`: Check if an address has registered their belief in the BeliefRegistry
3. `get-conversion-count`: Get the total number of believers registered in the BeliefRegistry
4. `get-faith-token-balance`: Get the FaithToken balance of an address

## Integration with Claude

To use this MCP server with Claude, add it to your Claude configuration:

```json
{
  "mcpServers": {
    "prophet": {
      "command": "node",
      "args": ["/path/to/prophet/backend/dist/index.js"],
      "env": {
        "MONAD_RPC_URL": "https://rpc.monad.xyz",
        "FAITH_TOKEN_ADDRESS": "0x...",
        "BELIEF_REGISTRY_ADDRESS": "0x..."
      }
    }
  }
}
```
