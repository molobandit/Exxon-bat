import { requireConnexion } from "./auth.js";
import {
  bulkApplyAutoImages,
  bulkImportPrestations,
  deletePrestation,
  ensureAllCatalogSeeds,
  ensureLibraryReady,
  ensureSeedForTrade,
  getLibraryStats,
  getPrestationById,
  getPrestationCategories,
  getPrestationsByTrade,
  searchPrestations,
  upsertPrestation,
} from "./data.js";
import {
  collectProductKeysForItems,
  fetchImagesForKeys,
  shouldAutoFetchItem,
} from "./auto-image-fetch.js";
import { localizePrestation, translateCategory, translateTrade } from "./catalog-i18n.js";
import { applyTranslations, onLocaleChange, t } from "./i18n.js";
import { initAppNav } from "./nav-app.js";
import { BATIPRIX_TRADE, getLibraryTradesForMarket } from "./data.js";
import { buildBatiprixCsvTemplate, buildCsvTemplate, parsePrestationsCsv } from "./prestations-import.js";
import { formatProfileMoney } from "./market.js";
import { canManagePrestationsLibrary } from "./subscription.js";
import { TRADES } from "./metre-templates.js";
import { queuePrestationsForDevis } from "./devis-draft.js";
import {
  buildLeroyMerlinSearchUrl,
  buildSearchQueryFromItem,
  fetchImageUrlFromProductPage,
  isLeroyMerlinImageUrl,
  isLeroyMerlinProductUrl,
  LM_IMAGE_HELP,
  normalizeLeroyMerlinImageUrl,
  parseLeroyMerlinPaste,
} from "./leroy-merlin.js";
import {
  getPrestationImageUrl,
  hasUserPhoto,
  renderRefThumb,
} from "./prestation-images.js";
import { debounce, escapeHtml } from "./utils.js";

if (!requireConnexion("bibliotheque.html")) return;

const canManageLibrary = canManagePrestationsLibrary();

initAppNav("prestations");
applyTranslations();

const PAGE_SIZE = 40;

const tradeTabs = document.getElementById("trade-tabs");
const libraryList = document.getElementById("library-list");
const libraryCount = document.getElementById("library-count");
const libraryStats = document.getElementById("library-stats");
const searchInput = document.getElementById("library-search");
const categorySelect = document.getElementById("library-category");
const importFile = document.getElementById("import-file");
const importFeedback = document.getElementById("import-feedback");
const manualForm = document.getElementById("manual-form");
const categorySuggestions = document.getElementById("category-suggestions");
const manualFormTitle = document.getElementById("manual-form-title");
const manualFormDesc = document.getElementById("manual-form-desc");
const manualSubmit = document.getElementById("manual-submit");
const selectionBar = document.getElementById("library-selection-bar");
const selectionCount = document.getElementById("selection-count");
const selectionClear = document.getElementById("selection-clear");
const selectionToDevis = document.getElementById("selection-to-devis");
const manualFormSection = document.getElementById("manual-form-section");

const paginationEl = document.createElement("div");
paginationEl.id = "library-pagination";
paginationEl.className = "library-pagination";
libraryList?.closest(".table-wrap")?.after(paginationEl);

const manualFields = {
  ref: document.getElementById("manual-ref"),
  designation: document.getElementById("manual-designation"),
  category: document.getElementById("manual-category"),
  unit: document.getElementById("manual-unit"),
  sell: document.getElementById("manual-sell"),
  purchase: document.getElementById("manual-purchase"),
  type: document.getElementById("manual-type"),
  imageUrl: document.getElementById("manual-image-url"),
  imageFile: document.getElementById("manual-image-file"),
  imagePreview: document.getElementById("manual-image-preview"),
  lmUrl: document.getElementById("manual-lm-url"),
};

const btnLmSearch = document.getElementById("btn-lm-search");
const btnLmFetch = document.getElementById("btn-lm-fetch");
const btnAutoImagesTrade = document.getElementById("btn-auto-images-trade");
const btnAutoImagesAll = document.getElementById("btn-auto-images-all");
const btnAutoImagesCancel = document.getElementById("btn-auto-images-cancel");
const autoImageProgress = document.getElementById("auto-image-progress");
const autoImageProgressBar = document.getElementById("auto-image-progress-bar");
const autoImageProgressText = document.getElementById("auto-image-progress-text");

