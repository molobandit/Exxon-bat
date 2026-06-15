/**
 * Structure & rendu professionnel des devis BTP (lots numérotés, lisibles client).
 */

import {
  buildLinePdfDesignation,
  getLineEffectiveTotal,
  getLineEffectiveUnitPrice,
} from "./installation-difficulty.js";

export function lineSectionGroup(type) {
  if (type === "mo") return "mo";
  if (type === "vehicule") return "travel";
  if (type === "machine" || type === "equipement") return "equipment";
  if (type === "frais") return "misc";
  return "materials";
}

const SECTION_META = {
  mo: {
    title: "Main d'œuvre",
    subtitle: "Travaux, pose et mise en service",
    recap: "Main d'œuvre",
    accent: "#2563eb",
    accentSoft: "#eff6ff",
  },
  materials: {
    title: "Fournitures & matériaux",
    subtitle: "Produits et consommables",
    recap: "Matériaux",
    accent: "#059669",
    accentSoft: "#ecfdf5",
  },
  travel: {
    title: "Déplacement & transport",
    subtitle: "Frais de trajet et intervention",
    recap: "Déplacement",
    accent: "#d97706",
    accentSoft: "#fffbeb",
  },
  equipment: {
    title: "Locations & équipements",
    subtitle: "Matériel de chantier loué",
    recap: "Équipements",
    accent: "#7c3aed",
    accentSoft: "#f5f3ff",
  },
  misc: {
    title: "Frais annexes",
    subtitle: "Divers et prestations complémentaires",
    recap: "Frais annexes",
    accent: "#64748b",
    accentSoft: "#f8fafc",
  },
};

export const SECTION_DISPLAY_ORDER = ["mo", "materials", "travel", "equipment", "misc"];

export function getSectionTitle(group) {
  return SECTION_META[group]?.title ?? "Prestations";
}

export function getSectionSubtitle(group) {
  return SECTION_META[group]?.subtitle ?? "";
}

export function getSectionRecapLabel(group) {
  return SECTION_META[group]?.recap ?? "Sous-total";
}

export function getSectionAccent(group) {
  return SECTION_META[group]?.accent ?? "#6665dd";
}

export function getSectionAccentSoft(group) {
  return SECTION_META[group]?.accentSoft ?? "#f0f3fd";
}

export function computeSectionTotalsFromLines(lines = []) {
  const totals = { mo: 0, materials: 0, travel: 0, equipment: 0, misc: 0 };

  for (const line of lines) {
    const group = lineSectionGroup(line.type);
    const amount = getLineEffectiveTotal(line);
    totals[group] = Math.round((totals[group] + amount) * 100) / 100;
  }

  return totals;
}

export function buildClientPdfLineItems(clientLines) {
  const items = [];
  let index = 1;

  for (const line of clientLines) {
    const sectionGroup = lineSectionGroup(line.type);
    const qty = Number(line.qty) || 0;
    const unitPrice = getLineEffectiveUnitPrice(line);
    const designation = buildLinePdfDesignation(line);

    items.push({
      index,
      sectionGroup,
      section: sectionGroup,
      ref: line.ref || `L-${index}`,
      designation,
      description: "",
      unit: line.unit || "u",
      qty,
      unitPrice,
      total: getLineEffectiveTotal(line),
    });
    index += 1;
  }

  return items;
}

/** Regroupe les lignes consécutives en lots (ordre utilisateur respecté). */
export function buildSectionBlocks(items = []) {
  const blocks = [];
  let current = null;

  for (const item of items) {
    const group = item.sectionGroup || item.section;
    if (!current || current.group !== group) {
      current = {
        group,
        num: String(blocks.length + 1).padStart(2, "0"),
        items: [],
        total: 0,
      };
      blocks.push(current);
    }
    current.items.push(item);
    current.total = Math.round((current.total + item.total) * 100) / 100;
  }

  for (const block of blocks) {
    block.title = getSectionTitle(block.group);
    block.subtitle = getSectionSubtitle(block.group);
    block.accent = getSectionAccent(block.group);
    block.accentSoft = getSectionAccentSoft(block.group);
    block.recapLabel = getSectionRecapLabel(block.group);
  }

  return blocks;
}

function pluralPrestations(count) {
  return count > 1 ? "prestations" : "prestation";
}

