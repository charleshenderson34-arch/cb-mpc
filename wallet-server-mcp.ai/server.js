import express from 'express';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import bs58 from 'bs58'; // You may need to: npm install bs58
import dotenv from 'dotenv';

dotenv.config();

const connection = new Connection(process.env.SOLANA_RPC_URL);

// 1. Initialize the Server Wallet
// Expects a Base58 string or a JSON array string in your .env
const secretKeyString = process.env.SOLANA_PRIVATE_KEY;
const serverWallet = Keypair.fromSecretKey(
  secretKeyString.startsWith('[') 
    ? Uint8Array.from(JSON.parse(secretKeyString)) 
    : bs58.decode(secretKeyString)
);

const server = new McpServer({
  name: "mcp-wallet-server",
  version: "1.0.0",
});

// 2. Add the Transfer Tool
server.tool(
  "transfer_sol",
  "Send SOL from the server wallet to another address on Devnet",
  {
    to: { type: "string", description: "The recipient's public key" },
    amount: { type: "number", description: "Amount of SOL to send" }
  },
  async ({ to, amount }) => {
    try {
      const recipient = new PublicKey(to);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: serverWallet.publicKey,
          toPubkey: recipient,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      const signature = await connection.sendTransaction(transaction, [serverWallet]);
      
      // Optional: Wait for confirmation
      await connection.confirmTransaction(signature);

      return {
        content: [{ 
          type: "text", 
          text: `Successfully sent ${amount} SOL. Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet` 
        }]
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Transfer failed: ${err.message}` }], isError: true };
    }
  }
);

// (Keep the Express/SSE setup from the previous step here...)

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