let autoImageAbort = null;

let activeTrade = getLibraryTradesForMarket()[0];
let currentPage = 1;
let filteredItems = [];
let editingId = null;
const selectedIds = new Set();

function applyLibraryAccessUi() {
  const toolbarActions = document.querySelector(".library-toolbar__actions");
  if (toolbarActions) toolbarActions.hidden = !canManageLibrary;
  if (manualFormSection) manualFormSection.hidden = !canManageLibrary;
  if (importFeedback && !canManageLibrary) {
    importFeedback.textContent =
      "Offre Devis & factures : consultez le catalogue et ajoutez au devis. Import CSV et édition avancée avec l'offre Pro.";
    importFeedback.style.color = "var(--text-muted)";
  }
}

applyLibraryAccessUi();

function tradeLabel(tradeType) {
  return translateTrade(tradeType) || TRADES[tradeType]?.label || tradeType;
}

function renderTradeTabs() {
  tradeTabs.innerHTML = getLibraryTradesForMarket().map(
    (trade) => `
      <button
        type="button"
        class="trade-tab${trade === activeTrade ? " trade-tab--active" : ""}"
        data-trade="${trade}"
        role="tab"
        aria-selected="${trade === activeTrade}"
      >
        ${tradeLabel(trade)}
      </button>`,
  ).join("");
}

function renderStats() {
  const stats = getLibraryStats();
  libraryStats.innerHTML = getLibraryTradesForMarket().map((trade) => {
    const { count, ready } = stats[trade];
    return `
      <article class="library-stat${ready ? " library-stat--ok" : ""}">
        <span>${escapeHtml(tradeLabel(trade))}</span>
        <strong>${t("library.statsRefs", { count })}</strong>
        <small>${ready ? t("library.statsComplete") : count > 0 ? t("library.statsPartial") : t("library.statsEmpty")}</small>
      </article>`;
  }).join("");
}

function renderCategories() {
  const categories = getPrestationCategories(activeTrade);
  categorySelect.innerHTML =
    `<option value="">${t("library.allCategories")}</option>` +
    categories
      .map(
        (cat) =>
          `<option value="${escapeHtml(cat)}">${escapeHtml(translateCategory(cat))}</option>`,
      )
      .join("");
  categorySuggestions.innerHTML = categories
    .map((cat) => `<option value="${escapeHtml(cat)}"></option>`)
    .join("");
}

function renderPagination(totalPages) {
  if (!paginationEl) return;
  if (totalPages <= 1) {
    paginationEl.innerHTML = "";
    return;
  }

  paginationEl.innerHTML = `
    <button type="button" class="btn btn--ghost btn--sm" data-page="prev" ${currentPage <= 1 ? "disabled" : ""}>${t("common.prev")}</button>
    <span>${t("common.page", { current: currentPage, total: totalPages })}</span>
    <button type="button" class="btn btn--ghost btn--sm" data-page="next" ${currentPage >= totalPages ? "disabled" : ""}>${t("common.next")}</button>
  `;
}

