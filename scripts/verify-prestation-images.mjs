/**
 * Vérifie les images du catalogue.
 * node scripts/verify-prestation-images.mjs
 */
import { existsSync } from "node:fs";
import { generateTradeCatalog, CATALOG_TRADES } from "../js/prestations-catalog.js";
import { getPrestationImageUrl, resolveProductKey } from "../js/prestation-images.js";

const failures = [];
const keys = new Set();

for (const trade of CATALOG_TRADES) {
  for (const item of generateTradeCatalog(trade)) {
    const url = getPrestationImageUrl(item);
    const key = resolveProductKey(item.tradeType, item.category, item.type, item.designation);
    keys.add(key);

    if (!url) failures.push(`URL vide: ${item.ref}`);
    if (url.startsWith("/images/") && !existsSync(`.${url}`)) {
      failures.push(`Fichier manquant: ${url}`);
    }
    if (!url.startsWith("/images/") && !url.startsWith("data:image/svg")) {
      failures.push(`Format inconnu: ${item.ref} → ${url.slice(0, 40)}`);
    }
  }
}

console.log(`Clés produit: ${keys.size}`);

if (failures.length) {
  console.error("ÉCHECS:\n" + failures.slice(0, 10).map((f) => `  ✕ ${f}`).join("\n"));
  process.exit(1);
}

console.log("✓ Images produit OK (photos + pictogrammes SVG)");
