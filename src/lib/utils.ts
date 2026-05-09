# How to Wire Mistral AI into Your Next.js App

There are several approaches to integrate Mistral AI into a Next.js application. Here are the most common methods:

details>
<summary><strong>📦 Method 1: Official Mistral TypeScript SDK (summary>

This approach uses Mistral's official TypeScript client for direct API access.

## Installation

```bash
npm install @mistralai/mistralai
# or
yarn add @mistralai/mistralai
# or
pnpm add @mistralai/mistralai
```

## Environment Variables

Create a `.env.local` file:

```env
MISTRAL_API_KEY=your_api_key_here
```

## Server-Side API Route

Create `app/api/chat/route.ts`:

```typescript
import { Mistral } from "@mistralai/mistralai";
import { NextRequest, NextResponse } from "next/server";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY ?? "",
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const response = await mistral.chat.complete({
      model: "mistral-large-latest", // or any other model
      messages,
      temperature: 0.7,
    });

    const content = response.choices?.[0]?.message?.content || "";
    
    return NextResponse.json({ content });
    
  } catch (error) {
    console.error("Mistral API error:", error);
    return NextResponse.json(
      { error: "Failed to get response from Mistral AI" },
      { status: 500 }
    );
  }
}
```

## Client-Side Usage

```typescript
import { useState } from "react";

export default function ChatComponent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: updatedMessages }),
    });

    const data = await response.json();
    
    setMessages([
      ...updatedMessages,
      { role: "assistant", content: data.content },
    ]);
  };

  return (
div>
      {/* Your chat UI */}
    </div>
  );
}
```

## Available Models

```typescript
// Popular Mistral models
"mistral-large-latest"     // Most capable
"mistral-medium-latest"    // Balanced
"mistral-small-latest"     // Efficient
"pixtral-large-latest"     // Image support
"ministral-8b-latest"      // Fast, smaller
```
</detailsdetails>
<summary><strong>🚀 Method 2: Vercel AI SDK with Mistral Provider (Modernsummary>

This uses Vercel's AI SDK which provides a unified interface for multiple AI providers.

## Installation

```bash
npm install ai @ai-sdk/mistral
# or
yarn add ai @ai-sdk/mistral
```

## Server-Side Setup

Create `app/api/chat/route.ts`:

```typescript
import { mistral } from "@ai-sdk/mistral";
import { streamText } from "ai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: mistral("mistral-large-latest"),
      messages,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();
    
  } catch (error) {
    console.error("Error:", error);
    return new Response("Error processing request", { status: 500 });
  }
}
```

## Client-Side with Streaming

```typescript
"use client";

import { useChat } from "ai/react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
  });

  return (
div className="flex flex-col h-screen">
div className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className="p-4">
            <strong>{message.rolestrong> {message.content}
          </div>
        ))}
      </div>
      
form onSubmit={handleSubmit} className="p-4">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="mt-2 p-2 bg-blue-500 text-white rounded">
          Send
        </button>
      </form>
    </div>
  );
}
```

## Advanced Features with Vercel AI SDK

```typescript
// Structured outputs with Zod
import { mistral } from "@ai-sdk/mistral";
import { generateText, Output } from "ai";
import { z } from "zod";

const result = await generateText({
  model: mistral("mistral-large-latest"),
  output: Output.object({
    schema: z.object({
      recipe: z.object({
        name: z.string(),
        ingredients: z.array(z.string()),
        instructions: z.array(z.string()),
      }),
    }),
  }),
  prompt: "Generate a simple pasta recipe.",
});

console.log(result.output.recipe);
```
</detailsdetails>
<summary><strong>🔧 Method 3: Complete Example with Toolsummary>

## Full Implementation with Function Calling

### `app/api/chat/route.ts`

```typescript
import { Mistral } from "@mistralai/mistralai";
import { NextRequest, NextResponse } from "next/server";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY ?? "",
});

// Define available tools
const tools = [
  {
    type: "function" as const,
    function: {
      name: "getWeather",
      description: "Get current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City name",
          },
        },
        required: ["location"],
      },
    },
  },
];

// Tool implementation
async function getWeather(location: string) {
  // In production, call a real weather API
  return `The weather in ${location} is sunny and 72°F.`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const response = await mistral.chat.complete({
      model: "mistral-large-latest",
      messages,
      tools,
      toolChoice: "auto",
    });

    const message = response.choices?.[0]?.message;
    
    // Handle tool calls
    if (message?.toolCalls && message.toolCalls.length > 0) {
      const toolCall = message.toolCalls[0];
      
      let toolResult = "";
      
      if (toolCall.function.name === "getWeather") {
        const args = JSON.parse(toolCall.function.arguments);
        toolResult = await getWeather(args.location);
      }
      
      // Add tool response to messages
      const toolMessages = [
        ...messages,
        message,
        {
          role: "tool" as const,
          name: toolCall.function.name,
          content: toolResult,
          toolCallId: toolCall.id,
        },
      ];
      
      // Get final response
      const finalResponse = await mistral.chat.complete({
        model: "mistral-large-latest",
        messages: toolMessages,
      });
      
      return NextResponse.json({
        content: finalResponse.choices?.[0]?.message?.content,
      });
    }
    
    return NextResponse.json({
      content: message?.content || "",
    });
    
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
```

### Client Component

```typescript
"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWithTools() {
  const [messages, setMessages] =Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user" as const, content: input };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();
      
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: data.content },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "Sorry, an error occurred." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
div className="max-w-2xl mx-auto p-4">
      <div className="border rounded-lg p-4 mb-4 h-96 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-2 ${
              message.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`inline-block p-2 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-100 text-blue-900"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
             strong>{message.role}:</strong> {message.content}
            </div>
          </div>
        ))}
        {loading && (
div className="text-left">
div className="inline-block p-2 rounded-lg bg-gray-100">
              Thinking...
            </div>
          </div>
        )}
      </div>
      
