/**
 * Aide Leroy Merlin — recherche produit & import photo (usage interne).
 * Les images restent hébergées chez Leroy Merlin (media.adeo.com) ou en local.
 */

export const LM_SEARCH_URL = "https://www.leroymerlin.fr/search?q=";

export function buildLeroyMerlinSearchUrl(query = "") {
  const q = String(query || "").trim();
  return `${LM_SEARCH_URL}${encodeURIComponent(q)}`;
}

export function buildSearchQueryFromItem(item) {
  if (!item) return "";
  const parts = [item.designation, item.ref].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function isLeroyMerlinProductUrl(url = "") {
  return /leroymerlin\.fr\/produits\//i.test(String(url).trim());
}

export function isLeroyMerlinImageUrl(url = "") {
  return /media\.adeo\.com/i.test(String(url).trim());
}

export function isLeroyMerlinInput(url = "") {
  const v = String(url).trim();
  return isLeroyMerlinProductUrl(v) || isLeroyMerlinImageUrl(v);
}

/** Taille adaptée aux vignettes bibliothèque / devis */
export function normalizeLeroyMerlinImageUrl(url = "") {
  const raw = String(url).trim();
  if (!raw) return "";
  const base = raw.split("?")[0];
  return `${base}?width=200&height=200&format=jpg&quality=80&fit=bounds`;
}

export function extractSkuFromProductUrl(url = "") {
  const match = String(url).trim().match(/-(\d{6,})\.html(?:\?.*)?$/i);
  return match?.[1] || "";
}

export function parseLeroyMerlinPaste(input = "") {
  const value = String(input).trim();
  if (!value) return null;
  if (isLeroyMerlinImageUrl(value)) {
    return { kind: "image", imageUrl: normalizeLeroyMerlinImageUrl(value) };
  }
  if (isLeroyMerlinProductUrl(value)) {
    return {
      kind: "product",
      productUrl: value,
      sku: extractSkuFromProductUrl(value),
    };
  }
  return null;
}

function extractOgImage(html = "") {
  const patterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /https:\/\/media\.adeo\.com\/[^"'\s]+\/media\.jpg/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1] || match?.[0]) return match[1] || match[0];
  }
  return "";
}

const CORS_PROXIES = [
  (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
  (target) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
];

async function fetchHtmlThroughProxy(url) {
  let lastError = null;
  for (const build of CORS_PROXIES) {
    try {
      const response = await fetch(build(url));
      if (!response.ok) continue;
      const text = await response.text();
      if (text.length > 800) return text;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("proxy_failed");
}

/** Tente d'extraire l'image depuis une fiche produit (peut échouer selon le réseau). */
export async function fetchImageUrlFromProductPage(productUrl) {
  const html = await fetchHtmlThroughProxy(productUrl);
  const image = extractOgImage(html);
  if (!image) throw new Error("image_not_found");
  return normalizeLeroyMerlinImageUrl(image);
}

export const LM_IMAGE_HELP =
  "Sur Leroy Merlin : ouvrez la fiche produit → clic droit sur la photo → « Copier l'adresse de l'image » → collez-la ci-dessus.";
