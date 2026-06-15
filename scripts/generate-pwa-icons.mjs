#!/usr/bin/env node
/**
 * Génère les icônes PNG PWA depuis icons/icon.svg
 * Usage : npm run icons
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "icons/icon.svg");

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("Installez sharp : npm install");
    process.exit(1);
  }

  const svg = await readFile(svgPath);
  const sizes = [
    { name: "icon-192.png", size: 192, maskable: false },
    { name: "icon-512.png", size: 512, maskable: false },
    { name: "icon-maskable-512.png", size: 512, maskable: true },
  ];

  for (const item of sizes) {
    const out = join(root, "icons", item.name);
    let pipeline = sharp(svg).resize(item.size, item.size);

    if (item.maskable) {
      pipeline = sharp({
        create: {
          width: item.size,
          height: item.size,
          channels: 4,
          background: { r: 15, g: 23, b: 42, alpha: 1 },
        },
      })
        .composite([
          {
            input: await sharp(svg)
              .resize(Math.round(item.size * 0.72), Math.round(item.size * 0.72))
              .toBuffer(),
            gravity: "centre",
          },
        ]);
    }

    await pipeline.png({ compressionLevel: 9 }).toFile(out);
    console.log("✓", item.name);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
