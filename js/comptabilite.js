import { formatProfileMoney } from "./market.js";
import { getCountryProfile } from "./country-config.js";
import {
  addCustomCategory,
  addManualExpense,
  deleteManualExpense,
  getComptaCategories,
} from "./compta-store.js";
import {
  buildComptaLedger,
  exportChantierCsv,
  exportChantierDetailCsv,
  exportJournalCsv,
  getClientOptions,
  getExpenseCategoryOptions,
  groupByCategory,
  groupByChantier,
  groupByClient,
  summarizeLedger,
} from "./compta-engine.js";
import { exportFecContent, getFecFilename } from "./compta-fec-export.js";
import { getChantierOptions, resolveChantierIdForExpense } from "./compta-imputation.js";
import { initModule } from "./module-base.js";
import { getPlan, hasModule } from "./subscription.js";
import { loadProfile } from "./storage.js";
import { escapeHtml } from "./utils.js";

initModule("comptabilite", "comptabilite");

const profile = loadProfile();
const vatOptionsHtml = getCountryProfile(profile.country ?? "FR").vatRates
  .map((r) => `<option value="${r.value}">${r.label}</option>`)
  .join("");
let activePeriod = "month";
let activeTab = "synthese";

const panelsRoot = document.getElementById("compta-panels");
const periodLabel = document.getElementById("compta-period-label");
const kpisRoot = document.getElementById("compta-kpis");
const exportMsg = document.getElementById("export-msg");

function formatDate(iso) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function getLedger() {
  return buildComptaLedger({ period: activePeriod, profile });
}

function downloadText(content, filename, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF", content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadBundle(files) {
  files.forEach((file, index) => {
    setTimeout(() => downloadText(file.content, file.filename, file.mime), index * 350);
  });
}

function exportStamp(period) {
  const d = new Date().toISOString().slice(0, 10);
  return `${period}-${d}`;
}

function canExportFec() {
  return hasModule("chantiers") || getPlan().id === "business";
}

function renderKpis(summary) {
  kpisRoot.innerHTML = `
    <article class="compta-kpi"><span>CA facturé HT</span><strong>${formatProfileMoney(summary.incomeHT)}</strong></article>
    <article class="compta-kpi compta-kpi--good"><span>Encaissé</span><strong>${formatProfileMoney(summary.encaisse)}</strong></article>
    <article class="compta-kpi compta-kpi--bad"><span>Achats & charges</span><strong>${formatProfileMoney(summary.expenseHT)}</strong></article>
    <article class="compta-kpi ${summary.result >= 0 ? "compta-kpi--good" : "compta-kpi--bad"}"><span>Résultat HT</span><strong>${formatProfileMoney(summary.result)}</strong></article>
    <article class="compta-kpi"><span>TVA collectée</span><strong>${formatProfileMoney(summary.vatCollected)}</strong></article>
    <article class="compta-kpi"><span>TVA déductible</span><strong>${formatProfileMoney(summary.vatDeductible)}</strong></article>
  `;
}