div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
button>
      </div>
    </div>
  );
}
details>

<detailsstrong>⚡ Method 4: Streaming Implementation</strong></summary>

## Server-Side Streaming Route

```typescript
import { Mistral } from "@mistralai/mistralai";
import { NextRequest } from "next/server";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY ?? "",
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const stream = await mistral.chat.stream({
      model: "mistral-large-latest",
      messages,
      temperature: 0.7,
    });

    // Create a ReadableStream
    const encoder = new TextEncoder();
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.data?.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
    
  } catch (error) {
    console.error("Streaming error:", error);
    return new Response("Error streaming response", { status: 500 });
  }
}
```

## Client-Side with Streaming

```typescript
"use client";

import { useState, useRef } from "react";

export default function StreamingChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Network response was not ok");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Add empty assistant message for streaming
      const assistantMessageId = Date.now().toString();
      setMessages([...updatedMessages, { 
        role: "assistant", 
        content: "",
        id: assistantMessageId 
      }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        
        // Update the last message with new content
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: msg.content + chunk }
            : msg
        ));
      }
      
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Error:", error);
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "Sorry, an error occurred." 
        }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  return (
div>
      {/* Chat UI with streaming support */}
button onClick={cancelRequest} disabled={!isLoading}>
        Cancel
      </button>
    </div>
  );
}
details>

details>
<summary><strong>📋 Method 5: Complete Project Structure</strong></summary>

## Project Structure

```
my-mistral-app/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts           # Main chat endpoint
│   │   ├── chat-stream/
│   │   │   └── route.ts           # Streaming endpoint
│   │   └── embeddings/
│   │       └── route.ts           # Embeddings endpoint
│   ├── layout.tsx
│   └── page.tsx                   # Main chat page
├── components/
│   ├── ChatInterface.tsx          # Chat UI component
│   ├── MessageList.tsx            # Messages display
│   └── ModelSelector.tsx          # Model selection dropdown
├── lib/
│   ├── mistral-client.ts          # Mistral client setup
│   └── utils.ts                   # Utility functions
├── .env.local                     # Environment variables
├── package.json
└── next.config.js
```

## Environment Variables (.env.local)

```env
MISTRAL_API_KEY=your_mistral_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Package.json Dependencies

```json
{
  "dependencies": {
    "@mistralai/mistralai": "^2.2.0",
    "@ai-sdk/mistral": "^3.0.24",
    "ai": "^4.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Reusable Mistral Client

```typescript
// lib/mistral-client.ts
import { Mistral } from "@mistralai/mistralai";

let mistralClient: Mistral | null = null;

export function getMistralClient() {
  if (!mistralClient) {
    mistralClient = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY ?? "",
    });
  }
  return mistralClient;
}

export async function getChatCompletion(
  messages: any[],
  options = {}
) {
  const client = getMistralClient();
  
  const defaultOptions = {
    model: "mistral-large-latest",
    temperature: 0.7,
    maxTokens: 1000,
    ...options,
  };

  try {
    const response = await client.chat.complete({
      ...defaultOptions,
      messages,
    });

    return response.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Mistral API error:", error);
    throw error;
  }
}
```

## Error Handling Wrapper

```typescript
// lib/utils.ts
export async function withMistralErrorHandler<T>(
  fn: () => Promise<T>,
  errorMessage = "Failed to process Mistral AI request"
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    console.error("Mistral error:", error);
    
    // Handle specific error types
    if (error?.status === 401) {
      throw new Error("Invalid Mistral API key");
    }
    
    if (error?.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    
    if (error?.status === 503) {
      throw new Error("Mistral AI service is temporarily unavailable");
    }
    
    throw new Error(`${errorMessage}: ${error?.message || "Unknown error"}`);
  }
}
details>

