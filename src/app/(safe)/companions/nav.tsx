// ==============================================
// file: apps/web/src/components/nav.tsx
// ==============================================
import React from "react";
import { Button } from "@/components/ui";

export function TopNav() {
  return (
    <div className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="flex items-center gap-2 py-3">
          <a className="mr-2 text-sm font-semibold tracking-wide" href="/">
            NOMEA
          </a>

          <a className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white" href="/companions">
            Companions
          </a>
          <a className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white" href="/companions/new">
            Create
          </a>
          <a className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white" href="/adult">
            Adult
          </a>

          <div className="ml-auto flex items-center gap-2">
            <a href="/login">
              <Button variant="secondary">Login</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
