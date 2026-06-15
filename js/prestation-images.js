/**
 * Pictogrammes produit SVG — correspondent au matériel (pas de photos stock).
 */

import { SVG_THUMBS } from "./prestation-svg-thumbs.js";

export const IMAGE_SYNC_VERSION = 5;

const TRADE_DEFAULT_KEY = {
  electricien: "prise",
  plombier: "robinet",
  chauffagiste: "clim",
  peintre: "peinture",
  carreleur: "carrelage",
  menuisier: "porte",
  plaquiste: "plaquiste",
  isolateur: "isolant",
  batiprix: "default",
  general: "default",
};

const PRODUCT_RULES = [
  { test: /prise|rj45|usb|ve type/i, key: "prise" },
  { test: /interrupteur|variateur|télérupteur|poussoir/i, key: "interrupteur" },
  { test: /disjoncteur|différentiel|differentiel/i, key: "disjoncteur" },
  { test: /tableau|porte.*modules|rail din/i, key: "tableau" },
  { test: /spot|dalle led|réglette|applique|luminaire|minuterie|détecteur|ecl-/i, key: "eclairage" },
  { test: /câble|cable|gaine|goulotte|boîte|boite/i, key: "cable" },
  { test: /robinet|mitigeur|mélangeur|melangeur/i, key: "robinet" },
  { test: /wc|lavabo|baignoire|douche|sanitaire|vasque|receveur|paroi/i, key: "sanitaire" },
  { test: /chauffe-eau|ballon thermo|ballon thermodynamique/i, key: "chauffeEau" },
  { test: /adoucisseur|surpresseur|disconnecteur|filtre à/i, key: "chauffeEau" },
  { test: /chaudière|chaudiere|poêle|poele|insert/i, key: "radiateur" },
  { test: /ddr|différentiel|differentiel|type ev|type a/i, key: "disjoncteur" },
  { test: /borne|wallbox|chargeur|recharge véhicule|recharge ve/i, key: "prise" },
  { test: /tableau pré|tableaux pré|pré-câblé|precable/i, key: "tableau" },
  { test: /gaine préfil|gaines préfil|prefil/i, key: "cable" },
  { test: /filerie|h07v|u1000 r2v|ro2v/i, key: "cable" },
  { test: /tube|per |pvc|cuivre|raccord|siphon|pipe|évacuation|evacuation|collier/i, key: "tube" },
  { test: /split|climatisation|unité int|unité ext|liaison frigo/i, key: "clim" },
  { test: /radiateur|convecteur|sèche-serviette/i, key: "radiateur" },
  { test: /pac |pompe à chaleur|pompe a chaleur/i, key: "clim" },
  { test: /vmc|ventilation|caisson/i, key: "clim" },
  { test: /thermostat|régulation|regulation|sonde/i, key: "radiateur" },
  { test: /peinture|acrylique|glycéro|glycero|façade|facede/i, key: "peinture" },
  { test: /toile de verre|papier peint|revêtement|enduit décor/i, key: "revetement" },
  { test: /pinceau|rouleau|scotch|bâche|abrasif|enduit lissage|colle|mastic/i, key: "peinture" },
  { test: /carrelage|faïence|faience|mosaïque|mosaique/i, key: "carrelage" },
  { test: /parquet|vinyle|lvt|sol pvc|caoutchouc/i, key: "parquet" },
  { test: /plinthe/i, key: "carrelage" },
  { test: /colle|joint|croisillon|ragréage/i, key: "carrelage" },
  { test: /porte|bloc-porte/i, key: "porte" },
  { test: /fenêtre|fenetre|menuiserie ext/i, key: "fenetre" },
  { test: /placard|dressing|verrière|étagère/i, key: "placard" },
  { test: /parquet massif|plancher bois/i, key: "parquet" },
  { test: /cloison|doublage|plaque ba/i, key: "plaquiste" },
  { test: /faux plafond|dalle acoustique|dalles minérales/i, key: "fauxPlafond" },
  { test: /rail|montant|suspente|vis ttpc|bande|enduit joint/i, key: "plaquiste" },
  { test: /laine|ouate|pir|pur |panneau isol|phonique|combles/i, key: "isolant" },
  { test: /pare-vapeur|membrane|film/i, key: "isolant" },
];

