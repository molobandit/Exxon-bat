import { formatProfileMoney } from "./market.js";
import {
  ensureChantierAccessCodes,
  getChantierById,
  getDevisById,
  getMetresByChantier,
  updateChantier,
  updateMetre,
} from "./data.js";
import { initModule } from "./module-base.js";
import {
  aggregateMetres,
  compareDevisToMetre,
  computeMetreTotals,
} from "./metre-calculator.js";
import { METRE_STATUS } from "./metre-constants.js";
import { resolveMetreTemplate } from "./metre-templates.js";
import { loadProfile } from "./storage.js";

initModule("metre", "metre");

const profile = loadProfile();
const chantierSelect = document.getElementById("chantier-select");
const panel = document.getElementById("comparison-panel");
const finalPriceInput = document.getElementById("final-price");

const cmpEls = {
  devisPrice: document.getElementById("cmp-devis-price"),
  metreCost: document.getElementById("cmp-metre-cost"),
  delta: document.getElementById("cmp-delta"),
  verdict: document.getElementById("cmp-verdict"),
  icon: document.getElementById("cmp-icon"),
  label: document.getElementById("cmp-label"),
  message: document.getElementById("cmp-message"),
  detail: document.getElementById("metres-detail"),
};

let currentChantierId = "";

function populateChantiers() {
  const chantiers = ensureChantierAccessCodes();
  chantierSelect.innerHTML = chantiers.length
    ? chantiers
        .map(
          (c) =>
            `<option value="${c.id}">${c.name} — ${c.accessCode} — ${c.client || "Sans client"}</option>`,
        )
        .join("")
    : `<option value="">Aucun chantier</option>`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function renderComparison() {
  const chantier = getChantierById(currentChantierId);
  if (!chantier) {
    panel.hidden = true;
    return;
  }

  const metres = getMetresByChantier(currentChantierId);
  const chantierCountry = chantier.country ?? profile.country ?? "FR";
  const aggregated = aggregateMetres(metres, chantierCountry);
  const devis = chantier.devisId ? getDevisById(chantier.devisId) : null;
  const comparison = compareDevisToMetre(devis, aggregated);
  const formTemplate = resolveMetreTemplate(chantier, profile);

  panel.hidden = false;
  const head = document.querySelector(".app-page__head p");
  if (head) {
    head.textContent = `${formTemplate.tradeLabel} · ${formTemplate.countryLabel} — comparez le devis au bulletin terrain.`;
  }
  cmpEls.devisPrice.textContent = devis
    ? formatProfileMoney(comparison.devisPrice)
    : formatProfileMoney(chantier.budget || 0);
  cmpEls.metreCost.textContent = formatProfileMoney(aggregated.totalCost);
  cmpEls.delta.textContent = formatProfileMoney(comparison.deltaPrice);

  const statusMap = {
    match: { class: "success", icon: "✓", label: "Conforme au devis" },
    overrun: { class: "danger", icon: "!", label: "Dépassement" },
    underrun: { class: "warning", icon: "i", label: "Sous le devis" },
  };
  const visual = statusMap[comparison.status] ?? statusMap.match;

  cmpEls.verdict.className = `verdict verdict--${visual.class}`;
  cmpEls.icon.textContent = visual.icon;
  cmpEls.label.textContent = visual.label;
  cmpEls.message.textContent = comparison.message;

  finalPriceInput.value =
    chantier.finalPrice ?? Math.round(comparison.suggestedFinalPrice);

  cmpEls.detail.innerHTML = metres.length
    ? metres
        .map((metre) => {
          const status = METRE_STATUS[metre.status] ?? METRE_STATUS.draft;
          const totals = computeMetreTotals(metre, chantier.country ?? profile.country ?? "FR");
          return `
          <article class="metre-card">
            <div class="metre-card__top">
              <strong>${formatDate(metre.date || metre.createdAt)} — ${metre.employeeName}</strong>
              <span class="status-pill status-pill--${status.class}">${status.label}</span>
            </div>
            <div class="metre-card__meta">${metre.location || "—"} · ${totals.totalHours} h · ${formatProfileMoney(totals.totalCost)} · Client : ${metre.clientName || "—"}</div>
            <p style="margin:8px 0 0;font-size:0.88rem">
              ${metre.workDescription || metre.notes || "Aucune observation."}
              ${metre.workStatus?.billingType ? ` · ${metre.workStatus.billingType === "regie" ? "Régie" : "Métré"}` : ""}
              ${metre.workStatus?.finished === false ? " · Travail non terminé" : ""}
            </p>
            ${metre.clientSignature ? `<img src="${metre.clientSignature}" alt="Signature" style="margin-top:10px;max-height:70px;border:1px solid var(--border);border-radius:8px" />` : ""}
          </article>`;
        })
        .join("")
    : `<p style="color:var(--text-muted);margin:0">Aucun métré reçu pour ce chantier. L'employé doit saisir les données depuis l'espace terrain.</p>`;
}

chantierSelect.addEventListener("change", () => {
  currentChantierId = chantierSelect.value;
  renderComparison();
});

document.getElementById("validate-metre").addEventListener("click", () => {
  if (!currentChantierId) return;

  const metres = getMetresByChantier(currentChantierId);
  metres.forEach((metre) => updateMetre(metre.id, { status: "validated" }));

  updateChantier(currentChantierId, {
    finalPrice: Number(finalPriceInput.value) || 0,
    status: "valide",
  });

  alert("Métré validé. Le prix final a été enregistré sur le chantier.");
  renderComparison();
});

document.getElementById("request-revision").addEventListener("click", () => {
  if (!currentChantierId) return;

  const metres = getMetresByChantier(currentChantierId);
  metres.forEach((metre) => updateMetre(metre.id, { status: "revision" }));

  updateChantier(currentChantierId, { status: "revision" });
  alert("Révision demandée — l'équipe terrain sera notifiée lors de sa prochaine saisie.");
  renderComparison();
});

populateChantiers();

const presetChantier = new URLSearchParams(window.location.search).get("chantier");
if (presetChantier && chantierSelect.querySelector(`option[value="${presetChantier}"]`)) {
  chantierSelect.value = presetChantier;
}

currentChantierId = chantierSelect.value;
renderComparison();
