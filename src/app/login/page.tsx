"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, next: "/companions" }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }

    setSent(true);
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Login to Noema</h1>

      {sent ? (
        <p className="mt-4">Check your email for the magic link.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            className="w-full rounded border p-3"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <p className="text-red-500">{error}</p>}

          <button className="rounded bg-black px-4 py-2 text-white">
            Send magic link
          </button>
        </form>
      )}
    </main>
  );
}
