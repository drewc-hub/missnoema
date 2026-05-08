// app/page.tsx
// app/page.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export default function Chat() {
    const [input, setInput] = useState("");
    const { messages, sendMessage } = useChat();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage({
                role: "user",
                parts: [{ type: "text", text: input }],
            });
            setInput("");
        }
    };

    return (
        <div>
            {messages.map((message) => (
                <div key={message.id}>
                    <strong>{message.role}:</strong>
                    {message.parts.map((part, i) =>
                        part.type === "text" ? <span key={i}> {part.text}</span> : null
                    )}
                </div>
            ))}

            <form onSubmit={handleSubmit}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Send a message"
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
}
