import { getUser } from "./auth.js";
import { hasPaidSubscription, isTrialActive } from "./trial.js";

export const PLAN_ORDER = ["devis", "pro", "business"];

/** Capacités encaissement — à partir de l'offre Pro (79,90 €) */
export const PAYMENT_CAPABILITIES = {
  tracking: {
    id: "tracking",
    label: "Suivi des paiements",
    minPlan: "pro",
  },
  deposits: {
    id: "deposits",
    label: "Gestion des acomptes",
    minPlan: "pro",
  },
  customTerms: {
    id: "customTerms",
    label: "Personnalisation des conditions de paiement",
    minPlan: "pro",
  },
  manualReminders: {
    id: "manualReminders",
    label: "Relances des impayés",
    minPlan: "pro",
  },
  installments: {
    id: "installments",
    label: "Multi-échéances",
    minPlan: "pro",
  },
  autoReminders: {
    id: "autoReminders",
    label: "Relance automatique des impayés",
    minPlan: "pro",
  },
  paymentLinks: {
    id: "paymentLinks",
    label: "Liens de paiement client (virement / acompte)",
    minPlan: "pro",
  },
};

export const PAYMENT_CAPABILITY_ORDER = [
  "tracking",
  "deposits",
  "paymentLinks",
  "customTerms",
  "manualReminders",
  "installments",
  "autoReminders",
];

function normalizePlanId(planId) {
  if (planId === "essentiel") return "pro";
  return planId;
}

function planTier(planId) {
  const index = PLAN_ORDER.indexOf(normalizePlanId(planId));
  return index === -1 ? 999 : index;
}

export function hasPaymentCapability(capabilityId) {
  const cap = PAYMENT_CAPABILITIES[capabilityId];
  if (!cap) return false;
  return planTier(getPlan().id) >= planTier(cap.minPlan);
}

export function getMinPlanForPaymentCapability(capabilityId) {
  const cap = PAYMENT_CAPABILITIES[capabilityId];
  if (!cap) return null;
  return PLANS[cap.minPlan] ?? null;
}

export function planHasPaymentCapability(planId, capabilityId) {
  const cap = PAYMENT_CAPABILITIES[capabilityId];
  if (!cap) return false;
  return planTier(planId) >= planTier(cap.minPlan);
}

export const PLANS = {
  devis: {
    id: "devis",
    name: "Devis & factures",
    tagline: "Devis et factures pro — simple et efficace",
    priceMonthly: 19.9,
    priceAnnual: 199,
    popular: false,
    profiles: ["micro"],
    features: [
      "Devis & factures PDF professionnels",
      "Bibliothèque BTP & Batiprix — ajout au devis",
      "Modalités de paiement standard sur PDF",
      "Personnalisation au nom de votre entreprise",
      "Historique des devis",
      "Mode hors connexion (PWA)",
      "1 utilisateur",
    ],
    modules: ["devis", "prestations"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "L'offre sérieuse — rentabilité, commercial & encaissements",
    priceMonthly: 79.9,
    priceAnnual: 799,
    popular: true,
    profiles: ["micro", "solo"],
    features: [
      "Calculateur de rentabilité illimité",
      "Suivi des paiements, acomptes & relances",
      "Multi-échéances & relances automatiques",
      "Gestion clients & prospects",
      "Bibliothèque BTP + ouvrages Batiprix intégrés",
      "Statistiques de ventes & export compta",
      "Avis clients & mode hors connexion",
      "1 utilisateur",
    ],
    modules: [
      "rentabilite",
      "devis",
      "avis",
      "paiements",
      "paiements_auto",
      "prestations",
      "clients",
      "statistiques",
      "comptabilite",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "TPE BTP avec équipe — chantier, métré & Gantt",
    priceMonthly: 99.9,
    priceAnnual: 999,
    popular: false,
    profiles: ["micro", "solo", "tpe"],
    features: [
      "Tout Pro inclus",
      "Gestion de chantiers & suivi temps réel",
      "Planning Gantt & tâches",
      "Métré terrain & espace employé",
      "Validation devis vs travaux réels",
      "Documents, photos & notes centralisés",
      "Profil TPE / PME avec salariés",
      "Multi-utilisateurs (jusqu'à 5)",
      "Campagnes d'appels & exports FEC",
    ],
    modules: [
      "rentabilite",
      "devis",
      "paiements",
      "paiements_auto",
      "clients",
      "statistiques",
      "comptabilite",
      "chantiers",
      "campagnes",
      "metre",
      "employes",
      "planning",
      "prestations",
      "avis",
    ],
  },
};

const PLAN_KEY = "exone-solution-plan";

export function getPlan() {
  const user = getUser();
  const stored = normalizePlanId(localStorage.getItem(PLAN_KEY) || "");

  if (user?.isDemo) {
    const demoPlan = stored && PLANS[stored] ? stored : "business";
    if (!stored || !PLANS[stored]) setPlan(demoPlan);
    return PLANS[demoPlan];
  }

  // Offre choisie sur la page Tarifs — prime sur l'essai Pro encore actif
  if (stored && PLANS[stored]) {
    return PLANS[stored];
  }

  if (user && isTrialActive(user)) {
    return PLANS.pro;
  }

  return PLANS.devis;
}

export function setPlan(planId) {
  const id = normalizePlanId(planId);
  if (PLANS[id]) {
    localStorage.setItem(PLAN_KEY, id);
  }
}

export function hasModule(moduleId) {
  return getPlan().modules.includes(moduleId);
}

/** Catalogue intégré : accessible à tout utilisateur connecté (offre Devis incluse). */
export function canUseLibraryCatalog() {
  return Boolean(getUser());
}

/** Import CSV, édition avancée, photos auto — offre Pro et supérieure. */
export function canManagePrestationsLibrary() {
  if (!getUser()) return false;
  if (getUser()?.isDemo) return true;
  return planTier(getPlan().id) >= planTier("pro");
}

export function getMinPlanForModule(moduleId) {
  if (moduleId === "paiements" || moduleId === "paiements_auto") {
    return getMinPlanForPaymentCapability(
      moduleId === "paiements_auto" ? "autoReminders" : "tracking",
    );
  }
  for (const planId of PLAN_ORDER) {
    if (PLANS[planId]?.modules.includes(moduleId)) return PLANS[planId];
  }
  return null;
}

export function requireModule(moduleId, redirectTo = "tarifs.html") {
  if (moduleId === "prestations") {
    if (canUseLibraryCatalog()) return true;
    window.location.href = `${redirectTo}?upgrade=${moduleId}`;
    return false;
  }
  if (!hasModule(moduleId)) {
    window.location.href = `${redirectTo}?upgrade=${moduleId}`;
    return false;
  }
  return true;
}

export function formatPrice(amount) {
  const hasDecimals = Math.abs(amount % 1) > 0.001;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(amount);
}
