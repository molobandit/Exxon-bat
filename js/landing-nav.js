import { getUser, hasAppAccess } from "./auth.js";
import { isDemoEnabled } from "./app-config.js";

/** Complète la nav vitrine : Mon espace + Mode test (local). */
export function patchLandingNav() {
  const auth = document.querySelector(".nav__auth");
  if (!auth) return;

  const primary = auth.querySelector(".btn--primary");

  const user = getUser();
  if (user && hasAppAccess(user) && !auth.querySelector("[data-app-entry]")) {
    const link = document.createElement("a");
    link.href = "dashboard.html";
    link.className = "btn btn--ghost";
    link.dataset.appEntry = "1";
    link.textContent = "Mon espace";
    auth.insertBefore(link, primary ?? null);
  }

  if (isDemoEnabled() && !auth.querySelector("[data-quick-test]")) {
    const link = document.createElement("a");
    link.href = "acces.html?go=employeur";
    link.className = "btn btn--ghost";
    link.dataset.quickTest = "1";
    link.textContent = "Mode test";
    auth.insertBefore(link, primary ?? null);
  }
}
