// file: src/app/api/media/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { ContentRating } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId: id } = await params;

  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const job = await prisma.generationJob.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
      status: true,
      type: true,
      contentRating: true,
      prompt: true,
      error: true,
      resultUrl: true,
      resultBucket: true,
      resultPath: true,
      companionId: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json(
      { error: "Age verification required." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    job,
  });
}
