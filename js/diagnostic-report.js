import { getClients, getPrintedDevisHistory } from "./data.js";
import { getPlan } from "./subscription.js";
import { getUser } from "./auth.js";
import { APP_VERSION } from "./version.js";

/** Rapport technique sans données clients, devis ni montants. */
export function buildDiagnosticReport() {
  const user = getUser();
  let storageBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      storageBytes += (localStorage.getItem(key)?.length ?? 0) * 2;
    }
  } catch {
    /* lecture storage impossible */
  }

  return {
    schema: "exone-diagnostic-v1",
    generatedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    account: {
      hasSession: Boolean(user),
      plan: getPlan()?.id ?? "unknown",
    },
    environment: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      displayMode: window.matchMedia("(display-mode: standalone)").matches
        ? "standalone"
        : "browser",
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    storage: {
      clientsCount: getClients().length,
      printedDevisCount: getPrintedDevisHistory().length,
      estimatedKb: Math.round(storageBytes / 1024),
    },
    serviceWorker: {
      supported: "serviceWorker" in navigator,
    },
    privacyNote:
      "Ce rapport ne contient aucun nom de client, adresse, montant ni contenu de devis.",
  };
}

export async function enrichDiagnosticReport(report) {
  if (!("serviceWorker" in navigator)) {
    return { ...report, serviceWorker: { ...report.serviceWorker, registered: false } };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      ...report,
      serviceWorker: {
        ...report.serviceWorker,
        registered: Boolean(registration),
        scope: registration?.scope ?? null,
      },
    };
  } catch {
    return report;
  }
}

export function downloadDiagnosticReport(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `exxon-bat-diagnostic-${report.generatedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
