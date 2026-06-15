import { getEmployeeSession, logoutEmployee } from "./employee-auth.js";
import { initEmployeSecurity } from "./employe-security.js";
import { initAiAssistant } from "./ai-assistant.js";
import { initBrand } from "./brand.js";
import { initI18n } from "./i18n.js";

export function initEmployeNav(activePage) {
  const brand = document.querySelector("a.brand");
  if (brand) brand.href = "../index.html";

  const session = getEmployeeSession();
  const userEl = document.getElementById("employe-user");

  if (userEl && session) {
    userEl.textContent = `${session.firstname} ${session.lastname ?? ""}`.trim();
  }

  document.querySelectorAll("[data-employe-nav]").forEach((link) => {
    link.classList.toggle(
      "employe-nav__link--active",
      link.dataset.employeNav === activePage,
    );
  });

  initBrand();
  initI18n();
  initEmployeSecurity();
  setupEmployeMobileNav(activePage);
  initAiAssistant();

  const logoutBtn = document.getElementById("employe-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (event) => {
      event.preventDefault();
      logoutEmployee();
      window.location.href = "connexion.html";
    });
  }
}

function setupEmployeMobileNav(activePage) {
  if (window.matchMedia("(min-width: 769px)").matches) return;
  if (document.getElementById("employe-bottom-nav")) return;

  const metreHref = getActiveMetreHref();

  const nav = document.createElement("nav");
  nav.id = "employe-bottom-nav";
  nav.className = "employe-bottom-nav";
  nav.setAttribute("aria-label", "Navigation terrain");

  const tabs = [
    { id: "accueil", href: "index.html", icon: "🏠", label: "Accueil" },
    { id: "metre", href: metreHref, icon: "📐", label: "Métré" },
    { id: "historique", href: "historique.html", icon: "📋", label: "Historique" },
  ];

  nav.innerHTML = tabs
    .map(
      (tab) => `
    <a href="${tab.href}" class="employe-bottom-nav__item${activePage === tab.id ? " is-active" : ""}">
      <span aria-hidden="true">${tab.icon}</span>
      ${tab.label}
    </a>`,
    )
    .join("");

  document.body.appendChild(nav);
  document.body.classList.add("has-employe-bottom-nav");
}

function getActiveMetreHref() {
  try {
    const code = sessionStorage.getItem("exone-employee-chantier-code");
    if (code) return `metre.html?code=${encodeURIComponent(code)}`;
  } catch {
    /* ignore */
  }
  return "index.html";
}
