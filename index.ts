import { createClient } from "npm:@supabase/supabase-js@2.49.8";

type CompanionBatchRow = {
  id: string;
  profile_text: string;
};

type EmbeddingResponse = {
  data?: Array<{ embedding: number[] }>;
  error?: { message?: string };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const BACKFILL_TOKEN = Deno.env.get("BACKFILL_TOKEN");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

async function embedText(input: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY secret");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings failed (${res.status}): ${body}`);
  }

  const payload = (await res.json()) as EmbeddingResponse;
  const embedding = payload.data?.[0]?.embedding;

  if (!embedding || embedding.length !== 1536) {
    throw new Error("Invalid embedding returned (expected 1536 dims)");
  }

  return embedding;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (BACKFILL_TOKEN) {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== BACKFILL_TOKEN) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  const body = await req.json().catch(() => ({}));
  const batchSize = Math.max(1, Math.min(Number(body.batch_size ?? 50), 200));
  const maxBatches = Math.max(1, Math.min(Number(body.max_batches ?? 10), 200));

  let processed = 0;
  let updated = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < maxBatches; i++) {
    const { data, error } = await supabase.rpc("get_companions_for_embedding", {
      batch_size: batchSize,
    });

    if (error) {
      return json({ error: `Failed to fetch batch: ${error.message}` }, 500);
    }

    const rows = (data ?? []) as CompanionBatchRow[];
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      processed += 1;
      try {
        const embedding = await embedText(row.profile_text || "");
        const { error: writeError } = await supabase.rpc(
          "set_companion_profile_embedding",
          {
            p_companion_id: row.id,
            p_embedding: toVectorLiteral(embedding),
          },
        );

        if (writeError) {
          throw new Error(writeError.message);
        }

        updated += 1;
      } catch (e) {
        failed += 1;
        errors.push({ id: row.id, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return json({ processed, updated, failed, errors: errors.slice(0, 20) });
});
