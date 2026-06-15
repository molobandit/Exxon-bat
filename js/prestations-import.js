const COLUMN_ALIASES = {
  ref: ["ref", "reference", "référence", "code", "sku", "codeouvrage", "codebatiprix"],
  designation: [
    "designation",
    "désignation",
    "libelle",
    "libellé",
    "nom",
    "article",
    "ouvrage",
    "libelleouvrage",
  ],
  unit: ["unit", "unité", "unite", "u", "uniteouvrage"],
  unitpriceht: [
    "unitpriceht",
    "prixht",
    "prix ht",
    "prix_unitaire",
    "pu",
    "vente",
    "prixunitaireht",
    "prixunitaire",
    "montantht",
  ],
  purchasecostht: [
    "purchasecostht",
    "achatht",
    "achat ht",
    "coutachat",
    "coûtachat",
    "achat",
    "cout",
    "coût",
  ],
  category: ["category", "categorie", "catégorie", "famille", "rubrique", "lot", "chapitre"],
  type: ["type", "typ"],
  batiprixcode: ["batiprixcode", "codebatiprixcomplet", "nomenclature"],
  batiprixlot: ["batiprixlot", "corpsdetat", "corpsdetat", "lotbatiprix"],
};

function normalizeHeader(value = "") {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function detectSeparator(line) {
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return semicolons >= commas ? ";" : ",";
}

function mapHeaderIndex(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
        map[field] = index;
      }
    }
  });
  return map;
}

function parseNumber(value) {
  if (value == null || value === "") return 0;
  const normalized = String(value).replace(/\s/g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function parseType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (["mo", "maindoeuvre", "maindœuvre", "main", "labor"].includes(raw)) {
    return "mo";
  }
  if (["vehicule", "véhicule", "vehicle", "km"].includes(raw)) return "vehicule";
  if (["machine", "mac"].includes(raw)) return "machine";
  if (["equipement", "équipement", "equipment", "eqp"].includes(raw)) return "equipement";
  if (["frais", "fee", "fees", "divers"].includes(raw)) return "frais";
  return "fourniture";
}

/**
 * Import CSV / Excel (export CSV point-virgule).
 * Colonnes : ref;designation;unit;unitPriceHT;purchaseCostHT;category;type
 */
export function parsePrestationsCsv(text, tradeType) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { rows: [], errors: ["Fichier vide."] };
  }

  const separator = detectSeparator(lines[0]);
  const headers = lines[0].split(separator).map((cell) => cell.trim());
  const map = mapHeaderIndex(headers);
  const errors = [];

  if ((map.ref == null && map.batiprixcode == null) || map.designation == null) {
    return {
      rows: [],
      errors: [
        "Colonnes obligatoires manquantes : ref (ou code Batiprix) et désignation.",
      ],
    };
  }

  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(separator).map((cell) => cell.trim());
    const ref = (map.ref != null ? cells[map.ref] : "") || (map.batiprixcode != null ? cells[map.batiprixcode] : "") || "";
    const designation = cells[map.designation] ?? "";

    if (!ref && !designation) continue;

    if (!ref || !designation) {
      errors.push(`Ligne ${i + 1} : référence et désignation requises.`);
      continue;
    }

    const batiprixCode =
      map.batiprixcode != null ? cells[map.batiprixcode] || "" : "";
    const batiprixLot = map.batiprixlot != null ? cells[map.batiprixlot] || "" : "";
    const category =
      map.category != null ? cells[map.category] || "Import" : "Import";
    const isBatiprix =
      tradeType === "batiprix" ||
      /^BP-/i.test(ref) ||
      /^\d{2}\.\d{3}/.test(batiprixCode) ||
      /^\d{2}\.\d{3}/.test(ref) ||
      Boolean(batiprixLot);

    rows.push({
      tradeType,
      ref: isBatiprix && !/^BP-/i.test(ref) ? `BP-${ref.replace(/\./g, "-")}` : ref,
      designation,
      unit: map.unit != null ? cells[map.unit] || "u" : "u",
      unitPriceHT: map.unitpriceht != null ? parseNumber(cells[map.unitpriceht]) : 0,
      purchaseCostHT:
        map.purchasecostht != null ? parseNumber(cells[map.purchasecostht]) : 0,
      category,
      type: map.type != null ? parseType(cells[map.type]) : "fourniture",
      source: isBatiprix ? "batiprix" : "import",
      batiprixCode: batiprixCode || (isBatiprix ? ref.replace(/^BP-/, "").replace(/-/g, ".") : ""),
      batiprixLot,
    });
  }

  return { rows, errors };
}

export function buildCsvTemplate() {
  return [
    "ref;designation;unit;unitPriceHT;purchaseCostHT;category;type",
    "EX-PR-16A;Prise 16A 2P+T blanc;u;8.50;4.20;Appareillage;fourniture",
    "EX-CAB-2.5;Câble H07V-U 2.5 mm²;m;1.85;0.95;Câblage;fourniture",
    "MO-HEURE;Heure électricien;h;48.00;28.00;Main d'œuvre;mo",
  ].join("\n");
}

/** Modèle CSV compatible imports Batiprix (colonnes ouvrage). */
export function buildBatiprixCsvTemplate() {
  return [
    "batiprixCode;ref;designation;unit;unitPriceHT;purchaseCostHT;batiprixLot;category",
    "07.001;BP-07-001;Point lumineux encastré;u;95.00;58.00;Électricité & courants faibles;07 — Électricité & courants faibles",
    "05.003;BP-05-003;Pose WC suspendu + bâti-support;u;780.00;480.00;Plomberie & sanitaire;05 — Plomberie & sanitaire",
    "08.001;BP-08-001;Cloison BA13 sur ossature 48 mm;m²;42.00;26.00;Cloisons & plafonds;08 — Cloisons & plafonds",
  ].join("\n");
}
