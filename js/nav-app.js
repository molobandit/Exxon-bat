import { getUser, logout } from "./auth.js";
import { canShowEmployeePortal } from "./employee-access.js";
import { importVersioned } from "./module-import.js";
import { initBrand } from "./brand.js";
import { applyTranslations, initI18n } from "./i18n.js";
import { initAppSecurity } from "./app-security.js";
import { initMobileBottomNav } from "./mobile-bottom-nav.js";
import { getPlan, hasModule } from "./subscription.js";
import {
  getTrialDaysLeft,
  getTrialStatusLabel,
  hasPaidSubscription,
  isTrialActive,
} from "./trial.js";
import { escapeHtml } from "./utils.js";

const NAV_ORDER = [
  "dashboard",
  "devis",
  "rentabilite",
  "prestations",
  "clients",
  "chantiers",
  "planning",
  "metre",
  "employes",
  "statistiques",
  "comptabilite",
  "profil",
  "tarifs",
  "avis",
  "support",
];

const NAV_I18N_KEYS = {
  dashboard: "nav.home",
  devis: "nav.quotesInvoices",
  rentabilite: "nav.rentability",
  prestations: "nav.library",
  clients: "nav.clients",
  chantiers: "nav.sites",
  statistiques: "nav.stats",
  profil: "nav.profile",
  planning: "nav.planning",
  metre: "nav.metre",
  employes: "nav.team",
  avis: "nav.reviews",
  support: "nav.support",
  tarifs: "nav.pricing",
};

function appPath(path) {
  return window.location.pathname.includes("/employe/") ? `../${path}` : path;
}

function homePageHref() {
  return window.location.pathname.includes("/employe/") ? "../index.html" : "index.html";
}

let aiAssistantScheduled = false;

function scheduleAiAssistant() {
  if (aiAssistantScheduled) return;
  aiAssistantScheduled = true;

  const load = () => {
    importVersioned("./ai-assistant.js")
      .then((mod) => mod.initAiAssistant?.())
      .catch(() => {
        /* assistant optionnel — ne pas bloquer l'app */
      });
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(load, { timeout: 4000 });
  } else {
    setTimeout(load, 1500);
  }
}

const NAV_ICONS = {
  dashboard: "🏠",
  devis: "📋",
  rentabilite: "📊",
  prestations: "📚",
  clients: "👥",
  chantiers: "🏗️",
  planning: "📅",
  metre: "✓",
  employes: "👷",
  statistiques: "📈",
  comptabilite: "💰",
  profil: "⚙️",
  tarifs: "💳",
  avis: "⭐",
  support: "💬",
};

const NAV_GROUPS = [
  {
    title: "Pilotage",
    ids: ["dashboard", "devis", "rentabilite", "prestations", "clients", "chantiers", "planning"],
  },
  { title: "Terrain", ids: ["metre", "employes"] },
  { title: "Entreprise", ids: ["statistiques", "comptabilite", "profil", "tarifs", "avis", "support"] },
];

function userInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "EX").toUpperCase();
}

let appMenuCloseTimer = null;

function updateNavToggle(open) {
  const toggle = document.getElementById("nav-toggle");
  toggle?.classList.toggle("is-open", open);
  toggle?.setAttribute("aria-expanded", String(open));
  toggle?.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
}

function removeAppMenuShell() {
  if (appMenuCloseTimer) {
    clearTimeout(appMenuCloseTimer);
    appMenuCloseTimer = null;
  }
  document.querySelectorAll("#app-menu").forEach((el) => el.remove());
}

function isAppMenuOpen() {
  return document.getElementById("app-menu")?.classList.contains("is-open") ?? false;
}

function closeAppMenu() {
  const menu = document.getElementById("app-menu");
  if (!menu) {
    document.body.classList.remove("app-menu-open");
    updateNavToggle(false);
    return;
  }

  menu.classList.remove("is-open");
  updateNavToggle(false);

  if (appMenuCloseTimer) clearTimeout(appMenuCloseTimer);
  appMenuCloseTimer = setTimeout(() => {
    menu.remove();
    appMenuCloseTimer = null;
    if (!document.getElementById("app-menu")) {
      document.body.classList.remove("app-menu-open");
    }
  }, 320);
}

