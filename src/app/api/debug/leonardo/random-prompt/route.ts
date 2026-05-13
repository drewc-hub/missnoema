import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { randomLeonardoPrompt } from "@/lib/gen/leonardo-image";

export const runtime = "nodejs";

export async function POST() {
  const user = await getAuthedUser();
  if (user?.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Admin required." }, { status: 403 });
  }

  try {
    const data = await randomLeonardoPrompt();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Leonardo request failed." },
      { status: 500 },
    );
  }
}
