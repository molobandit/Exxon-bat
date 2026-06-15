/**
 * Import automatique de photos produit — Wikimedia Commons (libre de droits).
 * Une recherche par type de matériel → appliquée à toutes les références du métier.
 */

import { resolveProductKey } from "./prestation-images.js";

const CACHE_KEY = "exone-wikimedia-image-cache-v1";

/** Cache images en RAM — rien sur le stockage du téléphone. */
let memoryImageCache = null;

/** Photos locales déjà présentes sur le site */
const LOCAL_PRESETS = {
  prise: "/images/prestations/prise.jpg",
  disjoncteur: "/images/prestations/disjoncteur.jpg",
  tableau: "/images/prestations/tableau.jpg",
};

const SEARCH_QUERIES = {
  prise: "electrical outlet socket France",
  interrupteur: "light switch wall",
  disjoncteur: "circuit breaker DIN rail",
  tableau: "electrical panel distribution board",
  eclairage: "LED ceiling light",
  cable: "electrical cable wire",
  robinet: "kitchen faucet tap",
  sanitaire: "toilet bathroom",
  chauffeEau: "water heater tank",
  tube: "PVC pipe plumbing",
  clim: "air conditioner split unit",
  radiateur: "radiator heating",
  peinture: "paint can bucket",
  revetement: "wallpaper roll",
  carrelage: "floor ceramic tiles",
  parquet: "wooden parquet floor",
  porte: "interior door",
  fenetre: "window frame",
  placard: "wardrobe closet",
  plaquiste: "drywall plasterboard",
  fauxPlafond: "suspended ceiling tiles",
  isolant: "glass wool insulation",
  default: "building material construction",
};

function readCache() {
  if (memoryImageCache) return memoryImageCache;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
  memoryImageCache = {};
  return memoryImageCache;
}

function writeCache(cache) {
  memoryImageCache = cache;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shouldAutoFetchItem(item) {
  if (!item || item.type === "mo") return false;
  if (
    item.imageSource === "leroymerlin" ||
    item.imageSource === "manual" ||
    item.imageSource === "auto"
  ) {
    return false;
  }
  const url = String(item.imageUrl || "").trim();
  if (url.startsWith("http") || url.startsWith("/images/")) return false;
  return true;
}

export function collectProductKeysForItems(items) {
  const keys = new Set();
  for (const item of items) {
    if (!shouldAutoFetchItem(item)) continue;
    keys.add(
      resolveProductKey(item.tradeType, item.category, item.type, item.designation),
    );
  }
  return [...keys].filter((key) => key && key !== "mo");
}

export async function fetchWikimediaImage(searchTerm) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: searchTerm,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "220",
  });

  const response = await fetch(
    `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
  );
  if (!response.ok) throw new Error("wikimedia_http");

  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const url = info?.thumburl || info?.url;
    if (!url || /\.svg$/i.test(url)) continue;
    return url;
  }

  return null;
}

export async function resolveImageForProductKey(key) {
  if (LOCAL_PRESETS[key]) return LOCAL_PRESETS[key];

  const cache = readCache();
  if (cache[key]) return cache[key];

  const query = SEARCH_QUERIES[key] || SEARCH_QUERIES.default;
  const url = await fetchWikimediaImage(query);
  if (url) {
    cache[key] = url;
    writeCache(cache);
  }
  return url;
}

/**
 * Récupère les URLs pour une liste de clés produit (avec délai anti-limite API).
 */
export async function fetchImagesForKeys(keys, { onProgress, delayMs = 280, signal } = {}) {
  const keyToUrl = {};
  const total = keys.length;

  for (let i = 0; i < keys.length; i += 1) {
    if (signal?.aborted) break;
    const key = keys[i];
    onProgress?.({ phase: "search", key, current: i + 1, total });

    try {
      const url = await resolveImageForProductKey(key);
      if (url) keyToUrl[key] = url;
    } catch {
      /* ignore single key failure */
    }

    if (i < keys.length - 1) await sleep(delayMs);
  }

  return keyToUrl;
}
