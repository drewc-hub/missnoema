"use client";

import { useChat } from "../hooks/useChat";
import MessageBubble from "@/components//MessageBubble";
import ChatInput from "@/components/ChatInput";

export default function ChatWindow() {
  const { messages, sendMessage } = useChat();

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map((m, i) => (
          <MessageBubble key={i} {...m} />
        ))}
      </div>
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
