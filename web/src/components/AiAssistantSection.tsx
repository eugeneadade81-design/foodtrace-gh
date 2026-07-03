import { useRef, useState } from "react";
import { apiBase } from "../lib/api";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Is it safe to eat food past the expiry date?",
  "How do I store fish without a fridge?",
  "Are mouldy groundnuts dangerous?",
  "How do I treat malaria?",
];

export function AiAssistantSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const history = next.slice(-10, -1);
      const res = await fetch(`${apiBase}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = typeof data.reply === "string" && data.reply.trim()
        ? data.reply
        : "Sorry, I couldn't respond. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Could not reach the assistant. Check your connection and try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    }
  }

  return (
    <section style={{ background: "#11161b", borderRadius: 18, padding: 20, marginTop: 22, border: "1px solid rgba(119,199,162,0.16)" }}>
      <p style={{ color: "#77c7a2", fontSize: 12, fontWeight: 600, letterSpacing: 1, margin: 0 }}>AI HELPER</p>
      <h2 style={{ margin: "4px 0 2px", color: "#f4f4ef", fontSize: 20 }}>Food &amp; Drug Assistant</h2>
      <p style={{ color: "#a9c7b8", fontSize: 14, marginTop: 0 }}>Ask about food safety, medicine storage, recalls, or how to use FoodTrace.</p>

      <div ref={scrollRef} style={{ maxHeight: 320, overflowY: "auto", display: "grid", gap: 8, margin: "12px 0", padding: 4 }}>
        {messages.length === 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "#8aa79a", fontSize: 13 }}>Try one of these:</div>
            {SUGGESTIONS.map((q) => (
              <button key={q} onClick={() => void send(q)} style={suggestion}>{q}</button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "82%", padding: "10px 14px", borderRadius: 14, fontSize: 14, lineHeight: 1.5,
                background: m.role === "user" ? "#c4f1db" : "#0d1216",
                color: m.role === "user" ? "#12392d" : "#e8f0ec",
                border: m.role === "user" ? "none" : "1px solid rgba(119,199,162,0.14)",
              }}>{m.content}</div>
            </div>
          ))
        )}
        {loading ? <div style={{ color: "#8aa79a", fontSize: 13 }}>Thinking…</div> : null}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void send(input); }}
          placeholder="Ask a question…"
          style={{ flex: 1, background: "#192027", color: "#f4f4ef", border: "1px solid rgba(119,199,162,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 14 }}
        />
        <button onClick={() => void send(input)} disabled={!input.trim() || loading}
          style={{ background: "#77c7a2", color: "#05080b", border: "none", borderRadius: 8, padding: "0 18px", fontWeight: 600, cursor: "pointer", opacity: !input.trim() || loading ? 0.6 : 1 }}>
          Send
        </button>
      </div>
    </section>
  );
}

const suggestion = {
  textAlign: "left" as const, background: "#0d1216", color: "#cdd8d2", border: "1px solid rgba(119,199,162,0.14)",
  borderRadius: 10, padding: "10px 12px", fontSize: 13, cursor: "pointer",
};
