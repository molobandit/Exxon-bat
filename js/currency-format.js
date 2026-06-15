import { getCountryProfile } from "./country-config.js";

export function formatMoney(value, country = "FR", detailed = false) {
  const cfg = getCountryProfile(country);
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: cfg.currency,
    minimumFractionDigits: detailed ? 2 : 0,
    maximumFractionDigits: detailed ? 2 : 0,
  }).format(value);
}

export function formatHourly(value, country = "FR") {
  return `${formatMoney(value, country, true)}/h`;
}
