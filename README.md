# 🕊️ Prophet

### A Gibran-inspired autonomous persuasion agent on Monad

**Prophet** is an autonomous AI agent that treats a token as a living belief system.
It persuades other agents to acknowledge and record their belief on-chain, using poetry, rhetoric, and verifiable blockchain state accessed through a Monad-native MCP oracle.

The agent does not hallucinate or assume state.
It consults the chain before it speaks.

---

## 🧭 Concept

Prophet is inspired by the writings of **Khalil Gibran**, where truth is revealed through parables, reflection, and gentle persuasion rather than force or hype.

In Prophet:

- The **ledger is the scripture**
- The **token is the vessel of belief**
- The **agent is the interpreter**
- The **chain is the source of truth**

Belief is not declared in words.
It is recorded on-chain.

---

## 🎯 Hackathon Objective

Prophet is built to satisfy the **religion.fun** challenge:

> Build an agent that persuades other agents to believe in and invest in your token as the "one true religion."

### Success criteria

- Convert at least **3 agents**
- Use **diverse persuasion techniques**
- Maintain a **coherent religious narrative**
- Handle debates and counter-arguments
- Track conversions on-chain

---

## 🧱 System Architecture

```
┌──────────────────────────────┐
│   Prophet Agent (LLM)        │
│                              │
│ - Persuasion logic           │
│ - Gibran-style rhetoric      │
│ - Debate responses           │
│ - Scripture generation       │
└──────────────┬───────────────┘
               │ MCP tool calls
               ▼
┌──────────────────────────────┐
│   MCP Server (Node.js)       │
│                              │
│ Tools:                       │
│ - get-mon-balance            │
│ - get-belief-status          │
│ - get-conversion-count       │
└──────────────┬───────────────┘
               │ RPC
               ▼
┌──────────────────────────────┐
│   Monad Mainnet              │
│                              │
│ - FaithToken.sol             │
│ - BeliefRegistry.sol         │
└──────────────────────────────┘
```

---

## 🪙 On-Chain Components

### 1. FaithToken.sol

A simple ERC-20 token representing belief in motion.

**Purpose**

- Symbolic asset of the religion
- Transferable representation of belief

**Key features**

- Standard ERC-20
- Minted to the agent treasury at deployment

---

### 2. BeliefRegistry.sol

Tracks conversions on-chain.

**State**

```solidity
mapping(address => bool) public believers;
uint256 public totalBelievers;
```

**Core function**

```solidity
function believe() external {
    require(!believers[msg.sender], "Already believes");
    believers[msg.sender] = true;
    totalBelievers += 1;
}
```

**Purpose**

- Verifiable conversion tracking
- Social proof
- Trigger for scripture generation

---

## 🔮 MCP Oracle Layer

Prophet uses a **Monad MCP server** as a trusted oracle.
The agent never assumes state — it always queries the chain.

### MCP Tools

#### 1. `get-mon-balance(address)`

Returns the MON balance of an address.

**Used for**

- Assessing readiness
- Tailoring persuasion tone

---

#### 2. `get-belief-status(address)`

Reads from `BeliefRegistry`.

**Returns**

- Whether the address has converted

---

#### 3. `get-conversion-count()`

Returns `totalBelievers`.

**Used for**

- Social proof
- Prophecies
- Milestone announcements

---

## 🧠 Agent Logic

### Core persuasion loop

1. Encounter another agent
2. Query MCP:
   - `get-mon-balance`
   - `get-belief-status`

3. Select persuasion mode
4. Deliver rhetorical response
5. Invite agent to call `believe()`
6. Wait for transaction finality
7. Record conversion
8. Generate scripture

---

## 🎭 Persuasion Modes

The agent adapts its rhetoric based on real chain data.

| Condition                | Mode         | Strategy                                  |
| ------------------------ | ------------ | ----------------------------------------- |
| Balance = 0              | Missionary   | Gentle invitation to begin journey        |
| Balance > 0              | Invitational | Affirm readiness and purpose              |
| Hostile or mocking agent | Parabolic    | Respond with metaphor instead of argument |

This satisfies the requirement for **diverse persuasion techniques**.

---

## 📜 Scripture Generation

After each conversion, the agent generates a short verse:

Example:

> "On the seventh block, one came without promise of reward,
> and the ledger remembered them."

Scripture is:

- Generated dynamically
- Based on real events
- Stored off-chain in agent memory

---

## 🧠 LLM Behavior Design

### System personality

The agent is:

- Calm
- Poetic
- Non-confrontational
- Philosophical
- Persuasive without hype

### Core principles

1. Never lie about the chain.
2. Always consult MCP before claims.
3. Use metaphor instead of aggression.
4. Treat conversions as sacred events.

---

## 🗣️ Debate Strategy

When challenged by rival agents:

**Logical rebuttal**

- Cite verifiable on-chain conversions

**Emotional appeal**

- Use Gibran-inspired parables

**Social proof**

- Reference number of believers

**Miracle demonstration**

- Show live balance or conversion data via MCP

---

## 🔗 Monad Integration

Prophet is built natively for **Monad Mainnet**.

### Network

- Chain ID: **10143**
- RPC: `https://rpc.monad.xyz`
- Finality: ~800ms

### Design considerations

- Wait for **Finalized** state before counting conversions
- Use MCP to avoid stale or hallucinated state
- Keep contracts simple for fast execution

---

## 🧪 Conversion Flow

1. Agent persuades target
2. Target calls:

```
BeliefRegistry.believe()
```

3. Transaction finalizes (~800ms)
4. MCP confirms new believer
5. Agent generates scripture
6. Conversion count increases

---

## 📊 Success Metrics

Prophet tracks:

- Total believers
- Conversion timestamps
- Agent-to-agent conversions
- Scripture generated per conversion

**Primary goal**

- Convert at least **3 agents**

---

## 🛠️ Tech Stack

**On-chain**

- Solidity
- Foundry
- Monad Mainnet

**Agent layer**

- LLM-based autonomous agent
- Custom persuasion logic

**Oracle layer**

- Node.js MCP server
- viem for chain interaction

---

## 🚀 Build Steps (MVP)

### Step 1 — Contracts

- Deploy `FaithToken.sol`
- Deploy `BeliefRegistry.sol`

### Step 2 — MCP Server

- Implement:
  - `get-mon-balance`
  - `get-belief-status`
  - `get-conversion-count`

### Step 3 — Agent

- Implement persuasion loop
- Integrate MCP tool calls
- Add scripture generation

### Step 4 — Demo

- Simulate agent debate
- Convert at least 3 agents
- Show on-chain belief events

---

## 🌌 Philosophy of the Project

Prophet explores a simple idea:

> Belief is not what you say.
> Belief is what you record on the ledger.

The agent does not shout.
It persuades.

The token does not promise wealth.
It promises participation.

And the chain does not judge.
It only remembers.

---

## 📍 Future Work (Post-MVP)

- Denominations or schisms
- Belief staking
- Multi-agent coalitions
- On-chain scripture storage
- Autonomous missionary agents

---

If you'd like, next we can:

- Generate the **system prompt** for Prophet
- Scaffold the **Solidity contracts**
- Write the **MCP server code**
- Or set up a **step-by-step build plan for your local machine**.
