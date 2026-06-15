/**
 * Tests bibliothèque — node scripts/test-prestations.mjs
 */
import { generateTradeCatalog, CATALOG_TRADES } from "../js/prestations-catalog.js";
import { parsePrestationsCsv, buildCsvTemplate } from "../js/prestations-import.js";
import {
  filterLinesForClient,
  isClientVisibleLine,
} from "../js/client-quote-visibility.js";
import { shouldAutoFetchItem } from "../js/auto-image-fetch.js";
import {
  catalogSyncImageUrl,
  getPrestationImageUrl,
  hasUserPhoto,
  IMAGE_SYNC_VERSION,
  resolveProductKey,
} from "../js/prestation-images.js";
import {
  hasDetailedLineItems,
  rollupQuoteFromLineItems,
} from "../js/quote-pricing.js";
import { scorePrestationSearch } from "../js/prestation-search.js";

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const {
  ensureSeedForTrade,
  upsertPrestation,
  bulkImportPrestations,
  bulkApplyAutoImages,
  getPrestationsByTrade,
  findPrestationByRef,
  deletePrestation,
  searchPrestations,
} = await import("../js/data.js");

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const trade of CATALOG_TRADES) {
  const items = generateTradeCatalog(trade);
  assert(items.length >= 500, `${trade}: count ${items.length} (min 500)`);
  const refs = items.map((i) => i.ref);
  assert(refs.length === new Set(refs).size, `${trade}: duplicate refs`);
  const missingImages = items.filter((i) => !i.imageUrl?.startsWith("data:image/svg"));
  assert(missingImages.length === 0, `${trade}: ${missingImages.length} refs sans pictogramme SVG`);
  const badPrices = items.filter(
    (i) => i.type !== "mo" && i.purchaseCostHT > i.unitPriceHT && i.unitPriceHT > 0,
  );
  assert(badPrices.length === 0, `${trade}: ${badPrices.length} refs achat > vente`);
}

const seeded = ensureSeedForTrade("electricien");
assert(seeded >= 200, `seed electricien: ${seeded}`);
assert(getPrestationsByTrade("electricien").length >= 200, "library count");

const manual = upsertPrestation({
  tradeType: "electricien",
  ref: "TEST-MANUAL",
  designation: "Test manuel",
  unit: "u",
  unitPriceHT: 10,
  purchaseCostHT: 5,
});
assert(manual?.ref === "TEST-MANUAL", "manual upsert");

const updated = upsertPrestation({
  tradeType: "electricien",
  ref: "TEST-MANUAL",
  designation: "Test mis à jour",
  unitPriceHT: 12,
});
assert(updated?.designation === "Test mis à jour", "manual update");

const renamed = upsertPrestation({
  id: manual.id,
  tradeType: "electricien",
  ref: "TEST-MANUAL-2",
  designation: "Test renommé",
  unitPriceHT: 14,
  imageUrl: "data:image/jpeg;base64,abc",
  imageSource: "manual",
  source: "catalog",
});
assert(renamed?.ref === "TEST-MANUAL-2", "edit par id change ref");
assert(
  getPrestationsByTrade("electricien").filter((i) => i.id === manual.id).length === 1,
  "pas de doublon après changement ref",
);
assert(
  getPrestationImageUrl(renamed).startsWith("data:image/jpeg"),
  "photo manuelle catalogue affichée",
);
assert(findPrestationByRef("electricien", "TEST-MANUAL-2"), "find by ref case");

const clashRef = getPrestationsByTrade("electricien").find((i) => i.id !== renamed.id)?.ref;
assert(clashRef, "ref existante pour test doublon");
const duplicate = upsertPrestation({
  id: renamed.id,
  tradeType: "electricien",
  ref: clashRef,
  designation: "Doublon ref",
});
assert(duplicate === null, "ref dupliquée refusée à l'édition");

const { rows } = parsePrestationsCsv(buildCsvTemplate(), "peintre");
const imp = bulkImportPrestations(rows, "peintre");
assert(imp.added + imp.updated >= 3, "bulk import");

deletePrestation(manual.id);
assert(!findPrestationByRef("electricien", "TEST-MANUAL"), "delete");
assert(
  upsertPrestation({
    id: manual.id,
    tradeType: "electricien",
    ref: "TEST-GHOST",
    designation: "Fantôme",
  }) === null,
  "id supprimé refusé",
);

