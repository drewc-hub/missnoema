// file: src/components/footer.tsx
import React from "react";
import { Badge } from "@/components/ui";

function cx(...parts: Array<string | undefined | false>) {
    return parts.filter(Boolean).join(" ");
}

export function Footer({
    brand = "NOEMA",
    year = new Date().getFullYear(),
    className,
}: {
    brand?: string;
    year?: number;
    className?: string;
}) {
    
      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-12 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-zinc-300">Noema AI</p>
            <p>Persistent memory. Adaptive relationships. Immersive AI.</p>
          </div>

          <div className="flex gap-6">
            <a href="/about" className="transition hover:text-white">
              About
            </a>
            <a href="/companions" className="transition hover:text-white">
              Companions
            </a>
            <a href="/adult" className="transition hover:text-pink-400">
              Adult
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
