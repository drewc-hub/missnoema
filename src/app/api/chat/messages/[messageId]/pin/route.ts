import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ messageId: string }> },
) {
    const { messageId } = await params;

    const user = await getAuthedUser();
    if (!user) {
        return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    if (user.suspendedAt) {
        return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    if (!messageId) {
        return NextResponse.json({ error: "Missing messageId." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const isPinned = typeof body?.isPinned === "boolean" ? body.isPinned : true;

    const msg = await prisma.chatMessage.findFirst({
        where: {
            id: messageId,
            conversation: {
                userId: user.id,
            },
        },
        select: {
            id: true,
            isPinned: true,
        },
    });

    if (!msg) {
        return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    if (msg.isPinned === isPinned) {
        return NextResponse.json({
            ok: true,
            message: msg,
        });
    }

    const updated = await prisma.chatMessage.update({
        where: { id: messageId },
        data: { isPinned },
        select: {
            id: true,
            isPinned: true,
        },
    });

    return NextResponse.json({ ok: true, message: updated });
}