const rolled = rollupQuoteFromLineItems(
  [
    {
      ref: "MO",
      designation: "Heure",
      unit: "h",
      qty: 2,
      unitPriceHT: 40,
      purchaseCostHT: 22,
      type: "mo",
    },
    {
      ref: "F1",
      designation: "Fourniture",
      unit: "u",
      qty: 5,
      unitPriceHT: 20,
      purchaseCostHT: 10,
      type: "fourniture",
    },
  ],
  { jobName: "Chantier" },
);
assert(rolled.price === 180, `rollup price ${rolled.price}`);
assert(rolled.hours === 2, `rollup hours ${rolled.hours}`);
assert(rolled.materialSellPrice === 100, `material sell ${rolled.materialSellPrice}`);
assert(hasDetailedLineItems(rolled), "detailed lines");

const elecCatalog = generateTradeCatalog("electricien");
assert(
  !elecCatalog.some((item) => item.category === "Visserie & fixation"),
  "visserie retirée du catalogue",
);
assert(
  elecCatalog.some((item) => item.category === "Appareillage" && item.designation.includes("Prise")),
  "prises visibles catalogue",
);
const prise = elecCatalog.find((i) => i.designation.includes("Prise"));
const disj = elecCatalog.find((i) => i.designation.includes("Disjoncteur"));
const inter = elecCatalog.find((i) => i.designation.includes("Interrupteur"));
assert(prise && disj && inter, "échantillons élec");
assert(resolveProductKey(prise.tradeType, prise.category, prise.type, prise.designation) === "prise", "clé prise");
assert(resolveProductKey(disj.tradeType, disj.category, disj.type, disj.designation) === "disjoncteur", "clé disjoncteur");
assert(resolveProductKey(inter.tradeType, inter.category, inter.type, inter.designation) === "interrupteur", "clé interrupteur");
assert(
  getPrestationImageUrl(prise) !== getPrestationImageUrl(disj),
  "images différentes prise vs disjoncteur",
);
assert(
  getPrestationImageUrl(prise).startsWith("data:image/svg"),
  "pictogramme SVG prise catalogue",
);
assert(!hasUserPhoto(prise), "catalogue seed sans photo utilisateur");
assert(
  catalogSyncImageUrl({
    ...prise,
    imageUrl: "data:image/svg+xml,old",
    imageSyncVersion: 1,
  }).startsWith("data:image/svg"),
  "sync catalogue régénère le pictogramme",
);

const autoSample = {
  tradeType: "electricien",
  category: "Appareillage",
  type: "fourniture",
  designation: "Legrand — Prise 16A",
  imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Electrical_Outlet.jpg",
  imageSource: "auto",
  source: "catalog",
};
assert(
  getPrestationImageUrl(autoSample).startsWith("https://"),
  "photo auto affichée",
);
assert(!shouldAutoFetchItem(autoSample), "auto déjà importé ignoré");
assert(
  shouldAutoFetchItem({
    ...autoSample,
    imageSource: "",
    imageUrl: "data:image/svg+xml,test",
  }),
  "SVG catalogue éligible import auto",
);

const autoApplied = bulkApplyAutoImages("electricien", {
  interrupteur: "/images/prestations/test-inter.jpg",
});
assert(autoApplied > 0, `bulk auto images ${autoApplied}`);
const withAuto = getPrestationsByTrade("electricien").find(
  (item) => item.imageSource === "auto" && item.imageUrl.includes("test-inter"),
);
assert(withAuto, "référence interrupteur mise à jour");
assert(
  bulkApplyAutoImages("electricien", { interrupteur: "/images/prestations/test-inter.jpg" }) === 0,
  "re-import auto sans doublon",
);

const httpOnly = upsertPrestation({
  tradeType: "electricien",
  ref: "TEST-HTTP-IMG",
  designation: "Test URL http",
  imageUrl: "https://example.com/photo.jpg",
  source: "catalog",
});
assert(httpOnly && hasUserPhoto(httpOnly), "http affiché en bibliothèque");
assert(!shouldAutoFetchItem(httpOnly), "http hérité ignoré par import auto");
deletePrestation(httpOnly.id);

