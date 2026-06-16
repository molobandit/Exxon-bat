/**
 * Détection mobile fiable — fenêtre étroite sur PC ≠ mobile (souris).
 */
(function (g) {
  function isDesktopPointer() {
    try {
      return g.matchMedia("(hover: hover) and (pointer: fine)").matches;
    } catch (e) {
      return false;
    }
  }

  function isMobileEnv() {
    var ua = g.navigator.userAgent || "";
    if (/Android|webOS|iPhone|iPod|Mobile|IEMobile|Opera Mini/i.test(ua)) return true;
    if (/iPad/i.test(ua)) return true;
    if (isDesktopPointer()) return false;
    try {
      if (g.matchMedia("(max-width: 900px)").matches) return true;
    } catch (e) {
      /* ignore */
    }
    return false;
  }

  g.exoneIsDesktopPointer = isDesktopPointer;
  g.exoneIsMobileEnv = isMobileEnv;

  var script = g.document.currentScript;
  if (script && !g.__exoneNavMenuBootstrap) {
    var src = script.getAttribute("src") || "";
    var base = src.replace(/[^/]+$/, "");
    var ver = g.__APP_VERSION;
    if (!ver) {
      var vm = src.match(/[?&]v=(\d+)/);
      ver = vm ? vm[1] : "191";
    }
    var boot = g.document.createElement("script");
    boot.src = base + "nav-menu-bootstrap.js?v=" + ver;
    boot.async = false;
    g.document.head.appendChild(boot);
  }
})(window);