function renderMenuGroups(navLinks) {
  const byNav = Object.fromEntries(navLinks.map((link) => [link.dataset.nav, link]));
  const used = new Set();

  const grouped = NAV_GROUPS.map((group) => {
    const items = group.ids.map((id) => byNav[id]).filter(Boolean);
    items.forEach((link) => used.add(link.dataset.nav));
    if (!items.length) return "";

    const rows = items
      .map((link) => {
        const navId = link.dataset.nav;
        const icon = NAV_ICONS[navId] ?? "•";
        const active = link.classList.contains("nav__link--active") ? " is-active" : "";
        const label = link.textContent.trim();
        return `<a href="${link.getAttribute("href")}" class="app-menu__row${active}" data-nav="${navId ?? ""}">
          <span class="app-menu__row-icon" aria-hidden="true">${icon}</span>
          <span class="app-menu__row-label">${escapeHtml(label)}</span>
          <span class="app-menu__row-chevron" aria-hidden="true">›</span>
        </a>`;
      })
      .join("");

    return `<section class="app-menu__group"><h3 class="app-menu__group-title">${group.title}</h3>${rows}</section>`;
  }).join("");

  const extras = navLinks
    .filter((link) => !used.has(link.dataset.nav))
    .map((link) => {
      const navId = link.dataset.nav;
      const icon = NAV_ICONS[navId] ?? "•";
      const active = link.classList.contains("nav__link--active") ? " is-active" : "";
      return `<a href="${link.getAttribute("href")}" class="app-menu__row${active}" data-nav="${navId ?? ""}">
        <span class="app-menu__row-icon" aria-hidden="true">${icon}</span>
        <span class="app-menu__row-label">${escapeHtml(link.textContent.trim())}</span>
        <span class="app-menu__row-chevron" aria-hidden="true">›</span>
      </a>`;
    })
    .join("");

  return grouped + (extras ? `<section class="app-menu__group">${extras}</section>` : "");
}

function openAppMenu() {
  document.getElementById("app-menu-plus")?.remove();
  removeAppMenuShell();

  const menuEl = document.querySelector(".nav__menu");
  const actions = document.querySelector(".nav__actions");
  const navLinks = menuEl
    ? [...menuEl.querySelectorAll("a[data-nav]")]
    : [...document.querySelectorAll(".nav__links a[data-nav]")];
  const userEl = document.getElementById("nav-user");
  const userName = userEl?.querySelector(".nav__user-name")?.textContent?.trim() || "Mon compte";
  const userPlan = userEl?.querySelector(".nav__user-plan")?.textContent?.trim() || "";
  const initials = userInitials(userName);

  const employeeLink = actions?.querySelector("#nav-employee-portal");
  const employeeFoot = employeeLink
    ? `<a href="${employeeLink.href}" class="app-menu__foot-link" target="_blank" rel="noopener">👷 Espace employé</a>`
    : "";

  const langSwitcher = actions?.querySelector(".lang-switcher");
  const langFoot = langSwitcher ? langSwitcher.outerHTML : "";

  const shell = document.createElement("aside");
  shell.id = "app-menu";
  shell.className = "app-menu";
  shell.innerHTML = `
    <div class="app-menu__scrim" data-close-menu tabindex="-1"></div>
    <div class="app-menu__sheet" role="dialog" aria-modal="true" aria-label="Menu principal" tabindex="-1">
      <div class="app-menu__handle" aria-hidden="true"></div>
      <header class="app-menu__hero">
        <div class="app-menu__hero-top">
          <div class="app-menu__user">
            <div class="app-menu__avatar" aria-hidden="true">${escapeHtml(initials)}</div>
            <div class="app-menu__user-text">
              <p class="app-menu__name">${escapeHtml(userName)}</p>
              ${userPlan ? `<span class="app-menu__plan">${escapeHtml(userPlan)}</span>` : ""}
            </div>
          </div>
          <button type="button" class="app-menu__close" data-close-menu aria-label="Fermer le menu">×</button>
        </div>
      </header>
      <div class="app-menu__scroll">${renderMenuGroups(navLinks)}</div>
      <footer class="app-menu__footer">
        ${langFoot}
        ${employeeFoot}
        <button type="button" class="app-menu__logout" id="app-menu-logout">Déconnexion</button>
      </footer>
    </div>`;

  document.body.appendChild(shell);
  document.body.classList.add("app-menu-open");
  updateNavToggle(true);

  void shell.offsetHeight;
  requestAnimationFrame(() => {
    shell.classList.add("is-open");
    setTimeout(() => {
      if (!shell.isConnected) return;
      shell.classList.add("is-open");
    }, 32);
  });

  shell.querySelectorAll("[data-close-menu]").forEach((el) => {
    el.addEventListener("click", closeAppMenu);
  });
  shell.querySelectorAll(".app-menu__row").forEach((link) => {
    link.addEventListener("click", closeAppMenu);
  });
  shell.querySelector("#app-menu-logout")?.addEventListener("click", () => {
    closeAppMenu();
    logout();
    window.location.href = homePageHref();
  });

  shell.querySelector(".app-menu__sheet")?.focus();
}

