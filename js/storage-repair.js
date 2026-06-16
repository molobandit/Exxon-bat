/** Réparation légère — aucun import du catalogue (compatible iPhone). */
(function () {
  const APP_VERSION = "197";
  const PRESTATIONS_KEY = "exone-prestations-library";
  const PRESTATIONS_PERSISTED_KEY = "exone-prestations-saved";

  function scrubSavedCatalog() {
    try {
      const saved = localStorage.getItem(PRESTATIONS_PERSISTED_KEY);
      if (!saved) return;
      const list = JSON.parse(saved);
      if (!Array.isArray(list)) {
        localStorage.removeItem(PRESTATIONS_PERSISTED_KEY);
        return;
      }
      const kept = list.filter((item) => {
        const src = item?.source ?? "";
        return src === "manual" || src === "import";
      });
      if (kept.length !== list.length) {
        localStorage.setItem(PRESTATIONS_PERSISTED_KEY, JSON.stringify(kept));
      }
    } catch {
      localStorage.removeItem(PRESTATIONS_PERSISTED_KEY);
    }
  }

  function purgeLegacyCatalog() {
    scrubSavedCatalog();
    const legacy = localStorage.getItem(PRESTATIONS_KEY);
    if (!legacy) {
      let kept = 0;
      try {
        const saved = localStorage.getItem(PRESTATIONS_PERSISTED_KEY);
        kept = saved ? JSON.parse(saved).length : 0;
      } catch {
        kept = 0;
      }
      return { freed: false, kept };
    }

    /* Ne pas parser 7 Mo sur un téléphone saturé — suppression directe. */
    if (legacy.length > 200000) {
      localStorage.removeItem(PRESTATIONS_KEY);
      scrubSavedCatalog();
      return { freed: true, kept: 0, fast: true };
    }

    try {
      const list = JSON.parse(legacy);
      const keptItems = Array.isArray(list)
        ? list.filter((item) => {
            const src = item?.source ?? "";
            return src === "manual" || src === "import";
          })
        : [];
      const existingRaw = localStorage.getItem(PRESTATIONS_PERSISTED_KEY);
      let existing = [];
      try {
        existing = existingRaw ? JSON.parse(existingRaw) : [];
      } catch {
        existing = [];
      }
      if (!Array.isArray(existing)) existing = [];
      const byRef = new Map(
        existing.map((item) => [`${item.tradeType}|${String(item.ref || "").toUpperCase()}`, item]),
      );
      for (const item of keptItems) {
        byRef.set(`${item.tradeType}|${String(item.ref || "").toUpperCase()}`, item);
      }
      localStorage.setItem(PRESTATIONS_PERSISTED_KEY, JSON.stringify([...byRef.values()]));
      localStorage.removeItem(PRESTATIONS_KEY);
      return { freed: true, kept: byRef.size, fast: false };
    } catch {
      localStorage.removeItem(PRESTATIONS_KEY);
      return { freed: true, kept: 0, fast: true };
    }
  }

  async function repairAppStorage() {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
    localStorage.removeItem("exone-app-version");
    localStorage.removeItem("exone-wikimedia-image-cache-v1");
    const freed = purgeLegacyCatalog();
    localStorage.setItem("exone-app-version", APP_VERSION);
    return { ...freed, version: APP_VERSION };
  }

  window.ExoneStorageRepair = {
    APP_VERSION,
    purgeLegacyCatalog,
    repairAppStorage,
  };
})();
