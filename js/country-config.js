/** Paramètres métier — France. */

export const COUNTRY_PROFILES = {
  FR: {
    code: "FR",
    label: "France",
    currency: "EUR",
    locale: "fr-FR",
    symbol: "€",
    defaultVatRate: 20,
    vatRates: [
      { value: 20, label: "20 %" },
      { value: 10, label: "10 %" },
      { value: 5.5, label: "5,5 %" },
      { value: 0, label: "0 %" },
    ],
    travelDefaults: { km: 1.2, depannage: 65, day: 45 },
    moHourlyDefault: 48,
    idLabel: "SIRET",
    idHint: "14 chiffres",
    legalForms: [
      "Micro-entreprise",
      "EI",
      "EURL",
      "SARL",
      "SASU",
      "SAS",
      "SA",
    ],
    businessLabels: {
      micro: "Micro-entreprise",
      solo: "Entrepreneur seul (EI, EURL, SASU)",
      tpe: "TPE / PME avec salariés",
    },
    socialLabel: "Cotisations URSSAF",
  },
};

export function getCountryProfile(country = "FR") {
  return COUNTRY_PROFILES.FR;
}

export function getCurrencyCode() {
  return getCountryProfile().currency;
}

export function applyCountryProfileDefaults(profile) {
  return { ...profile, country: "FR" };
}