function renderJournalTable(entries, emptyMessage, { showChantier = true } = {}) {
  if (!entries.length) {
    return `<p class="compta-note">${emptyMessage}</p>`;
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Libellé</th>
            <th>Catégorie</th>
            ${showChantier ? "<th>Chantier</th>" : ""}
            <th>Client / Fournisseur</th>
            <th>Type</th>
            <th>HT</th>
            <th>TVA</th>
            <th>Payé</th>
          </tr>
        </thead>
        <tbody>
          ${entries
            .map(
              (e) => `
            <tr>
              <td>${formatDate(e.date)}</td>
              <td><strong>${escapeHtml(e.label)}</strong>${e.invoiceRef ? `<br><small>${escapeHtml(e.invoiceRef)}</small>` : ""}</td>
              <td>${escapeHtml(e.categoryLabel)}</td>
              ${
                showChantier
                  ? `<td>${
                      e.chantierId
                        ? `<span class="compta-chantier-tag">${escapeHtml(e.chantierName)}</span><br><small class="compta-chantier-code">${escapeHtml(e.chantierCode)}</small>`
                        : `<span class="compta-chantier-tag compta-chantier-tag--none">Non imputé</span>`
                    }</td>`
                  : ""
              }
              <td>${escapeHtml(e.clientName || e.supplier || "—")}</td>
              <td><span class="compta-badge compta-badge--${e.kind === "income" ? "income" : "expense"}">${e.kind === "income" ? "Produit" : "Charge"}</span></td>
              <td>${formatProfileMoney(e.amountHT)}</td>
              <td>${formatProfileMoney(e.vatAmount)}</td>
              <td>${e.paid ? "✓" : "—"}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderCategoryBars(entries) {
  const groups = groupByCategory(entries);
  const max = Math.max(...groups.map((g) => g.totalHT), 1);

  const income = groups.filter((g) => g.kind === "income");
  const expense = groups.filter((g) => g.kind === "expense");

  const bar = (items, expenseMode = false) =>
    items
      .slice(0, 8)
      .map(
        (g) => `
      <div class="compta-category-bar">
        <div class="compta-category-bar__head">
          <span>${escapeHtml(g.label)}</span>
          <strong>${formatProfileMoney(g.totalHT)}</strong>
        </div>
        <div class="compta-category-bar__track">
          <div class="compta-category-bar__fill${expenseMode ? " compta-category-bar__fill--expense" : ""}" style="width:${Math.max(4, (g.totalHT / max) * 100)}%"></div>
        </div>
      </div>`,
      )
      .join("");

  return `
    <div class="card" style="margin-bottom:20px">
      <h2 class="card__title">Recettes par catégorie</h2>
      <div class="compta-category-bars">${income.length ? bar(income) : "<p class='compta-note'>Aucune recette sur la période.</p>"}</div>
    </div>
    <div class="card">
      <h2 class="card__title">Achats & charges par catégorie</h2>
      <div class="compta-category-bars">${expense.length ? bar(expense, true) : "<p class='compta-note'>Aucune charge sur la période.</p>"}</div>
    </div>`;
}

function renderExpenseForm() {
  const categories = getExpenseCategoryOptions();
  const clients = getClientOptions();
  const chantiers = getChantierOptions();

  return `
    <section class="card">
      <h2 class="card__title">Saisir un achat ou un frais</h2>
      <p class="card__desc">Factures fournisseur, carburant, sous-traitance… Imputation chantier automatique si non renseignée.</p>
      <form id="expense-form" class="compta-form-grid">
        <label class="field">
          <span>Date</span>
          <div class="field__wrap"><input type="date" id="exp-date" required /></div>
        </label>
        <label class="field">
          <span>Catégorie</span>
          <div class="field__wrap">
            <select id="exp-category" required>
              ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.group)} — ${escapeHtml(c.label)}</option>`).join("")}
            </select>
          </div>
        </label>
        <label class="field field--full">
          <span>Libellé</span>
          <div class="field__wrap"><input type="text" id="exp-label" placeholder="Ex. Facture Rexel — câbles" required /></div>
        </label>
        <label class="field">
          <span>Fournisseur</span>
          <div class="field__wrap"><input type="text" id="exp-supplier" placeholder="Nom du fournisseur" /></div>
        </label>
        <label class="field">
          <span>Réf. facture</span>
          <div class="field__wrap"><input type="text" id="exp-invoice" placeholder="N° facture" /></div>
        </label>
        <label class="field">
          <span>Chantier</span>
          <div class="field__wrap">
            <select id="exp-chantier">
              <option value="">Auto — détection intelligente</option>
              ${chantiers.map((c) => `<option value="${c.id}">${escapeHtml(c.label)} (${escapeHtml(c.code)})</option>`).join("")}
            </select>
          </div>
        </label>
        <label class="field">
          <span>Client lié (optionnel)</span>
          <div class="field__wrap">
            <input type="text" id="exp-client" list="exp-client-list" placeholder="Aide à l'imputation auto" />
            <datalist id="exp-client-list">${clients.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("")}</datalist>
          </div>
        </label>
        <label class="field">
          <span>Montant HT</span>
          <div class="field__wrap"><input type="number" id="exp-amount" min="0" step="0.01" required /></div>
        </label>
        <label class="field">
          <span>TVA</span>
          <div class="field__wrap">
            <select id="exp-vat">
              ${vatOptionsHtml}
            </select>
          </div>
        </label>
        <label class="field payments-check" style="align-self:end">
          <input type="checkbox" id="exp-paid" checked />
          <span>Dépense payée</span>
        </label>
        <div class="field--full">
          <button type="submit" class="btn btn--primary">Enregistrer la dépense</button>
        </div>
      </form>
    </section>`;
}

function renderManualExpenseTable(entries) {
  const manual = entries.filter((e) => e.source === "manual");
  if (!manual.length) {
    return `<p class="compta-note">Aucun achat saisi manuellement — utilisez le formulaire ci-dessus.</p>`;
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Fournisseur</th><th>HT</th><th></th></tr>
        </thead>
        <tbody>
          ${manual
            .map(
              (e) => `
            <tr>
              <td>${formatDate(e.date)}</td>
              <td><strong>${escapeHtml(e.label)}</strong></td>
              <td>${escapeHtml(e.categoryLabel)}</td>
              <td>${escapeHtml(e.supplier || "—")}</td>
              <td>${formatProfileMoney(e.amountHT)}</td>
              <td><button type="button" class="btn btn--ghost btn--sm" data-delete-exp="${escapeHtml(e.id)}">Supprimer</button></td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderClientCards(entries) {
  const clients = groupByClient(entries);
  if (!clients.length) {
    return `<p class="compta-note">Aucun client avec activité sur la période — imprimez des devis ou factures.</p>`;
  }

  return clients
    .map(
      (c) => `
    <article class="compta-client-card">
      <div class="compta-client-card__name">${escapeHtml(c.clientName)}</div>
      <div class="compta-client-card__stat"><span>Facturé HT</span><strong>${formatProfileMoney(c.incomeHT)}</strong></div>
      <div class="compta-client-card__stat"><span>Encaissé</span><strong>${formatProfileMoney(c.encaisse)}</strong></div>
      <div class="compta-client-card__stat"><span>Charges liées</span><strong>${formatProfileMoney(c.expenseHT)}</strong></div>
      <div class="compta-client-card__stat"><span>Documents</span><strong>${c.docs}</strong></div>
    </article>`,
    )
    .join("");
}

function renderChantierCards(entries) {
  const chantiers = groupByChantier(entries);
  const totalLines = entries.length;
  const imputedLines = entries.filter((e) => e.chantierId).length;
  const imputationRate = totalLines ? Math.round((imputedLines / totalLines) * 100) : 0;

  if (!chantiers.length) {
    return `<p class="compta-note">Aucune écriture — créez des chantiers et imprimez des devis pour activer l'imputation automatique.</p>`;
  }

  const cards = chantiers
    .map((c) => {
      const marginClass = c.result >= 0 ? "good" : "bad";
      const budgetPct = c.budget > 0 ? Math.min(100, Math.round((c.expenseHT / c.budget) * 100)) : null;
      const link = c.chantierId
        ? `<a href="chantier-detail.html?id=${encodeURIComponent(c.chantierId)}" class="btn btn--ghost btn--sm">Voir le chantier</a>`
        : "";

      return `
    <article class="compta-chantier-card${c.chantierId ? "" : " compta-chantier-card--orphan"}">
      <div class="compta-chantier-card__head">
        <div>
          <div class="compta-chantier-card__name">${escapeHtml(c.chantierName)}</div>
          ${c.chantierCode ? `<div class="compta-chantier-card__code">${escapeHtml(c.chantierCode)}</div>` : ""}
          ${c.chantierClient ? `<div class="compta-chantier-card__client">${escapeHtml(c.chantierClient)}</div>` : ""}
        </div>
        ${c.budget > 0 ? `<div class="compta-chantier-card__budget"><span>Budget</span><strong>${formatProfileMoney(c.budget)}</strong></div>` : ""}
      </div>
      <div class="compta-chantier-card__stats">
        <div class="compta-chantier-card__stat"><span>Facturé HT</span><strong>${formatProfileMoney(c.incomeHT)}</strong></div>
        <div class="compta-chantier-card__stat"><span>Encaissé</span><strong>${formatProfileMoney(c.encaisse)}</strong></div>
        <div class="compta-chantier-card__stat"><span>Charges HT</span><strong>${formatProfileMoney(c.expenseHT)}</strong></div>
        <div class="compta-chantier-card__stat compta-chantier-card__stat--${marginClass}"><span>Résultat HT</span><strong>${formatProfileMoney(c.result)}</strong></div>
      </div>
      ${
        budgetPct !== null
          ? `<div class="compta-chantier-card__progress"><div class="compta-chantier-card__progress-label"><span>Consommation budget</span><strong>${budgetPct} %</strong></div><div class="compta-chantier-card__progress-track"><div class="compta-chantier-card__progress-fill${budgetPct > 90 ? " compta-chantier-card__progress-fill--warn" : ""}" style="width:${budgetPct}%"></div></div></div>`
          : ""
      }
      <div class="compta-chantier-card__foot">
        <span>${c.imputed} / ${c.lines} lignes imputées · Marge ${c.marginRate.toFixed(1).replace(".", ",")} %</span>
        ${link}
      </div>
    </article>`;
    })
    .join("");

  return `
    <div class="compta-imputation-banner">
      <strong>Imputation automatique : ${imputationRate} %</strong>
      <span>${imputedLines} écritures rattachées à un chantier sur ${totalLines} (devis lié, client, pipeline commercial).</span>
    </div>
    <div class="compta-chantier-grid">${cards}</div>`;
}

function renderCategoryCards() {
  const categories = getComptaCategories();
  const byGroup = new Map();
  for (const cat of categories) {
    if (!byGroup.has(cat.group)) byGroup.set(cat.group, []);
    byGroup.get(cat.group).push(cat);
  }

  return [...byGroup.entries()]
    .map(
      ([group, items]) => `
      <section class="card" style="margin-bottom:16px">
        <h2 class="card__title">${escapeHtml(group)}</h2>
        <div class="compta-cat-grid">
          ${items
            .map(
              (c) => `
            <article class="compta-cat-card">
              <div class="compta-cat-card__group">${c.kind === "income" ? "Recette" : "Charge"}</div>
              <div class="compta-cat-card__label">${c.icon} ${escapeHtml(c.label)}</div>
            </article>`,
            )
            .join("")}
        </div>
      </section>`,
    )
    .join("");
}

function renderPanels() {
  const { bounds, entries } = getLedger();
  const summary = summarizeLedger(entries);
  periodLabel.textContent = `Période : ${bounds.label}`;
  renderKpis(summary);

  const incomeEntries = entries.filter((e) => e.kind === "income");
  const expenseEntries = entries.filter((e) => e.kind === "expense");

  panelsRoot.innerHTML = `
    <section class="compta-panel" data-panel="synthese"${activeTab === "synthese" ? "" : " hidden"}>
      ${renderCategoryBars(entries)}
    </section>

    <section class="compta-panel" data-panel="recettes"${activeTab === "recettes" ? "" : " hidden"}>
      <div class="card">
        <h2 class="card__title">Recettes — devis, factures & encaissements</h2>
        <p class="card__desc">Alimenté automatiquement depuis vos devis imprimés et les paiements enregistrés.</p>
        ${renderJournalTable(incomeEntries, "Aucune recette — imprimez un devis ou une facture depuis Devis & factures.")}
      </div>
    </section>

    <section class="compta-panel" data-panel="achats"${activeTab === "achats" ? "" : " hidden"}>
      <div class="compta-split">
        ${renderExpenseForm()}
        <section class="card">
          <h2 class="card__title">Achats & frais saisis</h2>
          <p class="card__desc">Matériel issu des devis + dépenses saisies manuellement + charges fixes du profil.</p>
          ${renderManualExpenseTable(entries)}
          <h3 class="form-section__title" style="margin-top:24px">Toutes les charges (période)</h3>
          ${renderJournalTable(expenseEntries, "Aucune charge sur la période.")}
        </section>
      </div>
    </section>

    <section class="compta-panel" data-panel="chantiers"${activeTab === "chantiers" ? "" : " hidden"}>
      <div class="card">
        <h2 class="card__title">Analytique par chantier</h2>
        <p class="card__desc">CA, encaissements et charges imputés automatiquement depuis vos devis, paiements et saisies.</p>
        ${renderChantierCards(entries)}
        <h3 class="form-section__title" style="margin-top:28px">Détail des écritures imputées</h3>
        ${renderJournalTable(entries.filter((e) => e.chantierId), "Aucune écriture imputée à un chantier sur cette période.")}
      </div>
    </section>

    <section class="compta-panel" data-panel="clients"${activeTab === "clients" ? "" : " hidden"}>
      <div class="card">
        <h2 class="card__title">Vue par client</h2>
        <p class="card__desc">CA facturé, encaissements et charges imputées par client.</p>
        ${renderClientCards(entries)}
      </div>
    </section>

    <section class="compta-panel" data-panel="journal"${activeTab === "journal" ? "" : " hidden"}>
      <div class="card">
        <h2 class="card__title">Journal des écritures</h2>
        <p class="card__desc">Vue comptable chronologique — exportable en CSV pour votre expert-comptable.</p>
        ${renderJournalTable(entries, "Journal vide sur la période sélectionnée.")}
      </div>
    </section>

    <section class="compta-panel" data-panel="categories"${activeTab === "categories" ? "" : " hidden"}>
      ${renderCategoryCards()}
      <section class="card">
        <h2 class="card__title">Ajouter une catégorie personnalisée</h2>
        <form id="category-form" class="compta-form-grid">
          <label class="field field--full">
            <span>Libellé</span>
            <div class="field__wrap"><input type="text" id="cat-label" placeholder="Ex. Location nacelle" required /></div>
          </label>
          <label class="field">
            <span>Type</span>
            <div class="field__wrap">
              <select id="cat-kind">
                <option value="expense">Charge / achat</option>
                <option value="income">Recette</option>
              </select>
            </div>
          </label>
          <label class="field">
            <span>Groupe</span>
            <div class="field__wrap"><input type="text" id="cat-group" value="Frais" /></div>
          </label>
          <div class="field--full">
            <button type="submit" class="btn btn--primary btn--sm">Ajouter la catégorie</button>
          </div>
        </form>
      </section>
    </section>
  `;

  bindPanelEvents();
}

function bindPanelEvents() {
  const dateInput = document.getElementById("exp-date");
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  document.getElementById("expense-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = {
      date: document.getElementById("exp-date").value,
      categoryId: document.getElementById("exp-category").value,
      label: document.getElementById("exp-label").value,
      supplier: document.getElementById("exp-supplier").value,
      invoiceRef: document.getElementById("exp-invoice").value,
      amountHT: document.getElementById("exp-amount").value,
      vatRate: document.getElementById("exp-vat").value,
      clientName: document.getElementById("exp-client").value,
      chantierId: document.getElementById("exp-chantier").value,
      paid: document.getElementById("exp-paid").checked,
    };
    if (!payload.chantierId) {
      payload.chantierId = resolveChantierIdForExpense(payload) || "";
    }
    addManualExpense(payload);
    exportMsg.textContent = payload.chantierId
      ? "Dépense enregistrée et imputée au chantier."
      : "Dépense enregistrée (imputation automatique à la prochaine synchronisation).";
    renderPanels();
  });

  document.getElementById("category-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      addCustomCategory({
        label: document.getElementById("cat-label").value,
        kind: document.getElementById("cat-kind").value,
        group: document.getElementById("cat-group").value || "Frais",
      });
      exportMsg.textContent = "Catégorie ajoutée.";
      renderPanels();
    } catch (error) {
      alert(error.message);
    }
  });

  panelsRoot.querySelectorAll("[data-delete-exp]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("Supprimer cette dépense ?")) {
        deleteManualExpense(btn.dataset.deleteExp);
        renderPanels();
      }
    });
  });
}

