"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

const MIN_LENGTH = 8;

function validate(pw: string) {
  const errs: string[] = [];
  if (pw.length < MIN_LENGTH) errs.push(`At least ${MIN_LENGTH} characters.`);
  if (!/[A-Z]/.test(pw)) errs.push("At least one uppercase letter.");
  if (!/[0-9]/.test(pw)) errs.push("At least one number.");
  return errs;
}

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    if (!code) {
      setError("Invalid or expired reset link.");
      return;
    }
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
      if (err) {
        setError("Reset link is invalid or has expired. Please request a new one.");
      } else {
        setReady(true);
      }
    });
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationErrors([]);
    setError(null);

    const errs = validate(password);
    if (errs.length > 0) { setValidationErrors(errs); return; }
    if (password !== confirm) { setValidationErrors(["Passwords do not match."]); return; }

    setStatus("loading");
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setStatus("idle");
    } else {
      setStatus("done");
      setTimeout(() => router.push("/companions"), 1500);
    }
  }

  if (error) return (
    <main className="mx-auto max-w-md p-8 space-y-4">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{error}</div>
      <a href="/login" className="block text-sm underline text-zinc-400">Back to login</a>
    </main>
  );

  if (!ready) return (
    <main className="mx-auto max-w-md p-8">
      <p className="text-zinc-400 text-sm">Verifying link…</p>
    </main>
  );

  if (status === "done") return (
    <main className="mx-auto max-w-md p-8 space-y-4">
      <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
        ✓ Password updated. Redirecting…
      </div>
    </main>
  );

  return (
    <main className="mx-auto max-w-md p-8 space-y-4">
      <h1 className="text-2xl font-bold">Set new password</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <div className="text-xs text-zinc-400">New password</div>
          <input
            type="password"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-white"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="text-xs text-zinc-500">Min 8 characters, one uppercase, one number.</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-zinc-400">Confirm password</div>
          <input
            type="password"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-white"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {validationErrors.length > 0 && (
          <ul className="rounded-xl border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300 space-y-0.5 list-disc list-inside">
            {validationErrors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {status === "loading" ? "Saving…" : "Set new password"}
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