/** Bandeau KPI en tête de devis — aperçu immédiat du montant et du contexte. */
export function renderQuoteHeroStats({
  totalHT,
  hours,
  validityDays,
  blockCount,
  lineCount,
  formatEuroDetailed,
  isFacture = false,
}) {
  return `
  <div class="quote-hero">
    <div class="quote-hero__amount-card">
      <span class="quote-hero__eyebrow">${isFacture ? "Montant de la facture" : "Montant de l'offre"}</span>
      <div class="quote-hero__amount-row">
        <strong class="quote-hero__amount">${formatEuroDetailed(totalHT)}</strong>
        <span class="quote-hero__ht">HT</span>
      </div>
      <p class="quote-hero__tagline">${isFacture ? "Échéance selon modalités ci-dessous" : "Devis clair, sans surprise — validité " + validityDays + " jours"}</p>
    </div>
    <div class="quote-hero__metrics">
      <div class="quote-hero__metric">
        <span class="quote-hero__metric-value">${String(blockCount).padStart(2, "0")}</span>
        <span class="quote-hero__metric-label">Lot${blockCount > 1 ? "s" : ""}</span>
      </div>
      <div class="quote-hero__metric">
        <span class="quote-hero__metric-value">${lineCount}</span>
        <span class="quote-hero__metric-label">Ligne${lineCount > 1 ? "s" : ""}</span>
      </div>
      <div class="quote-hero__metric">
        <span class="quote-hero__metric-value">${hours}</span>
        <span class="quote-hero__metric-label">Heure${hours > 1 ? "s" : ""}</span>
      </div>
      <div class="quote-hero__metric">
        <span class="quote-hero__metric-value">${validityDays}</span>
        <span class="quote-hero__metric-label">Jours</span>
      </div>
    </div>
  </div>`;
}

