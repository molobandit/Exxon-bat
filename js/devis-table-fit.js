/**
 * Ajuste le tableau lignes devis pour tout voir sans scroll horizontal (mobile surtout).
 * Sur PC : pas de zoom — scroll horizontal si besoin pour garder les unités lisibles.
 */
(function () {
  function isDesktopTable() {
    try {
      return window.matchMedia("(min-width: 901px) and (pointer: fine)").matches;
    } catch (e) {
      return window.innerWidth >= 901;
    }
  }

  function resetWrap(wrap) {
    wrap.style.zoom = "";
    wrap.style.transform = "";
    wrap.style.transformOrigin = "";
    wrap.style.width = "";
    wrap.style.height = "";
    wrap.style.overflow = "";
    wrap.classList.remove("is-scaled");
  }

  function fitDevisLinesTable() {
    var wrap = document.querySelector(".devis-lines-table-wrap");
    var table = wrap && wrap.querySelector(".devis-lines-table");
    if (!wrap || !table) return;

    resetWrap(wrap);

    if (isDesktopTable()) {
      wrap.style.overflowX = "auto";
      return;
    }

    var available = wrap.clientWidth;
    if (!available) return;

    var needed = table.scrollWidth;
    if (needed <= available + 6) return;

    var scale = Math.max(0.72, Math.min(1, (available - 4) / needed));
    wrap.classList.add("is-scaled");
    wrap.style.setProperty("--devis-table-scale", String(scale));

    try {
      wrap.style.zoom = String(scale);
    } catch (e) {
      wrap.style.transform = "scale(" + scale + ")";
      wrap.style.transformOrigin = "top left";
      wrap.style.width = 100 / scale + "%";
      wrap.style.height = table.offsetHeight * scale + "px";
      wrap.style.overflow = "hidden";
    }
  }

  function scheduleFit() {
    requestAnimationFrame(function () {
      requestAnimationFrame(fitDevisLinesTable);
    });
  }

  window.exoneFitDevisLinesTable = scheduleFit;

  document.addEventListener("DOMContentLoaded", scheduleFit);
  window.addEventListener("resize", scheduleFit);
  window.addEventListener("devis-lines-rendered", scheduleFit);
})();
