/**
 * Generates PWA icons from public/logo.svg using sharp.
 * Run: node scripts/gen-icons.mjs
 */
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("public/logo.svg");
mkdirSync("public/icons", { recursive: true });

// Full logo (has its own rounded background) for "any" icons
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(svg, { density: 300 }).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(svg, { density: 300 }).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");

// Maskable: logo content scaled into safe zone on the brand light surface
const pad = Math.round(512 * 0.14);
const inner = 512 - pad * 2;
const innerBuf = await sharp(svg, { density: 300 }).resize(inner, inner).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 0xf0, g: 0xfd, b: 0xfa, alpha: 1 } },
})
  .composite([{ input: innerBuf, top: pad, left: pad }])
  .png()
  .toFile("public/icons/maskable-512.png");

// App favicon
await sharp(svg, { density: 300 }).resize(64, 64).png().toFile("src/app/icon.png");

console.log("icons generated ✓");
