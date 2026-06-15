import { formatProfileMoney, getLibraryTradesForMarket } from "./market.js";
import {
  addActivity,
  addChantier,
  ensureChantierAccessCodes,
  getChantiers,
  getDevisById,
  getPrintedDevisHistory,
  getMetresByChantier,
} from "./data.js";
import { computeChantierProgress } from "./chantier-hub.js";
import { TRADES } from "./metre-templates.js";
import { loadProfile } from "./storage.js";
import { initModule } from "./module-base.js";
import { getUser } from "./auth.js";
import { syncChantierCreated } from "./commercial-sync.js";
import { escapeHtml } from "./utils.js";

initModule("chantiers", "chantiers");

const form = document.getElementById("chantier-form");
const list = document.getElementById("chantiers-list");
const cardsList = document.getElementById("chantiers-cards");
const tableWrap = document.querySelector(".chantiers-table-wrap");
const scrollHint = document.querySelector(".chantiers-table-scroll-hint");
const devisSelect = document.getElementById("chantier-devis");
const tradeSelect = document.getElementById("chantier-trade");

const profile = loadProfile();
const user = getUser();

function isMobileList() {
  if (document.documentElement.classList.contains("chantiers-desktop")) return false;
  return true;
}

function toggleListMode() {
  const mobile = isMobileList();
  if (tableWrap) {
    tableWrap.style.display = mobile ? "none" : "block";
  }
  if (scrollHint) {
    scrollHint.style.display = mobile ? "none" : "block";
  }
  if (cardsList) {
    cardsList.style.display = mobile ? "flex" : "none";
  }
}

const marketTrades = getLibraryTradesForMarket();
tradeSelect.innerHTML = Object.entries(TRADES)
  .filter(([value]) => marketTrades.includes(value))
  .map(([value, trade]) => `<option value="${value}">${trade.label}</option>`)
  .join("");
tradeSelect.value = marketTrades.includes(profile.tradeType)
  ? profile.tradeType
  : marketTrades[0] ?? "electricien";

function populateDevis() {
  const devis = getPrintedDevisHistory();
  devisSelect.innerHTML =
    `<option value="">— Sans lien devis —</option>` +
    devis
      .map(
        (item) =>
          `<option value="${item.id}">${item.jobName || "Devis"} — ${formatProfileMoney(item.price)}</option>`,
      )
      .join("");
}

function statusLabel(status) {
  const map = {
    en_cours: { label: "En cours", class: "warning" },
    valide: { label: "Métré validé", class: "success" },
    revision: { label: "Révision", class: "danger" },
    termine: { label: "Terminé", class: "success" },
  };
  return map[status] ?? map.en_cours;
}

async function copyAccessCode(code, button) {
  try {
    await navigator.clipboard.writeText(code);
    const original = button.textContent;
    button.textContent = "Copié ✓";
    setTimeout(() => {
      button.textContent = original;
    }, 1500);
  } catch {
    alert(`Code chantier : ${code}`);
  }
}

function renderChantierCard(chantier) {
  const metres = getMetresByChantier(chantier.id);
  const status = statusLabel(chantier.status);
  const progress = computeChantierProgress(chantier.id);
  const employeLink = `employe/connexion.html?code=${encodeURIComponent(chantier.accessCode)}`;

  return `
    <article class="chantier-card">
      <header class="chantier-card__head">
        <div class="chantier-card__intro">
          <h3 class="chantier-card__title">
            <a href="chantier-detail.html?id=${encodeURIComponent(chantier.id)}">${escapeHtml(chantier.name)}</a>
          </h3>
          <p class="chantier-card__meta">${escapeHtml(TRADES[chantier.tradeType]?.label ?? "Général")} · ${escapeHtml(chantier.location || "Lieu non renseigné")}</p>
        </div>
        <span class="status-pill status-pill--${status.class}">${status.label}</span>
      </header>
      <dl class="chantier-card__facts">
        <div class="chantier-card__fact">
          <dt>Client</dt>
          <dd>${escapeHtml(chantier.client || "—")}</dd>
        </div>
        <div class="chantier-card__fact">
          <dt>Budget HT</dt>
          <dd>${formatProfileMoney(chantier.budget)} <small>(${metres.length} métré(s))</small></dd>
        </div>
        <div class="chantier-card__fact chantier-card__fact--wide">
          <dt>Avancement</dt>
          <dd>
            <div class="progress-bar chantier-card__progress">
              <div class="progress-bar__fill" style="width:${progress}%"></div>
            </div>
            <span>${progress} %</span>
          </dd>
        </div>
        <div class="chantier-card__fact">
          <dt>Code employé</dt>
          <dd><strong class="access-code">${escapeHtml(chantier.accessCode)}</strong></dd>
        </div>
      </dl>
      <div class="chantier-card__actions">
        <a href="chantier-detail.html?id=${encodeURIComponent(chantier.id)}" class="btn btn--ghost btn--sm">Suivi</a>
        <a href="planning.html?chantier=${encodeURIComponent(chantier.id)}" class="btn btn--ghost btn--sm">Gantt</a>
        <a href="${employeLink}" class="btn btn--ghost btn--sm" target="_blank" rel="noopener">Employé</a>
        <button type="button" class="btn btn--ghost btn--sm" data-copy-code="${escapeHtml(chantier.accessCode)}">Copier code</button>
      </div>
    </article>`;
}

