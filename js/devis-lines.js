import { formatProfileMoney, getProfileCurrencySymbol } from "./market.js";
import { loadProfile } from "./storage.js";
import { localizePrestation, translateTrade, translateUnit } from "./catalog-i18n.js";
import { pullPrestationsForDevis } from "./devis-draft.js";
import {
  ensureLibraryReady,
  ensureSeedForTrade,
  getPrestationById,
  getPrestationsByTrade,
  searchPrestations,
  upsertPrestation,
} from "./data.js";
import { onLocaleChange, t } from "./i18n.js";
import { getPrestationImageUrl, renderRefThumb } from "./prestation-images.js";
import { debounce, escapeHtml } from "./utils.js";
import { BATIPRIX_TRADE, getLibraryTradesForMarket } from "./data.js";
import { rollupQuoteFromLineItems, getFeesTotalFromLineItems, getMaterialTotalFromLineItems } from "./quote-pricing.js";
import {
  formatDifficultyCoeffBadge,
  getLineEffectiveTotal,
  normalizeInstallationMode,
  renderInstallationModeSelectHtml,
} from "./installation-difficulty.js";
import {
  isFeeLineType,
  isMoLineType,
  LINE_TYPE_LABELS,
  normalizeLineType,
} from "./devis-line-types.js";
import { FEE_QUICK_DEFAULTS, getFeeTemplateByRef } from "./devis-fee-templates.js";
import { DEFAULT_TRAVEL_FEES, resolveTravelFees } from "./travel-fees.js";
import { getSectionAccent, getSectionSubtitle, getSectionTitle, lineSectionGroup } from "./quote-sections.js";

function lineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function tradeLabel(tradeType) {
  return translateTrade(tradeType) || tradeType;
}

function lineDesignation(line) {
  if (line.designation?.trim()) return line.designation;
  if (line.prestationId) {
    const item = getPrestationById(line.prestationId);
    if (item) return localizePrestation(item).designation;
  }
  return "";
}

function isHourlyQtyLine(line) {
  return isMoLineType(line.type) && line.unit === "h";
}

function lineTypeLabel(type) {
  return LINE_TYPE_LABELS[type] || type;
}

function qtyInputAttrs(line) {
  if (isHourlyQtyLine(line)) {
    return { min: 1, step: 1 };
  }
  return { min: 1, step: 1 };
}

function normalizeLineQty(line, rawQty) {
  if (isHourlyQtyLine(line)) {
    return Math.max(1, Math.round(Number(rawQty) || 1));
  }
  return Math.max(1, Math.round(Number(rawQty) || 1));
}

