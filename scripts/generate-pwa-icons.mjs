#!/usr/bin/env node
/**
 * Generates PWA icons and favicon from public/logo.png.
 * Run: node scripts/generate-pwa-icons.mjs
 * Requires: npm install -D sharp
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const logoPath = join(root, "public", "logo.png");
const iconsDir = join(root, "public", "icons");
const appDir = join(root, "src", "app");

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("Run: npm install -D sharp");
    process.exit(1);
  }

  const buf = await readFile(logoPath).catch(() => null);
  if (!buf) {
    console.error("public/logo.png not found.");
    process.exit(1);
  }
  if (buf.length < 100) {
    console.warn("public/logo.png is very small; replace with your full logo and re-run for best results.");
  }

  await mkdir(iconsDir, { recursive: true });

  const image = sharp(buf);
  const meta = await image.metadata();
  const size = Math.min(meta.width || 512, meta.height || 512);

  await image
    .resize(192, 192)
    .toFile(join(iconsDir, "icon-192x192.png"));
  console.log("Wrote public/icons/icon-192x192.png");

  await sharp(buf)
    .resize(512, 512)
    .toFile(join(iconsDir, "icon-512x512.png"));
  console.log("Wrote public/icons/icon-512x512.png");

  await sharp(buf)
    .resize(32, 32)
    .toFile(join(appDir, "icon.png"));
  console.log("Wrote src/app/icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
