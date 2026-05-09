import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { requireAdultAllowed } from "@/lib/ratings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ContentRating } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(
    _: Request,
    { params }: { params: Promise<{ assetId: string }> },
) {
    const { assetId } = await params;

    const asset = await prisma.companionAsset.findUnique({
        where: { id: assetId },
        select: {
            id: true,
            contentRating: true,
            storageBucket: true,
            storagePath: true,
            publicUrl: true,
        },
    });

    if (!asset) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (asset.contentRating === ContentRating.SAFE && asset.publicUrl) {
        return NextResponse.redirect(asset.publicUrl, {
            headers: { "Cache-Control": "public, max-age=86400, immutable" },
        });
    }

    const user = await getAuthedUser();

    try {
        requireAdultAllowed(user);
    } catch {
        return new NextResponse("Age verification required for adult content.", {
            status: 403,
        });
    }

    // 1-hour signed URL — browser caches the redirect for 55 min so subsequent
    // loads skip this route entirely (no DB query, no Supabase API call).
    const TTL = 3600;
    const { data, error } = await createSupabaseAdminClient().storage
        .from(asset.storageBucket)
        .createSignedUrl(asset.storagePath, TTL);

    if (error || !data?.signedUrl) {
        return NextResponse.json({ error: "sign_failed" }, { status: 500 });
    }

    return NextResponse.redirect(data.signedUrl, {
        headers: {
            "Cache-Control": `private, max-age=${TTL - 60}, immutable`,
        },
    });
}
