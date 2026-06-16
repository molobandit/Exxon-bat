#!/usr/bin/env node
/**
 * Prépare dist/ pour Cloudflare Pages — uniquement les fichiers du site web.
 */
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "scripts",
  "deploy",
  ".cursor",
]);

const SKIP_FILES = new Set([
  "Dockerfile",
  "docker-compose.yml",
  "wrangler.toml",
  "package.json",
  "package-lock.json",
  "netlify.toml",
  "README.md",
  ".gitignore",
  "demarrer.command",
  "iphone.command",
]);

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const { name } = entry;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      copyDir(join(src, name), join(dest, name));
      continue;
    }
    if (SKIP_FILES.has(name)) continue;
    cpSync(join(src, name), join(dest, name));
  }
}

rmSync(dist, { recursive: true, force: true });
copyDir(root, dist);
console.log("✓ dist/ prêt pour Cloudflare Pages");
