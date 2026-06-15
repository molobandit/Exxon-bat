const PRIMARY_TABS = [
  { id: "dashboard", href: "dashboard.html", icon: "🏠", label: "Accueil" },
  { id: "devis", href: "devis.html", icon: "📋", label: "Devis" },
  { id: "bibliotheque", href: "bibliotheque.html", icon: "📚", label: "Bibliothèque" },
  { id: "chantiers", href: "chantiers.html", icon: "🏗️", label: "Chantiers" },
];

const MORE_SECTIONS = [
  {
    title: "Gestion",
    links: [
      { href: "clients.html", label: "Clients", icon: "👥", id: "clients" },
      { href: "planning.html", label: "Planning", icon: "📅", id: "planning" },
      { href: "comptabilite.html", label: "Comptabilité", icon: "💰", id: "comptabilite" },
      { href: "statistiques.html", label: "Statistiques", icon: "📈", id: "statistiques" },
    ],
  },
  {
    title: "Chantier",
    links: [
      { href: "metre.html", label: "Valider métré", icon: "✓", id: "metre" },
      { href: "devis.html#rentabilite", label: "Rentabilité", icon: "📊", id: "rentabilite" },
    ],
  },
  {
    title: "Compte",
    links: [
      { href: "employes.html", label: "Équipe", icon: "👷", id: "employes" },
      { href: "profil.html", label: "Profil & réglages", icon: "⚙️", id: "profil" },
      { href: "support.html", label: "Support", icon: "💬", id: "support" },
      { href: "tarifs.html", label: "Offres & tarifs", icon: "💳", id: "tarifs" },
    ],
  },
];

const PAGE_TO_TAB = {
  dashboard: "dashboard",
  devis: "devis",
  rentabilite: "devis",
  prestations: "bibliotheque",
  clients: "menu",
  chantiers: "chantiers",
  planning: "planning",
  metre: "menu",
  employes: "menu",
  statistiques: "menu",
  comptabilite: "menu",
  profil: "menu",
  bibliotheque: "bibliotheque",
  support: "menu",
  tarifs: "menu",
  avis: "menu",
};

function appPath(path) {
  const prefix = window.location.pathname.includes("/employe/") ? "../" : "";
  const v = window.__APP_VERSION;
  if (!v) return prefix + path;
  const hashIdx = path.indexOf("#");
  const hash = hashIdx >= 0 ? path.slice(hashIdx) : "";
  const pathOnly = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
  if (pathOnly.includes("?")) return prefix + path;
  return `${prefix}${pathOnly}?v=${v}${hash}`;
}

function isMoreLinkActive(link, activePage) {
  if (link.id === activePage) return true;
  if (activePage === "prestations" && link.href === "bibliotheque.html") return true;
  return false;
}

let plusMenuCloseTimer = null;

function isPlusMenuOpen() {
  return document.getElementById("app-menu-plus")?.classList.contains("is-open") ?? false;
}

function removePlusMenuShell() {
  if (plusMenuCloseTimer) {
    clearTimeout(plusMenuCloseTimer);
    plusMenuCloseTimer = null;
  }
  document.querySelectorAll("#app-menu-plus").forEach((el) => el.remove());
}

function closeSheet() {
  const sheet = document.getElementById("app-menu-plus");
  if (!sheet) {
    document.body.classList.remove("app-menu-open");
    document.getElementById("mobile-more-btn")?.classList.remove("is-open");
    return;
  }

  sheet.classList.remove("is-open");
  document.getElementById("mobile-more-btn")?.classList.remove("is-open");

  if (plusMenuCloseTimer) clearTimeout(plusMenuCloseTimer);
  plusMenuCloseTimer = setTimeout(() => {
    sheet.remove();
    plusMenuCloseTimer = null;
    if (!document.getElementById("app-menu-plus") && !document.getElementById("app-menu")) {
      document.body.classList.remove("app-menu-open");
    }
  }, 320);
}

