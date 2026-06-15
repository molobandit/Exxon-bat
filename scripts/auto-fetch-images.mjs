/**
 * Pré-télécharge les photos Wikimedia par type de produit (hors navigateur).
 * node scripts/auto-fetch-images.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { generateTradeCatalog, CATALOG_TRADES } from "../js/prestations-catalog.js";
import { resolveProductKey } from "../js/prestation-images.js";

const PRESET = {
  prise:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Electrical_Outlet_%2849163649463%29.jpg/250px-Electrical_Outlet_%2849163649463%29.jpg",
  interrupteur:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Light_switch_in_the_off_position_%28white%29.jpg/250px-Light_switch_in_the_off_position_%28white%29.jpg",
  disjoncteur:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Miniature_circuit_breakers.jpg/250px-Miniature_circuit_breakers.jpg",
  carrelage:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Floor_tiles.jpg/250px-Floor_tiles.jpg",
  sanitaire:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Toilet_in_France.jpg/250px-Toilet_in_France.jpg",
};

const keys = new Set();
for (const trade of CATALOG_TRADES) {
  for (const item of generateTradeCatalog(trade)) {
    if (item.type === "mo") continue;
    keys.add(
      resolveProductKey(item.tradeType, item.category, item.type, item.designation),
    );
  }
}

const manifest = {};
mkdirSync("images/prestations/auto", { recursive: true });

for (const key of keys) {
  if (key === "mo" || key === "default") continue;
  const url = PRESET[key];
  if (!url) continue;
  manifest[key] = url;
}

writeFileSync(
  "js/auto-image-manifest.json",
  JSON.stringify(manifest, null, 2),
  "utf8",
);

console.log(`✓ Manifeste auto-image : ${Object.keys(manifest).length} types produit`);
