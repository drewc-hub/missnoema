// file: src/components/MediaGenPanel.tsx
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

const IMAGE_PRESETS = ["portrait", "cover", "studio", "cinematic"] as const;
const VIDEO_PRESETS = ["intro", "cinematic", "loop"] as const;

export function MediaPanel({
  loggedIn,
  allowAdult,
  companionId,
  contentRating,
  defaultTag,
}: {
  loggedIn: boolean;
  allowAdult: boolean;
  companionId: string;
  contentRating: "SAFE" | "ADULT";
  defaultTag: string;
}) {
  return (
    <>
      <Card>
        <CardHeader
          title="Image generation"
          subtitle="Preset + tag + prompt"
          right={
            loggedIn ? (
              <Badge tone="safe">Logged in</Badge>
            ) : (
              <Badge>Guest</Badge>
            )
          }
        />
        <CardBody className="space-y-3">
          {!loggedIn ? (
            <a href="/login">
              <Button className="w-full">Login to generate</Button>
            </a>
          ) : (
            <form
              action="/api/generate/image"
              method="post"
              className="space-y-3"
            >
              <input type="hidden" name="companionId" value={companionId} />
              <input type="hidden" name="contentRating" value={contentRating} />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <div className="text-xs text-zinc-400">Preset</div>
                  <select
                    name="preset"
                    defaultValue="cover"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  >
                    {IMAGE_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-zinc-400">Tag</div>
                  <Input
                    name="tag"
                    defaultValue={defaultTag}
                    placeholder="romance"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-zinc-400">Prompt</div>
                <Textarea
                  name="prompt"
                  rows={5}
                  placeholder="Portrait, soft lighting, clean background..."
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Queue image
              </Button>

              {!allowAdult ? (
                <div className="text-xs text-zinc-500">
                  18+ is gated (web-only).
                </div>
              ) : null}
            </form>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Video generation" subtitle="Preset + tag + prompt" />
        <CardBody className="space-y-3">
          {!loggedIn ? (
            <a href="/login">
              <Button className="w-full" variant="secondary">
                Login to generate
              </Button>
            </a>
          ) : (
            <form
              action="/api/generate/video"
              method="post"
              className="space-y-3"
            >
              <input type="hidden" name="companionId" value={companionId} />
              <input type="hidden" name="contentRating" value={contentRating} />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <div className="text-xs text-zinc-400">Preset</div>
                  <select
                    name="preset"
                    defaultValue="intro"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  >
                    {VIDEO_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-zinc-400">Tag</div>
                  <Input
                    name="tag"
                    defaultValue={defaultTag}
                    placeholder="romance"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-zinc-400">Prompt</div>
                <Textarea
                  name="prompt"
                  rows={5}
                  placeholder="5s intro clip, cinematic, friendly..."
                  required
                />
              </div>

              <Button type="submit" variant="secondary" className="w-full">
                Queue video
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </>
  );
}