function renderChantierRow(chantier) {
  const metres = getMetresByChantier(chantier.id);
  const status = statusLabel(chantier.status);
  const progress = computeChantierProgress(chantier.id);
  const employeLink = `employe/connexion.html?code=${encodeURIComponent(chantier.accessCode)}`;

  return `
        <tr>
          <td class="col-projet">
            <strong><a href="chantier-detail.html?id=${encodeURIComponent(chantier.id)}">${escapeHtml(chantier.name)}</a></strong><br>
            <small>${escapeHtml(TRADES[chantier.tradeType]?.label ?? "Général")} · France</small><br>
            <small>${escapeHtml(chantier.location || "Lieu non renseigné")}</small>
          </td>
          <td class="col-client">${escapeHtml(chantier.client || "—")}</td>
          <td class="col-progress">
            <div class="progress-bar" style="max-width:100px;margin-bottom:6px">
              <div class="progress-bar__fill" style="width:${progress}%"></div>
            </div>
            <small>${progress} %</small>
          </td>
          <td class="col-code">
            <strong class="access-code">${escapeHtml(chantier.accessCode)}</strong><br>
            <a href="${employeLink}" target="_blank" style="font-size:0.78rem">Lien employé</a>
          </td>
          <td class="col-budget">
            ${formatProfileMoney(chantier.budget)}<br>
            <small>${metres.length} métré(s)</small>
          </td>
          <td class="col-status"><span class="status-pill status-pill--${status.class}">${status.label}</span></td>
          <td class="col-actions">
            <a href="chantier-detail.html?id=${encodeURIComponent(chantier.id)}" class="btn btn--ghost btn--sm">Suivi</a>
            <a href="planning.html?chantier=${encodeURIComponent(chantier.id)}" class="btn btn--ghost btn--sm">Gantt</a>
          </td>
        </tr>`;
}

function bindCopyButtons(root) {
  root?.querySelectorAll("[data-copy-code]").forEach((button) => {
    button.addEventListener("click", () => {
      copyAccessCode(button.dataset.copyCode, button);
    });
  });
}

function render() {
  toggleListMode();
  const chantiers = ensureChantierAccessCodes();
  const emptyMessage = `<p class="chantiers-empty">Aucun chantier — créez votre premier projet.</p>`;

  if (isMobileList()) {
    list.innerHTML = "";
    if (cardsList) {
      cardsList.style.display = "flex";
      cardsList.innerHTML = chantiers.length
        ? chantiers.map((chantier) => renderChantierCard(chantier)).join("")
        : emptyMessage;
      bindCopyButtons(cardsList);
    }
    return;
  }

  if (cardsList) {
    cardsList.style.display = "none";
    cardsList.innerHTML = "";
  }
  list.innerHTML = chantiers.length
    ? chantiers.map((chantier) => renderChantierRow(chantier)).join("")
    : `<tr><td colspan="7" style="color:var(--text-muted)">Aucun chantier — créez votre premier projet.</td></tr>`;

  bindCopyButtons(list);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const devisId = devisSelect.value || null;
  const devis = devisId ? getDevisById(devisId) : null;

  addChantier({
    name: document.getElementById("chantier-name").value.trim(),
    client: document.getElementById("chantier-client").value.trim(),
    location: document.getElementById("chantier-location").value.trim(),
    budget: devis?.price ?? Number(document.getElementById("chantier-budget").value) || 0,
    devisId,
    tradeType: tradeSelect.value,
    country: "FR",
  });

  const created = getChantiers().at(-1);
  if (created) {
    syncChantierCreated(created);
    addActivity({
      chantierId: created.id,
      type: "status",
      icon: "🏗️",
      title: "Chantier créé",
      message: `${created.name} — suivi et planning activés`,
      author: user?.firstname ?? "Employeur",
    });
  }

  form.reset();
  tradeSelect.value = profile.tradeType ?? "electricien";
  populateDevis();
  render();
});

populateDevis();
render();

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 150);
});