function shouldUseQtySteppers(line) {
  if (isHourlyQtyLine(line)) return true;
  try {
    if (
      isMoLineType(line.type) &&
      window.matchMedia("(max-width: 900px), (pointer: coarse)").matches
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function renderQtyInput(line, qtyAttrs, qtyValue) {
  const hourly = isHourlyQtyLine(line);
  const input = `<input type="number" class="devis-line-qty${hourly ? " devis-line-qty--hours" : ""}" data-qty="${escapeHtml(line.id)}" min="${qtyAttrs.min}" step="${qtyAttrs.step}" value="${qtyValue}"${hourly ? ' inputmode="numeric"' : ""} />`;
  if (!shouldUseQtySteppers(line)) return input;
  return `
    <div class="devis-line-qty-wrap devis-line-qty-wrap--hours">
      <button type="button" class="devis-line-qty-step" data-qty-down="${escapeHtml(line.id)}" aria-label="Diminuer la quantité">−</button>
      ${input}
      <button type="button" class="devis-line-qty-step" data-qty-up="${escapeHtml(line.id)}" aria-label="Augmenter la quantité">+</button>
    </div>`;
}

const LINE_UNIT_OPTIONS = [
  { value: "u", label: "Unité" },
  { value: "m", label: "Mètre" },
  { value: "m²", label: "M²" },
  { value: "ml", label: "Mètre lin." },
  { value: "km", label: "Kilomètre" },
  { value: "L", label: "Litre" },
  { value: "h", label: "Heure" },
  { value: "j", label: "Jour" },
  { value: "forfait", label: "Forfait" },
];

const LINE_UNIT_TABLE_LABELS = {
  u: "u",
  m: "m",
  "m²": "m²",
  ml: "ml",
  km: "km",
  L: "L",
  h: "h",
  j: "j",
  forfait: "forf.",
};

function lineUnitSelectHtml(lineId, current) {
  return `<select class="devis-line-unit" data-unit="${escapeHtml(lineId)}" title="Unité">${LINE_UNIT_OPTIONS.map(
    (option) => {
      const label = LINE_UNIT_TABLE_LABELS[option.value] ?? option.label;
      return `<option value="${option.value}"${option.value === current ? " selected" : ""}>${label}</option>`;
    },
  ).join("")}</select>`;
}

function isLineFieldEditable() {
  return true;
}

function syncManualQtyInput() {
  const typeEl = document.getElementById("line-manual-type");
  const unitEl = document.getElementById("line-manual-unit");
  const qtyEl = document.getElementById("line-manual-qty");
  if (!typeEl || !unitEl || !qtyEl) return;

  qtyEl.min = "1";
  qtyEl.step = "1";
  qtyEl.value = Math.max(1, Math.round(Number(qtyEl.value) || 1));
}

/**
 * Gestionnaire de lignes de devis avec picker bibliothèque.
 */
export function initDevisLines({
  root,
  defaultTrade = "electricien",
  canManageLibrary = true,
  getDefaultHourlyRate = () => 45,
  getProfile = () => ({}),
  onTotalsChange,
}) {
  if (!root) return null;

  ensureLibraryReady({ preferredTrade: defaultTrade });

  let lineItems = [];
  let activeTrade = getLibraryTradesForMarket().includes(defaultTrade)
    ? defaultTrade
    : getLibraryTradesForMarket()[0];
  let activeTypeFilter = "";
  let pickerOpen = false;
  const pickerItems = new Map();
  const currencySym = getProfileCurrencySymbol();

  root.innerHTML = `
    <div class="devis-lines">
      <div class="devis-lines__head">
        <div>
          <h3 class="form-section__title" style="margin:0">${t("devis.linesTitle")}</h3>
          <p class="card__desc" style="margin:6px 0 0">${t("devis.linesDesc")}</p>
        </div>
        <div class="devis-lines__trade">
          <label class="field" style="margin:0">
            <span>${t("devis.trade")}</span>
            <div class="field__wrap">
              <select id="devis-lines-trade"></select>
            </div>
          </label>
        </div>
      </div>

      <div class="devis-lines__actions">
        <button type="button" class="btn btn--primary btn--sm" id="devis-lines-picker-btn">${t("devis.fromLibrary")}</button>
        <button type="button" class="btn btn--ghost btn--sm" id="devis-lines-manual-btn">${t("devis.manualLine")}</button>
        ${canManageLibrary ? `<a href="bibliotheque.html" class="btn btn--ghost btn--sm">${t("devis.manageLibrary")}</a>` : `<a href="bibliotheque.html" class="btn btn--ghost btn--sm">${t("devis.openLibrary")}</a>`}
      </div>

      <div class="devis-fees-quick devis-fees-quick--vehicle">
        <span class="devis-fees-quick__label">${t("devis.vehicleOptionsLabel")}</span>
        <button type="button" class="btn btn--ghost btn--sm" data-fee-template="VEH-KM" id="devis-fee-km"></button>
        <button type="button" class="btn btn--ghost btn--sm" data-fee-template="VEH-DEP" id="devis-fee-dep"></button>
        <button type="button" class="btn btn--ghost btn--sm" data-fee-template="VEH-JOUR" id="devis-fee-jour"></button>
        <button type="button" class="btn btn--ghost btn--sm" id="devis-travel-custom">${t("devis.travelCustom")}</button>
      </div>

      <div class="devis-fees-quick">
        <span class="devis-fees-quick__label">${t("devis.feesQuickLabel")}</span>
        <button type="button" class="btn btn--ghost btn--sm" data-fee-quick="machine">${t("devis.feeMachine")}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-fee-quick="equipement">${t("devis.feeEquipment")}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-fee-quick="frais">${t("devis.feeMisc")}</button>
      </div>

      <div class="devis-lines__hint devis-difficulty-hint">
        <strong>Pose & difficulté (matériel) :</strong> choisissez le mode sur chaque ligne <strong>fourniture</strong> — coefficients ajustables par métier dans
        <a href="profil.html#difficulty-coefficients">Mon profil → Coefficients pose</a>. La main d'œuvre n'est pas majorée.
      </div>

      <div class="devis-lines__hint">
        ${t("devis.linesReorderHint")}
      </div>

      <div class="table-wrap devis-lines-table-wrap">
        <table class="data-table devis-lines-table">
          <thead>
            <tr>
              <th class="col-order" aria-label="Ordre"></th>
              <th>${t("common.ref")}</th>
              <th>${t("common.designation")}</th>
              <th class="col-difficulty">Pose mat.</th>
              <th class="col-qty">${t("devis.qty")}</th>
              <th class="col-unit">${t("common.unit")}</th>
              <th>${t("devis.unitPrice")}</th>
              <th>${t("devis.purchaseHT")}</th>
              <th>${t("devis.totalHT")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="devis-lines-body"></tbody>
          <tfoot>
            <tr class="devis-lines-total-row">
              <td colspan="8" class="devis-lines-total-label">${t("devis.linesTotal")}</td>
              <td id="devis-lines-total" class="devis-lines-total-value">${formatProfileMoney(0)}</td>
              <td class="devis-lines-total-spacer" aria-hidden="true"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div id="devis-lines-picker" class="library-picker" hidden>
        <div class="library-picker__panel">
          <div class="library-picker__head">
            <strong>${t("devis.pickerTitle")} — <span id="picker-trade-label"></span></strong>
            <button type="button" class="btn btn--ghost btn--sm" id="devis-lines-picker-close">${t("common.cancel")}</button>
          </div>
          <input type="search" id="picker-search" class="library-picker__search" placeholder="${t("devis.pickerSearch")}" />
          <div class="library-picker__filters" id="picker-type-filters">
            <button type="button" class="library-picker__filter is-active" data-type="">${t("devis.filterAll")}</button>
            <button type="button" class="library-picker__filter" data-type="fourniture">${t("devis.filterMaterials")}</button>
            <button type="button" class="library-picker__filter" data-type="mo">${t("devis.filterLabor")}</button>
            <button type="button" class="library-picker__filter" data-type="frais">${t("devis.filterFees")}</button>
          </div>
          <div class="library-picker__list" id="picker-list"></div>
        </div>
      </div>

      <form id="devis-lines-manual" class="devis-lines-manual" hidden>
        <h4>Ajouter une ligne (enregistrée dans la bibliothèque)</h4>
        <div class="form__grid">
          <label class="field">
            <span>Référence</span>
            <div class="field__wrap"><input type="text" id="line-manual-ref" required /></div>
          </label>
          <label class="field" style="grid-column:span 2">
            <span>Désignation</span>
            <div class="field__wrap"><input type="text" id="line-manual-designation" required /></div>
          </label>
          <label class="field">
            <span>Qté</span>
            <div class="field__wrap"><input type="number" id="line-manual-qty" min="1" step="1" value="1" /></div>
          </label>
          <label class="field">
            <span>Unité</span>
            <div class="field__wrap">
              <select id="line-manual-unit">
                <option value="u">Unité</option>
                <option value="m">Mètre</option>
                <option value="m²">Mètre carré</option>
                <option value="ml">Mètre linéaire</option>
                <option value="km">Kilomètre</option>
                <option value="L">Litre</option>
                <option value="h">Heure</option>
                <option value="j">Jour</option>
                <option value="forfait">Forfait</option>
              </select>
            </div>
          </label>
          <label class="field">
            <span>Prix client HT</span>
            <div class="field__wrap"><input type="number" id="line-manual-sell" min="0" step="0.01" /></div>
          </label>
          <label class="field">
            <span>Achat HT</span>
            <div class="field__wrap"><input type="number" id="line-manual-purchase" min="0" step="0.01" /></div>
          </label>
          <label class="field">
            <span>Type</span>
            <div class="field__wrap">
              <select id="line-manual-type">
                <option value="fourniture">Fourniture</option>
                <option value="mo">Main d'œuvre</option>
                <option value="vehicule">Véhicule & km</option>
                <option value="machine">Location machine</option>
                <option value="equipement">Équipement spécial</option>
                <option value="frais">Frais divers</option>
              </select>
            </div>
          </label>
          <label class="field" id="line-manual-difficulty-wrap">
            <span>Pose / difficulté</span>
            <div class="field__wrap" id="line-manual-difficulty-slot"></div>
          </label>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button type="submit" class="btn btn--primary btn--sm">Ajouter au devis</button>
          <button type="button" class="btn btn--ghost btn--sm" id="line-manual-cancel">Annuler</button>
        </div>
      </form>

      <form id="devis-lines-fee" class="devis-lines-manual" hidden>
        <h4 id="devis-fee-form-title">${t("devis.feeFormTitle")}</h4>
        <p class="card__desc" style="margin:0 0 12px">${t("devis.feeFormDesc")}</p>
        <div class="form__grid">
          <label class="field">
            <span>Référence <small style="color:var(--text-muted);font-weight:400">(${t("devis.feeRefOptional")})</small></span>
            <div class="field__wrap"><input type="text" id="line-fee-ref" /></div>
          </label>
          <label class="field" style="grid-column:span 2">
            <span>Désignation</span>
            <div class="field__wrap"><input type="text" id="line-fee-designation" required /></div>
          </label>
          <label class="field">
            <span>Qté</span>
            <div class="field__wrap"><input type="number" id="line-fee-qty" min="1" step="1" value="1" /></div>
          </label>
          <label class="field">
            <span>Unité</span>
            <div class="field__wrap">
              <select id="line-fee-unit">
                <option value="km">Kilomètre</option>
                <option value="j">Jour</option>
                <option value="h">Heure</option>
                <option value="forfait">Forfait</option>
                <option value="u">Unité</option>
              </select>
            </div>
          </label>
          <label class="field">
            <span>Prix client HT</span>
            <div class="field__wrap"><input type="number" id="line-fee-sell" min="0" step="0.01" required /></div>
          </label>
          <label class="field">
            <span>Achat HT (interne)</span>
            <div class="field__wrap"><input type="number" id="line-fee-purchase" min="0" step="0.01" /></div>
          </label>
          <label class="field field--check" style="grid-column:1/-1">
            <input type="checkbox" id="line-fee-save-library" checked />
            <span>Enregistrer dans la bibliothèque pour réutiliser</span>
          </label>
        </div>
        <input type="hidden" id="line-fee-type" value="frais" />
        <div style="display:flex;gap:8px;margin-top:12px">
          <button type="submit" class="btn btn--primary btn--sm">${t("devis.feeFormAdd")}</button>
          <button type="button" class="btn btn--ghost btn--sm" id="line-fee-cancel">${t("common.cancel")}</button>
        </div>
      </form>

      <div id="devis-fee-price-dialog" class="devis-fee-dialog" hidden>
        <div class="devis-fee-dialog__panel">
          <h4 id="devis-fee-price-title"></h4>
          <p class="card__desc" id="devis-fee-price-desc" style="margin:0 0 12px"></p>
          <label class="field">
            <span>${t("devis.feePriceLabel")}</span>
            <div class="field__wrap">
              <input type="number" id="devis-fee-price-input" min="0" step="0.01" />
              <span class="field__suffix">${currencySym} HT</span>
            </div>
          </label>
          <div class="devis-fee-dialog__actions">
            <button type="button" class="btn btn--primary btn--sm" id="devis-fee-price-confirm">${t("devis.feePriceConfirm")}</button>
            <button type="button" class="btn btn--ghost btn--sm" id="devis-fee-price-cancel">${t("common.cancel")}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const tradeSelect = root.querySelector("#devis-lines-trade");
  const linesBody = root.querySelector("#devis-lines-body");
  const linesTotal = root.querySelector("#devis-lines-total");
  const picker = root.querySelector("#devis-lines-picker");
  const pickerList = root.querySelector("#picker-list");
  const pickerSearch = root.querySelector("#picker-search");
  const pickerTradeLabel = root.querySelector("#picker-trade-label");
  const manualForm = root.querySelector("#devis-lines-manual");
  const feeForm = root.querySelector("#devis-lines-fee");
  const feePriceDialog = root.querySelector("#devis-fee-price-dialog");
  const feePriceInput = root.querySelector("#devis-fee-price-input");
  const feePriceTitle = root.querySelector("#devis-fee-price-title");
  const feePriceDesc = root.querySelector("#devis-fee-price-desc");
  let pendingFeeTemplate = null;
  let dragLineId = null;

  function profileData() {
    return typeof getProfile === "function" ? getProfile() : {};
  }

  function renderTravelQuickLabels() {
    const { kmRate, depannageHT, dayHT } = resolveTravelFees(profileData());
    const kmBtn = root.querySelector("#devis-fee-km");
    const depBtn = root.querySelector("#devis-fee-dep");
    const jourBtn = root.querySelector("#devis-fee-jour");
    if (kmBtn) kmBtn.textContent = `${formatProfileMoney(kmRate)} / km`;
    if (depBtn) depBtn.textContent = `Dépannage ${formatProfileMoney(depannageHT)}`;
    if (jourBtn) jourBtn.textContent = `Déplacement ${formatProfileMoney(dayHT)} / jour`;
  }

  renderTravelQuickLabels();

  function lineTotal(line) {
    return getLineEffectiveTotal(line);
  }

  function refreshManualDifficultySelect() {
    const slot = root.querySelector("#line-manual-difficulty-slot");
    const wrap = root.querySelector("#line-manual-difficulty-wrap");
    const typeEl = root.querySelector("#line-manual-type");
    if (!slot || !wrap || !typeEl) return;
    const isMaterial = normalizeLineType(typeEl.value) === "fourniture";
    wrap.hidden = !isMaterial;
    if (!isMaterial) return;
    slot.innerHTML = renderInstallationModeSelectHtml(activeTrade, "standard", {
      cssClass: "devis-line-difficulty",
    });
  }

  function addLineEntry(entry) {
    const type = normalizeLineType(entry.type);
    lineItems.push({
      id: lineId(),
      prestationId: entry.prestationId || "",
      tradeType: entry.tradeType || activeTrade,
      ref: entry.ref,
      designation: entry.designation,
      category: entry.category || lineTypeLabel(type),
      unit: entry.unit || "u",
      unitPriceHT: Number(entry.unitPriceHT) || 0,
      purchaseCostHT: Number(entry.purchaseCostHT) || 0,
      type,
      clientVisible: entry.clientVisible !== false,
      installationMode: normalizeInstallationMode(entry.installationMode),
      qty: normalizeLineQty({ type, unit: entry.unit }, entry.qty ?? 1),
    });
    renderLines();
  }

  tradeSelect.innerHTML = getLibraryTradesForMarket().map(
    (trade) => `<option value="${trade}">${tradeLabel(trade)}</option>`,
  ).join("");
  tradeSelect.value = activeTrade;

  function emitChange() {
    const rolled = rollupQuoteFromLineItems(lineItems, {});
    const laborTotal = lineItems
      .filter((line) => isMoLineType(line.type))
      .reduce((sum, line) => sum + lineTotal(line), 0);
    const feesTotal = getFeesTotalFromLineItems(lineItems);
    const materialTotal = getMaterialTotalFromLineItems(lineItems);

    linesTotal.innerHTML = lineItems.length
      ? `${formatProfileMoney(rolled.price)}<small class="devis-lines-total__detail"> — ${t("devis.laborHT")} : ${formatProfileMoney(laborTotal)} · ${t("devis.materialHT")} : ${formatProfileMoney(materialTotal)} · ${t("devis.feesHT")} : ${formatProfileMoney(feesTotal)}</small>`
      : formatProfileMoney(0);

    if (lineItems.length) {
      onTotalsChange?.(rolled);
    }
  }

  /**
   * Crée ou met à jour une ligne MO horaire facturée à partir du champ « Temps estimé ».
   */
  function syncHoursBilling(hours) {
    if (!lineItems.length) return;

    const normalizedHours = Math.max(Number(hours) || 0, 0);
    const hourlyLines = lineItems.filter(
      (line) => isMoLineType(line.type) && line.unit === "h" && !line.autoHours,
    );
    const autoLine = lineItems.find((line) => line.autoHours);

    if (hourlyLines.length === 1) {
      const line = hourlyLines[0];
      if (normalizedHours > 0 && line.qty !== normalizeLineQty(line, normalizedHours)) {
        line.qty = normalizeLineQty(line, normalizedHours);
        renderLines();
      }
      if (autoLine) {
        lineItems = lineItems.filter((entry) => entry.id !== autoLine.id);
        renderLines();
      }
      return;
    }

    if (hourlyLines.length > 1) return;

    if (normalizedHours <= 0) {
      if (autoLine) {
        lineItems = lineItems.filter((entry) => entry.id !== autoLine.id);
        renderLines();
      }
      return;
    }

    const rate = Math.round((getDefaultHourlyRate() || 45) * 100) / 100;
    const purchase = Math.round(rate * 0.58 * 100) / 100;

    if (autoLine) {
      const nextQty = normalizeLineQty(autoLine, normalizedHours);
      let changed = false;
      if (autoLine.qty !== nextQty) {
        autoLine.qty = nextQty;
        changed = true;
      }
      if (!autoLine.unitPriceHT) {
        autoLine.unitPriceHT = rate;
        autoLine.purchaseCostHT = purchase;
        changed = true;
      }
      if (changed) renderLines();
      return;
    }

    lineItems.push({
      id: lineId(),
      tradeType: activeTrade,
      ref: "MO-HEURES",
      designation: t("devis.autoHoursLabel"),
      category: "Main d'œuvre",
      unit: "h",
      unitPriceHT: rate,
      purchaseCostHT: purchase,
      type: "mo",
      clientVisible: true,
      autoHours: true,
      qty: normalizeLineQty({ type: "mo", unit: "h" }, normalizedHours),
    });
    renderLines();
  }

  function moveLine(lineId, delta) {
    const index = lineItems.findIndex((entry) => entry.id === lineId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= lineItems.length) return;
    const [entry] = lineItems.splice(index, 1);
    lineItems.splice(target, 0, entry);
    renderLines();
  }

  function reorderLine(dragId, targetId) {
    if (!dragId || !targetId || dragId === targetId) return;
    const from = lineItems.findIndex((entry) => entry.id === dragId);
    const to = lineItems.findIndex((entry) => entry.id === targetId);
    if (from < 0 || to < 0) return;
    const [entry] = lineItems.splice(from, 1);
    lineItems.splice(to, 0, entry);
    renderLines();
  }

  function renderLines() {
    const rows = [];
    let sectionNum = 0;
    let prevGroup = null;

    lineItems.forEach((line, index) => {
      const group = lineSectionGroup(line.type);
      if (index === 0 || group !== prevGroup) {
        sectionNum += 1;
        prevGroup = group;
        rows.push(`
          <tr class="devis-lines-section-row" style="--section-accent:${getSectionAccent(group)}">
            <td colspan="10">
              <div class="devis-lines-section-row__inner">
                <span class="devis-lines-section-row__num">${String(sectionNum).padStart(2, "0")}</span>
                <div>
                  <strong class="devis-lines-section-row__title">${escapeHtml(getSectionTitle(group))}</strong>
                  <span class="devis-lines-section-row__sub">${escapeHtml(getSectionSubtitle(group))}</span>
                </div>
              </div>
            </td>
          </tr>`);
      }

      const qtyAttrs = qtyInputAttrs(line);
      const qtyValue = normalizeLineQty(line, line.qty);
      const designation = lineDesignation(line);
      const isFirst = index === 0;
      const isLast = index === lineItems.length - 1;

      const coeffBadge = formatDifficultyCoeffBadge(line);
      const showDifficulty =
        !isFeeLineType(line.type) && !isMoLineType(line.type);
      const difficultyCell = showDifficulty
        ? `${renderInstallationModeSelectHtml(line.tradeType || activeTrade, line.installationMode, {
            lineId: line.id,
            cssClass: "devis-line-difficulty",
          })}${coeffBadge ? `<small class="devis-line-coeff">${coeffBadge}</small>` : ""}`
        : "—";

      rows.push(`
        <tr class="devis-line-row" data-line="${escapeHtml(line.id)}" draggable="true">
          <td class="devis-line-order">
            <div class="devis-line-order__controls">
              <button type="button" class="devis-line-order__btn" data-move-up="${escapeHtml(line.id)}" ${isFirst ? "disabled" : ""} title="Monter">↑</button>
              <button type="button" class="devis-line-order__btn" data-move-down="${escapeHtml(line.id)}" ${isLast ? "disabled" : ""} title="Descendre">↓</button>
            </div>
          </td>
          <td><code>${escapeHtml(line.ref)}</code></td>
          <td>
            <span class="devis-line-type devis-line-type--${escapeHtml(line.type)}">${escapeHtml(lineTypeLabel(line.type))}</span>
            <input type="text" class="devis-line-designation" data-designation="${escapeHtml(line.id)}" value="${escapeHtml(designation)}" />
          </td>
          <td class="devis-line-difficulty-cell">${difficultyCell}</td>
          <td class="col-qty">
            ${renderQtyInput(line, qtyAttrs, qtyValue)}
          </td>
          <td class="col-unit">${lineUnitSelectHtml(line.id, line.unit)}</td>
          <td>
            <input type="number" class="devis-line-price" data-price="${escapeHtml(line.id)}" min="0" step="0.01" value="${Number(line.unitPriceHT) || 0}" />
          </td>
          <td class="devis-line-purchase">${isMoLineType(line.type) ? "—" : formatProfileMoney(line.purchaseCostHT || 0)}</td>
          <td data-line-total="${escapeHtml(line.id)}">${formatProfileMoney(lineTotal(line))}</td>
          <td><button type="button" class="btn btn--ghost btn--sm" data-remove="${escapeHtml(line.id)}" aria-label="Supprimer la ligne">×</button></td>
        </tr>`);
    });

    linesBody.innerHTML = lineItems.length
      ? rows.join("")
      : `<tr><td colspan="10" style="color:var(--text-muted)">${t("devis.linesEmpty")}</td></tr>`;
    emitChange();
    window.dispatchEvent(new Event("devis-lines-rendered"));
  }

  function refreshLineTotalCell(lineId) {
    const line = lineItems.find((entry) => entry.id === lineId);
    if (!line) return;
    const totalCell = linesBody.querySelector(`[data-line-total="${lineId}"]`);
    if (totalCell) {
      totalCell.textContent = formatProfileMoney(lineTotal(line));
    }
  }

  function updateLineField(lineId, patch) {
    const line = lineItems.find((entry) => entry.id === lineId);
    if (!line) return;
    Object.assign(line, patch);
    refreshLineTotalCell(lineId);
    emitChange();
  }

  function addLineFromPrestation(prestation, qty = 1) {
    addLineEntry({
      prestationId: prestation.id,
      tradeType: prestation.tradeType,
      ref: prestation.ref,
      designation: prestation.designation,
      category: prestation.category,
      unit: prestation.unit,
      unitPriceHT: prestation.unitPriceHT,
      purchaseCostHT: prestation.purchaseCostHT,
      type: prestation.type,
      clientVisible: prestation.clientVisible,
      qty,
    });
  }

  function renderPicker() {
    ensureLibraryReady();
    ensureSeedForTrade(activeTrade);
    pickerTradeLabel.textContent = tradeLabel(activeTrade);
    const items = searchPrestations({
      tradeType: activeTrade,
      query: pickerSearch.value,
      type: activeTypeFilter,
    }).slice(0, 80);

    pickerItems.clear();
    for (const item of items) pickerItems.set(item.id, item);

    if (!items.length) {
      const tradeCount = getPrestationsByTrade(activeTrade).length;
      pickerList.innerHTML = `
        <div class="library-picker__empty">
          <p>${escapeHtml(t("devis.pickerEmpty"))}</p>
          <p class="library-picker__empty-detail">${tradeCount ? escapeHtml(t("devis.pickerEmptyFilter")) : escapeHtml(t("devis.pickerEmptySeed"))}</p>
          <button type="button" class="btn btn--primary btn--sm" id="picker-reload-catalog">${escapeHtml(t("devis.pickerReload"))}</button>
        </div>`;
      pickerList.querySelector("#picker-reload-catalog")?.addEventListener("click", () => {
        ensureLibraryReady();
        renderPicker();
      }, { once: true });
      return;
    }

    pickerList.innerHTML = items
          .map(
            (item) => {
              const loc = localizePrestation(item);
              return `
        <button type="button" class="library-picker__item" data-add="${escapeHtml(item.id)}">
          <span class="library-picker__thumb">${renderRefThumb(getPrestationImageUrl(item), { size: "sm" })}</span>
          <span class="library-picker__meta">
            <span class="library-picker__ref">${escapeHtml(item.ref)}${item.source === "batiprix" ? ' <span class="library-picker__badge">Batiprix</span>' : ""}</span>
            <span class="library-picker__label">${escapeHtml(loc.designation)}</span>
            ${!isMoLineType(item.type) && item.purchaseCostHT ? `<span class="library-picker__purchase">${t("devis.purchaseHT")} : ${formatProfileMoney(item.purchaseCostHT)}</span>` : ""}
          </span>
          <span class="library-picker__price">${formatProfileMoney(item.unitPriceHT)} / ${escapeHtml(loc.unit)}</span>
        </button>`;
            },
          )
          .join("");
  }

  const debouncedRenderPicker = debounce(renderPicker, 200);

  function updateLineQty(lineId, qty) {
    const line = lineItems.find((entry) => entry.id === lineId);
    if (!line) return;
    line.qty = normalizeLineQty(line, qty);
    const input = linesBody.querySelector(`[data-qty="${lineId}"]`);
    if (input && Number(input.value) !== line.qty) {
      input.value = line.qty;
    }
    const totalCell = linesBody.querySelector(`[data-line-total="${lineId}"]`);
    if (totalCell) {
      totalCell.textContent = formatProfileMoney(lineTotal(line));
    }
    emitChange();
  }

  function mountPickerOverlay() {
    if (picker.parentElement !== document.body) {
      document.body.appendChild(picker);
    }
  }

  function openPicker() {
    mountPickerOverlay();
    pickerOpen = true;
    picker.hidden = false;
    document.body.classList.add("library-picker-open");
    pickerSearch.value = "";
    pickerList.innerHTML = `<p class="library-picker__status">${escapeHtml(t("devis.pickerLoading"))}</p>`;
    requestAnimationFrame(() => {
      ensureLibraryReady();
      renderPicker();
      pickerSearch.focus({ preventScroll: true });
    });
  }

  function closePicker() {
    pickerOpen = false;
    picker.hidden = true;
    document.body.classList.remove("library-picker-open");
  }

  tradeSelect.addEventListener("change", () => {
    activeTrade = tradeSelect.value;
    if (pickerOpen) renderPicker();
  });

  root.querySelector("#devis-lines-picker-btn")?.addEventListener("click", openPicker);
  root.querySelector("#devis-lines-picker-close")?.addEventListener("click", closePicker);
  picker?.addEventListener("click", (event) => {
    if (event.target === picker) closePicker();
  });
  pickerSearch?.addEventListener("input", debouncedRenderPicker);

  root.querySelector("#picker-type-filters")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-type]");
    if (!btn) return;
    activeTypeFilter = btn.dataset.type || "";
    root.querySelectorAll(".library-picker__filter").forEach((el) => {
      el.classList.toggle("is-active", el === btn);
    });
    renderPicker();
  });

  pickerList?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-add]");
    if (!btn) return;
    const item = pickerItems.get(btn.dataset.add) ?? getPrestationById(btn.dataset.add);
    if (item) {
      addLineFromPrestation(item);
      closePicker();
    }
  });

  linesBody?.addEventListener("input", (event) => {
    const qtyInput = event.target.closest("[data-qty]");
    if (qtyInput) {
      updateLineQty(qtyInput.dataset.qty, qtyInput.value);
      return;
    }

    const priceInput = event.target.closest("[data-price]");
    if (priceInput) {
      updateLineField(priceInput.dataset.price, {
        unitPriceHT: Math.max(0, Number(priceInput.value) || 0),
      });
      return;
    }

    const designationInput = event.target.closest("[data-designation]");
    if (designationInput) {
      updateLineField(designationInput.dataset.designation, {
        designation: designationInput.value,
      });
    }
  });

  linesBody?.addEventListener("change", (event) => {
    const difficultySelect = event.target.closest("[data-difficulty]");
    if (difficultySelect) {
      const line = lineItems.find((entry) => entry.id === difficultySelect.dataset.difficulty);
      if (!line) return;
      line.installationMode = normalizeInstallationMode(difficultySelect.value);
      renderLines();
      return;
    }

    const unitSelect = event.target.closest("[data-unit]");
    if (!unitSelect) return;
    const line = lineItems.find((entry) => entry.id === unitSelect.dataset.unit);
    if (!line) return;
    line.unit = unitSelect.value;
    line.qty = normalizeLineQty(line, line.qty);
    const qtyInput = linesBody.querySelector(`[data-qty="${line.id}"]`);
    if (qtyInput) {
      const attrs = qtyInputAttrs(line);
      qtyInput.min = String(attrs.min);
      qtyInput.step = String(attrs.step);
      qtyInput.value = line.qty;
    }
    refreshLineTotalCell(line.id);
    emitChange();
  });

  function stepLineQty(lineId, direction) {
    const line = lineItems.find((entry) => entry.id === lineId);
    if (!line) return;
    const step = 1;
    const next = normalizeLineQty(line, (Number(line.qty) || 0) + direction * step);
    updateLineQty(lineId, next);
    const qtyInput = linesBody.querySelector(`[data-qty="${lineId}"]`);
    if (qtyInput) qtyInput.value = next;
  }

  let lastQtyStepAt = 0;
  let lastQtyStepKey = "";

  function handleQtyStep(event) {
    const qtyUp = event.target.closest("[data-qty-up]");
    const qtyDown = event.target.closest("[data-qty-down]");
    if (!qtyUp && !qtyDown) return false;

    event.preventDefault();
    event.stopPropagation();

    const lineId = qtyUp?.dataset.qtyUp ?? qtyDown?.dataset.qtyDown;
    const direction = qtyUp ? 1 : -1;
    const key = `${lineId}:${direction}`;
    const now = Date.now();
    if (key === lastQtyStepKey && now - lastQtyStepAt < 350) return true;
    lastQtyStepKey = key;
    lastQtyStepAt = now;

    stepLineQty(lineId, direction);
    return true;
  }

  linesBody?.addEventListener("click", (event) => {
    if (handleQtyStep(event)) return;
    const upBtn = event.target.closest("[data-move-up]");
    if (upBtn) {
      moveLine(upBtn.dataset.moveUp, -1);
      return;
    }

    const downBtn = event.target.closest("[data-move-down]");
    if (downBtn) {
      moveLine(downBtn.dataset.moveDown, 1);
      return;
    }

    const btn = event.target.closest("[data-remove]");
    if (!btn) return;
    lineItems = lineItems.filter((line) => line.id !== btn.dataset.remove);
    renderLines();
  });

  linesBody?.addEventListener(
    "pointerup",
    (event) => {
      if (event.pointerType === "mouse") return;
      handleQtyStep(event);
    },
    { passive: false },
  );

  linesBody?.addEventListener("dragstart", (event) => {
    const row = event.target.closest(".devis-line-row");
    if (!row) return;
    dragLineId = row.dataset.line;
    row.classList.add("devis-line-row--dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dragLineId);
  });

  linesBody?.addEventListener("dragend", (event) => {
    const row = event.target.closest(".devis-line-row");
    if (row) row.classList.remove("devis-line-row--dragging");
    dragLineId = null;
    linesBody.querySelectorAll(".devis-line-row--drop-target").forEach((el) => {
      el.classList.remove("devis-line-row--drop-target");
    });
  });

  linesBody?.addEventListener("dragover", (event) => {
    const row = event.target.closest(".devis-line-row");
    if (!row || row.dataset.line === dragLineId) return;
    event.preventDefault();
    linesBody.querySelectorAll(".devis-line-row--drop-target").forEach((el) => {
      el.classList.remove("devis-line-row--drop-target");
    });
    row.classList.add("devis-line-row--drop-target");
  });

  linesBody?.addEventListener("drop", (event) => {
    event.preventDefault();
    const row = event.target.closest(".devis-line-row");
    if (!row || !dragLineId) return;
    reorderLine(dragLineId, row.dataset.line);
  });

  root.querySelector("#devis-lines-manual-btn")?.addEventListener("click", () => {
    feeForm.hidden = true;
    manualForm.hidden = false;
    refreshManualDifficultySelect();
  });

  root.querySelector("#line-manual-cancel")?.addEventListener("click", () => {
    manualForm.hidden = true;
    manualForm.reset();
  });

  function defaultFeeQty(template) {
    return 1;
  }

  function purchaseFromSell(sell, ratio = 0.54) {
    return Math.round(sell * ratio * 100) / 100;
  }

  function resolveTemplatePricing(template) {
    if (!template) return null;

    const fees = resolveTravelFees(profileData());
    const travelPricing = {
      "VEH-KM": { unitPriceHT: fees.kmRate || DEFAULT_TRAVEL_FEES.travelKmRate, ratio: 0.54 },
      "VEH-DEP": {
        unitPriceHT: fees.depannageHT || DEFAULT_TRAVEL_FEES.travelDepannageHT,
        ratio: 0.54,
      },
      "VEH-JOUR": { unitPriceHT: fees.dayHT || DEFAULT_TRAVEL_FEES.travelDayHT, ratio: 0.55 },
    };

    const travel = travelPricing[template.ref];
    if (travel) {
      return {
        ...template,
        unitPriceHT: travel.unitPriceHT,
        purchaseCostHT: purchaseFromSell(travel.unitPriceHT, travel.ratio),
      };
    }

    return { ...template };
  }

  function addFeeFromTemplate(template) {
    const priced = resolveTemplatePricing(template);
    if (!priced) return;

    feeForm.hidden = true;
    manualForm.hidden = true;
    feePriceDialog.hidden = true;
    closePicker();

    addLineEntry({
      tradeType: activeTrade,
      ref: priced.ref,
      designation: priced.designation,
      category: priced.category || lineTypeLabel(priced.type),
      unit: priced.unit,
      unitPriceHT: Number(priced.unitPriceHT) || 0,
      purchaseCostHT: Number(priced.purchaseCostHT) || 0,
      type: priced.type,
      qty: defaultFeeQty(priced),
      clientVisible: true,
    });

    linesBody.closest(".table-wrap")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function openFeePriceDialog(template) {
    pendingFeeTemplate = { ...template };
    feePriceDialog.hidden = false;
    feePriceTitle.textContent = template.designation;
    feePriceDesc.textContent = t("devis.feePriceAsk");
    feePriceInput.value = Number(template.unitPriceHT) || "";
    feeForm.hidden = true;
    manualForm.hidden = true;
    feePriceInput.focus();
    feePriceInput.select();
  }

  function confirmFeePriceDialog() {
    if (!pendingFeeTemplate) return;
    const price = Number(String(feePriceInput.value).replace(",", ".")) || 0;
    if (price <= 0) {
      feePriceInput.focus();
      return;
    }

    const template = {
      ...pendingFeeTemplate,
      unitPriceHT: price,
      purchaseCostHT: purchaseFromSell(price, pendingFeeTemplate.type === "frais" ? 0 : 0.5),
    };
    pendingFeeTemplate = null;
    feePriceDialog.hidden = true;
    addFeeFromTemplate(template);
  }

  function addTravelDirect(ref) {
    addFeeFromTemplate(getFeeTemplateByRef(ref, profileData()));
  }

  function addOtherFeeDirect(feeType) {
    const template = FEE_QUICK_DEFAULTS[feeType];
    if (!template) return;
    openFeePriceDialog(template);
  }

  function openFeeFormCustom() {
    manualForm.hidden = true;
    feeForm.hidden = false;
    root.querySelector("#line-fee-type").value = "vehicule";
    root.querySelector("#devis-fee-form-title").textContent = t("devis.travelCustomTitle");
    root.querySelector("#line-fee-ref").value = "";
    root.querySelector("#line-fee-designation").value = "";
    root.querySelector("#line-fee-designation").placeholder = t("devis.travelCustomPlaceholder");
    root.querySelector("#line-fee-unit").value = "forfait";
    root.querySelector("#line-fee-qty").value = 1;
    root.querySelector("#line-fee-sell").value = "";
    root.querySelector("#line-fee-purchase").value = "";
    root.querySelector("#line-fee-save-library").checked = false;
    const desc = feeForm.querySelector(".card__desc");
    if (desc) desc.textContent = t("devis.travelCustomDesc");
    feeForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  root.addEventListener("click", (event) => {
    const travelBtn = event.target.closest("[data-fee-template]");
    if (travelBtn) {
      event.preventDefault();
      addTravelDirect(travelBtn.dataset.feeTemplate);
      return;
    }

    const quickBtn = event.target.closest("[data-fee-quick]");
    if (quickBtn) {
      event.preventDefault();
      addOtherFeeDirect(quickBtn.dataset.feeQuick);
      return;
    }

    if (event.target.closest("#devis-fee-price-confirm")) {
      event.preventDefault();
      confirmFeePriceDialog();
      return;
    }

    if (event.target.closest("#devis-fee-price-cancel")) {
      event.preventDefault();
      pendingFeeTemplate = null;
      feePriceDialog.hidden = true;
    }
  });

  feePriceInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmFeePriceDialog();
    }
    if (event.key === "Escape") {
      pendingFeeTemplate = null;
      feePriceDialog.hidden = true;
    }
  });

  root.querySelector("#devis-travel-custom")?.addEventListener("click", openFeeFormCustom);

  root.querySelector("#line-fee-cancel")?.addEventListener("click", () => {
    feeForm.hidden = true;
    feeForm.reset();
  });

  feeForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const type = normalizeLineType(root.querySelector("#line-fee-type").value);
    const refInput = root.querySelector("#line-fee-ref").value.trim();
    const ref =
      refInput ||
      `TRAV-${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const designation = root.querySelector("#line-fee-designation").value.trim();
    if (!designation) return;
    const unit = root.querySelector("#line-fee-unit").value;
    const qty = normalizeLineQty({ type, unit }, root.querySelector("#line-fee-qty").value);
    const sell = Number(root.querySelector("#line-fee-sell").value) || 0;
    let purchase = Number(root.querySelector("#line-fee-purchase").value) || 0;
    const saveLibrary = root.querySelector("#line-fee-save-library").checked;
    const category =
      getFeeTemplateByRef(ref, profileData())?.category ||
      FEE_QUICK_DEFAULTS[type]?.category ||
      lineTypeLabel(type);

    addLineEntry({
      tradeType: activeTrade,
      ref,
      designation,
      category,
      unit,
      unitPriceHT: ref === "VEH-KM" ? resolveTravelFees(profileData()).kmRate || DEFAULT_TRAVEL_FEES.travelKmRate : sell,
      purchaseCostHT: purchase,
      type,
      qty,
    });

    if (saveLibrary) {
      upsertPrestation({
        tradeType: activeTrade,
        ref,
        designation,
        unit,
        unitPriceHT: ref === "VEH-KM" ? resolveTravelFees(profileData()).kmRate || DEFAULT_TRAVEL_FEES.travelKmRate : sell,
        purchaseCostHT: purchase,
        type,
        category,
        source: "manual",
        clientVisible: true,
      });
    }

    feeForm.hidden = true;
    feeForm.reset();
  });

  root.querySelector("#line-manual-type")?.addEventListener("change", () => {
    syncManualQtyInput();
    refreshManualDifficultySelect();
  });
  root.querySelector("#line-manual-unit")?.addEventListener("change", syncManualQtyInput);

  manualForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const ref = root.querySelector("#line-manual-ref").value.trim();
    const designation = root.querySelector("#line-manual-designation").value.trim();
    const unit = root.querySelector("#line-manual-unit").value;
    const type = normalizeLineType(root.querySelector("#line-manual-type").value);
    const qty = normalizeLineQty({ type, unit }, root.querySelector("#line-manual-qty").value);
    const sell = Number(root.querySelector("#line-manual-sell").value) || 0;
    let purchase = Number(root.querySelector("#line-manual-purchase").value) || 0;
    const category = isFeeLineType(type)
      ? lineTypeLabel(type)
      : type === "mo"
        ? "Main d'œuvre"
        : "Saisie devis";

    if (!purchase && sell && !isFeeLineType(type)) {
      purchase = sell / 2;
    }

    const linePayload = {
      tradeType: activeTrade,
      ref,
      designation,
      unit,
      unitPriceHT: sell,
      purchaseCostHT: purchase,
      type,
      category,
      clientVisible: true,
      installationMode: isFeeLineType(type) || isMoLineType(type)
        ? "standard"
        : normalizeInstallationMode(
            root.querySelector("#line-manual-difficulty-slot select")?.value,
          ),
    };

    if (canManageLibrary) {
      const saved = upsertPrestation({
        ...linePayload,
        source: "manual",
      });
      if (saved) {
        addLineFromPrestation({ ...saved, clientVisible: true }, qty);
      }
    } else {
      addLineEntry({ ...linePayload, qty });
    }

    manualForm.hidden = true;
    manualForm.reset();
  });

  renderLines();

  window.addEventListener("exone-difficulty-coeffs-updated", () => {
    renderLines();
    if (pickerOpen) renderPicker();
  });

  onLocaleChange(() => {
    tradeSelect.innerHTML = getLibraryTradesForMarket().map(
      (trade) => `<option value="${trade}">${tradeLabel(trade)}</option>`,
    ).join("");
    tradeSelect.value = activeTrade;
    renderTravelQuickLabels();
    renderLines();
    if (pickerOpen) renderPicker();
  });

  window.addEventListener("exone-catalog-ready", () => {
    if (pickerOpen) renderPicker();
  });

  const pendingFromLibrary = pullPrestationsForDevis();
  if (pendingFromLibrary.length) {
    const firstTrade = pendingFromLibrary.find((item) => item.tradeType)?.tradeType;
    if (firstTrade && getLibraryTradesForMarket().includes(firstTrade)) {
      activeTrade = firstTrade;
      tradeSelect.value = activeTrade;
    }
    for (const item of pendingFromLibrary) {
      const prestation = item.id ? (getPrestationById(item.id) ?? item) : item;
      if (prestation?.ref) addLineFromPrestation(prestation);
    }
    window.dispatchEvent(new CustomEvent("devis-library-imported"));
  }

  return {
    getLineItems: () => [...lineItems],
    setLineItems: (items) => {
      lineItems = Array.isArray(items)
        ? items.map((line) => ({
            ...line,
            installationMode: normalizeInstallationMode(line.installationMode),
            qty: normalizeLineQty(line, line.qty),
          }))
        : [];
      renderLines();
    },
    getRolledQuote: (base = {}) => rollupQuoteFromLineItems(lineItems, base),
    clear: () => {
      lineItems = [];
      renderLines();
    },
    syncHoursBilling,
  };
}
