(function initBackNav() {
  const path = window.location.pathname;
  const file = path.split("/").pop() || "index.html";
  const inEmploye = path.includes("/employe/");

  if (!inEmploye && (file === "index.html" || file === "")) return;

  function fallbackHref() {
    const explicit = document.body.dataset.backHref;
    if (explicit) return explicit;

    if (inEmploye) {
      if (file === "connexion.html") return "../index.html";
      if (file === "index.html") return "../index.html";
      if (file === "metre.html" || file === "historique.html") return "index.html";
      return "index.html";
    }

    const pageFallbacks = {
      "chantier-detail.html": "chantiers.html",
      "planning.html": "chantiers.html",
      "metre.html": "chantiers.html",
      "profil.html": "dashboard.html",
      "devis.html": "dashboard.html",
      "clients.html": "dashboard.html",
      "chantiers.html": "dashboard.html",
      "statistiques.html": "dashboard.html",
      "comptabilite.html": "dashboard.html",
      "campagnes.html": "dashboard.html",
      "employes.html": "dashboard.html",
      "dashboard.html": "index.html",
      "connexion.html": "index.html",
      "inscription.html": "index.html",
      "tarifs.html": "index.html",
      "acces.html": "index.html",
    };

    if (pageFallbacks[file]) return pageFallbacks[file];
    return "index.html";
  }

  function goBack() {
    const referrer = document.referrer;
    const sameOrigin =
      referrer && new URL(referrer, window.location.origin).origin === window.location.origin;

    if (sameOrigin && window.history.length > 1) {
      history.back();
      return;
    }

    window.location.href = fallbackHref();
  }

  function mount() {
    const navInner =
      document.querySelector(".nav__inner") ||
      document.querySelector(".employe-nav__inner");

    if (!navInner) return;

    let btn = document.querySelector(".nav-back");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-back";
      btn.setAttribute("aria-label", "Retour");
      btn.title = "Retour";
      btn.innerHTML = "<span aria-hidden=\"true\">←</span>";
      btn.addEventListener("click", goBack);
    }

    if (btn.parentElement !== navInner || navInner.firstElementChild !== btn) {
      navInner.insertBefore(btn, navInner.firstChild);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  window.addEventListener("load", mount);
  document.addEventListener("exone-nav-ready", mount);
})();
