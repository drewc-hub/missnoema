// file: src/app/companions/new/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";

export default async function NewCompanionPage() {
  const user = await getAuthedUser();
  if (!user) {
    redirect("/login");
  }

  const allowAdult = isAdultAllowed(user);

  const draftCompanion = {
    id: "",
    slug: "",
    name: "",
    description: "",
    tags: [],
    profile: {
      scene: "",
      background: "",
      personality: "",
      wardrobe: "",
      traits: [],
      sliders: {
        warmth: 50,
        humor: 50,
        flirtiness: allowAdult ? 35 : 10,
        dominance: 25,
      },
      boundaries: allowAdult
        ? ["adults only", "no coercion", "no underage themes", "no incest"]
        : ["no explicit sexual content", "no coercion", "no underage themes"],
    },
    contentRating: "SAFE" as const,
  };

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Create your companion
          </h1>
          <p className="text-sm text-zinc-400">
            Build your companion profile first. After saving, you can generate
            photos and video.
          </p>
        </div>

        <Badge tone={allowAdult ? "adult" : "safe"}>
          {allowAdult ? "SAFE + ADULT allowed" : "SAFE only"}
        </Badge>
      </div>

      <Card>
        <CardHeader
          title="New companion"
          subtitle="Fill out the profile and save it. Media generation unlocks after the companion exists."
        />
        <CardBody>
          <CompanionBuilder
            mode="create"
            allowAdult={allowAdult}
            userEmail={user.email ?? null}
            companion={draftCompanion}
          />
        </CardBody>
      </Card>
    </main>
  );
}
