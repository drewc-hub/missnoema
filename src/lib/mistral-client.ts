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
