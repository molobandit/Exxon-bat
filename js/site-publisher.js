import { DEFAULT_SITE_PUBLISHER } from "./site-publisher.defaults.js";
import { loadProfile } from "./storage.js";

const SITE_PUBLISHER_KEY = "exone-site-publisher-v1";

export function loadSitePublisherOverrides() {
  try {
    const raw = localStorage.getItem(SITE_PUBLISHER_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SITE_PUBLISHER_KEY);
    return {};
  }
}

export function saveSitePublisherOverrides(data) {
  localStorage.setItem(SITE_PUBLISHER_KEY, JSON.stringify(data));
}

export function syncSitePublisherFromProfile(profile = loadProfile()) {
  const patch = {
    companyName: profile.companyName?.trim() || undefined,
    companyLegalForm: profile.companyLegalForm?.trim() || undefined,
    companyAddress: profile.companyAddress?.trim() || undefined,
    companyPostalCode: profile.companyPostalCode?.trim() || undefined,
    companyCity: profile.companyCity?.trim() || undefined,
    companySiret: profile.companySiret?.trim() || undefined,
    companyRcs: profile.companyRcs?.trim() || undefined,
    companyTvaIntra: profile.companyTvaIntra?.trim() || undefined,
    companyApe: profile.companyApe?.trim() || undefined,
    companyCapital: profile.companyCapital?.trim() || undefined,
    companyPhone: profile.companyPhone?.trim() || undefined,
    companyEmail: profile.companyEmail?.trim() || undefined,
    companyWebsite: profile.companyWebsite?.trim() || undefined,
    privacyEmail: profile.companyEmail?.trim() || undefined,
    supportEmail: profile.companyEmail?.trim() || undefined,
  };

  const cleaned = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined && value !== ""),
  );

  const current = loadSitePublisherOverrides();
  saveSitePublisherOverrides({ ...current, ...cleaned, updatedAt: new Date().toISOString() });
  return getLegalPublisher();
}

export function getLegalPublisher() {
  const overrides = loadSitePublisherOverrides();
  return { ...DEFAULT_SITE_PUBLISHER, ...overrides };
}

export function formatPublisherAddress(publisher = getLegalPublisher()) {
  const line = publisher.companyAddress?.trim();
  const cityLine = [publisher.companyPostalCode?.trim(), publisher.companyCity?.trim()]
    .filter(Boolean)
    .join(" ");
  const country = publisher.companyCountry?.trim();

  return [line, cityLine, country].filter(Boolean).join(", ");
}

export function formatPublisherIdentity(publisher = getLegalPublisher()) {
  const parts = [publisher.companyName?.trim()];
  if (publisher.companyLegalForm?.trim()) {
    parts[0] = `${parts[0]} (${publisher.companyLegalForm.trim()})`;
  }
  return parts.filter(Boolean).join(" ");
}

export function getPublisherContactEmail(publisher = getLegalPublisher(), kind = "support") {
  if (kind === "privacy") {
    return publisher.privacyEmail?.trim() || publisher.companyEmail?.trim() || DEFAULT_SITE_PUBLISHER.privacyEmail;
  }
  return publisher.supportEmail?.trim() || publisher.companyEmail?.trim() || DEFAULT_SITE_PUBLISHER.supportEmail;
}

export function getLegalUpdatedLabel() {
  const publisher = getLegalPublisher();
  if (publisher.updatedAt) {
    return new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    }).format(new Date(publisher.updatedAt));
  }
  return "juin 2026";
}
