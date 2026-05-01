"use client";

import React, { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Button } from "@/components/ui";

type AdultChatGateProps = {
  storageKey?: string;
  children: React.ReactNode;
};

export function AdultChatGate({
  storageKey = "adult_chat_gate_accepted",
  children,
}: AdultChatGateProps) {
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(storageKey)
        : null;

    setAccepted(stored === "1");
    setReady(true);
  }, [storageKey]);

  function accept() {
    window.localStorage.setItem(storageKey, "1");
    setAccepted(true);
  }

  if (!ready) return null;

  if (!accepted) {
    return (
      <main className="mx-auto w-full max-w-2xl py-8">
        <Card>
          <CardHeader
            title="Adult chat notice"
            subtitle="Please confirm before continuing."
          />
          <CardBody>
            <div className="space-y-4 text-sm text-zinc-300">
              <p>This chat is for adults only.</p>
              <p>
                All roleplay and interaction must be fictional and consensual.
              </p>
              <p>
                No underage content. No rape or non-consensual content. No
                illegal sexual content.
              </p>

              <div className="flex gap-2">
                <Button type="button" onClick={accept}>
                  I agree
                </Button>
                <a href="/companions">
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </a>
              </div>
            </div>
          </CardBody>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
