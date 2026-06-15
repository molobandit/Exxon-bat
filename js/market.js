/**
 * Marché France — catalogue, devises et contenus.
 */

import { CATALOG_TRADES } from "./prestations-catalog.js";
import { BATIPRIX_TRADE } from "./batiprix-catalog.js";
import { getCountryProfile } from "./country-config.js";
import { formatMoney, formatHourly } from "./currency-format.js";

export function getActiveCountry() {
  return "FR";
}

export function itemCountry(item) {
  return item?.country ?? "FR";
}

export function matchesMarket(item) {
  if (!item) return false;
  return itemCountry(item) !== "CH";
}

export function getLibraryTradesForMarket() {
  return [...CATALOG_TRADES, BATIPRIX_TRADE];
}

export function isBatiprixEnabled() {
  return true;
}

export function isTradeAvailableInMarket(tradeType) {
  return getLibraryTradesForMarket().includes(tradeType);
}

export function formatProfileMoney(value, detailed = false) {
  return formatMoney(value, "FR", detailed);
}

export function formatProfileHourly(value) {
  return formatHourly(value, "FR");
}

export function getProfileCurrencySymbol() {
  return getCountryProfile("FR").symbol;
}