const CATEGORY_KEYS = {
  electricien: {
    Appareillage: "prise",
    Protection: "disjoncteur",
    "DDR & différentiels": "disjoncteur",
    "Tableau électrique": "tableau",
    "Tableaux pré-câblés": "tableau",
    "Recharge véhicule électrique": "prise",
    Éclairage: "eclairage",
    Câblage: "cable",
    Filerie: "cable",
    Canalisation: "cable",
    "Gaines préfilées": "cable",
    "Boîtes & encastrement": "cable",
    "Main d'œuvre": "mo",
  },
  plombier: {
    Robinetterie: "robinet",
    "Robinetterie pro": "robinet",
    Sanitaire: "sanitaire",
    "Sanitaires & équipements": "sanitaire",
    "Chauffe-eau": "chauffeEau",
    "Chauffe-eau & ECS": "chauffeEau",
    Canalisations: "tube",
    "Canalisations & tubes": "tube",
    Raccords: "tube",
    "Raccords & raccordement": "tube",
    Fixation: "tube",
    Accessoires: "robinet",
    Évacuation: "tube",
    "Évacuation & vidages": "tube",
    "Traitement de l'eau": "chauffeEau",
    Isolation: "tube",
    "Main d'œuvre": "mo",
  },
  chauffagiste: {
    Climatisation: "clim",
    "Climatisation splits": "clim",
    Chaudières: "radiateur",
    Chauffage: "radiateur",
    "Poêles & inserts": "radiateur",
    "Radiateurs & émetteurs": "radiateur",
    "Pompe à chaleur": "clim",
    Ventilation: "clim",
    "Ventilation & VMC": "clim",
    Régulation: "radiateur",
    "Liaisons frigorifiques": "clim",
    Fluides: "clim",
    "Vannes & régulation": "radiateur",
    "Hydraulique chauffage": "radiateur",
    Cuivre: "tube",
    "Réseau ventilation": "clim",
    "Pompe & circuit": "radiateur",
    Entretien: "clim",
    "Plancher chauffant": "radiateur",
    "Main d'œuvre": "mo",
  },
  peintre: {
    Peinture: "peinture",
    "Peintures pro": "peinture",
    "Revêtements muraux": "revetement",
    "Revêtements muraux pro": "revetement",
    Préparation: "peinture",
    "Enduits & préparation": "peinture",
    Outils: "peinture",
    "Outillage peintre pro": "peinture",
    Protection: "peinture",
    "Colles & mastics": "peinture",
    Ponçage: "peinture",
    "Main d'œuvre": "mo",
  },
  carreleur: {
    "Carrelage sol": "carrelage",
    "Carrelage & revêtements": "carrelage",
    "Faïence murale": "carrelage",
    "Faïence & mosaïque pro": "carrelage",
    Mosaïque: "carrelage",
    "Sols souples": "parquet",
    "Plinthes & profilés": "carrelage",
    "Profilés & finitions": "carrelage",
    "Colles & mortiers": "carrelage",
    "Colles & mortiers-colle": "carrelage",
    "Joints & finitions": "carrelage",
    "Joints & finitions carrelage": "carrelage",
    "Étanchéité carrelage": "carrelage",
    "Préparation support": "carrelage",
    "Outils & consommables": "carrelage",
    "Main d'œuvre": "mo",
  },
  menuisier: {
    "Portes intérieures": "porte",
    "Portes & blocs-portes": "porte",
    "Blocs-portes": "porte",
    "Fenêtres & menuiseries ext.": "fenetre",
    "Volets & fermetures": "fenetre",
    Agencements: "placard",
    "Agencements intérieurs": "placard",
    "Parquet & plancher bois": "parquet",
    "Parquet & sols bois": "parquet",
    Quincaillerie: "porte",
    "Fixations & consommables": "porte",
    "Main d'œuvre": "mo",
  },
  plaquiste: {
    "Plaques & cloisons": "plaquiste",
    "Plaques BA13 & cloisons": "plaquiste",
    "Cloisons sèches": "plaquiste",
    "Cloisons sèches pro": "plaquiste",
    Doublage: "plaquiste",
    "Faux plafonds": "fauxPlafond",
    "Faux plafonds pro": "fauxPlafond",
    "Trappes & accessoires": "fauxPlafond",
    "Ossature métallique": "plaquiste",
    Fixations: "plaquiste",
    "Bandes & enduits": "plaquiste",
    "Bandes & enduits placo": "plaquiste",
    "Main d'œuvre": "mo",
  },
  isolateur: {
    "Isolation murs & combles": "isolant",
    "Laines & fibres": "isolant",
    "Panneaux isolants": "isolant",
    "Panneaux isolants rigides": "isolant",
    "Isolation combles": "isolant",
    "Isolation combles & toiture": "isolant",
    "Isolation extérieure (ITE)": "isolant",
    "Isolation phonique": "isolant",
    "Isolation phonique pro": "isolant",
    "Films & membranes": "isolant",
    "Fixations & accessoires": "isolant",
    "Main d'œuvre": "mo",
  },
};

