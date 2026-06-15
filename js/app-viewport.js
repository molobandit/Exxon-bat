/**
 * Vue mobile dézoomée — uniquement sur vrai mobile / fenêtre étroite.
 */
(function () {
  var DEFAULT_VIEWPORT =
    "width=device-width, initial-scale=1.0, viewport-fit=cover";

  function isCompactPage() {
    var path = window.location.pathname.toLowerCase();
    return !/(^\/$|\/index\.html$|connexion|inscription|acces\.html|mobile\.html|mentions|conditions|confidentialite|donnees-personnelles|offline\.html|paiement\.html|simulation-metre)/.test(
      path,
    );
  }

  function isMobileEnv() {
    if (typeof window.exoneIsMobileEnv === "function") {
      return window.exoneIsMobileEnv();
    }
    var ua = navigator.userAgent || "";
    if (/Android|webOS|iPhone|iPod|Mobile|IEMobile|Opera Mini/i.test(ua)) return true;
    if (/iPad/i.test(ua)) return true;
    try {
      if (window.matchMedia("(max-width: 900px)").matches) return true;
    } catch (e) {
      /* ignore */
    }
    return false;
  }

  function restoreDesktopViewport() {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    if (meta.dataset.compact === "1") {
      meta.setAttribute("content", DEFAULT_VIEWPORT);
      delete meta.dataset.compact;
    }
  }

  function applyCompact() {
    var path = window.location.pathname.toLowerCase();
    if (/devis\.html/.test(path)) {
      document.documentElement.classList.add("devis-page-compact");
    } else {
      document.documentElement.classList.remove("devis-page-compact");
    }

    if (!isCompactPage() || !isMobileEnv()) {
      document.documentElement.classList.remove("is-app-compact");
      restoreDesktopViewport();
      return;
    }

    var meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "width=device-width, initial-scale=0.7, minimum-scale=0.55, maximum-scale=3, viewport-fit=cover",
      );
      meta.dataset.compact = "1";
    }

    document.documentElement.classList.add("is-app-compact");
  }

  applyCompact();
  document.addEventListener("DOMContentLoaded", applyCompact);
  window.addEventListener("orientationchange", function () {
    setTimeout(applyCompact, 120);
  });
  window.addEventListener("resize", function () {
    applyCompact();
  });
})();
