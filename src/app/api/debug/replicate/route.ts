import { NextResponse } from "next/server";
import Replicate from "replicate";
import crypto from "crypto";

export const runtime = "nodejs";

function fp8(v: string) {
  return crypto.createHash("sha256").update(v).digest("hex").slice(0, 8);
}

export async function GET() {
  const raw = process.env.REPLICATE_API_TOKEN ?? "";
  const token = raw.replace(/\s+/g, "");

  return (async () => {
    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing REPLICATE_API_TOKEN",
          diag: { rawLen: raw.length },
        },
        { status: 500 },
      );
    }

    const replicate = new Replicate({ auth: token });

    try {
      const out = await replicate.run("black-forest-labs/flux-dev", {
        input: { prompt: "test image: a red apple on a table" },
      });

      return NextResponse.json({
        ok: true,
        diag: {
          rawLen: raw.length,
          cleanedLen: token.length,
          rawHasWhitespace: /\s/.test(raw),
          fp8: fp8(token),
          outType: typeof out,
          sample: Array.isArray(out) ? out[0] : out,
        },
      });
    } catch (e: any) {
      return NextResponse.json(
        {
          ok: false,
          error: e?.message ?? String(e),
          diag: {
            rawLen: raw.length,
            cleanedLen: token.length,
            rawHasWhitespace: /\s/.test(raw),
            fp8: fp8(token),
          },
        },
        { status: 500 },
      );
    }
  })();
}
