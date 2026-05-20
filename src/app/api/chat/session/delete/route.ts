import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
    const user = await getAuthedUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.suspendedAt) {
        return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const companionId = searchParams.get("companionId") ?? "";

    if (!companionId) {
        return NextResponse.json({ error: "Missing companionId." }, { status: 400 });
    }

    const updated = await prisma.conversation.updateMany({
        where: {
            userId: user.id,
            companionId,
            deletedAt: null,
        },
        data: {
            deletedAt: new Date(),
            lastActiveAt: new Date(),
        },
    });

    if (updated.count === 0) {
        return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
