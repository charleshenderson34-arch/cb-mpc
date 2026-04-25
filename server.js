<style>
:root {
  --sol: #9945FF; --sol2: #14F195; --sol3: #00C2FF;
  --bg: #04050a; --panel: rgba(13,18,33,0.96);
  --border: rgba(153,69,255,0.22); --border2: rgba(20,241,149,0.22);
}
/* IMPORTANT: Change all var(–name) to var(--name) */
.panel { border: 1px solid var(--border); }
/* ... [Fixed CSS for the rest of the file] ... */
</style>

<script>
const BACKEND_URL = 'http://localhost:3000';
let chatHistory = [];

async function askAI(prompt) {
    go('v-ai', document.querySelectorAll('.tab')[1]);
    addMessage('user', prompt);
    const thinking = addMessage('thinking', 'Thinking');
    
    try {
        const res = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [...chatHistory, { role: 'user', content: prompt }],
                systemPrompt: "You are the NEXUS AI assistant..." 
            })
        });
        
        thinking.remove();
        const data = await res.json();
        const text = data.content[0].text;
        
        addMessage('ai', text);
        chatHistory.push({ role: 'user', content: prompt });
        chatHistory.push({ role: 'assistant', content: text });
    } catch (e) {
        thinking.remove();
        addMessage('system', 'Error: ' + e.message);
    }
}

async function sendMemo(payload, logId = 'noc-log') {
    addLog(logId, 'info', '» Sending via Backend...');
    try {
        const res = await fetch(`${BACKEND_URL}/api/solana/memo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload })
        });
        const data = await res.json();
        addLog(logId, 'ok', '» Sig: ' + data.signature.slice(0, 20) + '...');
    } catch (e) {
        addLog(logId, 'err', '» ' + e.message);
    }
}

async function refreshBal() {
    const res = await fetch(`${BACKEND_URL}/api/solana/info`);
    const data = await res.json();
    document.getElementById('wAddr').textContent = data.address;
    document.getElementById('wBal').textContent = data.balance.toFixed(4);
}
// ... [Remaining UI logic] ...
</script>



