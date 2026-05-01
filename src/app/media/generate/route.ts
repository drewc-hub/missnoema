import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { generateSafeImage } from "@/lib/gen/openai-image";
import { generateAdultImage } from "@/lib/gen/replicate-image";
import { generateAdultVideo } from "@/lib/gen/replicate-video";

export async function POST(req: Request) {
  const user = await getAuthedUser();

  const body = await req.json();
  const { prompt, contentRating, type } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  try {
    if (contentRating === "SAFE") {
      const url = await generateSafeImage(prompt);

      return NextResponse.json({
        provider: "openai",
        url,
      });
    }

    if (contentRating === "ADULT") {
      if (!isAdultAllowed(user)) {
        return NextResponse.json(
          { error: "Age verification required." },
          { status: 403 },
        );
      }

      if (type === "video") {
        const url = await generateAdultVideo(prompt);
        return NextResponse.json({ provider: "replicate", url });
      }

      const url = await generateAdultImage(prompt);

      return NextResponse.json({
        provider: "replicate",
        url,
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
