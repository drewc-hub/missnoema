// file: src/app/api/companions/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { ContentRating, Visibility } from "@prisma/client";
import {
  listCompanions,
  AdultVerificationRequiredError,
} from "@/lib/companions";
import { checkBannedThemes, logAudit } from "@/lib/moderation";

export const runtime = "nodejs";

const ProfileSchema = z.object({
  scene: z.string().optional().default(""),
  background: z.string().optional().default(""),
  personality: z.string().optional().default(""),
  wardrobe: z.string().optional().default(""),
  traits: z.array(z.string()).optional().default([]),
  voice: z.string().optional().nullable(),
  sliders: z
    .object({
      warmth: z.number().min(0).max(100).optional().default(50),
      humor: z.number().min(0).max(100).optional().default(50),
      flirtiness: z.number().min(0).max(100).optional().default(10),
      dominance: z.number().min(0).max(100).optional().default(20),
    })
    .optional()
    .default({
      warmth: 50,
      humor: 50,
      flirtiness: 10,
      dominance: 20,
    }),
  boundaries: z.array(z.string()).optional().default([]),
});

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(10).max(1000),
  tags: z.array(z.string()).optional().default([]),
  archetype: z.string().optional().nullable(),
  visibility: z
    .enum(["PUBLIC", "UNLISTED", "PRIVATE"])
    .optional()
    .default("UNLISTED"),
  contentRating: z.enum(["SAFE", "ADULT"]).optional().default("SAFE"),
  profile: ProfileSchema.optional().default({
    scene: "",
    background: "",
    personality: "",
    wardrobe: "",
    traits: [],
    sliders: {
      warmth: 50,
      humor: 50,
      flirtiness: 10,
      dominance: 20,
    },
    boundaries: [],
  }),
});

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

async function uniqueSlug(base: string) {
  const normalized = normalizeSlug(base);
  let slug = normalized;
  let i = 2;

  while (true) {
    const exists = await prisma.companion.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!exists) return slug;
    slug = `${normalized}-${i}`;
    i += 1;
  }
}

export async function GET(req: Request) {
  const user = await getAuthedUser();
  const url = new URL(req.url);

  try {
    const data = await listCompanions({
      user,
      q: url.searchParams.get("q") ?? "",
      tags: url.searchParams.get("tags") ?? "",
      page: Number(url.searchParams.get("page") ?? "1"),
      pageSize: Number(url.searchParams.get("pageSize") ?? "12"),
      includeAdult: url.searchParams.get("includeAdult") === "1",
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AdultVerificationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const contentRating =
    data.contentRating === "ADULT" ? ContentRating.ADULT : ContentRating.SAFE;

  if (contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json(
      { error: "Age verification required." },
      { status: 403 },
    );
  }

  if (user.suspendedAt) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  const textToCheck = [data.name, data.description, data.profile?.personality, data.profile?.background, data.profile?.scene]
    .filter(Boolean)
    .join(" ");
  const themeCheck = checkBannedThemes(textToCheck);
  if (themeCheck.blocked) {
    logAudit(user.id, "banned_theme_blocked", { category: themeCheck.category, route: "companion_create" });
    return NextResponse.json({ error: "Companion description contains prohibited content." }, { status: 400 });
  }

  const slug = await uniqueSlug(data.slug || data.name);

  const companion = await prisma.companion.create({
    data: {
      ownerId: user.id,
      name: data.name,
      slug,
      description: data.description,
      tags: data.tags,
      archetype: data.archetype ?? null,
      visibility: data.visibility as Visibility,
      contentRating,
      profile: data.profile,
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
    companion,
    editUrl:
      companion.contentRating === ContentRating.ADULT
        ? `/adult/companions/${companion.slug}/edit`
        : `/companions/${companion.slug}/edit`,
    viewUrl:
      companion.contentRating === ContentRating.ADULT
        ? `/adult/companions/${companion.slug}`
        : `/companions/${companion.slug}`,
    chatUrl:
      companion.contentRating === ContentRating.ADULT
        ? `/adult/chat?companion=${companion.slug}`
        : `/chat?companion=${companion.slug}`,
  });
}
