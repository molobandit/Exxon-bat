import { isProductionHost, isSecureContext, warnIfInsecureProduction } from "./app-config.js";

const PWA_ICONS = [
  { rel: "icon", href: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { rel: "apple-touch-icon", href: "/icons/icon-192.png", sizes: "192x192" },
];

const META_TAGS = [
  { name: "mobile-web-app-capable", content: "yes" },
  { name: "apple-mobile-web-app-capable", content: "yes" },
  { name: "apple-mobile-web-app-status-bar-style", content: "default" },
  { name: "apple-mobile-web-app-title", content: "Exxon-bat" },
  { name: "format-detection", content: "telephone=no" },
];

function ensureLink(icon) {
  const selector = icon.rel.includes("apple")
    ? 'link[rel="apple-touch-icon"]'
    : `link[rel="icon"][sizes="${icon.sizes}"]`;
  if (document.querySelector(selector)) return;
  const link = document.createElement("link");
  link.rel = icon.rel;
  link.href = icon.href;
  if (icon.sizes) link.sizes = icon.sizes;
  if (icon.type) link.type = icon.type;
  document.head.appendChild(link);
}

function ensureMeta(name, content) {
  if (document.querySelector(`meta[name="${name}"]`)) return;
  const meta = document.createElement("meta");
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
}

function ensureStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function applyStandaloneClass() {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (standalone) {
    document.documentElement.classList.add("is-standalone");
  }
}

/** Catalogue BTP = RAM uniquement ; ne laisser que les refs perso (manual/import) sur l'appareil. */
function scrubLibraryFromDeviceStorage() {
  try {
    localStorage.removeItem("exone-prestations-library");
    localStorage.removeItem("exone-wikimedia-image-cache-v1");
    const raw = localStorage.getItem("exone-prestations-saved");
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) {
      localStorage.removeItem("exone-prestations-saved");
      return;
    }
    const kept = list.filter((item) => {
      const src = item?.source ?? "";
      return src === "manual" || src === "import";
    });
    if (kept.length !== list.length) {
      localStorage.setItem("exone-prestations-saved", JSON.stringify(kept));
    }
  } catch {
    localStorage.removeItem("exone-prestations-library");
  }
}

function applyCompactMobileViewport() {
  const isMobile =
    typeof window.exoneIsMobileEnv === "function"
      ? window.exoneIsMobileEnv()
      : window.matchMedia("(max-width: 900px)").matches ||
        /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  if (!isMobile) return;
  const path = window.location.pathname.toLowerCase();
  const skip =
    /(^\/$|\/index\.html$|connexion|inscription|acces\.html|mobile\.html|mentions|conditions|confidentialite|donnees-personnelles|offline\.html|paiement\.html|simulation-metre)/.test(
      path,
    );
  if (skip) return;

  document.documentElement.classList.add("is-app-compact");
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && !viewport.dataset.compact) {
    viewport.content =
      "width=device-width, initial-scale=0.7, minimum-scale=0.55, maximum-scale=3, viewport-fit=cover";
    viewport.dataset.compact = "1";
  }
}

function ensurePreconnect() {
  if (document.querySelector('link[rel="preconnect"][href="https://fonts.googleapis.com"]')) return;
  const google = document.createElement("link");
  google.rel = "preconnect";
  google.href = "https://fonts.googleapis.com";
  document.head.appendChild(google);
  const gstatic = document.createElement("link");
  gstatic.rel = "preconnect";
  gstatic.href = "https://fonts.gstatic.com";
  gstatic.crossOrigin = "anonymous";
  document.head.appendChild(gstatic);
}

export function initPwaBootstrap() {
  warnIfInsecureProduction();

  ensurePreconnect();
  applyCompactMobileViewport();

  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && !viewport.dataset.compact && !viewport.content.includes("viewport-fit")) {
    viewport.content = "width=device-width, initial-scale=1.0, viewport-fit=cover";
  }

  for (const icon of PWA_ICONS) ensureLink(icon);
  for (const meta of META_TAGS) ensureMeta(meta.name, meta.content);
  ensureStylesheet(`/css/mobile-app.css?v=${window.__APP_VERSION ?? "176"}`);
  ensureStylesheet(`/css/mobile-nav.css?v=${window.__APP_VERSION ?? "176"}`);
  ensureStylesheet(`/css/pwa-install.css?v=${window.__APP_VERSION ?? "176"}`);

  applyStandaloneClass();

  scrubLibraryFromDeviceStorage();

  if (isProductionHost() && !isSecureContext()) {
    document.documentElement.classList.add("is-insecure");
  }
}

initPwaBootstrap();
