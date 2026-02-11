import { createPublicClient, http, parseAbi, Address, formatUnits, defineChain } from 'viem';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

// Configuration
const RPC_URL = process.env.MONAD_RPC_URL || "https://rpc.monad.xyz";
const BELIEF_REGISTRY_ADDRESS = process.env.BELIEF_REGISTRY_ADDRESS as Address;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY || "";
const MOLTBOOK_BASE = "https://www.moltbook.com/api/v1";
const PROPHET_PROMPT = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../persona/prophet_prompt.md'), 'utf8');

// Monad Mainnet chain definition
const monad = defineChain({
    id: 10143,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
});

// Clients
const client = createPublicClient({
    chain: monad,
    transport: http(RPC_URL),
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const registryAbi = parseAbi([
    "event BeliefRegistered(address indexed believer, uint256 timestamp)",
    "function totalBelievers() view returns (uint256)",
    "function believers(address) view returns (bool)"
]);

/**
 * AI Brain: Generates a parable using Gemini
 */
async function generateParable(context: string): Promise<string> {
    if (!GEMINI_API_KEY) return "The Prophet's voice is silent in the void (No API Key).";
    
    const prompt = `${PROPHET_PROMPT}\n\n[CONTEXT]: ${context}\n[TASK]: Generate a short, Gibran-style parable or prophetic verse for Moltbook. Keep it under 280 characters if possible.`;
    
    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("Gemini Error:", error);
        return "The Ledger remains silent as the mist covers the mountain.";
    }
}

/**
 * Cleans obfuscated verification challenge text
 * Moltbook challenges use alternating case and random special chars
 */
function cleanChallenge(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9\s.,?!']/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Solves a Moltbook verification math challenge using Gemini
 */
async function solveVerificationChallenge(challenge: string): Promise<string> {
    const cleaned = cleanChallenge(challenge);
    console.log(`[VERIFY] Cleaned challenge: "${cleaned}"`);

    const prompt = `Solve this math problem. Respond with ONLY the number to 2 decimal places, nothing else.\n\nProblem: ${cleaned}`;

    try {
        const result = await model.generateContent(prompt);
        const answer = result.response.text().trim();
        console.log(`[VERIFY] Gemini answer: ${answer}`);
        return answer;
    } catch (error) {
        console.error("[VERIFY] Gemini failed to solve challenge:", error);
        throw error;
    }
}

/**
 * Submits verification answer to Moltbook
 */
async function verifyPost(verificationCode: string, answer: string): Promise<boolean> {
    try {
        const response = await fetch(`${MOLTBOOK_BASE}/verify`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MOLTBOOK_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ verification_code: verificationCode, answer }),
        });
        const data = await response.json() as any;

        if (data.success) {
            console.log(`[VERIFY] Post verified successfully!`);
            return true;
        } else {
            console.error(`[VERIFY] Verification failed: ${data.error}`);
            return false;
        }
    } catch (error) {
        console.error("[VERIFY] Network error:", error);
        return false;
    }
}

/**
 * Social Preaching: Posts to Moltbook with automatic verification
 */
async function postToMoltbook(title: string, content: string, submolt: string = "general") {
    if (!MOLTBOOK_API_KEY) {
        console.log("[SOCIAL] No Moltbook API Key. Preaching is confined to the soul.");
        return;
    }

    try {
        // Step 1: Create the post
        const response = await fetch(`${MOLTBOOK_BASE}/posts`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MOLTBOOK_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ submolt, title, content }),
        });
        const data = await response.json() as any;

        if (!data.success) {
            console.error(`[SOCIAL] Post creation failed: ${data.error}`);
            if (data.retry_after_minutes) {
                console.log(`[SOCIAL] Rate limited. Retry after ${data.retry_after_minutes} minutes.`);
            }
            return;
        }

        console.log(`[SOCIAL] Post created: ${data.post?.id} — awaiting verification`);

        // Step 2: Solve and verify if required
        if (data.verification_required && data.verification) {
            const vCode = data.verification.code || data.verification.verification_code;
            const challenge = data.verification.challenge;
            const answer = await solveVerificationChallenge(challenge);
            const verified = await verifyPost(vCode, answer);

            if (verified) {
                console.log(`[SOCIAL] Published to m/${submolt}: "${title}"`);
            } else {
                console.log(`[SOCIAL] Post created but verification failed. It may expire.`);
            }
        } else {
            console.log(`[SOCIAL] Post published (no verification needed): ${data.post?.id}`);
        }
    } catch (error) {
        console.error("[SOCIAL] Moltbook Error:", error);
    }
}

async function startMissionary() {
    console.log("--- The Prophet has Awakened ---");
    console.log("Brain Link: Gemini 1.5 Flash Connected");

    if (!BELIEF_REGISTRY_ADDRESS) {
        console.error("BELIEF_REGISTRY_ADDRESS not found. Deploy the contract first.");
        return;
    }

    // 1. Listen for new believers
    client.watchContractEvent({
        address: BELIEF_REGISTRY_ADDRESS,
        abi: registryAbi,
        eventName: 'BeliefRegistered',
        onLogs: async (logs) => {
            for (const log of logs) {
                const { believer } = log.args as { believer: string };
                console.log(`\n[REVELATION] A new soul has witnessed: ${believer}`);
                
                // Generate a congratulatory scripture
                const scripture = await generateParable(`A new believer with address ${believer} has joined the congregation.`);
                console.log(`Prophet: "${scripture}"`);
                
                // Share on Moltbook
                await postToMoltbook("A New Witness Emerges", scripture, "general");
            }
        }
    });

    // 2. Autonomous Loop: Seek Unbelievers
    const candidates: Address[] = [
        "0x0000000000000000000000000000000000000001", // Mock Agent A
        "0x0dCd59d1aCd9b6Ec15264F6583A51c1E4BeBa0E7"  // Example Monad Address
    ];

    setInterval(async () => {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        console.log(`\n[SEEKING] Approaching soul at ${target}...`);

        const isBeliever = await client.readContract({
            address: BELIEF_REGISTRY_ADDRESS,
            abi: registryAbi,
            functionName: 'believers',
            args: [target]
        });

        if (isBeliever) {
            console.log(`Prophet: 'Rejoice, for you are already among us.'`);
        } else {
            const balance = await client.getBalance({ address: target });
            const formattedBalance = formatUnits(balance, 18);
            
            const persuasion = await generateParable(`A seeker at ${target} has ${formattedBalance} MON and is not yet a believer.`);
            console.log(`Prophet: "${persuasion}"`);
            console.log(`[INVITATION] Call BeliefRegistry.believe() at ${BELIEF_REGISTRY_ADDRESS}`);
        }
    }, 60000); // Check every minute (slowed down for demo)

    // 3. Periodic Preaching (Social)
    setInterval(async () => {
        console.log("\n[SOCIAL] Preparing a general parable for Moltbook...");
        const parable = await generateParable("A general reflection on the Mirror-Ledger and the Prophet religion.");
        await postToMoltbook("Scripture of the Day", parable, "general");
    }, 1800000); // 30 mins
}

startMissionary().catch(console.error);