function matchProductKey(designation = "") {
  const text = String(designation);
  for (const rule of PRODUCT_RULES) {
    if (rule.test.test(text)) return rule.key;
  }
  return "";
}

export function resolveProductKey(tradeType, category, type = "fourniture", designation = "") {
  if (type === "mo") return "mo";
  if (["vehicule", "machine", "equipement", "frais"].includes(type)) return "default";

  const fromName = matchProductKey(designation);
  if (fromName) return fromName;

  return CATEGORY_KEYS[tradeType]?.[category] ?? TRADE_DEFAULT_KEY[tradeType] ?? "default";
}

export function imageUrlForProductKey(key) {
  return SVG_THUMBS[key] ?? SVG_THUMBS.default;
}

export function resolvePrestationImageUrl(tradeType, category, type = "fourniture", designation = "") {
  const key = resolveProductKey(tradeType, category, type, designation);
  return imageUrlForProductKey(key);
}

function isExternalImageUrl(url = "") {
  const value = String(url).trim();
  return value.startsWith("http://") || value.startsWith("https://");
}

export function hasUserPhoto(item) {
  if (!item) return false;
  const custom = item.imageUrl?.trim();
  if (!custom) return false;
  if (
    item.imageSource === "leroymerlin" ||
    item.imageSource === "auto" ||
    item.imageSource === "manual" ||
    item.source === "manual"
  ) {
    return true;
  }
  if (isExternalImageUrl(custom) || custom.startsWith("/images/")) return true;
  if (custom.startsWith("data:image/") && !custom.startsWith("data:image/svg")) {
    return true;
  }
  return false;
}

export function getPrestationImageUrl(item) {
  if (!item) return "";
  const custom = item.imageUrl?.trim();
  if (hasUserPhoto(item) && custom) return custom;
  return resolvePrestationImageUrl(
    item.tradeType,
    item.category,
    item.type,
    item.designation,
  );
}

export function catalogSyncImageUrl(entry) {
  if (!entry) return "";
  if (entry.imageSource === "leroymerlin" || entry.imageSource === "auto") {
    return entry.imageUrl?.trim() || "";
  }
  if (hasUserPhoto(entry)) return entry.imageUrl?.trim() || "";
  return resolvePrestationImageUrl(
    entry.tradeType,
    entry.category,
    entry.type,
    entry.designation,
  );
}

export function shouldSyncCatalogImage(item) {
  if (!item || item.source !== "catalog") return false;
  if (item.imageSource === "leroymerlin" || item.imageSource === "auto") return false;
  if (item.imageSyncVersion !== IMAGE_SYNC_VERSION) return true;
  return false;
}

export function renderRefThumb(imageUrl, { size = "md" } = {}) {
  const url = String(imageUrl || "").trim();
  const sizeClass = size === "sm" ? "ref-thumb--sm" : size === "lg" ? "ref-thumb--lg" : "";

  if (!url) {
    return `<span class="ref-thumb ref-thumb--placeholder ${sizeClass}" aria-hidden="true">📦</span>`;
  }

  const safe = url
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

  const isSvg = url.startsWith("data:image/svg");
  const fallback =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='14' fill='%23f1f5f9'/%3E%3Ctext x='60' y='72' text-anchor='middle' font-size='36'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";
  return `<img class="ref-thumb ${sizeClass}${isSvg ? " ref-thumb--svg" : ""}" src="${safe}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallback}';this.classList.add('ref-thumb--svg');" />`;
}
