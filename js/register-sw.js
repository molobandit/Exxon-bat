/** Service worker — désactivé en local et sur les pages auth. */
(async function registerAppServiceWorker() {
  const APP_VERSION = window.__APP_VERSION;
  if (!APP_VERSION) return;

  const host = window.location.hostname || "";
  const isLocalDev =
    window.__EXONE_LOCAL_DEV === true ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host);

  if (isLocalDev) return;

  const path = window.location.pathname.toLowerCase();
  const isAuthPage = /\/(connexion|verification|inscription|acces|maj)\.html/.test(path);
  if (isAuthPage) return;

  const bust = `?v=${APP_VERSION}`;

  try {
    await import(`./pwa-bootstrap.js${bust}`);
    await import(`./pwa-install.js${bust}`);
  } catch {
    /* PWA optionnelle */
  }

  async function purgeAllCaches() {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  async function forceAppRepair(reason) {
    console.warn("[Exxon-bat] Réparation cache v" + APP_VERSION, reason || "");
    await purgeAllCaches();
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
    try {
      localStorage.setItem("exone-app-version", APP_VERSION);
    } catch {
      /* ignore */
    }
  }

  function listenForSwUpdates(registration) {
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });

    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    const forceRefresh = new URLSearchParams(window.location.search).has("nocache");

    if (forceRefresh && "caches" in window) {
      await forceAppRepair("nocache");
      const url = new URL(window.location.href);
      url.searchParams.delete("nocache");
      window.location.replace(url.toString());
      return;
    }

    const previousVersion = localStorage.getItem("exone-app-version");

    if (previousVersion && previousVersion !== APP_VERSION) {
      await forceAppRepair("upgrade " + previousVersion + "→" + APP_VERSION);
      window.location.reload();
      return;
    }

    localStorage.setItem("exone-app-version", APP_VERSION);

    try {
      const registration = await navigator.serviceWorker.register(`/sw.js?v=${APP_VERSION}`);
      await registration.update();
      listenForSwUpdates(registration);
    } catch {
      /* PWA optionnelle */
    }

    import(`./rdv-reminder-init.js${bust}`)
      .then((m) => m.initRdvReminders?.())
      .catch(() => {});
  });

  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
})();
