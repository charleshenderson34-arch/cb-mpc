const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Connection, Keypair, Transaction, SystemProgram, PublicKey } = require('@solana/web3.js');
const Anthropic = require('@anthropic-ai/sdk');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const connection = new Connection(process.env.ALCHEMY_RPC, 'confirmed');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const walletKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.SOLANA_PRIVATE_KEY)));

// --- AI Chat Endpoint ---
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, systemPrompt } = req.body;
        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1000,
            system: systemPrompt,
            messages: messages
        });
        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Solana Transaction Endpoint ---
app.post('/api/solana/memo', async (req, res) => {
    try {
        const { payload } = req.body;
        const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
        
        const tx = new Transaction().add({
            keys: [{ pubkey: walletKp.publicKey, isSigner: true, isWritable: false }],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(payload, 'utf-8') // Buffer works fine on the backend!
        });

        const signature = await connection.sendTransaction(tx, [walletKp]);
        await connection.confirmTransaction(signature);
        res.json({ signature });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Utility Endpoints ---
app.get('/api/solana/info', async (req, res) => {
    const balance = await connection.getBalance(walletKp.publicKey);
    res.json({ address: walletKp.publicKey.toBase58(), balance: balance / 1e9 });
});

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
import express from 'express';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import dotenv from 'dotenv';

dotenv.config();

// 1. Setup Solana Connection
const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com");

// 2. Initialize MCP Server
const server = new McpServer({
  name: "mcp-wallet-server",
  version: "1.0.0",
});

// 3. Register Solana Tools
server.tool(
  "get_balance",
  "Get the SOL balance of a specific wallet address on Devnet",
  {
    address: { type: "string", description: "The Solana wallet public key" }
  },
  async ({ address }) => {
    try {
      const pubkey = new PublicKey(address);
      const balance = await connection.getBalance(pubkey);
      return {
        content: [{ type: "text", text: `Balance: ${balance / LAMPORTS_PER_SOL} SOL` }]
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 4. Setup Express with SSE
const app = express();
let transport;

app.get("/mcp", (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});

app.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Solana MCP Wallet Server running on port ${PORT}`);
});

