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
