/**
 * Garde-fou anti-cache — sans boucles de rechargement.
 * La version est lue depuis ?v= sur ce script (fallback synchronisé par sync-app-version.mjs).
 */
(function () {
  var FALLBACK_VERSION = "194";
  var VERSION_KEY = "exone-app-version";
  var RELOAD_KEY = "exone-repair-reload-v";

  function readGuardVersion() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("app-version-guard.js") !== -1) {
        var match = src.match(/[?&]v=(\d+)/);
        if (match) return match[1];
      }
    }
    return FALLBACK_VERSION;
  }

  function isLocalDev() {
    var host = window.location.hostname || "";
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host)
    );
  }

  var EXPECTED_VERSION = readGuardVersion();

  function purgeCaches() {
    var tasks = [];
    if ("caches" in window) {
      tasks.push(
        caches.keys().then(function (keys) {
          return Promise.all(
            keys.map(function (key) {
              return caches.delete(key);
            }),
          );
        }),
      );
    }
    if ("serviceWorker" in navigator) {
      tasks.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(
            regs.map(function (reg) {
              return reg.unregister();
            }),
          );
        }),
      );
    }
    return Promise.all(tasks);
  }

  function reloadOnce(reason) {
    try {
      if (sessionStorage.getItem(RELOAD_KEY + EXPECTED_VERSION)) return;
      sessionStorage.setItem(RELOAD_KEY + EXPECTED_VERSION, "1");
    } catch (_) {
      /* ignore */
    }
    console.warn("[Exxon-bat] Réparation v" + EXPECTED_VERSION + " —", reason || "");
    purgeCaches().then(function () {
      try {
        localStorage.setItem(VERSION_KEY, EXPECTED_VERSION);
      } catch (_) {
        /* ignore */
      }
      window.location.reload();
    });
  }

  function repairIfNeeded(reason) {
    try {
      localStorage.setItem(VERSION_KEY, EXPECTED_VERSION);
    } catch (_) {
      /* ignore */
    }
    if (isLocalDev()) {
      purgeCaches();
      return;
    }
    reloadOnce(reason);
  }

  try {
    var stored = localStorage.getItem(VERSION_KEY);
    if (stored && stored !== EXPECTED_VERSION) {
      repairIfNeeded("version " + stored + " → " + EXPECTED_VERSION);
    } else {
      localStorage.setItem(VERSION_KEY, EXPECTED_VERSION);
    }
  } catch (_) {
    /* ignore */
  }

  window.__APP_VERSION = EXPECTED_VERSION;
  window.__EXONE_LOCAL_DEV = isLocalDev();

  if (window.location.search.includes("nocache=1")) {
    purgeCaches().then(function () {
      try {
        var url = new URL(window.location.href);
        url.searchParams.delete("nocache");
        history.replaceState(null, "", url.toString());
      } catch (_) {
        /* ignore */
      }
    });
  }

  function isModuleLoadFailure(message) {
    return /does not provide an export|failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unexpected token|is not a valid/i.test(
      message,
    );
  }

  window.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      if (target && target.tagName === "SCRIPT" && target.src && /\.js(\?|$)/.test(target.src)) {
        if (target.src.indexOf("app-version-guard") !== -1) return;
        if (target.src.indexOf("import-map") !== -1) return;
        repairIfNeeded("script " + target.src.split("/").pop());
        return;
      }
      if (isModuleLoadFailure(String(event.message || ""))) {
        repairIfNeeded(String(event.message || "module error"));
      }
    },
    true,
  );

  window.addEventListener("unhandledrejection", function (event) {
    var msg = String(
      event.reason && event.reason.message ? event.reason.message : event.reason || "",
    );
    if (!isModuleLoadFailure(msg)) return;
    event.preventDefault();
    repairIfNeeded(msg.slice(0, 120));
  });
})();