function renderTable() {
  filteredItems = searchPrestations({
    tradeType: activeTrade,
    query: searchInput.value,
    category: categorySelect.value,
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredItems.slice(start, start + PAGE_SIZE);

  libraryCount.textContent = `(${filteredItems.length})`;

  libraryList.innerHTML = pageItems.length
    ? pageItems
        .map((item) => {
          const isSelected = selectedIds.has(item.id);
          const loc = localizePrestation(item);
          return `
        <tr data-id="${escapeHtml(item.id)}" class="${isSelected ? "library-row--selected" : ""}">
          <td class="col-photo">${renderRefThumb(getPrestationImageUrl(item), { size: "sm" })}</td>
          <td class="col-ref">
            <code>${escapeHtml(item.batiprixCode || item.ref)}</code>
            ${item.source === "batiprix" ? '<br><span class="library-badge library-badge--batiprix">Batiprix</span>' : ""}
          </td>
          <td class="col-designation">
            <strong>${escapeHtml(loc.designation)}</strong>
            <br><small>${escapeHtml(loc.typeLabel)} · ${escapeHtml(loc.sourceLabel)}${item.batiprixLot ? ` · ${escapeHtml(item.batiprixLot)}` : ""}</small>
          </td>
          <td class="col-category">${escapeHtml(loc.category)}</td>
          <td>${escapeHtml(loc.unit)}</td>
          <td>${formatProfileMoney(item.unitPriceHT)}</td>
          <td class="col-purchase">${formatProfileMoney(item.purchaseCostHT)}</td>
          <td class="col-actions">
            <div class="library-actions">
              <button type="button" class="btn btn--sm ${isSelected ? "btn--primary" : "btn--ghost"}" data-choose="${escapeHtml(item.id)}">${isSelected ? t("library.chosen") : t("library.choose")}</button>
              ${
                canManageLibrary
                  ? `<button type="button" class="btn btn--ghost btn--sm" data-lm="${escapeHtml(item.id)}" title="${t("library.lmTitle")}">LM</button>
              <button type="button" class="btn btn--ghost btn--sm" data-edit="${escapeHtml(item.id)}">${t("common.edit")}</button>
              ${item.source !== "catalog" ? `<button type="button" class="btn btn--ghost btn--sm" data-delete="${escapeHtml(item.id)}">${t("library.deleteShort")}</button>` : ""}`
                  : ""
              }
            </div>
          </td>
        </tr>`;
        })
        .join("")
    : (() => {
        const tradeCount = getPrestationsByTrade(activeTrade).length;
        const isEmptyCatalog =
          tradeCount === 0 && !searchInput.value.trim() && !categorySelect.value;
        if (!isEmptyCatalog) {
          return `<tr><td colspan="8" style="color:var(--text-muted);padding:20px;text-align:center">${t("library.noResults")}</td></tr>`;
        }
        return `<tr><td colspan="8" style="padding:20px;text-align:center">
          <p style="color:var(--text-muted);margin:0 0 12px">${t("library.catalogEmpty")}</p>
          <button type="button" class="btn btn--primary btn--sm" id="library-reload-catalog">${t("library.catalogReload")}</button>
        </td></tr>`;
      })();

  libraryList.querySelector("#library-reload-catalog")?.addEventListener(
    "click",
    () => {
      ensureLibraryReady({ eager: true, skipBackground: true });
      refresh({ reseed: true });
      if (importFeedback) {
        importFeedback.textContent = t("library.catalogReloading");
        importFeedback.style.color = "var(--text-muted)";
      }
    },
    { once: true },
  );

  renderPagination(totalPages);
}

const debouncedRenderTable = debounce(() => {
  currentPage = 1;
  renderTable();
}, 200);

function setFormMode(mode, item = null) {
  if (mode === "edit") {
    editingId = item?.id ?? editingId;
    if (manualFormTitle) manualFormTitle.textContent = t("library.formEditTitle");
    if (manualFormDesc) manualFormDesc.textContent = t("library.formEditDesc");
    if (manualSubmit) manualSubmit.textContent = t("library.formSubmitEdit");
  } else {
    editingId = null;
    if (manualFormTitle) manualFormTitle.textContent = t("library.formAddTitle");
    if (manualFormDesc) manualFormDesc.textContent = t("library.formAddDesc");
    if (manualSubmit) manualSubmit.textContent = t("library.formSubmitAdd");
  }
}

function updateImagePreview(url = "") {
  if (!manualFields.imagePreview) return;
  const value = url.trim();
  if (!value) {
    manualFields.imagePreview.hidden = true;
    manualFields.imagePreview.innerHTML = "";
    return;
  }
  manualFields.imagePreview.hidden = false;
  manualFields.imagePreview.innerHTML = renderRefThumb(value, { size: "lg" });
}

async function resizeImageFile(file, maxSize = 120) {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function applyLeroyMerlinImage(imageUrl, { productUrl = "", feedback = "" } = {}) {
  if (!manualFields.imageUrl || !imageUrl) return;
  manualFields.imageUrl.value = imageUrl;
  if (productUrl && manualFields.lmUrl) manualFields.lmUrl.value = productUrl;
  updateImagePreview(imageUrl);
  if (feedback && importFeedback) {
    importFeedback.textContent = feedback;
    importFeedback.style.color = "var(--success)";
  }
}

function openLeroyMerlinSearch(query = "") {
  const q =
    query.trim() ||
    buildSearchQueryFromItem({
      designation: manualFields.designation?.value,
      ref: manualFields.ref?.value,
    });
  window.open(buildLeroyMerlinSearchUrl(q || activeTrade), "_blank", "noopener,noreferrer");
}

async function resolveLeroyMerlinPhotoInput(rawInput = "") {
  const parsed = parseLeroyMerlinPaste(rawInput);
  if (!parsed) return null;
  if (parsed.kind === "image") {
    return { imageUrl: parsed.imageUrl, productUrl: "" };
  }
  const imageUrl = await fetchImageUrlFromProductPage(parsed.productUrl);
  return { imageUrl, productUrl: parsed.productUrl };
}

function fillManualForm(item) {
  setFormMode("edit", item);
  manualFields.ref.value = item.ref;
  manualFields.designation.value = item.designation;
  manualFields.category.value = item.category;
  manualFields.unit.value = item.unit;
  manualFields.sell.value = item.unitPriceHT;
  manualFields.purchase.value = item.purchaseCostHT;
  manualFields.type.value = item.type;
  if (manualFields.imageUrl) {
    const hasCustomPhoto = hasUserPhoto(item);
    manualFields.imageUrl.value = hasCustomPhoto ? item.imageUrl || "" : "";
    updateImagePreview(
      hasCustomPhoto ? item.imageUrl : getPrestationImageUrl(item),
    );
  }
  if (manualFields.lmUrl) manualFields.lmUrl.value = item.lmProductUrl || "";
  manualFormSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  manualFields.ref.focus();
}

function resetManualForm() {
  manualForm.reset();
  manualFields.unit.value = "u";
  manualFields.type.value = "fourniture";
  if (manualFields.imageUrl) manualFields.imageUrl.value = "";
  if (manualFields.lmUrl) manualFields.lmUrl.value = "";
  if (manualFields.imageFile) manualFields.imageFile.value = "";
  updateImagePreview("");
  setFormMode("add");
}

function renderSelectionBar() {
  const count = selectedIds.size;
  if (!selectionBar) return;

  if (!count) {
    selectionBar.hidden = true;
    return;
  }

  selectionBar.hidden = false;
  const label = count > 1 ? t("library.selectionMany") : t("library.selectionOne");
  if (selectionCount) {
    selectionCount.innerHTML = `<strong>${count}</strong> ${label}`;
  }
}

function toggleSelection(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  renderSelectionBar();
  renderTable();
}

function clearSelection() {
  selectedIds.clear();
  renderSelectionBar();
  renderTable();
}

function openAddForm() {
  resetManualForm();
  manualFormSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  manualFields.ref.focus();
}

function setAutoImageProgress(visible, { pct = 0, text = "" } = {}) {
  if (!autoImageProgress) return;
  autoImageProgress.hidden = !visible;
  if (autoImageProgressBar) {
    autoImageProgressBar.style.setProperty("--pct", `${Math.min(100, pct)}%`);
  }
  if (autoImageProgressText) autoImageProgressText.textContent = text;
}

function setAutoImageButtonsDisabled(disabled) {
  for (const btn of [btnAutoImagesTrade, btnAutoImagesAll, btnLmFetch]) {
    if (!btn) continue;
    btn.disabled = disabled;
  }
}

async function runAutoImageImport(trades) {
  if (autoImageAbort) return;

  const controller = new AbortController();
  autoImageAbort = controller;
  setAutoImageButtonsDisabled(true);
  setAutoImageProgress(true, { pct: 0, text: t("library.autoPrep") });

  let totalUpdated = 0;
  let totalEligible = 0;
  const tradeList = [...trades];

  try {
    for (let t = 0; t < tradeList.length; t += 1) {
      if (controller.signal.aborted) break;

      const trade = tradeList[t];
      const items = getPrestationsByTrade(trade).filter(shouldAutoFetchItem);
      if (!items.length) continue;

      const keys = collectProductKeysForItems(items);
      if (!keys.length) continue;

      totalEligible += items.length;

      const tradeLabel = TRADES[trade]?.label || trade;

      const keyToUrl = await fetchImagesForKeys(keys, {
        signal: controller.signal,
        onProgress: ({ key, current, total }) => {
          const tradePct = ((t + current / total) / tradeList.length) * 100;
          setAutoImageProgress(true, {
            pct: tradePct,
            text: `${tradeLabel} — type « ${key} » (${current}/${total})`,
          });
        },
      });

      const updated = bulkApplyAutoImages(trade, keyToUrl);
      totalUpdated += updated;
      renderStats();
    }

    if (controller.signal.aborted) {
      importFeedback.textContent = "Import photos annulé.";
      importFeedback.style.color = "var(--text-muted)";
    } else if (totalEligible === 0) {
      importFeedback.textContent =
        "Photos déjà à jour — aucune référence sans image à traiter.";
      importFeedback.style.color = "var(--text-muted)";
    } else if (totalUpdated === 0) {
      importFeedback.textContent =
        "Aucune image trouvée en ligne pour ce métier — vérifiez la connexion et réessayez.";
      importFeedback.style.color = "var(--danger)";
    } else {
      importFeedback.textContent = `${totalUpdated} référence(s) avec photo automatique (Wikimedia).`;
      importFeedback.style.color = "var(--success)";
    }

    setAutoImageProgress(true, { pct: 100, text: "Terminé." });

    refresh({ reseed: false });
  } catch {
    importFeedback.textContent =
      "Import photos interrompu — vérifiez votre connexion et réessayez.";
    importFeedback.style.color = "var(--danger)";
  } finally {
    autoImageAbort = null;
    setAutoImageButtonsDisabled(false);
    setAutoImageProgress(false);
  }
}

function refresh({ reseed = true } = {}) {
  if (reseed) ensureSeedForTrade(activeTrade);
  renderStats();
  renderCategories();
  renderTable();
}

function bootLibraryCatalog() {
  activeTrade = getLibraryTradesForMarket()[0] ?? "electricien";
  renderTradeTabs();

  if (importFeedback) {
    importFeedback.textContent = "Chargement des catalogues pour tous les métiers…";
    importFeedback.style.color = "var(--text-muted)";
  }
  const added = ensureLibraryReady({ eager: true, skipBackground: true }).added;
  renderStats();
  if (importFeedback && added > 0) {
    importFeedback.textContent = `${added} référence(s) catalogue ajoutée(s) — tous les métiers sont prêts.`;
    importFeedback.style.color = "var(--success)";
  }

  refresh({ reseed: false });
}

tradeTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-trade]");
  if (!tab) return;
  activeTrade = tab.dataset.trade;
  currentPage = 1;
  resetManualForm();
  renderTradeTabs();
  refresh();
});

