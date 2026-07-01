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
  companyAddress: "30 rue de Combes",
  companyPostalCode: "01710",
  companyCity: "Thoiry",
  companyCountry: "France",
  companySiret: "[À RENSEIGNER — après immatriculation Guichet unique]",
  companyRcs: "[À RENSEIGNER — ex. RCS Bourg-en-Bresse]",
  companyTvaIntra: "[À RENSEIGNER — après attribution]",
  companyApe: "5829C",
  companyCapital: "100 euros",
  companyPhone: "",
  companyEmail: "contact@exxon-bat.com",
  companyWebsite: "https://www.exxon-bat.com",

  // —— Contacts RGPD & support ——
  privacyEmail: "privacy@exxon-bat.com",
  supportEmail: "support@exxon-bat.com",
  dpoName: "", // Non obligatoire pour une TPE SaaS — laisser vide
  legalRepresentative: "Exon Chabani",
  legalRepresentativeRole: "Président",

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
