"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";
import type { NavLink } from "@/lib/nav-links";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidePanelNav({
  sections,
  title = "Menu",
  subtitle = "Navigation + album links",
}: {
  sections: Array<{ title: string; links: NavLink[] }>;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-24">
      <Card className="border-zinc-800-[3px] bg-blue-700/25">
        <CardHeader
          title={title}
          subtitle={subtitle}
          right={<Badge tone="safe">Web</Badge>}
        />
        <CardBody className="space-y-5">
          {sections.map((s) => (
            <div key={s.title} className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {s.title}
              </div>

              <nav className="space-y-1">
                {s.links.map((l) => {
                  const active = isActive(pathname, l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={[
                        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition",
                        active
                          ? "border-zinc-600 bg-zinc-950/60 text-white"
                          : "border-zinc-800 bg-zinc-950/20 text-zinc-300 hover:bg-zinc-950/50 hover:text-white",
                      ].join(" ")}
                    >
                      <span className="truncate">{l.label}</span>
                      {l.badge ? <Badge>{l.badge}</Badge> : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </CardBody>
      </Card>
    </aside>
  );
}