searchInput.addEventListener("input", debouncedRenderTable);
categorySelect.addEventListener("change", () => {
  currentPage = 1;
  renderTable();
});

paginationEl?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-page]");
  if (!btn || btn.disabled) return;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  if (btn.dataset.page === "prev" && currentPage > 1) currentPage -= 1;
  if (btn.dataset.page === "next" && currentPage < totalPages) currentPage += 1;
  renderTable();
  libraryList?.closest(".table-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

libraryList.addEventListener("click", (event) => {
  const chooseBtn = event.target.closest("[data-choose]");
  if (chooseBtn) {
    toggleSelection(chooseBtn.dataset.choose);
    return;
  }

  const lmBtn = event.target.closest("[data-lm]");
  if (lmBtn) {
    const item = getPrestationById(lmBtn.dataset.lm);
    openLeroyMerlinSearch(buildSearchQueryFromItem(item));
    return;
  }

  const editBtn = event.target.closest("[data-edit]");
  if (editBtn) {
    const item = getPrestationById(editBtn.dataset.edit);
    if (item) fillManualForm(item);
    return;
  }

  const deleteBtn = event.target.closest("[data-delete]");
  if (!deleteBtn) return;
  if (!confirm("Supprimer cette référence de la bibliothèque ?")) return;
  deletePrestation(deleteBtn.dataset.delete);
  selectedIds.delete(deleteBtn.dataset.delete);
  renderSelectionBar();
  refresh({ reseed: false });
});

manualForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const existing = editingId ? getPrestationById(editingId) : null;
  const imageUrl = manualFields.imageUrl?.value.trim() || "";
  const lmProductUrl = manualFields.lmUrl?.value.trim() || "";
  const fromLm =
    Boolean(lmProductUrl) || isLeroyMerlinImageUrl(imageUrl) || isLeroyMerlinProductUrl(imageUrl);
  let imageSource = "";
  if (fromLm) {
    imageSource = "leroymerlin";
  } else if (imageUrl) {
    const sameAuto =
      existing?.imageSource === "auto" && existing.imageUrl === imageUrl;
    imageSource = sameAuto ? "auto" : "manual";
  }

  const saved = upsertPrestation({
    id: editingId || undefined,
    tradeType: existing?.tradeType || activeTrade,
    ref: manualFields.ref.value,
    designation: manualFields.designation.value,
    category: manualFields.category.value,
    unit: manualFields.unit.value,
    unitPriceHT: manualFields.sell.value,
    purchaseCostHT: manualFields.purchase.value,
    type: manualFields.type.value,
    imageUrl,
    imageSource,
    lmProductUrl,
    source: existing?.source || "manual",
  });
  if (!saved) {
    importFeedback.textContent =
      "Référence déjà utilisée dans ce métier — choisissez une autre réf.";
    importFeedback.style.color = "var(--danger)";
    return;
  }
  importFeedback.textContent = editingId
    ? "Référence mise à jour — disponible immédiatement dans vos devis."
    : "Référence ajoutée — disponible immédiatement dans vos devis.";
  importFeedback.style.color = "var(--success)";
  resetManualForm();
  refresh({ reseed: false });
});