function registerAppMenuToggle() {
  window.__exoneToggleAppMenuFull = () => {
    if (isAppMenuOpen()) closeAppMenu();
    else openAppMenu();
  };
  window.__exoneToggleAppMenu = window.__exoneToggleAppMenuFull;

  if (window.__exoneMenuTogglePending) {
    window.__exoneMenuTogglePending = false;
    window.__exoneToggleAppMenu();
  }
}

function shouldUseMobileNav() {
  if (typeof window.exoneIsMobileEnv === "function") {
    return window.exoneIsMobileEnv();
  }
  return window.matchMedia("(max-width: 900px)").matches;
}

function setupMobileNav() {
  const navInner = document.querySelector(".nav__inner");
  const links = document.querySelector(".nav__links");
  if (!navInner || !links) return;

  registerAppMenuToggle();

  if (!shouldUseMobileNav()) {
    links.removeAttribute("aria-hidden");
    document.getElementById("nav-toggle")?.remove();
    return;
  }

  links.setAttribute("aria-hidden", "true");

  let toggle = document.getElementById("nav-toggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.id = "nav-toggle";
    toggle.type = "button";
    toggle.className = "nav__toggle";
    toggle.setAttribute("aria-label", "Ouvrir le menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "<span></span><span></span><span></span>";
    navInner.appendChild(toggle);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAppMenu();
  });
}

function applyNavTranslations() {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const key = NAV_I18N_KEYS[link.dataset.nav];
    if (key) link.dataset.i18n = key;
  });
  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) logoutBtn.dataset.i18n = "nav.logout";
  applyTranslations();
  window.addEventListener("localechange", applyTranslations);
}

function ensureNavLink(navId, href, label) {
  const menu = document.querySelector(".nav__menu") ?? document.querySelector(".nav__links");
  if (!menu || menu.querySelector(`[data-nav="${navId}"]`)) return null;

  const link = document.createElement("a");
  link.href = appPath(href);
  link.dataset.nav = navId;
  link.className = "nav__link";
  const i18nKey = NAV_I18N_KEYS[navId];
  if (i18nKey) link.dataset.i18n = i18nKey;
  link.textContent = label;
  menu.appendChild(link);
  return link;
}

function ensureAppNavLinks() {
  ensureNavLink("rentabilite", "devis.html#rentabilite", "Rentabilité");
  ensureNavLink("avis", "avis-gestion.html", "Avis");
  ensureNavLink("support", "support.html", "Service client");
}

function ensureNavLayout() {
  const links = document.querySelector(".nav__links");
  if (!links) return;

  let menu = links.querySelector(".nav__menu");
  let actions = links.querySelector(".nav__actions");

  if (!menu) {
    menu = document.createElement("div");
    menu.className = "nav__menu";
    actions = document.createElement("div");
    actions.className = "nav__actions";

    const keepInActions = new Set(["nav-user", "nav-logout", "nav-employee-portal"]);

    [...links.childNodes].forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const id = node.id;
      const isAction =
        keepInActions.has(id) ||
        node.classList.contains("lang-switcher") ||
        node.classList.contains("nav-prefs") ||
        node.classList.contains("nav__actions");
      if (isAction) actions.appendChild(node);
      else menu.appendChild(node);
    });

    links.appendChild(menu);
    links.appendChild(actions);
  }

  if (!actions) return;

  for (const selector of [".nav-prefs", ".lang-switcher", "#nav-user", "#nav-logout", "#nav-employee-portal"]) {
    menu.querySelectorAll(selector).forEach((node) => actions.appendChild(node));
  }
}

