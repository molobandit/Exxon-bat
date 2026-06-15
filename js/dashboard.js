import { requireAuth } from "./auth.js";
import { getSalesStats } from "./data.js";
import { formatProfileMoney } from "./market.js";
import { applyTranslations, onLocaleChange, t } from "./i18n.js";
import { initAppNav } from "./nav-app.js";
import { getPlan, hasModule, PLANS, canUseLibraryCatalog } from "./subscription.js";

if (!requireAuth()) return;
initAppNav("dashboard");
applyTranslations();

const plan = getPlan();
const stats = getSalesStats();

function renderDashboardSubtitle() {
  const el = document.getElementById("dashboard-subtitle");
  if (!el) return;
  const planName = plan.name;
  el.innerHTML = t("dashboard.subtitle", { plan: planName }).replace(
    planName,
    `<strong id="plan-name">${planName}</strong>`,
  );
}

renderDashboardSubtitle();
document.getElementById("kpi-ca").textContent = formatProfileMoney(stats.totalCA);
document.getElementById("kpi-clients").textContent = stats.clientsCount;
document.getElementById("kpi-devis").textContent = stats.devisCount;
document.getElementById("kpi-renta").textContent = `${stats.tauxRentabilite} %`;

const modules = [
  { id: "devis", icon: "📋", title: "Devis & factures", desc: "Créer et suivre vos devis", href: "devis.html", minPlan: "devis" },
  { id: "rentabilite", icon: "📊", title: "Rentabilité", desc: "Analyser si vos devis sont rentables", href: "devis.html#rentabilite", minPlan: "pro" },
  { id: "prestations", icon: "📦", title: "Bibliothèque BTP", desc: "Références métier + ouvrages Batiprix, ajout direct au devis", href: "bibliotheque.html", minPlan: "devis" },
  { id: "clients", icon: "👥", title: "Gestion commerciale", desc: "Pipeline, RDV et suivi synchronisé aux devis", href: "clients.html", minPlan: "pro" },
  { id: "statistiques", icon: "📈", title: "Statistiques ventes", desc: "CA, marges et performance commerciale", href: "statistiques.html", minPlan: "pro" },
  { id: "comptabilite", icon: "🧾", title: "Comptabilité", desc: "Recettes, achats, frais, clients & journal exportable", href: "comptabilite.html", minPlan: "pro" },
  { id: "chantiers", icon: "🏗️", title: "Chantiers & projets", desc: "Suivi temps réel, documents et rentabilité", href: "chantiers.html", minPlan: "business" },
  { id: "planning", icon: "📅", title: "Planning & calendrier", desc: "Agenda unifié, disponibilités et Gantt chantier", href: "planning.html", minPlan: "business" },
  { id: "metre", icon: "📐", title: "Métré & validation", desc: "Comparer le devis au travail réel sur chantier", href: "metre.html", minPlan: "business" },
  { id: "employes", icon: "👷", title: "Équipe terrain", desc: "Identifiants employés pour saisie du métré", href: "employes.html", minPlan: "business" },
  { id: "campagnes", icon: "📞", title: "Campagnes d'appels", desc: "Prospection téléphonique et suivi des appels", href: "campagnes.html", minPlan: "business" },
  { id: "profil", icon: "⚙️", title: "Mon profil", desc: "Paramètres entreprise et abonnement", href: "profil.html", minPlan: "devis" },
  { id: "avis", icon: "⭐", title: "Avis clients", desc: "Lien de collecte et validation des retours clients", href: "avis-gestion.html", minPlan: "pro" },
  { id: "support", icon: "🎧", title: "Service client", desc: "Aide humaine, tickets et accompagnement", href: "support.html", minPlan: "devis", alwaysOn: true },
];

const grid = document.getElementById("module-grid");

for (const mod of modules) {
  const unlocked = hasModule(mod.id) || mod.id === "profil" || mod.alwaysOn || (mod.id === "prestations" && canUseLibraryCatalog());
  const el = document.createElement(unlocked ? "a" : "div");
  el.className = `module-card${unlocked ? "" : " module-card--locked"}`;
  if (unlocked) el.href = mod.href;

  const minPlanName = PLANS[mod.minPlan]?.name ?? mod.minPlan;

  el.innerHTML = `
    ${!unlocked ? `<span class="module-card__badge">${minPlanName}</span>` : ""}
    <div class="module-card__icon">${mod.icon}</div>
    <h3>${mod.title}</h3>
    <p>${mod.desc}</p>
    ${!unlocked ? `<span class="module-card__lock">${t("dashboard.locked", { plan: minPlanName })} <a href="tarifs.html">${t("dashboard.seePlans")}</a></span>` : ""}
  `;

  grid.appendChild(el);
}

onLocaleChange(() => {
  applyTranslations();
  renderDashboardSubtitle();
  document.getElementById("plan-name").textContent = plan.name;
  grid.innerHTML = "";
  for (const mod of modules) {
    const unlocked = hasModule(mod.id) || mod.id === "profil" || mod.alwaysOn || (mod.id === "prestations" && canUseLibraryCatalog());
    const el = document.createElement(unlocked ? "a" : "div");
    el.className = `module-card${unlocked ? "" : " module-card--locked"}`;
    if (unlocked) el.href = mod.href;
    const minPlanName = PLANS[mod.minPlan]?.name ?? mod.minPlan;
    el.innerHTML = `
    ${!unlocked ? `<span class="module-card__badge">${minPlanName}</span>` : ""}
    <div class="module-card__icon">${mod.icon}</div>
    <h3>${mod.title}</h3>
    <p>${mod.desc}</p>
    ${!unlocked ? `<span class="module-card__lock">${t("dashboard.locked", { plan: minPlanName })} <a href="tarifs.html">${t("dashboard.seePlans")}</a></span>` : ""}
  `;
    grid.appendChild(el);
  }
});
