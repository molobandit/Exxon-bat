import { getFullCompanyAddress } from "./storage.js";

function normalizeSiret(value = "") {
  return String(value).replace(/\s/g, "");
}

function hasContact(profile) {
  return Boolean(profile.companyPhone?.trim() || profile.companyEmail?.trim());
}

export const PROFILE_SECTIONS = [
  {
    id: "rentabilite",
    label: "Rentabilité",
    tab: "rentabilite",
    weight: 20,
    check: (p) => p.monthlyNet > 0 && p.monthlyHours > 0 && p.monthlyFixed >= 0,
  },
  {
    id: "identite",
    label: "Identité entreprise",
    tab: "entreprise",
    weight: 20,
    check: (p) => Boolean(p.companyName?.trim() && getFullCompanyAddress(p)),
  },
  {
    id: "legal",
    label: "Informations légales",
    tab: "entreprise",
    weight: 15,
    check: (p) => normalizeSiret(p.companySiret).length >= 14,
  },
  {
    id: "contact",
    label: "Coordonnées",
    tab: "entreprise",
    weight: 10,
    check: hasContact,
  },
  {
    id: "paiements",
    label: "Paiements & IBAN",
    tab: "devis",
    weight: 15,
    check: (p) => Boolean(p.companyIban?.replace(/\s/g, "").length >= 15),
  },
  {
    id: "devis",
    label: "Conditions devis",
    tab: "devis",
    weight: 10,
    check: (p) => Boolean(p.defaultPaymentTerms?.trim() && Number(p.quoteValidityDays) > 0),
  },
  {
    id: "metier",
    label: "Corps de métier",
    tab: "metier",
    weight: 10,
    check: (p) => Boolean(p.tradeType),
  },
];

export function computeProfileCompleteness(profile) {
  const sections = PROFILE_SECTIONS.map((section) => ({
    ...section,
    done: section.check(profile),
  }));

  const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0);
  const earned = sections.filter((s) => s.done).reduce((sum, s) => sum + s.weight, 0);
  const score = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;

  return { score, sections, doneCount: sections.filter((s) => s.done).length, total: sections.length };
}

export function getProfileStatusLabel(score) {
  if (score >= 90) return { label: "Profil expert", tone: "success" };
  if (score >= 70) return { label: "Profil avancé", tone: "good" };
  if (score >= 45) return { label: "Profil en cours", tone: "warning" };
  return { label: "Profil à compléter", tone: "danger" };
}
