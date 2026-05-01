// file: src/app/(safe)/chat/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionChatWorkspace } from "@/components/CompanionChatWorkspace";

export default async function SafeChatPage() {
  const user = await getAuthedUser();
  if (!user) {
    redirect("/login");
  }

  const allowAdult = isAdultAllowed(user);

  return <CompanionChatWorkspace allowAdult={allowAdult} />;
}
