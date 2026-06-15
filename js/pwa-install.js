import { getUser } from "./auth.js";

let deferredPrompt = null;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function wasDismissed() {
  return localStorage.getItem("exone-pwa-install-dismissed") === "1";
}

function createBanner() {
  if (document.getElementById("pwa-install-banner")) return null;

  const banner = document.createElement("aside");
  banner.id = "pwa-install-banner";
  banner.className = "pwa-install";
  banner.hidden = true;
  banner.innerHTML = `
    <div class="pwa-install__inner">
      <div class="pwa-install__icon" aria-hidden="true">📲</div>
      <div class="pwa-install__text">
        <strong>Installer Exxon-bat</strong>
        <span>Accès rapide depuis l'écran d'accueil — mobile & tablette, mode hors ligne sur chantier.</span>
      </div>
      <div class="pwa-install__actions">
        <button type="button" class="btn btn--primary btn--sm" id="pwa-install-btn">Installer</button>
        <button type="button" class="btn btn--ghost btn--sm" id="pwa-install-dismiss">Plus tard</button>
      </div>
    </div>`;
  document.body.appendChild(banner);

  banner.querySelector("#pwa-install-btn")?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.hidden = true;
  });

  banner.querySelector("#pwa-install-dismiss")?.addEventListener("click", () => {
    localStorage.setItem("exone-pwa-install-dismissed", "1");
    banner.hidden = true;
  });

  return banner;
}

function showIosHint() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!isIos || isStandalone() || wasDismissed()) return;

  const banner = createBanner();
  if (!banner) return;
  banner.querySelector(".pwa-install__text span").textContent =
    "Sur iPhone/iPad : touchez Partager → « Sur l'écran d'accueil » pour installer l'application.";
  banner.querySelector("#pwa-install-btn").textContent = "Compris";
  banner.querySelector("#pwa-install-btn")?.addEventListener("click", () => {
    banner.hidden = true;
  });
  banner.hidden = false;
}

export function initPwaInstall() {
  if (isStandalone() || wasDismissed()) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    const onAppPage = /dashboard|devis|planning|chantiers|clients|mobile/.test(window.location.pathname);
    const loggedIn = Boolean(getUser());
    if (!onAppPage && !loggedIn) return;

    const banner = createBanner();
    if (banner) banner.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    document.getElementById("pwa-install-banner")?.remove();
  });

  setTimeout(showIosHint, 1500);
}

initPwaInstall();