function openMoreSheet(activePage) {
  document.querySelectorAll("#app-menu").forEach((el) => el.remove());
  removePlusMenuShell();

  const sectionsHtml = MORE_SECTIONS.map(
    (section) => `
    <section class="app-menu__group">
      <h3 class="app-menu__group-title">${section.title}</h3>
      ${section.links
        .map(
          (link) => `
        <a href="${appPath(link.href)}" class="app-menu__row${isMoreLinkActive(link, activePage) ? " is-active" : ""}">
          <span class="app-menu__row-icon" aria-hidden="true">${link.icon}</span>
          <span class="app-menu__row-label">${link.label}</span>
          <span class="app-menu__row-chevron" aria-hidden="true">›</span>
        </a>`,
        )
        .join("")}
    </section>`,
  ).join("");

  const sheet = document.createElement("aside");
  sheet.id = "app-menu-plus";
  sheet.className = "app-menu";
  sheet.innerHTML = `
    <div class="app-menu__scrim" data-close-more tabindex="-1"></div>
    <div class="app-menu__sheet" role="dialog" aria-modal="true" aria-label="Plus de modules" tabindex="-1">
      <div class="app-menu__handle" aria-hidden="true"></div>
      <header class="app-menu__hero">
        <div class="app-menu__hero-top">
          <div class="app-menu__user-text">
            <p class="app-menu__name">Modules</p>
            <span class="app-menu__plan">Accès rapide</span>
          </div>
          <button type="button" class="app-menu__close" data-close-more aria-label="Fermer">×</button>
        </div>
      </header>
      <div class="app-menu__scroll">${sectionsHtml}</div>
    </div>`;

  document.body.appendChild(sheet);
  document.body.classList.add("app-menu-open");
  document.getElementById("mobile-more-btn")?.classList.add("is-open");

  requestAnimationFrame(() => {
    sheet.classList.add("is-open");
  });

  sheet.querySelectorAll("[data-close-more]").forEach((el) => {
    el.addEventListener("click", closeSheet);
  });
  sheet.querySelectorAll(".app-menu__row").forEach((link) => {
    link.addEventListener("click", closeSheet);
  });

  document.addEventListener(
    "keydown",
    function onEsc(e) {
      if (e.key === "Escape") {
        closeSheet();
        document.removeEventListener("keydown", onEsc);
      }
    },
    { once: true },
  );
}

export function initMobileBottomNav(activePage) {
  if (window.matchMedia("(min-width: 1025px)").matches) return;
  if (document.getElementById("mobile-bottom-nav")) return;
  if (window.location.pathname.includes("/employe/")) return;

  const tabId = PAGE_TO_TAB[activePage] ?? "menu";

  const nav = document.createElement("nav");
  nav.id = "mobile-bottom-nav";
  nav.className = "mobile-bottom-nav";
  nav.setAttribute("aria-label", "Navigation principale");

  nav.innerHTML =
    PRIMARY_TABS.map(
      (tab) => `
    <a href="${appPath(tab.href)}" class="mobile-bottom-nav__item${tabId === tab.id ? " is-active" : ""}" data-tab="${tab.id}">
      <span class="mobile-bottom-nav__icon" aria-hidden="true">${tab.icon}</span>
      <span class="mobile-bottom-nav__label">${tab.label}</span>
    </a>`,
    ).join("") +
    `
    <button type="button" class="mobile-bottom-nav__item mobile-bottom-nav__item--more${tabId === "menu" ? " is-active" : ""}" id="mobile-more-btn" data-tab="menu" aria-label="Ouvrir le menu Plus">
      <span class="mobile-bottom-nav__icon mobile-bottom-nav__icon--menu" aria-hidden="true"><span></span><span></span><span></span></span>
      <span class="mobile-bottom-nav__label">Plus</span>
    </button>`;

  document.body.appendChild(nav);
  document.body.classList.add("has-mobile-bottom-nav");

  document.getElementById("mobile-more-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isPlusMenuOpen()) {
      closeSheet();
      return;
    }
    openMoreSheet(activePage);
  });
}
