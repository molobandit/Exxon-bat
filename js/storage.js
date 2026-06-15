const STORAGE_KEY = "exone-solution-profile-v3";

export const DEFAULT_PAYMENT_TERMS =
  "Acompte de 30 % à la commande — Solde à réception des travaux, par virement ou chèque.";

export const DEFAULT_PAYMENT_SCHEDULE = [
  { label: "Acompte à la commande", percent: 30, daysAfter: 0 },
  { label: "Solde à réception des travaux", percent: 70, daysAfter: 30 },
];

export const DEFAULT_PROFILE = {
  businessType: "micro",
  monthlyNet: 2500,
  monthlyFixed: 400,
  monthlyHours: 100,
  activityType: "bic",
  versementLiberatoire: false,
  chargeRate: 0.45,
  payrollLoaded: 8500,
  employeeCount: 2,
  overheadRate: 15,
  companyName: "",
  companyLegalForm: "",
  companyAddress: "",
  companyPostalCode: "",
  companyCity: "",
  companySiret: "",
  companyRcs: "",
  companyTvaIntra: "",
  companyApe: "",
  companyCapital: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  companyIban: "",
  companyBic: "",
  bankName: "",
  stripeCheckoutUrl: "",
  tvaRegime: "franchise",
  defaultVatRate: 20,
  defaultPaymentTerms: DEFAULT_PAYMENT_TERMS,
  defaultPaymentSchedule: DEFAULT_PAYMENT_SCHEDULE,
  quoteValidityDays: 30,
  insuranceRcPro: "",
  insuranceDecennale: "",
  legalFooterNote: "",
  syncLegalToSite: false,
  country: "FR",
  tradeType: "electricien",
  travelKmRate: 1.2,
  travelDepannageHT: 65,
  travelDayHT: 45,
  moHourlyRate: 48,
};

export function loadProfile() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_PROFILE };

  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw), country: "FR" };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profile, country: "FR" }));
}

export function isProfileComplete(profile) {
  return (
    profile.monthlyNet > 0 &&
    profile.monthlyHours > 0 &&
    (profile.businessType !== "tpe" || profile.payrollLoaded > 0)
  );
}

export function getDefaultPaymentTerms(profile = loadProfile()) {
  return profile.defaultPaymentTerms?.trim() || DEFAULT_PAYMENT_TERMS;
}

export function getQuoteValidityDays(profile = loadProfile()) {
  const days = Number(profile.quoteValidityDays);
  return days > 0 ? days : 30;
}

export function getFullCompanyAddress(profile = loadProfile()) {
  const street = profile.companyAddress?.trim() || "";
  const cpCity = [profile.companyPostalCode?.trim(), profile.companyCity?.trim()]
    .filter(Boolean)
    .join(" ");
  if (street && cpCity) return `${street}, ${cpCity}`;
  return street || cpCity || "";
}
