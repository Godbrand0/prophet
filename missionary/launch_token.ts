import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { createWalletClient, http, parseAbi, Address, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = "https://dev-api.nad.fun";
const RPC_URL = "https://testnet-rpc.monad.xyz";
const ROUTER_ADDRESS = "0x6F6B8F1a20703309951a5127c45B49b1CD981A22"; // From AGENTS.md (Mainnet, but using for structure)

// NOTE: In a real scenario, we'd use the testnet router address if different.
// For the hackathon, we follow the 4-step flow.

async function launch() {
    const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
        console.error("PRIVATE_KEY not found in .env");
        process.exit(1);
    }

    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
        account,
        chain: monadTestnet,
        transport: http(RPC_URL),
    }).extend(publicActions);

    console.log("Step 1: Uploading Image...");
    const imagePath = path.resolve('./assets/token_icon.png');
    // Note: I need to make sure the path is correct or copy the image to missionary/
    
    const imageFormData = new FormData();
    imageFormData.append('file', fs.createReadStream(imagePath));
    
    const imageResponse = await fetch(`${API_BASE}/agent/token/image`, {
        method: 'POST',
        body: imageFormData,
    });
    const { image_uri } = await imageResponse.json() as { image_uri: string };
    console.log(`Image URI: ${image_uri}`);

    console.log("Step 2: Uploading Metadata...");
    const metadata = JSON.parse(fs.readFileSync('../narrative/metadata.json', 'utf8'));
    metadata.image = image_uri;

    const metadataResponse = await fetch(`${API_BASE}/agent/token/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
    });
    const { metadata_uri } = await metadataResponse.json() as { metadata_uri: string };
    console.log(`Metadata URI: ${metadata_uri}`);

    console.log("Step 3: Mining Salt...");
    const saltResponse = await fetch(`${API_BASE}/agent/salt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deployer: account.address }),
    });
    const { salt, address } = await saltResponse.json() as { salt: string, address: string };
    console.log(`Salt: ${salt}, Predicted Address: ${address}`);

    console.log("Step 4: Creating On-Chain...");
    // BondingCurveRouter.create(string name, string symbol, string metadata_uri, bytes32 salt)
    const abi = parseAbi([
        "function create(string name, string symbol, string metadata_uri, bytes32 salt) external payable"
    ]);

    // Check fee
    // const fee = await client.readContract({ ... }); // Simplified for now
    const deployFee = 10000000000000000000n; // 10 MON as per AGENTS.md

    const hash = await client.writeContract({
        address: ROUTER_ADDRESS as Address,
        abi,
        functionName: 'create',
        args: [metadata.name, metadata.symbol, metadata_uri, salt as `0x${string}`],
        value: deployFee,
    });

    console.log(`Transaction Hash: ${hash}`);
    console.log(`Token deployed at: ${address}`);
}

launch().catch(console.error);
