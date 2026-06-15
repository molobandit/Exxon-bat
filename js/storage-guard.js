/**
 * Nettoyage stockage mobile (Safari, Chrome…) — chargé AVANT tout le reste (script classique, pas module).
 * Supprime le catalogue BTP du téléphone sans le lire (évite les alertes « stockage plein »).
 */
(function () {
  var BLOATED_KEYS = [
    "exone-prestations-library",
    "exone-wikimedia-image-cache-v1",
  ];

  function removeKey(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      /* quota iOS — on ignore */
    }
  }

  function trimKey(key, maxChars) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw || raw.length <= maxChars) return;
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        removeKey(key);
        return;
      }
      localStorage.setItem(key, JSON.stringify(data.slice(0, 30)));
    } catch (e) {
      removeKey(key);
    }
  }

  function scrubSavedPrestations() {
    try {
      var raw = localStorage.getItem("exone-prestations-saved");
      if (!raw) return;
      if (raw.length > 300000) {
        removeKey("exone-prestations-saved");
        return;
      }
      var list = JSON.parse(raw);
      if (!Array.isArray(list)) {
        removeKey("exone-prestations-saved");
        return;
      }
      var kept = list.filter(function (item) {
        var s = (item && item.source) || "";
        return s === "manual" || s === "import";
      });
      if (kept.length !== list.length) {
        localStorage.setItem("exone-prestations-saved", JSON.stringify(kept));
      }
    } catch (e) {
      removeKey("exone-prestations-saved");
    }
  }

  function freeExoneStorage() {
    for (var i = 0; i < BLOATED_KEYS.length; i += 1) {
      removeKey(BLOATED_KEYS[i]);
    }
    scrubSavedPrestations();
    trimKey("exone-devis-history", 120000);
    trimKey("exone-documents", 80000);
    trimKey("exone-metres", 80000);
    trimKey("exone-activities", 80000);
  }

  freeExoneStorage();

  window.ExoneStorageGuard = {
    freeExoneStorage: freeExoneStorage,
  };
})();
