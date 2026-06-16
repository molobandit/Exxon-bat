const CACHE = "exone-v196";
const APP_VERSION = CACHE.replace(/^exone-v/, "");

const ASSETS = [
  "/",
  "/index.html",
  "/app.html",
  "/offline.html",
  "/dashboard.html",
  "/profil.html",
  "/devis.html",
  "/bibliotheque.html",
  "/support.html",
  "/confidentialite.html",
  "/mentions-legales.html",
  "/conditions-generales.html",
  "/donnees-personnelles.html",
  "/paiement.html",
  "/tarifs.html",
  "/connexion.html",
  "/verification.html",
  "/inscription.html",
  "/acces.html",
  "/simulation-metre.html",
  "/maj.html",
  "/tel.html",
  "/m.html",
  "/js/mobile-env.js",
  "/js/nav-menu-bootstrap.js",
  "/js/app-viewport.js",
  "/js/storage-guard.js",
  "/js/storage-repair.js",
  "/clients.html",
  "/chantiers.html",
  "/chantier-detail.html",
  "/planning.html",
  "/campagnes.html",
  "/statistiques.html",
  "/comptabilite.html",
  "/metre.html",
  "/employes.html",
  "/employe/connexion.html",
  "/employe/index.html",
  "/employe/metre.html",
  "/employe/historique.html",
  "/css/base.css",
  "/css/landing.css",
  "/css/auth-flow.css",
  "/css/app.css",
  "/css/payments.css",
  "/css/payment-page.css",
  "/js/payment-link.codec.js",
  "/js/payment-link-service.js",
  "/js/payment-page.js",
  "/js/payment-store.js",
  "/js/payment-plan.js",
  "/js/devis-payments.js",
  "/css/lang-switcher.css",
  "/icons/logo-mark.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/css/ai-assistant.css",
  "/css/support.css",
  "/css/confidentialite.css",
  "/css/legal-pages.css",
  "/js/prestation-svg-thumbs.js",
  "/images/prestations/prise.jpg",
  "/images/prestations/disjoncteur.jpg",
  "/images/prestations/tableau.jpg",
  "/css/employe.css",
  "/css/planning.css",
  "/js/app-version-guard.js",
  "/js/import-map-bootstrap.js",
  "/js/module-import.js",
  "/js/version.js",
  "/js/utils.js",
  "/js/currency-format.js",
  "/js/calculator.js",
  "/js/country-config.js",
  "/js/market.js",
  "/js/nav-prefs-html.js",
  "/js/quick-test.js",
  "/js/quote-pricing.js",
  "/js/installation-difficulty.js",
  "/js/difficulty-coefficients-store.js",
  "/js/difficulty-settings.js",
  "/js/prestations-catalog.js",
  "/js/trade-catalog-extensions.js",
  "/js/devis-line-types.js",
  "/js/devis-fee-templates.js",
  "/js/batiprix-catalog.js",
  "/js/prestation-images.js",
  "/js/prestations-import.js",
  "/js/bibliotheque.js",
  "/js/auto-image-fetch.js",
  "/js/leroy-merlin.js",
  "/js/devis-lines.js",
  "/js/devis-table-fit.js",
  "/js/devis-draft.js",
  "/js/client-quote-visibility.js",
  "/js/storage.js",
  "/js/auth.js",
  "/js/auth-otp-ui.js",
  "/js/email-verification.js",
  "/js/support-store.js",
  "/js/employee-auth.js",
  "/js/employee-access.js",
  "/js/trial.js",
  "/js/subscription.js",
  "/js/data.js",
  "/js/nav-app.js",
  "/js/brand.js",
  "/js/i18n.js",
  "/js/locales/messages.js",
  "/js/landing-faq-i18n.js",
  "/js/landing-money.js",
  "/js/landing-features.js",
  "/js/catalog-i18n.js",
  "/js/locales/catalog-meta.js",
  "/js/locales/app-ui.js",
  "/js/site-services.js",
  "/js/landing-nav.js",
  "/js/support-store.js",
  "/js/diagnostic-report.js",
  "/js/support.js",
  "/js/module-base.js",
  "/js/dashboard.js",
  "/js/profil.js",
  "/js/profile-completeness.js",
  "/css/profil.css",
  "/js/quote-sections.js",
  "/js/devis-draft-store.js",
  "/js/travel-fees.js",
  "/js/prestation-search.js",
  "/js/devis.js",
  "/css/commercial.css",
  "/js/commercial-store.js",
  "/js/commercial-sync.js",
  "/js/clients.js",
  "/js/chantiers.js",
  "/js/chantier-hub.js",
  "/js/chantier-detail.js",
  "/js/campagnes.js",
  "/js/statistiques.js",
  "/js/comptabilite.js",
  "/js/compta-store.js",
  "/js/compta-engine.js",
  "/js/compta-imputation.js",
  "/js/compta-fec-export.js",
  "/css/compta.css",
  "/css/profil.css",
  "/css/mobile-app.css",
  "/css/mobile-nav.css",
  "/css/pwa-install.css",
  "/js/app-config.js",
  "/js/pwa-bootstrap.js",
  "/js/pwa-install.js",
  "/js/landing-money.js",
  "/js/landing-features.js",
  "/js/tarifs.js",
  "/js/planning.js",
  "/js/planning-store.js",
  "/js/planning-calendar.js",
  "/js/rdv-reminder-service.js",
  "/js/rdv-reminder-init.js",
  "/js/metre-constants.js",
  "/js/metre-templates.js",
  "/js/metre-calculator.js",
  "/js/metre-validation.js",
  "/js/signature-pad.js",
  "/js/employe-nav.js",
  "/js/employe-index.js",
  "/js/employe-metre.js",
  "/js/employe-historique.js",
  "/js/employes.js",
  "/js/acces-demo.js",
  "/js/simulation-metre.js",
  "/js/demo-seed.js",
  "/js/site-publisher.defaults.js",
  "/js/site-publisher.js",
  "/js/legal-content.js",
  "/js/legal-page.js",
  "/js/legal-footer.js",
  "/js/app-security.js",
  "/js/employe-security.js",
  "/js/mobile-bottom-nav.js",
  "/js/back-nav.js",
  "/js/register-sw.js",
  "/js/renta-demo.js",
  "/js/testimonials-seed.js",
  "/js/testimonials-render.js",
  "/js/avis-form.js",
  "/js/avis-gestion.js",
  "/js/utils.js",
  "/avis.html",
  "/avis-gestion.html",
  "/icons/icon.svg",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(ASSETS.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isAppAsset(url) {
  return (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".html")
  );
}

function isStyleAsset(url) {
  return url.pathname.endsWith(".css");
}

function isScriptAsset(url) {
  return url.pathname.endsWith(".js");
}

function versionedScriptUrl(url) {
  if (!isScriptAsset(url)) return url;
  const next = new URL(url);
  if (!next.searchParams.has("v")) {
    next.searchParams.set("v", APP_VERSION);
  }
  return next;
}

function networkFirstVersioned(request, url) {
  const target = isScriptAsset(url) ? versionedScriptUrl(url).toString() : request.url;
  return fetch(target, { cache: "no-store" })
    .then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(async () => {
      if (navigator.onLine && isScriptAsset(url)) {
        return Response.error();
      }
      const cached = await caches.match(request);
      return cached ?? Response.error();
    });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isStyleAsset(url)) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() =>
        caches.match(event.request),
      ),
    );
    return;
  }

  if (isAppAsset(url)) {
    event.respondWith(networkFirstVersioned(event.request, url));
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          return caches.match("/offline.html");
        }
        return Response.error();
      }),
  );
});