document.getElementById("manual-reset")?.addEventListener("click", resetManualForm);
document.getElementById("btn-new-ref")?.addEventListener("click", openAddForm);

manualFields.imageUrl?.addEventListener("input", () => {
  const value = manualFields.imageUrl.value.trim();
  if (isLeroyMerlinImageUrl(value)) {
    manualFields.imageUrl.value = normalizeLeroyMerlinImageUrl(value);
  }
  updateImagePreview(manualFields.imageUrl.value);
});

manualFields.lmUrl?.addEventListener("input", async () => {
  const value = manualFields.lmUrl.value.trim();
  const parsed = parseLeroyMerlinPaste(value);
  if (parsed?.kind === "image") {
    applyLeroyMerlinImage(parsed.imageUrl);
  }
});

btnLmSearch?.addEventListener("click", () => openLeroyMerlinSearch());

btnLmFetch?.addEventListener("click", async () => {
  const raw = manualFields.lmUrl?.value.trim() || manualFields.imageUrl?.value.trim() || "";
  if (!raw) {
    importFeedback.textContent = "Collez un lien produit ou image Leroy Merlin.";
    importFeedback.style.color = "var(--danger)";
    return;
  }

  importFeedback.textContent = "Récupération de la photo Leroy Merlin…";
  importFeedback.style.color = "var(--text-muted)";
  btnLmFetch.disabled = true;

  try {
    const resolved = await resolveLeroyMerlinPhotoInput(raw);
    if (!resolved) {
      importFeedback.textContent = "Lien Leroy Merlin non reconnu.";
      importFeedback.style.color = "var(--danger)";
      return;
    }
    applyLeroyMerlinImage(resolved.imageUrl, {
      productUrl: resolved.productUrl,
      feedback: "Photo Leroy Merlin récupérée — enregistrez la référence.",
    });
  } catch {
    importFeedback.textContent = `Récupération auto impossible. ${LM_IMAGE_HELP}`;
    importFeedback.style.color = "var(--danger)";
    if (isLeroyMerlinProductUrl(raw) && manualFields.lmUrl) {
      manualFields.lmUrl.value = raw;
      window.open(raw, "_blank", "noopener,noreferrer");
    }
  } finally {
    btnLmFetch.disabled = false;
  }
});

