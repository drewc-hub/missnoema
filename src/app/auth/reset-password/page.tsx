"use client";

import { useState } from "react";
import { createSupabaseServerClientRoute } from "@/lib/supabase/server";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg("Password updated. You can now sign in.");
  }

  return (
    <main>
      <form onSubmit={onSubmit}>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <button type="submit" disabled={loading}>{loading ? "Saving..." : "Update password"}</button>
      </form>
      {err && <p>{err}</p>}
      {msg && <p>{msg}</p>}
    </main>
  );
}
