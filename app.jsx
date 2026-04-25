import React, { useState } from 'react';

const NexusInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pendingTool, setPendingTool] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const data = await response.json();

      // Check if the AI wants to use a tool (e.g., transfer_sol)
      if (data.toolUse) {
        setPendingTool(data.toolUse);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmTransaction = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/confirm-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolCallId: pendingTool.id, arguments: pendingTool.input }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.result.content[0].text }]);
      setPendingTool(null);
    } catch (err) {
      alert("Transaction failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>NEXUS — Solana AI</h2>
      
      <div style={{ height: '400px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '10px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <span style={{ background: m.role === 'user' ? '#007bff' : '#eee', color: m.role === 'user' ? 'white' : 'black', padding: '8px', borderRadius: '10px' }}>
              {m.text}
            </span>
          </div>
        ))}
        {loading && <p>Thinking...</p>}
      </div>

      <form onSubmit={handleSend}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." style={{ width: '80%', padding: '10px' }} />
        <button type="submit" style={{ width: '18%', padding: '10px' }}>Send</button>
      </form>

      {/* Confirmation Modal */}
      {pendingTool && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
            <h3>Confirm Transaction</h3>
            <p>The AI wants to <strong>{pendingTool.name}</strong>:</p>
            <pre style={{ background: '#f4f4f4', padding: '10px' }}>
              {JSON.stringify(pendingTool.input, null, 2)}
            </pre>
            <button onClick={confirmTransaction} style={{ background: '#28a745', color: 'white', padding: '10px 20px', marginRight: '10px', border: 'none', cursor: 'pointer' }}>Approve</button>
            <button onClick={() => setPendingTool(null)} style={{ background: '#dc3545', color: 'white', padding: '10px 20px', border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NexusInterface;
