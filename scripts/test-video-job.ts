// scripts/test-video-job.ts
// Creates a test VIDEO job and polls until it reaches a terminal state.
// Run with: dotenv -e .env -- tsx scripts/test-video-job.ts
import "dotenv/config";
import { PrismaClient, JobStatus, GenerationType, ContentRating } from "@prisma/client";

const prisma = new PrismaClient();
const POLL_MS = 4_000;
const TIMEOUT_MS = 12 * 60_000; // 12 min (video can take a while)

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // Pick the first available user + companion
  const user = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!user) throw new Error("No users in database — seed one first.");

  const companion = await prisma.companion.findFirst({
    select: { id: true, name: true },
  });

  console.log(`[test] using user: ${user.email ?? user.id}`);
  console.log(`[test] using companion: ${companion?.name ?? "(none)"}`);

  const job = await prisma.generationJob.create({
    data: {
      userId: user.id,
      companionId: companion?.id ?? null,
      type: GenerationType.VIDEO,
      status: JobStatus.PENDING,
      contentRating: ContentRating.SAFE,
      prompt: "a woman walking through a peaceful sunlit forest, cinematic, soft light, 4k",
    },
    select: { id: true, status: true, createdAt: true },
  });

  console.log(`[test] created job ${job.id} at ${job.createdAt.toISOString()}`);
  console.log("[test] polling for completion...");

  const deadline = Date.now() + TIMEOUT_MS;

  while (true) {
    await sleep(POLL_MS);

    const updated = await prisma.generationJob.findUniqueOrThrow({
      where: { id: job.id },
      select: {
        id: true,
        status: true,
        resultUrl: true,
        error: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    console.log(`[test] status: ${updated.status}`);

    if (updated.status === JobStatus.SUCCEEDED) {
      console.log("[test] ✅ SUCCEEDED");
      console.log("[test] result URL:", updated.resultUrl);
      break;
    }

    if (updated.status === JobStatus.FAILED) {
      console.error("[test] ❌ FAILED:", updated.error);
      process.exitCode = 1;
      break;
    }

    if (Date.now() > deadline) {
      console.error("[test] ❌ timed out waiting for job to complete");
      process.exitCode = 1;
      break;
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[test] fatal:", e);
  process.exit(1);
});
