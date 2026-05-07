"use client";

import React, { useState } from "react";
import { Card, CardBody, CardHeader, Input, Button, Badge } from "@/components/ui";

type AuthMethod = "magic-link" | "password";
type PasswordMode = "signin" | "signup";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const MIN_PASSWORD_LENGTH = 8;

function validatePasswordClient(password: string): string[] {
  const errors: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH)
    errors.push(`Must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (!/[A-Z]/.test(password))
    errors.push("Must contain at least one uppercase letter.");
  if (!/[0-9]/.test(password))
    errors.push("Must contain at least one number.");
  return errors;
}

export function LoginForm({ next }: { next: string }) {
  const [method, setMethod] = useState<AuthMethod>("magic-link");
  const [pwMode, setPwMode] = useState<PasswordMode>("signin");

  // Magic link state
  const [mlEmail, setMlEmail] = useState("");
  const [mlStatus, setMlStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [mlError, setMlError] = useState<string | null>(null);

  // Password state
  const [pwEmail, setPwEmail] = useState("");
  const [pwPassword, setPwPassword] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwValidationErrors, setPwValidationErrors] = useState<string[]>([]);

  // Password recovery state
  const [recoverStatus, setRecoverStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [recoverError, setRecoverError] = useState<string | null>(null);

  // ── Magic link submit ──────────────────────────────────────────────────────
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMlStatus("loading");
    setMlError(null);



const safeNext = next && next.startsWith("/") ? next : "/companions";

console.log("Sending magic link with next:", safeNext);

    try {
      const res = await fetch("/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mlEmail, next: safeNext }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setMlError(json.error ?? "Something went wrong. Please try again.");
        setMlStatus("error");
      } else {
        setMlStatus("sent");
      }
    } catch {
      setMlError("Network error. Please try again.");
      setMlStatus("error");
    }
  }

  // ── Password submit ────────────────────────────────────────────────────────
  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwValidationErrors([]);
    setRecoverStatus("idle");
    setRecoverError(null);

    // Client-side validation
    if (pwMode === "signup") {
      const errors = validatePasswordClient(pwPassword);
      if (errors.length > 0) {
        setPwValidationErrors(errors);
        return;
      }
      if (pwPassword !== pwConfirm) {
        setPwValidationErrors(["Passwords do not match."]);
        return;
      }
    }

    setPwStatus("loading");

    try {
      const res = await fetch("/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pwEmail, password: pwPassword, mode: pwMode, next }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setPwError(json.error ?? "Something went wrong. Please try again.");
        setPwStatus("error");
      } else {
        // Redirect to the destination after successful auth
        window.location.href = json.redirectTo ?? next;
      }
    } catch {
      setPwError("Network error. Please try again.");
      setPwStatus("error");
    }
  }

  // ── Password recovery submit ───────────────────────────────────────────────
  async function handleRecoverPassword() {
    setRecoverError(null);
    setRecoverStatus("idle");

    if (!pwEmail) {
      setRecoverError("Enter your email first, then click Forgot password.");
      setRecoverStatus("error");
      return;
    }

    setRecoverStatus("loading");

    try {
      const res = await fetch("/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pwEmail }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setRecoverError(json.error ?? "Could not send recovery email.");
        setRecoverStatus("error");
      } else {
        setRecoverStatus("sent");
      }
    } catch {
      setRecoverError("Network error. Please try again.");
      setRecoverStatus("error");
    }
  }

  // ── Tab button helper ──────────────────────────────────────────────────────
  function TabButton({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex-1 rounded-lg py-2 text-sm font-medium transition",
          active
            ? "bg-white text-zinc-900"
            : "text-zinc-400 hover:text-zinc-200",
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader
          title="Login"
          subtitle="Sign in or create an account."
          right={<Badge>Web</Badge>}
        />
        <CardBody className="space-y-4">
          {/* ── Method toggle ── */}
          <div className="flex gap-1 rounded-xl bg-zinc-900 p-1">
            <TabButton
              active={method === "magic-link"}
              onClick={() => setMethod("magic-link")}
            >
              Magic Link
            </TabButton>
            <TabButton
              active={method === "password"}
              onClick={() => setMethod("password")}
            >
              Email &amp; Password
            </TabButton>
          </div>

          {/* ── Magic link form ── */}
          {method === "magic-link" && (
            <>
              {mlStatus === "sent" ? (
                <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
                  ✓ Magic link sent! Check your inbox and click the link to sign
                  in.
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-xs text-zinc-400">Email</div>
                    <Input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={mlEmail}
                      onChange={(e) => setMlEmail(e.target.value)}
                    />                  </div>

                  {mlError && (
                    <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                      {mlError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={mlStatus === "loading"}
                  >
                    {mlStatus === "loading" ? "Sending…" : "Send magic link"}
                  </Button>
                </form>
              )}
            </>
          )}

          {/* ── Email & password form ── */}
          {method === "password" && (
            <>
              {/* Sign in / Sign up sub-toggle */}
              <div className="flex gap-3 border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setPwMode("signin");
                    setPwError(null);
                    setPwValidationErrors([]);
                    setRecoverStatus("idle");
                    setRecoverError(null);
                  }}
                  className={cn(
                    "text-sm font-medium transition",
                    pwMode === "signin"
                      ? "text-white underline underline-offset-4"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPwMode("signup");
                    setPwError(null);
                    setPwValidationErrors([]);
                    setRecoverStatus("idle");
                    setRecoverError(null);
                  }}
                  className={cn(
                    "text-sm font-medium transition",
                    pwMode === "signup"
                      ? "text-white underline underline-offset-4"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handlePassword} className="space-y-3">
                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">Email</div>
                  <Input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={pwEmail}
                    onChange={(e) => setPwEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">Password</div>
                  <Input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={pwPassword}
                    onChange={(e) => {
                      setPwPassword(e.target.value);
                      if (pwValidationErrors.length > 0) setPwValidationErrors([]);
                    }}
                  />
                  {pwMode === "signup" && (
                    <div className="text-xs text-zinc-500">
                      Min 8 characters, one uppercase letter, one number.
                    </div>
                  )}
                </div>

                {pwMode === "signup" && (
                  <div className="space-y-1">
                    <div className="text-xs text-zinc-400">Confirm password</div>
                    <Input
                      name="confirm"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={pwConfirm}
                      onChange={(e) => {
                        setPwConfirm(e.target.value);
                        if (pwValidationErrors.length > 0) setPwValidationErrors([]);
                      }}
                    />
                  </div>
                )}

                {pwValidationErrors.length > 0 && (
                  <ul className="rounded-xl border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300 space-y-0.5 list-disc list-inside">
                    {pwValidationErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                )}

                {pwError && (
                  <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                    {pwError}
                  </div>
                )}

                {pwMode === "signin" && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleRecoverPassword}
                      disabled={recoverStatus === "loading"}
                      className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-4 disabled:opacity-50"
                    >
                      {recoverStatus === "loading" ? "Sending reset link…" : "Forgot password?"}
                    </button>
                  </div>
                )}

                {recoverStatus === "sent" && (
                  <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
                    Password reset link sent. Check your email.
                  </div>
                )}

                {recoverError && (
                  <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                    {recoverError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={pwStatus === "loading"}
                >
                  {pwStatus === "loading"
                    ? "Please wait…"
                    : pwMode === "signin"
                      ? "Sign In"
                      : "Create Account"}
                </Button>
              </form>
            </>
          )}

          <div className="text-xs text-zinc-500">
            By continuing you confirm you&apos;re an adult where required and
            agree to the platform rules (no minors, no coercion, no exploitation).
          </div>
        </CardBody>
      </Card>

      {method === "magic-link" && mlStatus !== "sent" && (
        <div className="text-center text-xs text-zinc-500">
          After you click the email link, you&apos;ll be redirected to{" "}
          <span className="text-zinc-300">{next}</span>.
        </div>
      )}
    </main>
  );
}
