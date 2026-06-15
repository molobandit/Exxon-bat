#!/usr/bin/env node
/**
 * Génère des icônes PNG unicolores (fallback sans sharp).
 * Usage : node scripts/generate-pwa-icons-fallback.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "icons");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

async function solidPng(size, rgb = [102, 101, 221]) {
  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0;
  for (let x = 0; x < size; x += 1) {
    const i = 1 + x * 3;
    row[i] = rgb[0];
    row[i + 1] = rgb[1];
    row[i + 2] = rgb[2];
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const compressed = deflateRawSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  const files = [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
  ];
  for (const [name, size] of files) {
    const buf = await solidPng(size, name.includes("maskable") ? [15, 23, 42] : [102, 101, 221]);
    await writeFile(join(iconsDir, name), buf);
    console.log("✓", name, `(${size}×${size})`);
  }
  console.log("Icônes fallback générées. Pour des icônes depuis le SVG : npm run icons");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
