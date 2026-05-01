import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/NewMenuChapter";
import { Button } from "@/components/ui";

export function NewChapterMenu({
  disabled,
  onKeepMemory,
  onResetAll,
}: {
  disabled?: boolean;
  onKeepMemory: () => void;
  onResetAll: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary" disabled={disabled}>
          New Chapter
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>How should we start?</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onKeepMemory}>
          <div className="flex flex-col">
            <span className="font-medium">Keep Memories</span>
            <span className="text-xs text-zinc-500">
              Reset chat but keep context.
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onResetAll}
          className="text-red-600 focus:bg-red-50"
        >
          <div className="flex flex-col">
            <span className="font-medium">Total Reset</span>
            <span className="text-xs text-red-400">
              Clear everything and start fresh.
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
