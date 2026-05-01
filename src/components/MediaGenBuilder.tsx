// file: src/components/CompanionBuilder.tsx
import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Textarea,
  Button,
} from "@/components/ui";

export function CompanionBuilder() {
  return (
    <Card>
      <CardHeader title="Companion Builder" subtitle="Basics + personality" />
      <CardBody className="space-y-4 bg-blue-700 bg-opacity-25">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs text-zinc-400">Name</div>
            <Input name="name" placeholder="Nova" />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-zinc-400">Tags</div>
            <Input name="tags" placeholder="romance, cozy" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Personality</div>
          <Textarea
            name="personality"
            rows={6}
            placeholder="Witty, warm, playful..."
          />
        </div>

        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Wardrobe</div>
          <Textarea
            name="wardrobe"
            rows={4}
            placeholder="Outfits, style notes..."
          />
        </div>

        <Button type="button">Save</Button>
      </CardBody>
    </Card>
  );
}
