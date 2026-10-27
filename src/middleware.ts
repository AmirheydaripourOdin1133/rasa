import { NextResponse, type NextRequest } from "next/server";
import { landingRewriteFor, normalizeHost, parseLandingHosts } from "@/lib/landing/routing";

/**
 * Host-based landing routing — see src/lib/landing/routing.ts.
 *
 * With LANDING_HOST unset (dev, tests, app-only deploys) every request passes
 * through and the app behaves exactly as before. On production the platform
 * sets LANDING_HOST="rasa-*.ir,www.rasa-*.ir" so the root domain serves the
 * static landing from public/landing/ while app.<domain> serves the PWA.
 */
const landingHosts = parseLandingHosts(process.env.LANDING_HOST);

export function middleware(req: NextRequest) {
  const host = normalizeHost(req.headers.get("host"));
  const destination = landingRewriteFor(req.nextUrl.pathname, host, landingHosts);
  if (destination === null) return NextResponse.next();
  return NextResponse.rewrite(new URL(destination, req.url));
}

export const config = {
  matcher: ["/", "/index.html", "/logo.png", "/css/:path*", "/js/:path*", "/assets/:path*"],
};
