/**
 * Landing routing — pure, testable helpers for serving the static marketing
 * landing (public/landing/) from the SAME Next.js service as the app.
 *
 * Architecture: ONE deployment, TWO domains.
 *   - App domain (e.g. app.rasa-*.ir)  → the PWA (unchanged, scope "/")
 *   - Landing domain (e.g. rasa-*.ir)  → "/" rewritten to the landing page
 *
 * The landing host list comes from the LANDING_HOST env var (comma-separated,
 * e.g. "rasa-app.ir,www.rasa-app.ir"). When unset or empty the middleware is
 * a no-op: every host serves the app — safe default for dev/tests/CI.
 *
 * No clinical logic here; this file only routes the marketing page.
 */

/** Landing asset path prefixes referenced by the landing HTML at "/". */
export const LANDING_ASSET_PREFIXES = ["/css/", "/js/", "/assets/", "/index.html", "/logo.png"] as const;

/** Parse the LANDING_HOST env value into a normalized host set. */
export function parseLandingHosts(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0),
  );
}

/** Normalize a Host header: lowercase, strip port. */
export function normalizeHost(hostHeader: string | null | undefined): string {
  if (!hostHeader) return "";
  return hostHeader.trim().toLowerCase().split(":")[0] ?? "";
}

/**
 * Which internal rewrite (if any) should serve this request.
 * - "/" on a landing host  → "/landing/index.html"
 * - landing asset prefixes → same path under "/landing"
 * Returns null when the request should pass through to the app untouched.
 */
export function landingRewriteFor(
  pathname: string,
  host: string,
  landingHosts: Set<string>,
): string | null {
  if (landingHosts.size === 0) return null;
  if (!landingHosts.has(host)) return null;

  if (pathname === "/") return "/landing/index.html";

  for (const prefix of LANDING_ASSET_PREFIXES) {
    if (prefix.endsWith("/")) {
      if (pathname.startsWith(prefix)) return `/landing${pathname}`;
    } else if (pathname === prefix) {
      return `/landing${pathname}`;
    }
  }
  return null;
}
