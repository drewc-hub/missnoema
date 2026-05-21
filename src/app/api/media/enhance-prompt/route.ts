import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { companionGenerate } from "@/lib/ai-client";

export const runtime = "nodejs";

const TARGET = 1500;

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return NextResponse.json({ error: "No prompt provided." }, { status: 400 });
  if (prompt.length <= TARGET) return NextResponse.json({ ok: true, enhanced: prompt });

  const enhanced = await companionGenerate(
    "You are an expert image generation prompt engineer. Compress prompts efficiently while preserving all visual detail.",
    [{ role: "user", content: `Compress the following prompt to under ${TARGET} characters while preserving every important visual detail — subject, style, lighting, composition, colors, mood, and any character-specific descriptors. Use efficient comma-separated tag style where possible. Remove filler words and redundancy. Output ONLY the compressed prompt, nothing else.\n\nOriginal prompt:\n${prompt}` }],
  );
  return NextResponse.json({ ok: true, enhanced, originalLength: prompt.length, enhancedLength: enhanced.length });
}
