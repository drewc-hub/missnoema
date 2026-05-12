// file: src/app/api/companions/[slug]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { ContentRating, Visibility } from "@prisma/client";
import { CompanionProfileSchema } from "@/lib/companion-profile";

export const runtime = "nodejs";

const UpdateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(1000),
  tags: z.array(z.string()).optional().default([]),
  archetype: z.string().optional().nullable(),
  visibility: z
    .enum(["PUBLIC", "UNLISTED", "PRIVATE"])
    .optional()
    .default("UNLISTED"),
  contentRating: z.enum(["SAFE", "ADULT"]).optional().default("SAFE"),
  profile: CompanionProfileSchema.optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const existing = await prisma.companion.findFirst({
    where: {
      slug,
      ownerId: user.id,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const data = parsed.data;
  const profile = CompanionProfileSchema.parse(data.profile ?? {});
  const contentRating =
    data.contentRating === "ADULT" ? ContentRating.ADULT : ContentRating.SAFE;

  if (contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json(
      { error: "Age verification required." },
      { status: 403 },
    );
  }

  const updated = await prisma.companion.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      description: data.description,
      tags: data.tags,
      archetype: data.archetype ?? null,
      visibility: data.visibility as Visibility,
      contentRating,
      profile: profile as any,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      contentRating: true,
      visibility: true,
    },
  });

  return NextResponse.json({
    ok: true,
    companion: updated,
    editUrl:
      updated.contentRating === ContentRating.ADULT
        ? `/adult/companions/${updated.slug}/edit`
        : `/companions/${updated.slug}/edit`,

    viewUrl:
      updated.contentRating === ContentRating.ADULT
        ? `/adult/companions/${updated.slug}`
        : `/companions/${updated.slug}`,
  });
}
