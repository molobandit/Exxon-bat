/** Exemples réalistes BTP — bénéfice net après charges (illustratif). */
import { formatProfileMoney } from "./market.js";

export const DEVIS_MONEY_EXAMPLES = [
  {
    id: "elec",
    emoji: "⚡",
    title: "Tableau électrique",
    trade: "Électricien",
    priceQuoted: 2800,
    priceRecommended: 3350,
    netWithout: 186,
    netWith: 486,
    thoughtProfit: 800,
  },
  {
    id: "sdb",
    emoji: "🚿",
    title: "Rénovation SDB complète",
    trade: "Plombier · carreleur",
    priceQuoted: 4200,
    priceRecommended: 5100,
    netWithout: 312,
    netWith: 892,
    thoughtProfit: 1200,
  },
  {
    id: "peinture",
    emoji: "🎨",
    title: "Peinture appartement 70 m²",
    trade: "Peintre",
    priceQuoted: 6500,
    priceRecommended: 7800,
    netWithout: 540,
    netWith: 1280,
    thoughtProfit: 1800,
  },
  {
    id: "placo",
    emoji: "🧱",
    title: "Cloisons & isolation",
    trade: "Plaquiste",
    priceQuoted: 3200,
    priceRecommended: 3850,
    netWithout: 228,
    netWith: 612,
    thoughtProfit: 900,
  },
  {
    id: "depannage",
    emoji: "🔧",
    title: "Dépannage plomberie urgent",
    trade: "Plombier",
    priceQuoted: 1450,
    priceRecommended: 1780,
    netWithout: 95,
    netWith: 285,
    thoughtProfit: 450,
  },
  {
    id: "menuiserie",
    emoji: "🪟",
    title: "Pose fenêtres PVC (4 ouvrants)",
    trade: "Menuisier",
    priceQuoted: 5800,
    priceRecommended: 6950,
    netWithout: 410,
    netWith: 1040,
    thoughtProfit: 1500,
  },
];

export function getLandingMoneyExamples() {
  return DEVIS_MONEY_EXAMPLES;
}

export function getAverageExtraPerDevis(examples = getLandingMoneyExamples()) {
  if (!examples.length) return 0;
  const total = examples.reduce((sum, ex) => sum + (ex.netWith - ex.netWithout), 0);
  return Math.round(total / examples.length);
}

export function formatLandingMoney(value) {
  return formatProfileMoney(value);
}

export function formatLandingMoneySigned(value) {
  const prefix = value >= 0 ? "+ " : "− ";
  return prefix + formatLandingMoney(Math.abs(value)).replace(/\s/g, " ").trim();
}

export function projectGains(devisPerMonth, avgExtra = getAverageExtraPerDevis()) {
  const monthly = Math.round(devisPerMonth * avgExtra);
  const yearly = monthly * 12;
  return { monthly, yearly, avgExtra, devisPerMonth };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderDevisMoneyCard(example) {
  const extra = example.netWith - example.netWithout;
  const illusionGap = example.thoughtProfit - example.netWithout;

  return `
    <article class="devis-money-card" data-extra="${extra}">
      <div class="devis-money-card__head">
        <span class="devis-money-card__emoji">${example.emoji}</span>
        <div>
          <h3>${escapeHtml(example.title)}</h3>
          <p>${escapeHtml(example.trade)}</p>
        </div>
      </div>
      <div class="devis-money-card__prices">
        <div class="devis-money-card__price devis-money-card__price--bad">
          <span>Devis envoyé</span>
          <strong>${formatLandingMoney(example.priceQuoted)} HT</strong>
          <em>Vous pensiez ${formatLandingMoney(example.thoughtProfit)} de marge</em>
        </div>
        <div class="devis-money-card__arrow" aria-hidden="true">→</div>
        <div class="devis-money-card__price devis-money-card__price--good">
          <span>Après recalcul Exxon-bat</span>
          <strong>${formatLandingMoney(example.priceRecommended)} HT</strong>
          <em>${formatLandingMoney(example.netWith)} nets dans votre poche</em>
        </div>
      </div>
      <div class="devis-money-card__footer">
        <div class="devis-money-card__loss">
          <span>Sans recalcul</span>
          <strong>${formatLandingMoney(example.netWithout)}</strong>
          <small>−${formatLandingMoney(illusionGap)} vs ce que vous croyiez</small>
        </div>
        <div class="devis-money-card__gain">
          <span>Sur ce seul devis</span>
          <strong class="devis-money-card__extra">${formatLandingMoneySigned(extra)}</strong>
          <small>récupérés en ajustant le prix</small>
        </div>
      </div>
    </article>`;
}

export function initLandingMoney() {
  const grid = document.getElementById("devis-money-grid");
  const slider = document.getElementById("devis-per-month");
  const monthlyEl = document.getElementById("money-monthly");
  const yearlyEl = document.getElementById("money-yearly");
  const countEl = document.getElementById("devis-per-month-value");
  const avgHeroEls = document.querySelectorAll("[data-landing-avg-extra]");
  const statsExtraEl = document.getElementById("stats-extra-devis");

  const examples = getLandingMoneyExamples();
  const avgExtra = getAverageExtraPerDevis(examples);
  const avgLabel = formatLandingMoneySigned(avgExtra);

  avgHeroEls.forEach((el) => {
    el.textContent = avgLabel;
  });
  if (statsExtraEl) {
    statsExtraEl.textContent = avgLabel.replace("+ ", "+");
  }

  if (grid) {
    grid.innerHTML = examples.map(renderDevisMoneyCard).join("");
  }

  function updateProjection() {
    if (!slider) return;
    const count = Number(slider.value) || 8;
    const { monthly, yearly } = projectGains(count, avgExtra);
    if (countEl) countEl.textContent = String(count);
    if (monthlyEl) monthlyEl.textContent = formatLandingMoneySigned(monthly);
    if (yearlyEl) yearlyEl.textContent = formatLandingMoneySigned(yearly);
  }

  slider?.addEventListener("input", updateProjection);
  updateProjection();

  const section = document.getElementById("argent-devis");
  if (!section || !("IntersectionObserver" in window)) return;

  let animated = false;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting) || animated) return;
      animated = true;
      const count = Number(slider?.value) || 8;
      const { monthly, yearly } = projectGains(count, avgExtra);
      animateValue(monthlyEl, 0, monthly, 900);
      animateValue(yearlyEl, 0, yearly, 1100);
      section.querySelectorAll(".devis-money-card__extra").forEach((el, i) => {
        const card = el.closest(".devis-money-card");
        const target = Number(card?.dataset.extra) || 0;
        setTimeout(() => animateExtra(el, target), 120 * i);
      });
    },
    { threshold: 0.2 },
  );
  observer.observe(section);
}

function animateValue(el, from, to, duration) {
  if (!el) return;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    const value = Math.round(from + (to - from) * eased);
    el.textContent = formatLandingMoneySigned(value);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function animateExtra(el, target) {
  animateValue(el, 0, target, 700);
}

if (document.getElementById("devis-money-grid")) {
  initLandingMoney();
}