document.getElementById("compta-period")?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-period]");
  if (!btn) return;
  activePeriod = btn.dataset.period;
  document.querySelectorAll(".compta-period__btn").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.period === activePeriod);
  });
  renderPanels();
});

document.getElementById("compta-tabs")?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-tab]");
  if (!btn) return;
  activeTab = btn.dataset.tab;
  document.querySelectorAll(".compta-tabs__btn").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.tab === activeTab);
  });
  renderPanels();
});

document.getElementById("export-csv")?.addEventListener("click", () => {
  const { entries, bounds } = getLedger();
  downloadText(exportJournalCsv(entries), `exone-journal-${exportStamp(activePeriod)}.csv`);
  exportMsg.textContent = `Journal CSV téléchargé (${bounds.label}).`;
});

document.getElementById("export-chantiers")?.addEventListener("click", () => {
  const { entries, bounds } = getLedger();
  downloadText(exportChantierCsv(entries), `exone-chantiers-${exportStamp(activePeriod)}.csv`);
  exportMsg.textContent = `Synthèse par chantier téléchargée (${bounds.label}).`;
});

document.getElementById("export-fec")?.addEventListener("click", () => {
  if (!canExportFec()) {
    window.location.href = "tarifs.html?upgrade=fec";
    return;
  }
  const { entries, bounds } = getLedger();
  const filename = getFecFilename(profile, bounds);
  downloadText(exportFecContent(entries, { profile, bounds }), filename, "text/plain;charset=utf-8");
  exportMsg.textContent = `Export FEC conforme DGFiP téléchargé (${filename}).`;
});

document.getElementById("export-complet")?.addEventListener("click", () => {
  const { entries, bounds } = getLedger();
  const stamp = exportStamp(activePeriod);
  const files = [
    { content: exportJournalCsv(entries), filename: `exone-01-journal-${stamp}.csv` },
    { content: exportChantierCsv(entries), filename: `exone-02-synthese-chantiers-${stamp}.csv` },
    { content: exportChantierDetailCsv(entries), filename: `exone-03-detail-chantiers-${stamp}.csv` },
  ];

  if (canExportFec()) {
    files.push({
      content: exportFecContent(entries, { profile, bounds }),
      filename: getFecFilename(profile, bounds),
      mime: "text/plain;charset=utf-8",
    });
  }

  downloadBundle(files);
  exportMsg.textContent = canExportFec()
    ? `Export complet : ${files.length} fichiers (journal, synthèse & détail chantiers, FEC).`
    : `Export complet : 3 fichiers CSV (FEC disponible avec l'offre Business).`;
});

renderPanels();
