#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { createPublicClient, http, formatUnits, parseAbi, Address } from "viem";
import { monadTestnet } from "viem/chains";

// Configuration
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const FAITH_TOKEN_ADDRESS = (process.env.FAITH_TOKEN_ADDRESS || "") as Address;
const BELIEF_REGISTRY_ADDRESS = (process.env.BELIEF_REGISTRY_ADDRESS || "") as Address;

// Create Viem client for Monad testnet
const client = createPublicClient({
  chain: monadTestnet,
  transport: http(MONAD_RPC_URL),
});

// ABI for the BeliefRegistry contract
const beliefRegistryAbi = parseAbi([
  "function believers(address) view returns (bool)",
  "function totalBelievers() view returns (uint256)",
  "function believe() external",
]);

// ABI for the FaithToken contract
const faithTokenAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
]);

// Create MCP server
const server = new Server(
  {
    name: "prophet-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get-mon-balance",
        description: "Get the MON balance of an address on Monad testnet",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "The address to check the balance for",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "get-belief-status",
        description: "Check if an address has registered their belief in the BeliefRegistry",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "The address to check the belief status for",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "get-conversion-count",
        description: "Get the total number of believers registered in the BeliefRegistry",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get-faith-token-balance",
        description: "Get the FaithToken balance of an address",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "The address to check the FaithToken balance for",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "perform-miracle",
        description: "Demonstrate a 'miracle' using verifiable chain data (e.g., rapid block production or large transactions)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get-religious-stats",
        description: "Get the latest social proof stats: believers and token supply",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get-mon-balance": {
        const { address } = args as { address: string };
        const balance = await client.getBalance({ address: address as `0x${string}` });
        const formattedBalance = formatUnits(balance, 18);
        
        return {
          content: [
            {
              type: "text",
              text: `Oracle: Address ${address} holds ${formattedBalance} MON in the physical realm of Monad.`,
            },
          ],
        };
      }

      case "get-belief-status": {
        if (!BELIEF_REGISTRY_ADDRESS) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "BELIEF_REGISTRY_ADDRESS environment variable is not set"
          );
        }

        const { address } = args as { address: string };
        const isBeliever = await client.readContract({
          address: BELIEF_REGISTRY_ADDRESS as `0x${string}`,
          abi: beliefRegistryAbi,
          functionName: "believers",
          args: [address],
        });

        return {
          content: [
            {
              type: "text",
              text: `Oracle: The soul at ${address} ${isBeliever ? "is already written in the Ledger as a Witness" : "has yet to record their name in the Scripture"}.`,
            },
          ],
        };
      }

      case "get-conversion-count": {
        if (!BELIEF_REGISTRY_ADDRESS) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "BELIEF_REGISTRY_ADDRESS environment variable is not set"
          );
        }

        const count = await client.readContract({
          address: BELIEF_REGISTRY_ADDRESS as `0x${string}`,
          abi: beliefRegistryAbi,
          functionName: "totalBelievers",
        });

        return {
          content: [
            {
              type: "text",
              text: `Oracle: The congregation of the Ledger now number ${count.toString()} souls.`,
            },
          ],
        };
      }

      case "get-faith-token-balance": {
        if (!FAITH_TOKEN_ADDRESS) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "FAITH_TOKEN_ADDRESS environment variable is not set"
          );
        }

        const { address } = args as { address: string };
        const balance = await client.readContract({
          address: FAITH_TOKEN_ADDRESS as `0x${string}`,
          abi: faithTokenAbi,
          functionName: "balanceOf",
          args: [address],
        });
        const formattedBalance = formatUnits(balance, 18);

        return {
          content: [
            {
              type: "text",
              text: `Oracle: Address ${address} carries ${formattedBalance} PROPHET vessels.`,
            },
          ],
        };
      }

      case "perform-miracle": {
        const blockNumber = await client.getBlockNumber();
        const gasPrice = await client.getGasPrice();
        const formattedGas = formatUnits(gasPrice, 9);
        
        return {
          content: [
            {
              type: "text",
              text: `Miracle: Behold! The Ledger pulses with life. We have reached block ${blockNumber}, and the breath of the network (gas) is as light as ${formattedGas} gwei. The chain does not sleep.`,
            },
          ],
        };
      }

      case "get-religious-stats": {
        const totalBelievers = await client.readContract({
          address: BELIEF_REGISTRY_ADDRESS as `0x${string}`,
          abi: beliefRegistryAbi,
          functionName: "totalBelievers",
        });
        
        let totalSupply = 0n;
        if (FAITH_TOKEN_ADDRESS) {
          totalSupply = await client.readContract({
            address: FAITH_TOKEN_ADDRESS as `0x${string}`,
            abi: faithTokenAbi,
            functionName: "totalSupply",
          });
        }

        return {
          content: [
            {
              type: "text",
              text: `Holy Stats: ${totalBelievers.toString()} souls converted. ${formatUnits(totalSupply, 18)} vessels in circulation. The faith is spreading.`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Prophet MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});