"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signup(e: React.FormEvent) {
    e.preventDefault();

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert(error.message);
      return;
    }

    await fetch("/api/auth/provisions", { method: "POST" });
    window.location.href = "/companions";
  }

  return (
    <form onSubmit={signup} className="mx-auto max-w-md p-8 space-y-4">
      <h1 className="text-2xl font-bold">Create account</h1>

      <input
        className="w-full rounded border p-3"
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full rounded border p-3"
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="rounded bg-black px-4 py-2 text-white">
        Sign up
      </button>
    </form>
  );
}
