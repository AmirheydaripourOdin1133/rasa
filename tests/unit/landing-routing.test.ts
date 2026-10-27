/**
 * Landing routing helpers — host-based routing for the static landing page
 * served from the same Next.js service as the app (one deployment, two domains).
 */
import { describe, expect, it } from "vitest";
import {
  LANDING_ASSET_PREFIXES,
  landingRewriteFor,
  normalizeHost,
  parseLandingHosts,
} from "@/lib/landing/routing";

describe("parseLandingHosts", () => {
  it("parses a comma-separated list and normalizes case/whitespace", () => {
    const hosts = parseLandingHosts(" Rasa-App.ir , WWW.Rasa-App.ir ,");
    expect(hosts.has("rasa-app.ir")).toBe(true);
    expect(hosts.has("www.rasa-app.ir")).toBe(true);
    expect(hosts.size).toBe(2);
  });

  it("returns an empty set for undefined/empty input (middleware no-op)", () => {
    expect(parseLandingHosts(undefined).size).toBe(0);
    expect(parseLandingHosts("").size).toBe(0);
    expect(parseLandingHosts("  ,  ").size).toBe(0);
  });
});

describe("normalizeHost", () => {
  it("lowercases and strips the port", () => {
    expect(normalizeHost("Rasa-App.IR:443")).toBe("rasa-app.ir");
    expect(normalizeHost("localhost:3100")).toBe("localhost");
  });

  it("handles missing host headers", () => {
    expect(normalizeHost(null)).toBe("");
    expect(normalizeHost(undefined)).toBe("");
  });
});

describe("landingRewriteFor", () => {
  const hosts = parseLandingHosts("rasa-app.ir,www.rasa-app.ir");

  it("is a no-op when no landing hosts are configured", () => {
    expect(landingRewriteFor("/", "rasa-app.ir", parseLandingHosts(undefined))).toBeNull();
  });

  it("is a no-op for non-landing hosts (the app serves /)", () => {
    expect(landingRewriteFor("/", "app.rasa-app.ir", hosts)).toBeNull();
    expect(landingRewriteFor("/", "localhost", hosts)).toBeNull();
  });

  it("rewrites / on a landing host to the landing page", () => {
    expect(landingRewriteFor("/", "rasa-app.ir", hosts)).toBe("/landing/index.html");
    expect(landingRewriteFor("/", "www.rasa-app.ir", hosts)).toBe("/landing/index.html");
  });

  it("rewrites landing asset paths under /landing", () => {
    expect(landingRewriteFor("/css/main.css", "rasa-app.ir", hosts)).toBe("/landing/css/main.css");
    expect(landingRewriteFor("/js/main.js", "rasa-app.ir", hosts)).toBe("/landing/js/main.js");
    expect(landingRewriteFor("/assets/fonts/PeydaFaNumWeb-Regular.woff2", "rasa-app.ir", hosts)).toBe(
      "/landing/assets/fonts/PeydaFaNumWeb-Regular.woff2",
    );
    expect(landingRewriteFor("/logo.png", "rasa-app.ir", hosts)).toBe("/landing/logo.png");
    expect(landingRewriteFor("/index.html", "rasa-app.ir", hosts)).toBe("/landing/index.html");
  });

  it("never touches app routes or non-landing paths", () => {
    expect(landingRewriteFor("/medication", "rasa-app.ir", hosts)).toBeNull();
    expect(landingRewriteFor("/manifest.webmanifest", "rasa-app.ir", hosts)).toBeNull();
    expect(landingRewriteFor("/sw.js", "rasa-app.ir", hosts)).toBeNull();
    expect(landingRewriteFor("/random/path", "rasa-app.ir", hosts)).toBeNull();
  });

  it("keeps the documented asset prefixes in sync", () => {
    expect(LANDING_ASSET_PREFIXES).toEqual(["/css/", "/js/", "/assets/", "/index.html", "/logo.png"]);
  });
});
