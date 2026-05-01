// file: src/components/companion-builder.tsx
import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Textarea,
  Button,
  Badge,
} from "@/components/ui";

type BuilderDefaults = {
  companionId: string;
  name: string;
  description: string;
  tags: string[];
  contentRating: "SAFE" | "ADULT";
  profile?: any;
};

function RangeRow({
  name,
  label,
  hint,
  defaultValue,
}: {
  name: string;
  label: string;
  hint: string;
  defaultValue: number;
}) {
  return (
    <label className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-200">{label}</span>
        <span className="text-xs text-zinc-500">{hint}</span>
      </div>
      <input
        name={name}
        type="range"
        min={0}
        max={100}
        defaultValue={defaultValue}
        className="w-full accent-white"
      />
      <div className="flex justify-between text-[11px] text-zinc-600">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </label>
  );
}

export function CompanionBuilder({
  userEmail,
  allowAdult,
  defaults,
}: {
  userEmail?: string | null;
  allowAdult: boolean;
  defaults: BuilderDefaults;
}) {
  const profile = defaults.profile ?? {};

  const personalityDefault =
    typeof profile.personality === "string"
      ? profile.personality
      : typeof profile.style === "string"
        ? profile.style
        : "";

  const wardrobeDefault =
    typeof profile.wardrobe === "string" ? profile.wardrobe : "";

  const sliders = profile.sliders ?? {};
  const warmth = Number(sliders.warmth ?? 60);
  const flirtiness = Number(sliders.flirtiness ?? 40);
  const dominance = Number(sliders.dominance ?? 30);
  const humor = Number(sliders.humor ?? 55);

  return (
    <Card>
      <CardHeader
        title="Companion Builder"
        subtitle="Edit the companion basics + personality knobs."
        right={
          userEmail ? (
            <Badge tone="safe">{userEmail}</Badge>
          ) : (
            <Badge>Guest</Badge>
          )
        }
      />
      <CardBody className="space-y-4">
        <form
          action="/api/companions/update"
          method="post"
          className="space-y-4"
        >
          <input
            type="hidden"
            name="companionId"
            value={defaults.companionId}
          />
          <input
            type="hidden"
            name="contentRating"
            value={defaults.contentRating}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs text-zinc-400">Name</div>
              <Input
                name="name"
                defaultValue={defaults.name}
                placeholder="Nova"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-zinc-400">
                Tags (comma-separated)
              </div>
              <Input
                name="tags"
                defaultValue={defaults.tags.join(", ")}
                placeholder="romance, cozy, fantasy"
              />
              <div className="text-[11px] text-zinc-500">
                Tip: keep 3–6 tags. Use clear labels (e.g. “fantasy”, “mature”,
                “dominant”).
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-zinc-400">Description</div>
            <Textarea
              name="description"
              rows={3}
              defaultValue={defaults.description}
              placeholder="Warm, supportive, playful..."
              required
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs text-zinc-400">Personality</div>
              <Textarea
                name="personality"
                rows={6}
                defaultValue={personalityDefault}
                placeholder="How they speak, vibe, boundaries, what they’re into (no minors, no coercion)..."
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-zinc-400">Wardrobe / look</div>
              <Textarea
                name="wardrobe"
                rows={6}
                defaultValue={wardrobeDefault}
                placeholder="Outfits, accessories, style notes (tasteful)."
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-100">
                  Personality sliders
                </div>
                <div className="text-xs text-zinc-500">
                  These help generation + chat tone.
                </div>
              </div>
              <Badge
                tone={defaults.contentRating === "ADULT" ? "adult" : "safe"}
              >
                {defaults.contentRating}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <RangeRow
                name="warmth"
                label="Warmth"
                hint="cold → caring"
                defaultValue={warmth}
              />
              <RangeRow
                name="humor"
                label="Humor"
                hint="serious → witty"
                defaultValue={humor}
              />
              <RangeRow
                name="flirtiness"
                label="Flirtiness"
                hint="reserved → flirty"
                defaultValue={flirtiness}
              />
              <RangeRow
                name="dominance"
                label="Dominance"
                hint="soft → assertive"
                defaultValue={dominance}
              />
            </div>

            {!allowAdult && defaults.contentRating === "ADULT" ? (
              <div className="mt-3 text-xs text-zinc-500">
                Adult editing is locked until age verification.
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save changes</Button>
            <a href="/companions">
              <Button type="button" variant="secondary">
                Back
              </Button>
            </a>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
