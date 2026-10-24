import "@testing-library/jest-dom/vitest";

// jsdom lacks crypto.randomUUID in some Node versions — provide a fallback.
if (typeof crypto === "undefined" || !("randomUUID" in crypto)) {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      randomUUID: () =>
        `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`.replace(/\s/g, ""),
    },
  });
}
