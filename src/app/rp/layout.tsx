import type { ReactNode } from "react";
import { NoemaAppShell } from "@/components/NoemaAppShell";
import { NoemaTopNav } from "@/components/NoemaTopNav";

export default function RpLayout({ children }: { children: ReactNode }) {
  return (
    <NoemaAppShell>
      <NoemaTopNav title="Roleplay" />
      <div className="min-w-0 flex-1">{children}</div>
    </NoemaAppShell>
  );
}
