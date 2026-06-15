import { formatPrice, getPlan, getMinPlanForModule, PLAN_ORDER, PLANS, setPlan } from "./subscription.js";
import { getUser, saveUser } from "./auth.js";
import { withSubscription } from "./trial.js";

const toggleMonthly = document.getElementById("toggle-monthly");
const toggleAnnual = document.getElementById("toggle-annual");
const grid = document.getElementById("pricing-grid");

let billing = "monthly";

function renderCards() {
  grid.innerHTML = "";

  for (const planId of PLAN_ORDER) {
    const plan = PLANS[planId];
    const price = billing === "monthly" ? plan.priceMonthly : plan.priceAnnual;
    const suffix = billing === "monthly" ? "HT/mois" : "HT/an";
    const current = getPlan().id === plan.id;

    const card = document.createElement("article");
    card.className = `pricing-card${plan.popular ? " pricing-card--popular" : ""}`;
    card.innerHTML = `
      ${plan.popular ? '<span class="pricing-card__popular">Le plus populaire</span>' : ""}
      <h3>${plan.name}</h3>
      <p class="pricing-card__tagline">${plan.tagline}</p>
      <div class="pricing-card__price">
        <strong>${formatPrice(price)}</strong>
        <span>${suffix}</span>
      </div>
      <ul>
        ${plan.features.map((f) => `<li>${f}</li>`).join("")}
      </ul>
      <button class="btn ${plan.popular ? "btn--primary" : "btn--ghost"} btn--block" data-plan="${plan.id}">
        ${current ? "Offre actuelle" : "Choisir " + plan.name}
      </button>
    `;
    grid.appendChild(card);
  }

  grid.querySelectorAll("[data-plan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setPlan(btn.dataset.plan);
      const user = localStorage.getItem("exone-solution-user");
      const currentUser = getUser();
      if (currentUser) saveUser(withSubscription(currentUser));
      window.location.href = user ? "dashboard.html" : "inscription.html";
    });
  });
}

toggleMonthly?.addEventListener("click", () => {
  billing = "monthly";
  toggleMonthly.classList.add("is-active");
  toggleAnnual?.classList.remove("is-active");
  renderCards();
});

toggleAnnual?.addEventListener("click", () => {
  billing = "annual";
  toggleAnnual.classList.add("is-active");
  toggleMonthly?.classList.remove("is-active");
  renderCards();
});

const params = new URLSearchParams(window.location.search);
const upgrade = params.get("upgrade");
const expired = params.get("expired");
const banner = document.getElementById("upgrade-banner");

if (expired === "trial" && banner) {
  banner.hidden = false;
  banner.querySelector("p").textContent =
    "Votre essai gratuit est terminé. Choisissez une offre pour continuer à utiliser Exxon-bat.";
}

if (upgrade && banner) {
  const minPlan = getMinPlanForModule(upgrade);
  banner.hidden = false;
  banner.querySelector("p").textContent = minPlan
    ? `Ce module est inclus dans l'offre ${minPlan.name} (${formatPrice(minPlan.priceMonthly)} HT/mois) et les offres supérieures.`
    : "Ce module nécessite une offre supérieure.";
}

renderCards();
