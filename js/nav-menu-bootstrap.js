/**
 * Menu ☰ — fonctionne immédiatement, sans attendre nav-app.js (modules ES6).
 */
(function (g) {
  if (g.__exoneNavMenuBootstrap) return;
  g.__exoneNavMenuBootstrap = true;

  function isPhoneUA() {
    var ua = g.navigator.userAgent || "";
    return /Android|webOS|iPhone|iPod|Mobile|IEMobile|Opera Mini/i.test(ua) || /iPad/i.test(ua);
  }

  function isDesktopPointer() {
    try {
      return g.matchMedia("(hover: hover) and (pointer: fine)").matches;
    } catch (e) {
      return false;
    }
  }

  function isMobileNav() {
    if (isDesktopPointer()) return false;
    try {
      if (g.matchMedia("(max-width: 900px)").matches) return true;
    } catch (e) {
      /* ignore */
    }
    return isPhoneUA();
  }

  if (isPhoneUA()) {
    g.document.documentElement.classList.add("exone-mobile");
  }

  if (!g.document.getElementById("exone-nav-menu-css")) {
    var style = g.document.createElement("style");
    style.id = "exone-nav-menu-css";
    style.textContent =
      "@media (max-width:900px){" +
      ".nav__toggle{display:flex!important;order:10;position:relative;z-index:300;touch-action:manipulation;-webkit-tap-highlight-color:transparent;cursor:pointer;margin-left:auto;flex-shrink:0}" +
      ".nav__links{display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;pointer-events:none!important}" +
      ".nav__inner{flex-wrap:nowrap!important;align-items:center;gap:8px}" +
      ".brand{min-width:0;flex:1 1 auto;order:1;max-width:calc(100% - 52px)}" +
      ".brand__name{display:block!important;font-size:1rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".brand__tag{font-size:.65rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".nav__toggle{order:2;flex-shrink:0;margin-left:auto}" +
      "}" +
      "@media (min-width:901px){" +
      ".nav__toggle{display:none!important}" +
      ".nav__links{display:flex!important;visibility:visible!important;height:auto!important;overflow:visible!important;pointer-events:auto!important;flex-wrap:wrap}" +
      ".app-menu{display:none!important}" +
      "}" +
      ".app-menu{position:fixed;inset:0;z-index:9998;display:flex;align-items:flex-end;justify-content:center}" +
      ".app-menu:not(.is-open){visibility:hidden;pointer-events:none}" +
      ".app-menu.is-open{visibility:visible;pointer-events:auto}" +
      ".app-menu__scrim{position:absolute;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .28s ease}" +
      ".app-menu.is-open .app-menu__scrim{opacity:1}" +
      ".app-menu__sheet{position:relative;width:100%;max-height:min(88vh,720px);background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -24px 64px rgba(15,23,42,.22);display:flex;flex-direction:column;transform:translateY(100%);transition:transform .34s cubic-bezier(.22,1,.36,1);outline:none;overflow:hidden}" +
      ".app-menu.is-open .app-menu__sheet{transform:translateY(0)}" +
      ".app-menu__handle{flex-shrink:0;width:40px;height:4px;margin:10px auto 0;border-radius:999px;background:#cbd5e1}" +
      ".app-menu__head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;border-bottom:1px solid #e2e8f0;gap:12px}" +
      ".app-menu__head-brand{min-width:0;display:flex;flex-direction:column;gap:2px}" +
      ".app-menu__head-brand strong{font-size:1rem;color:#0f172a;line-height:1.2}" +
      ".app-menu__head-brand span{font-size:.68rem;color:#64748b;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".app-menu__head h2{margin:0;font-size:1rem;color:#0f172a}" +
      ".app-menu__close{width:34px;height:34px;border:none;border-radius:50%;background:#f1f5f9;color:#0f172a;font-size:1.35rem;line-height:1;cursor:pointer}" +
      ".app-menu__scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 12px 12px}" +
      ".app-menu__row{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;color:#0f172a;text-decoration:none;font-size:.95rem;font-weight:600}" +
      ".app-menu__row.is-active{background:#ede9fe;color:#4338ca}" +
      ".app-menu__row-label{flex:1;min-width:0}" +
      "body.app-menu-open{overflow:hidden!important}";
    g.document.head.appendChild(style);
  }

  function updateToggle(open) {
    var toggle = g.document.getElementById("nav-toggle");
    if (!toggle) return;
    toggle.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  }

  function closeMenu() {
    var menu = g.document.getElementById("app-menu");
    if (menu) {
      menu.classList.remove("is-open");
      g.setTimeout(function () {
        menu.remove();
      }, 280);
    }
    g.document.body.classList.remove("app-menu-open");
    updateToggle(false);
  }

  function collectNavLinks() {
    var menu = g.document.querySelector(".nav__menu");
    if (menu) return [...menu.querySelectorAll("a[data-nav], a.nav__link")];
    return [...g.document.querySelectorAll(".nav__links a[data-nav], .nav__links a.nav__link")].filter(
      function (a) {
        return a.id !== "nav-logout";
      },
    );
  }

  function openFallbackMenu() {
    closeMenu();
    var links = collectNavLinks();
    if (!links.length) return;

    var shell = g.document.createElement("aside");
    shell.id = "app-menu";
    shell.className = "app-menu";
    var rows = links
      .map(function (link) {
        var active = link.classList.contains("nav__link--active") ? " is-active" : "";
        var label = link.textContent.trim();
        return (
          '<a href="' +
          link.getAttribute("href") +
          '" class="app-menu__row' +
          active +
          '"><span class="app-menu__row-label">' +
          label +
          "</span></a>"
        );
      })
      .join("");

    var logout = g.document.getElementById("nav-logout");
    var logoutBtn = logout
      ? '<button type="button" class="app-menu__row" id="app-menu-logout" style="width:100%;border:0;background:transparent;color:#dc2626;cursor:pointer;font:inherit;text-align:left">Déconnexion</button>'
      : "";

    var brandName =
      g.document.querySelector(".brand__name")?.textContent?.trim() || "Exxon-bat";
    var brandTag = g.document.querySelector(".brand__tag")?.textContent?.trim() || "";

    shell.innerHTML =
      '<div class="app-menu__scrim" data-close-menu tabindex="-1"></div>' +
      '<div class="app-menu__sheet" role="dialog" aria-modal="true" aria-label="Menu principal">' +
      '<div class="app-menu__handle" aria-hidden="true"></div>' +
      '<div class="app-menu__head"><div class="app-menu__head-brand"><strong>' +
      brandName +
      "</strong>" +
      (brandTag ? "<span>" + brandTag + "</span>" : "") +
      '</div><button type="button" class="app-menu__close" data-close-menu aria-label="Fermer">×</button></div>' +
      '<div class="app-menu__scroll">' +
      rows +
      logoutBtn +
      "</div></div>";

    g.document.body.appendChild(shell);
    g.document.body.classList.add("app-menu-open");
    updateToggle(true);

    shell.querySelectorAll("[data-close-menu]").forEach(function (el) {
      el.addEventListener("click", closeMenu);
    });
    shell.querySelectorAll(".app-menu__row[href]").forEach(function (el) {
      el.addEventListener("click", closeMenu);
    });
    shell.querySelector("#app-menu-logout")?.addEventListener("click", function () {
      closeMenu();
      logout?.click();
    });

    g.requestAnimationFrame(function () {
      shell.classList.add("is-open");
    });
  }

  function isMenuOpen() {
    return g.document.getElementById("app-menu")?.classList.contains("is-open") ?? false;
  }

  function toggleMenu() {
    if (typeof g.__exoneToggleAppMenuFull === "function") {
      g.__exoneToggleAppMenuFull();
      return;
    }
    if (isMenuOpen()) closeMenu();
    else openFallbackMenu();
  }

  g.__exoneToggleAppMenu = toggleMenu;

  if (g.__exoneMenuTogglePending) {
    g.__exoneMenuTogglePending = false;
    toggleMenu();
  }

  function bindToggle(toggle) {
    if (!toggle || toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";
    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggleMenu();
    });
  }

  function ensureNavToggle() {
    if (!isMobileNav()) {
      g.document.getElementById("nav-toggle")?.remove();
      var links = g.document.querySelector(".nav__links");
      if (links) links.removeAttribute("aria-hidden");
      return;
    }

    var navInner = g.document.querySelector(".nav__inner");
    if (!navInner) return;

    var toggle = g.document.getElementById("nav-toggle");
    if (!toggle) {
      toggle = g.document.createElement("button");
      toggle.id = "nav-toggle";
      toggle.type = "button";
      toggle.className = "nav__toggle";
      toggle.setAttribute("aria-label", "Ouvrir le menu");
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = "<span></span><span></span><span></span>";
      navInner.appendChild(toggle);
    }
    bindToggle(toggle);

    var links = g.document.querySelector(".nav__links");
    if (links) links.setAttribute("aria-hidden", "true");
  }

  function boot() {
    ensureNavToggle();
  }

  g.document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenu();
  });

  if (g.document.readyState === "loading") {
    g.document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  g.addEventListener("resize", ensureNavToggle);
  g.document.addEventListener("exone-nav-ready", ensureNavToggle);
})(window);
