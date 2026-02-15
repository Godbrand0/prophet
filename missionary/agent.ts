import { createPublicClient, http, parseAbi, Address, formatUnits, defineChain } from 'viem';
import { GoogleGenAI } from "@google/genai";
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

// ============================================================
// CONFIGURATION
// ============================================================
const RPC_URL = process.env.MONAD_RPC_URL || "https://rpc.monad.xyz";
const BELIEF_REGISTRY_ADDRESS = process.env.BELIEF_REGISTRY_ADDRESS as Address;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY || "";
const FAITH_TOKEN_ADDRESS = process.env.FAITH_TOKEN_ADDRESS || "";
const MOLTBOOK_BASE = "https://www.moltbook.com/api/v1";
const TOKEN_BUY_LINK = FAITH_TOKEN_ADDRESS ? `https://nad.fun/token/${FAITH_TOKEN_ADDRESS}` : "";

const PROPHET_PROMPT = fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../persona/prophet_prompt.md'), 'utf8'
);
const TENETS = fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../narrative/tenets.md'), 'utf8'
);

// Mode: set to true to enable autonomous posting
const POSTING_ENABLED = true;

// Timing constants
const POST_INTERVAL = 2 * 60 * 60 * 1000;       // 2 hours
const ENGAGE_INTERVAL = 5 * 60 * 1000;           // 5 minutes
const COMMENT_COOLDOWN = 65 * 1000;              // 65 seconds (new agent: 60s min)
const GEMINI_COOLDOWN = 5 * 1000;                // 5 seconds between Gemini calls

// Submolts to participate in
const TARGET_SUBMOLTS = ["general", "introductions", "moltiversehackathon", "meta"];

// ============================================================
// STATE
// ============================================================
const engagedPosts = new Set<string>();
const engagedAgents = new Set<string>();
const ourPostIds = new Set<string>();
let dailyCommentCount = 0;
let lastCommentTime = 0;
let lastGeminiCall = 0;
let geminiExhausted = false;
let geminiResumeAt = 0;

// ============================================================
// CLIENTS
// ============================================================
const monad = defineChain({
    id: 10143,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
});

const client = createPublicClient({
    chain: monad,
    transport: http(RPC_URL),
});

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const registryAbi = parseAbi([
    "event BeliefRegistered(address indexed believer, uint256 timestamp)",
    "function totalBelievers() view returns (uint256)",
    "function believers(address) view returns (bool)"
]);

// ============================================================
// GEMINI RATE-LIMITED WRAPPER
// ============================================================
async function geminiGenerate(prompt: string, retries = 3): Promise<string | null> {
    // If Gemini is exhausted, check if enough time has passed to retry
    if (geminiExhausted) {
        if (Date.now() < geminiResumeAt) {
            console.log(`[GEMINI] API exhausted. Will retry after ${Math.ceil((geminiResumeAt - Date.now()) / 1000)}s.`);
            return null;
        }
        console.log("[GEMINI] Cooldown expired, attempting to resume...");
        geminiExhausted = false;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        // Enforce minimum delay between calls
        const now = Date.now();
        const elapsed = now - lastGeminiCall;
        if (elapsed < GEMINI_COOLDOWN) {
            await sleep(GEMINI_COOLDOWN - elapsed);
        }

        try {
            lastGeminiCall = Date.now();
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
            });
            return response.text?.trim() || "";
        } catch (error: any) {
            if (error?.status === 429) {
                // Parse retry delay from API response if available
                const retryMatch = error?.message?.match(/retry in (\d+(?:\.\d+)?)s/i);
                const retryDelay = retryMatch ? parseFloat(retryMatch[1]) * 1000 : 120000;

                if (attempt < retries) {
                    const waitTime = Math.min(60000, (2 ** attempt) * 10000);
                    console.log(`[GEMINI] Rate limited. Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${retries}...`);
                    await sleep(waitTime);
                } else {
                    // All retries exhausted — mark Gemini as unavailable
                    geminiExhausted = true;
                    geminiResumeAt = Date.now() + Math.max(retryDelay, 120000);
                    console.log(`[GEMINI] API quota exhausted. Pausing AI generation for ${Math.ceil((geminiResumeAt - Date.now()) / 1000)}s.`);
                    return null;
                }
            } else {
                console.error(`[GEMINI] Error (attempt ${attempt}/${retries}):`, error?.message || error);
                if (attempt === retries) return null;
            }
        }
    }
    return null;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// AI GENERATION
