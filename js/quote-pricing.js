import { isFeeLineType, isMoLineType } from "./devis-line-types.js";
import { getLineEffectiveUnitPrice } from "./installation-difficulty.js";

/** Coefficient minimum matériel : prix client ≥ 2× coût fournisseur */
export const MATERIAL_MIN_MARKUP = 2;

function lineAmount(line) {
  const qty = Number(line.qty) || 0;
  const unitSell = getLineEffectiveUnitPrice(line);
  return qty * unitSell;
}

export function normalizeQuote(quote = {}) {
  const purchase =
    Number(quote.materialPurchaseCost ?? quote.materialCost) || 0;
  let sell = Number(quote.materialSellPrice);

  if (!Number.isFinite(sell) || sell < 0) {
    sell = purchase > 0 ? purchase * MATERIAL_MIN_MARKUP : 0;
  }

  return {
    ...quote,
    materialPurchaseCost: purchase,
    materialSellPrice: sell,
  };
}

export function getLaborSellTotal(quote) {
  const q = normalizeQuote(quote);
  if (hasDetailedLineItems(q)) {
    return getLaborTotalFromLineItems(q.lineItems);
  }
  return Math.max(q.price - q.materialSellPrice, 0);
}

export function getFeesTotalFromLineItems(lineItems = []) {
  return lineItems
    .filter((line) => isFeeLineType(line.type))
    .reduce((sum, line) => sum + lineAmount(line), 0);
}

export function getMaterialTotalFromLineItems(lineItems = []) {
  return lineItems
    .filter((line) => !isMoLineType(line.type) && !isFeeLineType(line.type))
    .reduce((sum, line) => sum + lineAmount(line), 0);
}

export function getMaterialMarkupRatio(quote) {
  const q = normalizeQuote(quote);
  if (q.materialPurchaseCost <= 0) return null;
  return q.materialSellPrice / q.materialPurchaseCost;
}

export function isMaterialMarkupOk(quote) {
  const ratio = getMaterialMarkupRatio(quote);
  if (ratio === null) return true;
  return ratio >= MATERIAL_MIN_MARKUP;
}

export function getSuggestedMaterialSellPrice(purchase) {
  const cost = Number(purchase) || 0;
  return cost > 0 ? cost * MATERIAL_MIN_MARKUP : 0;
}

export function getMaterialGrossMargin(quote) {
  const q = normalizeQuote(quote);
  return Math.max(q.materialSellPrice - q.materialPurchaseCost, 0);
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

export function getHoursFromLineItems(lineItems = []) {
  return lineItems
    .filter((line) => isMoLineType(line.type) && line.unit === "h")
    .reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
}

export function getHourlyLaborLines(lineItems = []) {
  return lineItems.filter((line) => isMoLineType(line.type) && line.unit === "h");
}

export function getLaborTotalFromLineItems(lineItems = []) {
  return lineItems
    .filter((line) => isMoLineType(line.type))
    .reduce((sum, line) => sum + lineAmount(line), 0);
}

export function hasLaborLineItems(lineItems = []) {
  return lineItems.some((line) => isMoLineType(line.type));
}

/**
 * Heures pour l'analyse : lignes MO en « h », sinon champ temps estimé du formulaire.
 */
export function getEffectiveHours(quote = {}, fallbackHours = 0) {
  if (!hasDetailedLineItems(quote)) {
    return Number(quote.hours) || 0;
  }
  const fromLines = getHoursFromLineItems(quote.lineItems);
  if (fromLines > 0) return roundMoney(fromLines);
  return Number(fallbackHours) || Number(quote.hours) || 0;
}

export function isQuoteReady(quote = {}, fallbackHours = 0) {
  const price = Number(quote.price) || 0;
  if (price <= 0) return false;

  if (hasDetailedLineItems(quote)) {
    return hasLaborLineItems(quote.lineItems) || getEffectiveHours(quote, fallbackHours) > 0;
  }

  return getEffectiveHours(quote, fallbackHours) > 0;
}

/** Prêt pour aperçu PDF / export — plus permissif que l'analyse rentabilité. */
export function isExportReady(quote = {}, fallbackHours = 0) {
  const price = Number(quote.price) || 0;
  if (price <= 0) return false;

  if (hasDetailedLineItems(quote)) {
    return true;
  }

  const hours = getEffectiveHours(quote, fallbackHours);
  return hours > 0;
}

/**
 * Recalcule prix total, heures MO et matériel à partir des lignes détaillées.
 */
export function rollupQuoteFromLineItems(lineItems = [], baseQuote = {}) {
  let price = 0;
  let materialPurchase = 0;
  let materialSell = 0;
  let hours = 0;

  for (const line of lineItems) {
    const qty = Number(line.qty) || 0;
    const unitSell = getLineEffectiveUnitPrice(line);
    const unitPurchase = Number(line.purchaseCostHT) || 0;
    const lineTotal = qty * unitSell;
    price += lineTotal;

    if (isMoLineType(line.type)) {
      if (line.unit === "h") hours += qty;
    } else if (!isFeeLineType(line.type)) {
      materialSell += lineTotal;
      materialPurchase += qty * unitPurchase;
    }
  }

  const hasLines = lineItems.length > 0;
  const hoursFromLines = roundMoney(hours);
  const manualHours = Number(baseQuote.hours) || 0;

  return normalizeQuote({
    ...baseQuote,
    lineItems,
    price: roundMoney(price),
    hours: hasLines
      ? hoursFromLines > 0
        ? hoursFromLines
        : manualHours
      : manualHours,
    materialPurchaseCost: roundMoney(materialPurchase),
    materialSellPrice: roundMoney(materialSell),
  });
}

export function hasDetailedLineItems(quote) {
  return Array.isArray(quote?.lineItems) && quote.lineItems.length > 0;
}
