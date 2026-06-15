/**
 * Configuration environnement — local / démo / production.
 * En production : comptes démo désactivés, avertissement si pas HTTPS.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", ""]);

function readHostname() {
  return window.location.hostname?.toLowerCase() ?? "";
}

export function isLocalHost() {
  return LOCAL_HOSTS.has(readHostname());
}

export function isProductionHost() {
  const host = readHostname();
  return host !== "" && !LOCAL_HOSTS.has(host);
}

export function isDemoEnabled() {
  if (isLocalHost()) return true;
  const params = new URLSearchParams(window.location.search);
  return params.get("demo") === "1";
}

export function isSecureContext() {
  return window.isSecureContext === true;
}

export function warnIfInsecureProduction() {
  if (!isProductionHost() || isSecureContext()) return;
  console.warn("[Exxon-bat] HTTPS requis en production pour une PWA sécurisée.");
}

export function getAppEntryUrl() {
  try {
    const raw = localStorage.getItem("exone-solution-user");
    if (raw) return "/dashboard.html";
  } catch {
    /* ignore */
  }
  return "/index.html";
}