manualFields.imageFile?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    importFeedback.textContent = "Choisissez un fichier image (JPG, PNG, WebP…).";
    importFeedback.style.color = "var(--danger)";
    event.target.value = "";
    return;
  }
  if (file.size > 2_000_000) {
    importFeedback.textContent = "Image trop lourde — maximum 2 Mo.";
    importFeedback.style.color = "var(--danger)";
    event.target.value = "";
    return;
  }
  try {
    const dataUrl = await resizeImageFile(file);
    if (manualFields.imageUrl) manualFields.imageUrl.value = dataUrl;
    updateImagePreview(dataUrl);
    importFeedback.textContent = "Photo importée — enregistrez la référence pour la conserver.";
    importFeedback.style.color = "var(--success)";
  } catch {
    importFeedback.textContent = "Impossible de lire cette image.";
    importFeedback.style.color = "var(--danger)";
  }
});

selectionClear?.addEventListener("click", clearSelection);

selectionToDevis?.addEventListener("click", (event) => {
  const items = [...selectedIds]
    .map((id) => getPrestationById(id))
    .filter(Boolean);
  if (!items.length) {
    event.preventDefault();
    return;
  }
  queuePrestationsForDevis(items);
  window.location.href = "devis.html#devis-lines-section";
});

btnAutoImagesTrade?.addEventListener("click", () => {
  runAutoImageImport([activeTrade]);
});

