import "server-only";
import { getOpenAI } from "@/lib/openai";
import { createClient } from "@supabase/supabase-js";

const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_THRESHOLD = 0.65;
const DEFAULT_COUNT = 6;

// Minimum content length worth embedding — skip very short messages
const MIN_CONTENT_LENGTH = 20;

export async function embedText(text: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function findOrCreateDocument(
  sb: ReturnType<typeof adminClient>,
  supabaseUserId: string,
  conversationId: string,
  companionId: string,
): Promise<number | null> {
  // Try to find existing document for this conversation
  const { data: existing } = await sb
    .from("rag_documents")
    .select("id")
    .eq("title", conversationId)
    .maybeSingle();

  if (existing) return existing.id as number;

  // Create new document
  const { data: created, error } = await sb
    .from("rag_documents")
    .insert({
      owner_id: supabaseUserId,
      title: conversationId,
      source: "chat_memory",
      metadata: { conversationId, companionId },
    })
    .select("id")
    .single();

  if (error) {
    // Race condition — another request created it; try to fetch again
    const { data: retry } = await sb
      .from("rag_documents")
      .select("id")
      .eq("title", conversationId)
      .maybeSingle();
    return (retry?.id as number) ?? null;
  }

  return created.id as number;
}

export async function storeConversationMemory(args: {
  supabaseUserId: string;
  conversationId: string;
  companionId: string;
  content: string;
  role: "user" | "assistant";
  messageId?: string;
}): Promise<void> {
  const { supabaseUserId, conversationId, companionId, content, role, messageId } = args;

  if (content.trim().length < MIN_CONTENT_LENGTH) return;
  // Only index user messages — assistant replies are already in contextMessages
  // and embedding them creates a retrieval feedback loop that causes repetition.
  if (role !== "user") return;

  try {
    const [embedding, sb] = await Promise.all([
      embedText(content),
      Promise.resolve(adminClient()),
    ]);

    const docId = await findOrCreateDocument(sb, supabaseUserId, conversationId, companionId);
    if (!docId) return;

    const { error } = await sb.from("rag_document_sections").insert({
      document_id: docId,
      content,
      embedding: JSON.stringify(embedding),
      metadata: { conversationId, companionId, role, messageId: messageId ?? null },
    });

    if (error) console.error("[memory-rag] section insert:", error.message);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[memory-rag] storeConversationMemory failed:", msg);
  }
}

export async function retrieveConversationMemories(args: {
  conversationId: string;
  queryText: string;
  matchCount?: number;
  matchThreshold?: number;
}): Promise<string[]> {
  const {
    conversationId,
    queryText,
    matchCount = DEFAULT_COUNT,
    matchThreshold = DEFAULT_THRESHOLD,
  } = args;

  if (queryText.trim().length < MIN_CONTENT_LENGTH) return [];

  try {
    const [embedding, sb] = await Promise.all([
      embedText(queryText),
      Promise.resolve(adminClient()),
    ]);

    const { data, error } = await sb.rpc("match_conversation_memories", {
      query_embedding: JSON.stringify(embedding),
      conversation_id: conversationId,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error("[memory-rag] retrieval:", error.message);
      return [];
    }

    return ((data ?? []) as { content: string; metadata?: { role?: string } }[])
      .filter((r) => r.metadata?.role !== "assistant")
      .map((r) => r.content);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[memory-rag] retrieveConversationMemories failed:", msg);
    return [];
  }
}