assert(IMAGE_SYNC_VERSION >= 5, "version sync images");
assert(
  !isClientVisibleLine(
    { type: "fourniture", category: "Boîtes & encastrement", designation: "Boîte simple" },
    "electricien",
  ),
  "boîte masquée client",
);
assert(
  isClientVisibleLine(
    { type: "fourniture", category: "Appareillage", designation: "Legrand — Prise 16A" },
    "electricien",
  ),
  "prise visible client",
);
assert(
  isClientVisibleLine(
    { type: "fourniture", category: "Éclairage", designation: "Spot LED encastré 12 W" },
    "electricien",
  ),
  "luminaire visible client",
);
assert(
  filterLinesForClient(
    [
      { type: "fourniture", category: "Câblage", designation: "Câble H07V-U" },
      { type: "fourniture", category: "Appareillage", designation: "Prise 16A" },
    ],
    "electricien",
  ).length === 1,
  "filtre client lignes",
);

const disjoncteur = elecCatalog.find((item) => item.designation.toLowerCase().includes("disjoncteur"));
assert(disjoncteur, "échantillon disjoncteur");
const disjoncteurText = `${disjoncteur.ref} ${disjoncteur.designation} ${disjoncteur.category}`.toLowerCase();

assert(scorePrestationSearch("disjoncteur", disjoncteurText, { ref: disjoncteur.ref }) >= 90, "recherche exacte");
assert(scorePrestationSearch("disjonct", disjoncteurText, { ref: disjoncteur.ref }) > 0, "recherche partielle");
assert(scorePrestationSearch("disjoncteure", disjoncteurText, { ref: disjoncteur.ref }) > 0, "recherche typo");
assert(
  searchPrestations({ tradeType: "electricien", query: "disjoncteure" }).some(
    (item) => item.ref === disjoncteur.ref,
  ),
  "fuzzy search disjoncteur typo",
);
assert(
  searchPrestations({ tradeType: "electricien", query: "prise legrand" }).some((item) =>
    item.designation.toLowerCase().includes("prise"),
  ),
  "recherche multi-mots",
);

for (const trade of ["carreleur", "menuisier", "plaquiste", "isolateur", "plombier", "chauffagiste", "peintre"]) {
  const items = generateTradeCatalog(trade);
  assert(items.length >= 500, `${trade}: count ${items.length}`);
  const refs = items.map((i) => i.ref);
  assert(refs.length === new Set(refs).size, `${trade}: duplicate refs`);
}

assert(
  isClientVisibleLine(
    { type: "fourniture", category: "Carrelage sol", designation: "Carrelage sol 60×60" },
    "carreleur",
  ),
  "carrelage visible client",
);
assert(
  !isClientVisibleLine(
    { type: "fourniture", category: "Colles & mortiers", designation: "Colle flexible C2" },
    "carreleur",
  ),
  "colle masquée client",
);
assert(
  isClientVisibleLine(
    { type: "fourniture", category: "Portes intérieures", designation: "Porte isoplane 83×204" },
    "menuisier",
  ),
  "porte visible client",
);
assert(
  isClientVisibleLine(
    { type: "fourniture", category: "Cloisons sèches", designation: "Cloison 70 mm" },
    "plaquiste",
  ),
  "cloison visible client",
);
assert(
  !isClientVisibleLine(
    { type: "fourniture", category: "Ossature métallique", designation: "Rail 48 long. 3 m" },
    "plaquiste",
  ),
  "ossature masquée client",
);
assert(
  isClientVisibleLine(
    { type: "fourniture", category: "Isolation combles", designation: "Soufflage ouate R=6" },
    "isolateur",
  ),
  "isolation combles visible client",
);
assert(
  isClientVisibleLine(
    { type: "fourniture", category: "Chauffe-eau", designation: "Chauffe-eau 200 L" },
    "plombier",
  ),
  "chauffe-eau visible client",
);
assert(
  !isClientVisibleLine(
    { type: "fourniture", category: "Liaisons frigorifiques", designation: "Liaison 10 m" },
    "chauffagiste",
  ),
  "liaison frigo masquée client",
);
assert(
  isClientVisibleLine(
    { type: "fourniture", category: "Ventilation", designation: "VMC double flux" },
    "chauffagiste",
  ),
  "vmc visible client",
);

if (failures.length) {
  console.error("ÉCHECS:\n" + failures.map((f) => `  ✕ ${f}`).join("\n"));
  process.exit(1);
}

console.log("✓ Tous les tests bibliothèque OK");