function reorderNavLinks() {
  const menu = document.querySelector(".nav__menu");
  if (!menu) return;

  const navLinks = [...menu.querySelectorAll("a[data-nav]")];

  navLinks.sort((a, b) => {
    const orderA = NAV_ORDER.indexOf(a.dataset.nav);
    const orderB = NAV_ORDER.indexOf(b.dataset.nav);
    return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
  });

  for (const link of navLinks) {
    menu.appendChild(link);
  }
}

function renderTrialBanner(user) {
  if (!user || hasPaidSubscription(user) || !isTrialActive(user)) {
    document.getElementById("trial-banner")?.remove();
    return;
  }

  let banner = document.getElementById("trial-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "trial-banner";
    banner.className = "trial-banner";
    const nav = document.querySelector(".nav");
    if (nav) nav.insertAdjacentElement("afterend", banner);
    else document.body.prepend(banner);
  }

  const days = getTrialDaysLeft(user);
  const status = getTrialStatusLabel(user);
  banner.innerHTML = `
    <div class="container trial-banner__inner">
      <p><strong>Essai gratuit Pro</strong> — ${escapeHtml(status ?? "")} pour tester toutes les fonctionnalités.</p>
      <a href="tarifs.html" class="btn btn--ghost btn--sm">Choisir mon offre →</a>
    </div>
  `;
  banner.dataset.daysLeft = String(days);
}

function syncNavHeight() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  document.documentElement.style.setProperty("--app-nav-height", `${nav.offsetHeight}px`);
  const subnav = document.getElementById("devis-subnav");
  if (subnav) {
    document.documentElement.style.setProperty("--devis-subnav-height", `${subnav.offsetHeight}px`);
  }
}

export function initAppNav(activePage) {
  const brand = document.querySelector("a.brand");
  if (brand) brand.href = homePageHref();

  const user = getUser();
  const plan = getPlan();

  renderTrialBanner(user);

  const navUser = document.getElementById("nav-user");
  if (navUser && user) {
    const label = escapeHtml(user.firstname ?? user.email);
    const email = escapeHtml(user.email);
    const planName = escapeHtml(plan.name);
    navUser.innerHTML = `
      <span class="nav__user-name" title="${email}">${label}</span>
      <span class="nav__user-plan">${planName}</span>
    `;
  }

  ensureNavLayout();

  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("nav__link--active", link.dataset.nav === activePage);
  });

  ensureAppNavLinks();
  reorderNavLinks();

  const rentaLink = document.querySelector('[data-nav="rentabilite"]');
  if (rentaLink && !hasModule("rentabilite")) {
    rentaLink.remove();
  }

  if (canShowEmployeePortal()) {
    const actions = document.querySelector(".nav__actions");
    const anchor = document.getElementById("nav-user") ?? document.getElementById("nav-logout");
    if (actions && !document.getElementById("nav-employee-portal")) {
      const employeeLink = document.createElement("a");
      employeeLink.id = "nav-employee-portal";
      employeeLink.href = appPath("employe/connexion.html");
      employeeLink.className = "nav__link nav__link--employee";
      employeeLink.target = "_blank";
      employeeLink.rel = "noopener";
      employeeLink.dataset.i18n = "nav.employee";
      employeeLink.textContent = "Espace employé";
      if (anchor) actions.insertBefore(employeeLink, anchor);
      else actions.appendChild(employeeLink);
    }
  } else {
    document.getElementById("nav-employee-portal")?.remove();
  }

  setupMobileNav();
  initAppSecurity();
  initMobileBottomNav(activePage);
  initBrand();
  initI18n();
  ensureNavLayout();
  scheduleAiAssistant();
  applyNavTranslations();

  document.dispatchEvent(new Event("exone-nav-ready"));

  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("nav__link--active", link.dataset.nav === activePage);
  });

  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
      window.location.href = homePageHref();
    });
  }

  syncNavHeight();
  window.addEventListener("resize", syncNavHeight);
  window.addEventListener("orientationchange", () => setTimeout(syncNavHeight, 120));
}