/** Rendu client — blocs numérotés par lot (style devis artisan premium). */
export function renderProQuoteSections(items, { escapeHtml, translateUnit, formatEuroDetailed, locale }) {
  const blocks = buildSectionBlocks(items);
  if (!blocks.length) {
    return `<p class="quote-sections__empty">Aucune prestation détaillée.</p>`;
  }

  return blocks
    .map(
      (block) => `
    <section class="quote-section quote-section--${block.group}" style="--section-accent:${block.accent};--section-accent-soft:${block.accentSoft}">
      <header class="quote-section__head">
        <div class="quote-section__head-main">
          <span class="quote-section__num">${block.num}</span>
          <div class="quote-section__head-text">
            <h3 class="quote-section__title">${escapeHtml(block.title)}</h3>
            <p class="quote-section__subtitle">${escapeHtml(block.subtitle)}</p>
          </div>
        </div>
        <div class="quote-section__head-meta">
          <span class="quote-section__count">${block.items.length} ${pluralPrestations(block.items.length)}</span>
          <div class="quote-section__head-total">
            <span class="quote-section__head-total-label">Sous-total HT</span>
            <strong>${formatEuroDetailed(block.total)}</strong>
          </div>
        </div>
      </header>
      <div class="quote-section__table-wrap">
      <table class="quote-section__table">
        <thead>
          <tr>
            <th class="col-designation">Désignation</th>
            <th class="num col-qty">Quantité</th>
            <th class="num col-price">P.U. HT</th>
            <th class="num col-total">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${block.items
            .map(
              (item, rowIdx) => `
            <tr class="${rowIdx % 2 === 1 ? "is-alt" : ""}">
              <td class="designation">
                <strong>${escapeHtml(item.designation)}</strong>
                ${
                  item.description
                    ? `<span class="line-desc">${escapeHtml(item.description)}</span>`
                    : ""
                }
              </td>
              <td class="num">
                <span class="qty">${item.qty}</span>
                <span class="unit">${escapeHtml(translateUnit(item.unit, locale, item.qty))}</span>
              </td>
              <td class="num">${formatEuroDetailed(item.unitPrice)}</td>
              <td class="num line-total">${formatEuroDetailed(item.total)}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr class="quote-section__foot">
            <td colspan="3">
              <span class="quote-section__foot-label">Sous-total lot ${block.num}</span>
              <span class="quote-section__foot-name">${escapeHtml(block.title)}</span>
            </td>
            <td class="num">${formatEuroDetailed(block.total)}</td>
          </tr>
        </tfoot>
      </table>
      </div>
    </section>`,
    )
    .join("");
}

/** Estime le « poids » visuel du devis pour l'impression A4. */
export function estimatePrintWeight({
  lineCount = 0,
  blockCount = 1,
  objectText = "",
  paymentTerms = "",
  additionalNote = "",
  hasDeposit = false,
}) {
  const objectLines = Math.max(1, Math.ceil(String(objectText).trim().length / 90));
  const payLines = Math.max(1, Math.ceil(String(paymentTerms).trim().length / 72));
  const noteLines = additionalNote.trim()
    ? Math.ceil(String(additionalNote).trim().length / 82)
    : 0;
  const groupRows = Math.max(0, blockCount - 1);

  const weight =
    lineCount +
    groupRows * 2 +
    objectLines * 0.9 +
    payLines * 0.5 +
    noteLines * 0.65 +
    (hasDeposit ? 1.5 : 0) +
    9;

  return { weight, objectLines, payLines, noteLines, groupRows };
}

/**
 * Layout A4 adaptatif — sparse (peu de lignes), compact, dense.
 * allowSecondPage : tableau long avec bas de page propre sur la dernière feuille.
 */
export function computeClientPrintLayout(options = {}) {
  const { weight } = estimatePrintWeight(options);
  const lineCount = options.lineCount ?? 0;

  let density = "compact";
  if (weight <= 17) density = "sparse";
  else if (weight <= 30) density = "compact";
  else density = "dense";

  const allowSecondPage = weight > 36 || lineCount > 18;

  return { density, allowSecondPage, weight };
}

/** Densité d'impression — viser 1 page A4, layout sparse si peu de lignes. */
export function getQuotePrintDensity(lineCount, blockCount = 1) {
  return computeClientPrintLayout({ lineCount, blockCount }).density;
}

/** Tableau style devis pro (Costructor) — compact, colonnes Qté / Unité séparées. */
export function renderClientQuoteTable(items, { escapeHtml, translateUnit, formatEuroDetailed, locale }) {
  const blocks = buildSectionBlocks(items);
  if (!blocks.length) {
    return `<p class="quote-table__empty">Ancune prestation détaillée.</p>`;
  }

  const multiGroup = blocks.length > 1;
  const cols = 6;

  const body = blocks
    .map((block) => {
      const groupHeader = multiGroup
        ? `<tr class="quote-table__group"><td colspan="${cols}">${escapeHtml(block.title)}</td></tr>`
        : "";
      const rows = block.items
        .map(
          (item) => `
        <tr>
          <td class="col-designation">${escapeHtml(item.designation)}</td>
          <td class="num col-qty">${item.qty}</td>
          <td class="col-unit">${escapeHtml(translateUnit(item.unit, locale, item.qty))}</td>
          <td class="num col-price">${formatEuroDetailed(item.unitPrice)}</td>
          <td class="num col-tva">—</td>
          <td class="num col-total"><strong>${formatEuroDetailed(item.total)}</strong></td>
        </tr>`,
        )
        .join("");
      const subtotal = multiGroup
        ? `<tr class="quote-table__subtotal">
            <td colspan="${cols - 1}">Sous-total ${escapeHtml(block.title)}</td>
            <td class="num">${formatEuroDetailed(block.total)}</td>
          </tr>`
        : "";
      return groupHeader + rows + subtotal;
    })
    .join("");

  return `
  <div class="quote-table-wrap">
    <table class="quote-table">
      <thead>
        <tr>
          <th class="col-designation">Désignation</th>
          <th class="num col-qty">Qté.</th>
          <th class="col-unit">Unité</th>
          <th class="num col-price">Prix U. HT</th>
          <th class="num col-tva">TVA</th>
          <th class="num col-total">Total HT</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

/** Bas de page Costructor — acompte + paiement à gauche, totaux à droite. */
export function renderClientSettlePanel({
  totalHT,
  paymentTerms,
  delayText,
  depositInfo,
  formatEuroDetailed,
  escapeHtml,
  isFacture = false,
  tvaRegime = "franchise",
}) {
  const tvaApplicable = tvaRegime === "reel";
  const tvaAmount = tvaApplicable ? Math.round(totalHT * 0.2 * 100) / 100 : 0;
  const totalTTC = tvaApplicable ? Math.round((totalHT + tvaAmount) * 100) / 100 : totalHT;
  const netLabel = isFacture ? "Net à payer" : "Net à payer";

  const depositBlock = depositInfo
    ? `<div class="settle-deposit">
        <div class="settle-deposit__label">Acompte</div>
        <div class="settle-deposit__value">${formatEuroDetailed(depositInfo.amount)} <span>(${depositInfo.pct} %) à la signature</span></div>
      </div>`
    : "";

  return `
  <section class="doc-settle" aria-label="Totaux et paiement">
    <div class="doc-settle__left">
      ${depositBlock}
      <div class="settle-pay">
        <div class="settle-pay__label">Modalités de paiement</div>
        <p>${escapeHtml(paymentTerms)}</p>
        <p class="settle-pay__delay">${escapeHtml(delayText)}</p>
      </div>
    </div>
    <div class="doc-settle__right">
      <div class="settle-rows">
        <div class="settle-row"><span>Total HT</span><strong>${formatEuroDetailed(totalHT)}</strong></div>
        <div class="settle-row"><span>${tvaApplicable ? "TVA 20 %" : "TVA"}</span><strong>${tvaApplicable ? formatEuroDetailed(tvaAmount) : "N/A"}</strong></div>
        ${tvaApplicable ? `<div class="settle-row"><span>Total TTC</span><strong>${formatEuroDetailed(totalTTC)}</strong></div>` : ""}
      </div>
      <div class="settle-net">
        <span>${netLabel}${tvaApplicable ? "" : " HT"}</span>
        <strong>${formatEuroDetailed(tvaApplicable ? totalTTC : totalHT)}</strong>
      </div>
      ${!tvaApplicable ? `<p class="settle-vat-note">TVA non applicable — art. 293 B du CGI</p>` : ""}
    </div>
  </section>`;
}

/** Récap montants uniquement — pas de barre ni % par nature de prestation. */
export function renderClientRecapTotals(blocks, totalHT, { formatEuroDetailed, escapeHtml, isFacture = false }) {
  const vatNote = "TVA non applicable — art. 293 B du CGI.";
  const label = isFacture ? "Net à payer HT" : "Total à régler HT";

  const breakdown =
    blocks.length > 1
      ? `<div class="quote-recap__rows">
          ${blocks
            .map(
              (block) => `
            <div class="quote-recap__row">
              <span>${escapeHtml(block.recapLabel)}</span>
              <strong>${formatEuroDetailed(block.total)}</strong>
            </div>`,
            )
            .join("")}
        </div>`
      : "";

  return `
  <section class="quote-recap" aria-label="Total du devis">
    ${breakdown}
    <div class="quote-recap__total">
      <div class="quote-recap__total-label">
        <span>${label}</span>
        <small>${vatNote}</small>
      </div>
      <strong>${formatEuroDetailed(totalHT)}</strong>
    </div>
  </section>`;
}

/** @deprecated — préférer renderClientRecapTotals (sans pourcentages). */
export function renderPremiumRecap(blocks, totalHT, helpers) {
  return renderClientRecapTotals(blocks, totalHT, helpers);
}

export function renderProRecapFromBlocks(blocks, { formatEuroDetailed, escapeHtml = (v) => String(v) }) {
  if (!blocks.length) return "";

  return blocks
    .map(
      (block) => `
      <div class="recap-row recap-row--${block.group}">
        <span class="recap-row__label">
          <span class="recap-row__num">${block.num}</span>
          ${escapeHtml(block.recapLabel)}
        </span>
        <strong>${formatEuroDetailed(block.total)}</strong>
      </div>`,
    )
    .join("");
}

/** @deprecated — ancien rendu tableau unique */
export function renderPdfSectionRows(items, helpers) {
  return renderProQuoteSections(items, helpers);
}

export function renderSectionRecapRows(sectionTotals, { formatEuroDetailed }) {
  let num = 0;
  return SECTION_DISPLAY_ORDER.filter((group) => sectionTotals[group] > 0)
    .map((group) => {
      num += 1;
      const label = getSectionRecapLabel(group);
      return `<div class="recap-row recap-row--${group}">
        <span class="recap-row__label">
          <span class="recap-row__num">${String(num).padStart(2, "0")}</span>
          ${label}
        </span>
        <strong>${formatEuroDetailed(sectionTotals[group])}</strong>
      </div>`;
    })
    .join("");
}