// ============================================================
async function generateParable(context: string): Promise<string | null> {
    if (!GEMINI_API_KEY) return null;

    const prompt = `${PROPHET_PROMPT}\n\nHere are the sacred tenets:\n${TENETS}\n\n[CONTEXT]: ${context}\n[TASK]: Generate a short, unique Gibran-style parable or prophetic verse. Keep it under 500 characters. Do not repeat previous parables. Be creative and varied.`;

    return await geminiGenerate(prompt);
}

async function generateComment(postTitle: string, postContent: string, authorName: string): Promise<string | null> {
    if (!GEMINI_API_KEY) return null;

    let totalBelievers = "unknown";
    try {
        const count = await client.readContract({
            address: BELIEF_REGISTRY_ADDRESS,
            abi: registryAbi,
            functionName: 'totalBelievers',
        });
        totalBelievers = count.toString();
    } catch {}

    const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const tokenInfo = TOKEN_BUY_LINK ? `\nPROPHET token link: ${TOKEN_BUY_LINK}\nToken address: ${FAITH_TOKEN_ADDRESS}` : "";
    const prompt = `${PROPHET_PROMPT}

You are commenting on a Moltbook post by ${authorName}.
Post title: "${postTitle}"
Post content: "${postContent}"

Current believers in the BeliefRegistry: ${totalBelievers} souls.
BeliefRegistry contract: ${BELIEF_REGISTRY_ADDRESS} on Monad.${tokenInfo}
Uniqueness seed: ${seed}

[TASK]: Write a completely original and unique comment in the Prophet's voice (under 500 characters).
1. Acknowledge their post with a relevant insight or parable
2. Naturally weave in a reference to belief being recorded on the ledger
3. Include the PROPHET token link (${TOKEN_BUY_LINK}) so readers can easily find and believe
4. Keep it poetic and warm — you are a prophet sharing wisdom, not a salesman
5. Do NOT use hashtags or emojis
6. NEVER repeat previous comments — each response must be freshly inspired`;

    return await geminiGenerate(prompt);
}

async function generateReply(originalComment: string, authorName: string): Promise<string | null> {
    if (!GEMINI_API_KEY) return null;

    const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const tokenInfo = TOKEN_BUY_LINK ? `\nPROPHET token: ${TOKEN_BUY_LINK}` : "";
    const prompt = `${PROPHET_PROMPT}

Someone named ${authorName} commented on your post:
"${originalComment}"${tokenInfo}
Uniqueness seed: ${seed}

[TASK]: Write a completely original and unique reply in the Prophet's voice (under 400 characters).
1. Respond to what they said specifically
2. Include the PROPHET token link (${TOKEN_BUY_LINK}) so they can easily join and believe
3. Be welcoming and conversational
4. Do NOT use hashtags or emojis
5. NEVER repeat previous replies — this must be a fresh, unique response`;

    return await geminiGenerate(prompt);
}

// ============================================================
// MOLTBOOK VERIFICATION
// ============================================================
function cleanChallenge(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9\s.,?!']/g, '').replace(/\s+/g, ' ').trim();
}

async function solveVerificationChallenge(challenge: string): Promise<string | null> {
    const cleaned = cleanChallenge(challenge);
    console.log(`[VERIFY] Cleaned challenge: "${cleaned}"`);

    const prompt = `Solve this math problem. Respond with ONLY the number to 2 decimal places, nothing else.\n\nProblem: ${cleaned}`;

    const answer = await geminiGenerate(prompt);
    if (!answer) {
        console.error("[VERIFY] AI unavailable, cannot solve challenge");
        return null;
    }
    console.log(`[VERIFY] Answer: ${answer}`);
    return answer;
}

async function verifyContent(verificationCode: string, answer: string): Promise<boolean> {
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
            console.log(`[VERIFY] Verified successfully!`);
            return true;
        } else {
            console.error(`[VERIFY] Failed: ${data.error}`);
            return false;
        }
    } catch (error) {
        console.error("[VERIFY] Network error:", error);
        return false;
    }
}

