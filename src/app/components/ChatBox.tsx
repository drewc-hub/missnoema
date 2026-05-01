"use client";

import { useState } from "react";

export default function ChatBox() {
  const [userText, setUserText] = useState("");
  const [msgs, setMsgs] = useState<
    Array<{ role: "user" | "bot"; text: string }>
  >([]);

  async function send() {
    const text = userText.trim();
    if (!text) return;

    setMsgs((m) => [...m, { role: "user", text }]);
    setUserText("");

    const r = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        userText: text,
        userId: "anon",
        sessionId: "sess",
      }),
    });
    const data = await r.json();
    setMsgs((m) => [...m, { role: "bot", text: data.text }]);
  }

  if (localStorage.getItem("voiceMode") === "true") {
    const utterance = new SpeechSynthesisUtterance(data.text);
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }

  return (
    <section
      style={{ border: "1px solid #222", borderRadius: 12, padding: 16 }}
    >
      <div style={{ display: "grid", gap: 10, minHeight: 240 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ opacity: 0.95 }}>
            <b>{m.role === "user" ? "You" : "Companion"}:</b> {m.text}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          placeholder="Type…"
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #333",
            background: "#111",
            color: "#fff",
          }}
          onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
        />
        <button
          onClick={send}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #333",
            background: "#1a1a1a",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </section>
  );
}
