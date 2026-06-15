#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, statSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function read(path) {
  return readFile(join(root, path), "utf8");
}

const errors = [];
const warnings = [];

const versionJs = await read("js/version.js");
const version = versionJs.match(/APP_VERSION = "(\d+)"/)?.[1];
const sw = await read("sw.js");
const swCache = sw.match(/CACHE = "exone-v(\d+)"/)?.[1];
const swAppVersion = sw.match(/const APP_VERSION = CACHE\.replace\(\/\^exone-v\/, ""\);\s*\n\s*\/\/|\nconst APP_VERSION = "(\d+)"/)?.[1];

if (!version || !swCache || version !== swCache) {
  errors.push(`Version désynchronisée : version.js=${version}, sw.js=${swCache}`);
}

const storageRepair = await read("js/storage-repair.js");
const repairVersion = storageRepair.match(/APP_VERSION = "(\d+)"/)?.[1];
if (repairVersion && repairVersion !== version) {
  errors.push(`storage-repair.js=${repairVersion} ≠ version.js=${version}`);
}

const guard = await read("js/app-version-guard.js");
const guardVersion = guard.match(/FALLBACK_VERSION = "(\d+)"/)?.[1];
if (guardVersion !== version) {
  errors.push(`app-version-guard.js=${guardVersion} ≠ version.js=${version}`);
}

function walkHtml(dir, base = "") {
  const files = [];
  for (const entry of readdirSync(join(root, dir))) {
    const rel = base ? `${base}/${entry}` : entry;
    const abs = join(root, dir, entry);
    if (statSync(abs).isDirectory()) files.push(...walkHtml(join(dir, entry), rel));
    else if (entry.endsWith(".html")) files.push(rel);
  }
  return files;
}

const htmlFiles = walkHtml(".");
const staleHtml = [];
const missingGuard = [];

for (const file of htmlFiles) {
  const content = await read(file);
  if (!content.includes("app-version-guard.js")) {
    missingGuard.push(file);
  }
  const versions = [...content.matchAll(/\?v=(\d+)/g)].map((m) => m[1]);
  const bad = versions.filter((v) => v !== version);
  if (bad.length) staleHtml.push(`${file} (${[...new Set(bad)].join(", ")})`);
  if (/type="module" src="(?:\.\.\/)?js\/[^"?]+\.js"/.test(content)) {
    warnings.push(`Module ES sans ?v= dans ${file}`);
  }
}

if (missingGuard.length) {
  errors.push(`app-version-guard.js manquant dans : ${missingGuard.slice(0, 5).join(", ")}${missingGuard.length > 5 ? "…" : ""}`);
}
if (staleHtml.length) {
  errors.push(`Cache bust obsolète : ${staleHtml.slice(0, 5).join("; ")}${staleHtml.length > 5 ? "…" : ""}`);
}

const manifest = JSON.parse(await read("manifest.json"));
if (!manifest.icons?.some((i) => i.src.includes("icon-192.png"))) {
  warnings.push("Icônes PNG manquantes dans manifest — exécutez : npm run icons");
}

try {
  await read("icons/icon-192.png");
} catch {
  warnings.push("Fichier icons/icon-192.png absent — npm run icons");
}

if (errors.length) {
  console.error("❌ Pre-deploy échoué :\n", errors.join("\n"));
  console.error("\n→ Lancez : node scripts/sync-app-version.mjs");
  process.exit(1);
}

if (warnings.length) {
  console.warn("⚠ Avertissements :\n", warnings.join("\n"));
}

console.log(`✓ Pre-deploy OK (v${version}) — garde-fou cache actif`);