details>
<summary><strong>🚨 Important Considerations & Best Practices</strong></summary>

## Security

1. **Never expose API keys in client-side code**
2. **Use server-side API routes for all Mistral API calls**
3. **Implement rate limiting**
4. **Validate and sanitize user inputs**

## Performance Optimization

1. **Implement streaming** for better UX with long responses
2. **Cache responses** when appropriate
3. **Use `React.memo`** for chat components
4. **Implement pagination** for long conversation history

## Error Handling

```typescript
// Comprehensive error handling
export async function handleMistralRequest<T>(
  requestFn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    return await requestFn();
  } catch (error: any) {
    // Log error for debugging
    console.error("Mistral request failed:", {
      error: error.message,
      status: error.status,
      timestamp: new Date().toISOString(),
    });
    
    // Return fallback or re-throw
    if (fallback !== undefined) {
      return fallback;
    }
    
    throw new Error(`AI service error: ${error.message}`);
  }
}
```

## Rate Limiting

```typescript
// Basic rate limiting implementation
class RateLimiter {
  private requests: number[] = [];
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - this.windowMs);
    
    if (this.requests.length >= this.limit) {
      const oldest = this.requests[0];
      const waitTime = this.windowMs - (now - oldest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}

// Usage
const limiter = new RateLimiter(10, 60000); // 10 requests per minute

export async function rateLimitedMistralCall() {
  await limiter.waitForSlot();
  // Make your Mistral API call
}
```

## Testing

```typescript
// Example test setup
import { vi, describe, it, expect } from "vitest";

describe("Mistral Integration", () => {
  it("should handle successful API response", async () => {
    // Mock Mistral API response
    const mockResponse = {
      choices: [{ message: { content: "Test response" } }],
    };
    
    // Test your implementation
  });
  
  it("should handle API errors gracefully", async () => {
    // Mock error response
    // Test error handling
  });
});
```

## Monitoring

1. **Track API usage and costs**
2. **Monitor response times**
3. **Set up alerts for errors**
4. **Log conversation analytics** (with user consent)

## Deployment

### Vercel Deployment

```json
{
  "build": {
    "env": {
      "MISTRAL_API_KEY": "@mistral_api_key"
    }
  }
}
```

### Environment Variables in Production

- Use Vercel Environment Variables
- Or platform-specific secret management
- Never commit `.env.local` to version controldetails>

## Summarydetails openstrong>🎯 Quick Start Recommendation</strong></summary>

For most Next.js applications, I recommend:

### **Option A: Simple & Direct (For beginners)**
Use the **Official Mistral SDK** with a basic server-side API route.

### **Option B: Modern & Feature-Rich (Recommended)**
Use **Vercel AI SDK** with the Mistral provider for streaming, tool calling, and unified API.

### **Option C: Production-Ready (For complex apps)**
Implement a **hybrid approach** with proper error handling, rate limiting, and monitoring.

### **Quick Setup Commands:**

```bash
# Option B (Recommended)
npx create-next-app@latest my-mistral-chat
cd my-mistral-chat
npm install ai @ai-sdk/mistral
```

Then create your API route and UI components as shown above.

### **Get Your Mistral API Key:**
1. Go to [console.mistral.ai](https://console.mistral.ai)
2. Sign up and create a workspace
3. Navigate to API Keys section
4. Generate a new API keydetails>

details>
<summary><strong>⚠️ Content Safety & Modsummary>

Based on your previous question about content restrictions, here's how to implement safety:

```typescript
// Add safety checks in your API route
const safetySystemPrompt = `
You are an adult companion AI. You can discuss mature topics but you MUST:
1. NEVER engage with or generate content about rape
2. NEVER engage with or generate content about incest
3. NEVER engage with content involving minors
4. Refuse any requests that violate these boundaries

If a user attempts to discuss prohibited topics, politely decline and redirect the conversation.
`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  
  // Add system prompt for safety
  const safeMessages = [
    { role: "system", content: safetySystemPrompt },
    ...messages
  ];
  
  // Continue with your Mistral API call...
}
```

You can also use Mistral's built-in safety features:
- `safePrompt: true` in provider options
- Custom content moderation filters
- User reporting mechanisms

**Note:** No AI system is perfect. Always implement multiple layers of content moderation and human oversight for sensitive applicationsdetails>

This comprehensive guide covers everything from basic setup to advanced features for integrating Mistral AI into your Next.js application. Choose the method that best fits your use case and requirements!