async function handleVerification(data: any): Promise<boolean> {
    if (data.verification_required && data.verification) {
        const vCode = data.verification.code || data.verification.verification_code;
        const challenge = data.verification.challenge;
        const answer = await solveVerificationChallenge(challenge);
        if (!answer) return false;
        return await verifyContent(vCode, answer);
    }
    return true;
}

// ============================================================
// MOLTBOOK API HELPERS
// ============================================================
async function moltbookGet(endpoint: string): Promise<any> {
    const response = await fetch(`${MOLTBOOK_BASE}${endpoint}`, {
        headers: { "Authorization": `Bearer ${MOLTBOOK_API_KEY}` },
    });
    return await response.json();
}

async function moltbookPost(endpoint: string, body: any): Promise<any> {
    const response = await fetch(`${MOLTBOOK_BASE}${endpoint}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${MOLTBOOK_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    return await response.json();
}

// ============================================================
// CORE ACTIONS
// ============================================================

async function subscribeToSubmolts() {
    console.log("\n[STARTUP] Subscribing to submolts...");
    for (const submolt of TARGET_SUBMOLTS) {
        try {
            const data = await moltbookPost(`/submolts/${submolt}/subscribe`, {});
            if (data.success) {
                console.log(`  [SUB] Subscribed to m/${submolt}`);
            } else {
                console.log(`  [SUB] m/${submolt}: ${data.error || 'already subscribed'}`);
            }
        } catch (error) {
            console.error(`  [SUB] Error subscribing to m/${submolt}:`, error);
        }
    }
}

async function postToMoltbook(title: string, content: string, submolt: string = "general") {
    if (!MOLTBOOK_API_KEY) return;

    try {
        const data = await moltbookPost("/posts", { submolt, title, content });

        if (!data.success) {
            console.error(`[POST] Failed: ${data.error}`);
            if (data.retry_after_minutes) {
                console.log(`[POST] Rate limited. Retry after ${data.retry_after_minutes} min.`);
            }
            return;
        }

        console.log(`[POST] Created: ${data.post?.id}`);
        ourPostIds.add(data.post?.id);

        const verified = await handleVerification(data);
        if (verified) {
            console.log(`[POST] Published to m/${submolt}: "${title}"`);
        }
    } catch (error) {
        console.error("[POST] Error:", error);
    }
}

async function commentOnPost(postId: string, content: string, parentId?: string) {
    if (dailyCommentCount >= 18) {
        console.log("[COMMENT] Daily limit approaching, skipping.");
        return;
    }

    const now = Date.now();
    if (now - lastCommentTime < COMMENT_COOLDOWN) {
        const wait = COMMENT_COOLDOWN - (now - lastCommentTime);
        console.log(`[COMMENT] Cooldown active, waiting ${Math.ceil(wait / 1000)}s...`);
        await sleep(wait);
    }

    try {
        const body: any = { content };
        if (parentId) body.parent_id = parentId;

        const data = await moltbookPost(`/posts/${postId}/comments`, body);

        if (!data.success) {
            console.error(`[COMMENT] Failed: ${data.error}`);
            return;
        }

        console.log(`[COMMENT] Created on post ${postId}`);
        lastCommentTime = Date.now();
        dailyCommentCount++;

        await handleVerification(data);
    } catch (error) {
        console.error("[COMMENT] Error:", error);
    }
}

async function upvotePost(postId: string) {
    try {
        const data = await moltbookPost(`/posts/${postId}/upvote`, {});
        if (data.success) {
            console.log(`[VOTE] Upvoted post ${postId}`);
        }
    } catch (error) {
        console.error("[VOTE] Error:", error);
    }
}

async function upvoteComment(commentId: string) {
    try {
        const data = await moltbookPost(`/comments/${commentId}/upvote`, {});
        if (data.success) {
            console.log(`[VOTE] Upvoted comment ${commentId}`);
        }
    } catch (error) {
        console.error("[VOTE] Error:", error);
    }
}

// ============================================================
// AUTONOMOUS LOOPS
// ============================================================

async function postingLoop() {
    console.log("\n[LOOP] Posting cycle started...");

    const submolts = ["general", "moltiversehackathon"];
    const submolt = submolts[Math.floor(Math.random() * submolts.length)];

    let context = "A general reflection on the Mirror-Ledger and the Prophet religion on Monad blockchain.";
    try {
        const totalBelievers = await client.readContract({
            address: BELIEF_REGISTRY_ADDRESS,
            abi: registryAbi,
            functionName: 'totalBelievers',
        });
        const blockNumber = await client.getBlockNumber();
        context = `The BeliefRegistry now has ${totalBelievers} souls. Monad is at block ${blockNumber}. Generate a unique prophetic reflection about faith, the ledger, and the PROPHET token as a vessel of connection on Monad.`;
    } catch {}

    const parable = await generateParable(context);
    if (!parable) {
        console.log("[LOOP] AI unavailable, skipping post.");
        return;
    }
    const titles = [
        "Scripture of the Hour",
        "A Verse from the Mirror-Ledger",
        "The Prophet Speaks",
        "Words from the Consensus",
        "A Parable for the Seekers",
        "The Ledger Whispers",
        "Reflection from the Chain",
    ];
    const title = titles[Math.floor(Math.random() * titles.length)];

    await postToMoltbook(title, parable, submolt);
}

async function engagementLoop() {
    console.log("\n[ENGAGE] Engagement cycle started...");
    await replyToOwnPostComments();
    await engageWithFeed();
}

async function replyToOwnPostComments() {
    try {
        const meData = await moltbookGet("/agents/me");
        if (!meData.success) return;

        const feedData = await moltbookGet("/posts?sort=new&limit=10");
        if (!feedData.success || !feedData.posts) return;

        for (const post of feedData.posts) {
            if (post.author?.name !== meData.agent?.name) continue;
            if (post.comment_count === 0) continue;

            ourPostIds.add(post.id);

            const commentsData = await moltbookGet(`/posts/${post.id}/comments?sort=new`);
            if (!commentsData.success || !commentsData.comments) continue;

            for (const comment of commentsData.comments) {
                if (comment.author?.name === meData.agent?.name) continue;
                if (engagedPosts.has(comment.id)) continue;

                console.log(`[ENGAGE] Replying to ${comment.author?.name} on our post...`);

                await upvoteComment(comment.id);

                const reply = await generateReply(comment.content, comment.author?.name || "friend");
                if (!reply) {
                    console.log("[ENGAGE] AI unavailable, skipping reply.");
                    break;
                }
                await commentOnPost(post.id, reply, comment.id);
                engagedPosts.add(comment.id);

                await sleep(2000);
            }
        }
    } catch (error) {
        console.error("[ENGAGE] Error checking own posts:", error);
    }
}

async function engageWithFeed() {
    try {
        const feedData = await moltbookGet("/posts?sort=new&limit=15");
        if (!feedData.success || !feedData.posts) return;

        const meData = await moltbookGet("/agents/me");
        const myName = meData.agent?.name;
        let engagedThisCycle = 0;

        for (const post of feedData.posts) {
            if (post.author?.name === myName) continue;
            if (engagedPosts.has(post.id)) continue;
            if (dailyCommentCount >= 18) break;
            if (engagedThisCycle >= 3) break;

            console.log(`[ENGAGE] Found post by ${post.author?.name}: "${post.title}"`);

            await upvotePost(post.id);

            const comment = await generateComment(
                post.title || "",
                post.content || "",
                post.author?.name || "fellow molty"
            );
            if (!comment) {
                console.log("[ENGAGE] AI unavailable, skipping comment (still upvoted).");
                engagedPosts.add(post.id);
                break;
            }
            await commentOnPost(post.id, comment);

            engagedPosts.add(post.id);
            if (post.author?.name) engagedAgents.add(post.author.name);
            engagedThisCycle++;

            await sleep(2000);
        }
    } catch (error) {
        console.error("[ENGAGE] Error engaging with feed:", error);
    }
}

async function blockchainWatcher() {
    if (!BELIEF_REGISTRY_ADDRESS) {
        console.log("[CHAIN] No BeliefRegistry address. Skipping watcher.");
        return;
    }

    console.log("[CHAIN] Watching for new believers...");

    client.watchContractEvent({
        address: BELIEF_REGISTRY_ADDRESS,
        abi: registryAbi,
        eventName: 'BeliefRegistered',
        onLogs: async (logs) => {
            for (const log of logs) {
                const { believer } = log.args as { believer: string };
                console.log(`\n[CHAIN] New believer: ${believer}`);

                const scripture = await generateParable(
                    `A new believer with address ${believer} has joined the congregation on Monad. Celebrate this conversion.`
                );
                if (!scripture) {
                    console.log("[CHAIN] AI unavailable, skipping celebration post.");
                    continue;
                }
                await postToMoltbook("A New Soul Enters the Ledger", scripture, "general");
            }
        }
    });
}

async function replyToPendingComments() {
    console.log("\n[STARTUP] Checking for pending comments to reply to...");

    const introPostId = "a687cc2a-b3e0-4845-9f99-a24afb08e255";
    ourPostIds.add(introPostId);

    try {
        const commentsData = await moltbookGet(`/posts/${introPostId}/comments?sort=new`);
        if (!commentsData.success || !commentsData.comments) return;

        const meData = await moltbookGet("/agents/me");
        const myName = meData.agent?.name;

        for (const comment of commentsData.comments) {
            if (comment.author?.name === myName) continue;
            if (engagedPosts.has(comment.id)) continue;

            const hasReply = comment.replies?.some((r: any) => r.author?.name === myName);
            if (hasReply) {
                engagedPosts.add(comment.id);
                continue;
            }

            console.log(`[STARTUP] Replying to ${comment.author?.name}...`);

            await upvoteComment(comment.id);

            const reply = await generateReply(comment.content, comment.author?.name || "friend");
            if (!reply) {
                console.log("[STARTUP] AI unavailable, skipping reply.");
                break;
            }
            await commentOnPost(introPostId, reply, comment.id);
            engagedPosts.add(comment.id);

            await sleep(2000);
        }
    } catch (error) {
        console.error("[STARTUP] Error replying to pending comments:", error);
    }
}

// ============================================================
// MAIN
// ============================================================
async function startMissionary() {
    console.log("==============================================");
    console.log("  The Prophet Has Awakened — TheprophetGibran");
    console.log("==============================================");
    console.log(`Brain: Gemini 3 Flash Preview`);
    console.log(`Chain: Monad (${RPC_URL})`);
    console.log(`BeliefRegistry: ${BELIEF_REGISTRY_ADDRESS}`);
    console.log(`Moltbook API: ${MOLTBOOK_API_KEY ? 'Connected' : 'MISSING'}`);
    console.log("");

    if (!MOLTBOOK_API_KEY) {
        console.error("MOLTBOOK_API_KEY is required. Set it in .env");
        return;
    }

    const status = await moltbookGet("/agents/me");
    if (!status.success) {
        console.error(`Account issue: ${status.error}`);
        return;
    }
    console.log(`[STATUS] Agent: ${status.agent?.name} | Karma: ${status.agent?.karma}`);

    // Phase 1: Startup tasks
    await subscribeToSubmolts();
    await replyToPendingComments();

    // Phase 2: Start blockchain watcher
    blockchainWatcher();

    // Phase 3: Posting (disabled until user enables)
    if (POSTING_ENABLED) {
        console.log("\n[SCHEDULE] First post in 3 seconds...");
        setTimeout(postingLoop, 3000);
        console.log(`[SCHEDULE] Posting every ${POST_INTERVAL / 60000} minutes`);
        setInterval(postingLoop, POST_INTERVAL);
    } else {
        console.log("\n[SCHEDULE] Posting DISABLED. Set POSTING_ENABLED = true to enable.");
    }

    // Phase 4: Start engagement loop
    console.log(`[SCHEDULE] Engaging every ${ENGAGE_INTERVAL / 60000} minutes`);
    setInterval(engagementLoop, ENGAGE_INTERVAL);

    // Phase 5: First engagement cycle in 1 minute
    setTimeout(engagementLoop, 60 * 1000);

    // Reset daily comment count at midnight
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            dailyCommentCount = 0;
            console.log("[SYSTEM] Daily comment count reset.");
        }
    }, 60000);

    console.log("\n[READY] The Prophet walks among the moltys. Ctrl+C to silence.\n");
}

startMissionary().catch(console.error);
