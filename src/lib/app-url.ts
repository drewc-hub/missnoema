/**
 * Returns the public-facing origin for the app.
 * Prefers NEXT_PUBLIC_APP_URL env var, then x-forwarded-* headers,
 * to avoid returning the internal Railway localhost:8080 URL.
 */
export function getOrigin(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  }
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host.split(",")[0].trim()}`;
}
