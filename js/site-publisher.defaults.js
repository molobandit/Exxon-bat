/**
 * Identité légale affichée sur les pages mentions légales, CGU, confidentialité et RGPD.
 *
 * Après création de la SASU Exxon-bat, remplacez les champs marqués [À RENSEIGNER].
 * Fichier lié : docs/registre-traitements-rgpd.md
 */
export const DEFAULT_SITE_PUBLISHER = {
  // —— Société (SASU Exxon-bat) ——
  companyName: "Exxon-bat",
  companyLegalForm: "SASU",
  companyAddress: "[À RENSEIGNER] — adresse du siège social",
  companyPostalCode: "[À RENSEIGNER]",
  companyCity: "[À RENSEIGNER]",
  companyCountry: "France",
  companySiret: "[À RENSEIGNER — 14 chiffres]",
  companyRcs: "[À RENSEIGNER — ex. RCS Lyon]",
  companyTvaIntra: "[À RENSEIGNER — ex. FR12345678901]",
  companyApe: "5829C",
  companyCapital: "100 euros",
  companyPhone: "[À RENSEIGNER — tél. pro]",
  companyEmail: "contact@exxon-bat.com",
  companyWebsite: "https://www.exxon-bat.com",

  // —— Contacts RGPD & support ——
  privacyEmail: "privacy@exxon-bat.com",
  supportEmail: "support@exxon-bat.com",
  dpoName: "", // Non obligatoire pour une TPE SaaS — laisser vide

  // —— Prestataires (sous-traitants RGPD) ——
  hostingProvider: "Cloudflare, Inc.",
  hostingAddress: "CDN et hébergement statique — zone de traitement UE recommandée",
  paymentProvider: "Stripe Payments Europe Ltd.",
  paymentProviderAddress: "1 Grand Canal Street Lower, Dublin 2, Irlande",

  // —— Médiation consommation (B2C — artisans peuvent en bénéficier) ——
  mediatorName: "[À RENSEIGNER si adhésion à un médiateur]",
  mediatorUrl: "",

  // —— Application ——
  appName: "Exxon-bat",
  appDescription:
    "logiciel en ligne de devis, facturation, rentabilité, planning chantiers et métré terrain pour artisans du BTP",
};
