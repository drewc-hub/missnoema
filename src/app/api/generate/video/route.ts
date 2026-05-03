import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { coerceRating, requireAdultAllowed } from "@/lib/ratings";
import { GenerationType, ContentRating } from "@prisma/client";
import { getMediaCost, getMediaIntensity } from "@/lib/mediaPrompt";

const Schema = z.object({
    companionId: z.string().min(1),
    prompt: z.string().min(5).max(1000),
    contentRating: z.enum(["SAFE", "ADULT"]).optional(),
});

export async function POST(req: Request) {
    const user = await getAuthedUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();

    const parsed = Schema.safeParse({
        companionId: form.get("companionId"),
        prompt: form.get("prompt"),
        contentRating: form.get("contentRating") ?? undefined,
    });

    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const rating = coerceRating(parsed.data.contentRating);

    const companion = await prisma.companion.findUnique({
        where: { id: parsed.data.companionId },
        select: {
            id: true,
            slug: true,
            contentRating: true,
        },
    });

    if (!companion) {
        return NextResponse.json({ error: "Companion not found" }, { status: 404 });
    }

    const finalRating =
        companion.contentRating === ContentRating.ADULT
            ? ContentRating.ADULT
            : rating;

    if (finalRating === ContentRating.ADULT) {
        try {
            requireAdultAllowed(user);
        } catch {
            return NextResponse.json(
                { error: "Age verification required for adult content." },
                { status: 403 },
            );
        }
    }

    const conversation = await prisma.conversation.findUnique({
        where: {
            userId_companionId: {
                userId: user.id,
                companionId: companion.id,
            },
        },
        select: {
            trust: true,
            intimacy: true,
        },
    });

    const intensity = getMediaIntensity({
        trust: conversation?.trust ?? 0,
        intimacy: conversation?.intimacy ?? 0,
        platformMax: 3,
    });

    const cost = getMediaCost(intensity, "video");

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { coinBalance: true },
    });

    if (!dbUser || dbUser.coinBalance < cost) {
        return NextResponse.json(
            { error: "Not enough coins" },
            { status: 402 },
        );
    }

    // Atomically deduct coins and create the job to prevent double-spend races.
    try {
        await prisma.$transaction(async (tx) => {
            const deducted = await tx.user.updateMany({
                where: { id: user.id, coinBalance: { gte: cost } },
                data: { coinBalance: { decrement: cost } },
            });
            if (deducted.count === 0) throw new Error("insufficient_coins");

            await tx.coinTransaction.create({
                data: {
                    userId: user.id,
                    amount: -cost,
                    kind: "spend",
                    description: `Video generation job`,
                },
            });

            await tx.generationJob.create({
                data: {
                    userId: user.id,
                    companionId: companion.id,
                    type: GenerationType.VIDEO,
                    contentRating: finalRating,
                    prompt: parsed.data.prompt,
                },
            });
        });
    } catch {
        return NextResponse.json(
            { error: "Not enough coins" },
            { status: 402 },
        );
    }

    return NextResponse.redirect(
        new URL(
            `/companions/${companion.slug}`,
            process.env.BASE_URL ?? "https://missnoema.com",
        ),
    );
}
