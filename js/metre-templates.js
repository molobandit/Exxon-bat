export const COUNTRIES = {
  FR: { label: "France", currency: "EUR", symbol: "€" },
};

export const TRADES = {
  electricien: {
    label: "Électricité",
    materialRefLabel: "N° article",
    materialPlaceholder: "Câble, disjoncteur, prise…",
  },
  plombier: {
    label: "Plomberie / Sanitaire",
    materialRefLabel: "Réf. fournisseur",
    materialPlaceholder: "Tube PER, robinet, WC…",
  },
  chauffagiste: {
    label: "Chauffage / Climatisation",
    materialRefLabel: "Réf. fournisseur",
    materialPlaceholder: "Radiateur, vanne, chaudière…",
  },
  macon: {
    label: "Maçonnerie / Gros œuvre",
    materialRefLabel: "Réf.",
    materialPlaceholder: "Ciment, parpaing, fer…",
  },
  menuisier: {
    label: "Menuiserie / Charpente",
    materialRefLabel: "Réf.",
    materialPlaceholder: "Panneau, huisserie, quincaillerie…",
  },
  carreleur: {
    label: "Carrelage / Sols",
    materialRefLabel: "Réf.",
    materialPlaceholder: "Carrelage, faïence, parquet…",
  },
  plaquiste: {
    label: "Plâtrerie / Cloisons sèches",
    materialRefLabel: "Réf.",
    materialPlaceholder: "Plaque BA13, cloison, faux plafond…",
  },
  isolateur: {
    label: "Isolation thermique & phonique",
    materialRefLabel: "Réf.",
    materialPlaceholder: "Laine de verre, panneau PIR, combles…",
  },
  peintre: {
    label: "Peinture / Finitions",
    materialRefLabel: "Réf.",
    materialPlaceholder: "Peinture, enduit, toile de verre…",
  },
  general: {
    label: "Artisanat général",
    materialRefLabel: "Réf.",
    materialPlaceholder: "Fourniture, consommable…",
  },
};

export const WEEK_DAYS = [
  { key: "lu", label: "Lu" },
  { key: "ma", label: "Ma" },
  { key: "me", label: "Me" },
  { key: "je", label: "Je" },
  { key: "ve", label: "Ve" },
  { key: "sa", label: "Sa" },
  { key: "di", label: "Di" },
];

const TECHNICAL_SECTIONS = {
  controle_fr_elec: {
    id: "controle_fr",
    trades: ["electricien"],
    countries: ["FR"],
    title: "Contrôles électrique (France)",
    subtitle:
      "Points de contrôle avant mise en service",
    type: "checklist",
    items: [
      { key: "continuite_terre", label: "Continuité de la terre vérifiée" },
      { key: "differentiel", label: "Différentiel testé (30 mA)" },
      { key: "isolement", label: "Isolement conforme" },
      { key: "etiquetage", label: "Étiquetage tableau conforme" },
      { key: "mise_en_service", label: "Mise en service validée" },
    ],
  },
  controle_plombier: {
    id: "controle_plombier",
    trades: ["plombier", "chauffagiste"],
    countries: ["FR"],
    title: "Contrôles plomberie / chauffage",
    type: "checklist",
    items: [
      { key: "etancheite", label: "Étanchéité vérifiée (pression / fuite)" },
      { key: "debit", label: "Débit conforme" },
      { key: "evacuation", label: "Évacuation fonctionnelle" },
      { key: "mise_en_eau", label: "Mise en eau / chauffe validée" },
    ],
  },
  controle_macon: {
    id: "controle_macon",
    trades: ["macon", "carreleur"],
    countries: ["FR"],
    title: "Métré surfaces & volumes",
    type: "fields",
    fields: [
      { key: "surface_m2", label: "Surface traitée", suffix: "m²", type: "number" },
      { key: "volume_m3", label: "Volume / épaisseur", suffix: "m³", type: "number" },
      { key: "longueur_ml", label: "Longueur linéaire", suffix: "ml", type: "number" },
    ],
  },
  controle_menuisier: {
    id: "controle_menuisier",
    trades: ["menuisier"],
    countries: ["FR"],
    title: "Métré menuiserie",
    type: "fields",
    fields: [
      { key: "surface_m2", label: "Surface bois / panneaux", suffix: "m²", type: "number" },
      { key: "nb_elements", label: "Nombre d'éléments posés", suffix: "u", type: "number" },
      { key: "longueur_ml", label: "Linéaire", suffix: "ml", type: "number" },
    ],
  },
  controle_peintre: {
    id: "controle_peintre",
    trades: ["peintre"],
    countries: ["FR"],
    title: "Métré peinture",
    type: "fields",
    fields: [
      { key: "surface_m2", label: "Surface peinte", suffix: "m²", type: "number" },
      { key: "nb_couches", label: "Nombre de couches", suffix: "u", type: "number" },
      { key: "prep_surface", label: "Préparation surface (enduit, ponçage…)", suffix: "h", type: "number" },
    ],
  },
};

export function getMetreTemplate(trade = "general", country = "FR") {
  const tradeDef = TRADES[trade] ?? TRADES.general;
  const countryDef = COUNTRIES[country] ?? COUNTRIES.FR;

  const technicalSections = Object.values(TECHNICAL_SECTIONS).filter(
    (section) =>
      section.trades.includes(trade) && section.countries.includes(country),
  );

  const showCounterNumber = false;
  const showRsPm = false;

  return {
    trade,
    country,
    tradeLabel: tradeDef.label,
    countryLabel: countryDef.label,
    currency: countryDef.currency,
    currencySymbol: countryDef.symbol,
    bulletinTitle: "Bulletin de métré",
    materialRefLabel: tradeDef.materialRefLabel,
    materialPlaceholder: tradeDef.materialPlaceholder,
    technicalSections,
    showCounterNumber,
    showRsPm,
    showWeeklyHours: true,
    showLogistics: true,
    showWorkStatus: true,
  };
}

export function resolveMetreTemplate(chantier, profile) {
  const trade = chantier?.tradeType ?? profile?.tradeType ?? "general";
  const country = chantier?.country ?? profile?.country ?? "FR";
  return getMetreTemplate(trade, country);
}