btnAutoImagesAll?.addEventListener("click", () => {
  if (
    !confirm(
      "Importer les photos pour tous les métiers ? Environ 2 à 4 minutes selon la connexion.",
    )
  ) {
    return;
  }
  runAutoImageImport(getLibraryTradesForMarket().filter((trade) => trade !== BATIPRIX_TRADE));
});

btnAutoImagesCancel?.addEventListener("click", () => {
  autoImageAbort?.abort();
});

document.getElementById("btn-csv-template")?.addEventListener("click", () => {
  const template =
    activeTrade === BATIPRIX_TRADE ? buildBatiprixCsvTemplate() : buildCsvTemplate();
  const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    activeTrade === BATIPRIX_TRADE
      ? "modele-batiprix-ouvrages.csv"
      : `modele-bibliotheque-${activeTrade}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

importFile?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  importFeedback.textContent = "Import en cours…";
  importFeedback.style.color = "var(--text-muted)";

  try {
    const text = await file.text();
    const { rows, errors } = parsePrestationsCsv(text, activeTrade);

    if (!rows.length) {
      importFeedback.textContent = errors[0] || "Aucune ligne importée.";
      importFeedback.style.color = "var(--danger)";
      return;
    }

    const result = bulkImportPrestations(rows, activeTrade);
    const errorText = errors.length ? ` — ${errors.length} ligne(s) ignorée(s).` : "";
    importFeedback.textContent = `Import terminé : ${result.added} ajout(s), ${result.updated} mise(s) à jour — ${result.total} références au total.${errorText}`;
    importFeedback.style.color = "var(--success)";
    refresh({ reseed: false });
  } catch {
    importFeedback.textContent = "Impossible de lire le fichier. Exportez votre Excel en CSV (séparateur point-virgule).";
    importFeedback.style.color = "var(--danger)";
  }

  event.target.value = "";
});

setFormMode("add");
renderTradeTabs();
bootLibraryCatalog();

onLocaleChange(() => {
  applyTranslations();
  renderTradeTabs();
  renderStats();
  renderCategories();
  setFormMode(editingId ? "edit" : "add");
  renderSelectionBar();
  renderTable();
});
