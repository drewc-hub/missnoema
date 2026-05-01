// file: src/app/api/auth/adult-status/route.ts
import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ verified18: false }, { status: 200 });

  return NextResponse.json(
    { verified18: !!user.ageVerifiedAt },
    { status: 200 },
  );
}
