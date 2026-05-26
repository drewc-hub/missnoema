import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Visibility } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const slug = new URL(req.url).searchParams.get("slug")?.trim();
    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

    const companion = await prisma.companion.findFirst({
        where: { slug, visibility: Visibility.PUBLIC },
        select: {
            name: true,
            archetype: true,
            gender: true,
            profile: true,
        },
    });

    if (!companion) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(companion);
}
