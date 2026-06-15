/**
 * Modèles véhicule, machine, équipement et frais — communs à tous les métiers.
 */

import { mergeTravelFeesIntoCatalog } from "./travel-fees.js";
import { IMAGE_SYNC_VERSION, resolvePrestationImageUrl } from "./prestation-images.js";
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const FEE_CATALOG_ITEMS = [
  {
    type: "vehicule",
    category: "Véhicule & déplacement",
    ref: "VEH-KM",
    designation: "Frais kilométriques véhicule",
    unit: "km",
    unitPriceHT: 1.2,
    purchaseCostHT: 0.65,
  },
  {
    type: "vehicule",
    category: "Véhicule & déplacement",
    ref: "VEH-DEP",
    designation: "Forfait dépannage / intervention de base",
    unit: "forfait",
    unitPriceHT: 65,
    purchaseCostHT: 35,
  },
  {
    type: "vehicule",
    category: "Véhicule & déplacement",
    ref: "VEH-JOUR",
    designation: "Frais de déplacement — journée",
    unit: "j",
    unitPriceHT: 45,
    purchaseCostHT: 25,
  },
  {
    type: "vehicule",
    category: "Véhicule & déplacement",
    ref: "VEH-PARK",
    designation: "Frais de stationnement / parking",
    unit: "forfait",
    unitPriceHT: 15,
    purchaseCostHT: 15,
  },
  {
    type: "machine",
    category: "Location machine",
    ref: "MAC-NAC",
    designation: "Location nacelle / élévateur",
    unit: "j",
    unitPriceHT: 220,
    purchaseCostHT: 150,
  },
  {
    type: "machine",
    category: "Location machine",
    ref: "MAC-MINI",
    designation: "Location mini-pelle / pelleteuse",
    unit: "j",
    unitPriceHT: 180,
    purchaseCostHT: 120,
  },
  {
    type: "machine",
    category: "Location machine",
    ref: "MAC-GEN",
    designation: "Location groupe électrogène",
    unit: "j",
    unitPriceHT: 95,
    purchaseCostHT: 60,
  },
  {
    type: "equipement",
    category: "Équipement spécial",
    ref: "EQP-ECH",
    designation: "Location échafaudage",
    unit: "forfait",
    unitPriceHT: 350,
    purchaseCostHT: 200,
  },
  {
    type: "equipement",
    category: "Équipement spécial",
    ref: "EQP-ASP",
    designation: "Location aspirateur eau / poussières",
    unit: "j",
    unitPriceHT: 55,
    purchaseCostHT: 35,
  },
  {
    type: "equipement",
    category: "Équipement spécial",
    ref: "EQP-DET",
    designation: "Location détecteur / appareil de mesure",
    unit: "j",
    unitPriceHT: 45,
    purchaseCostHT: 25,
  },
  {
    type: "frais",
    category: "Frais & divers",
    ref: "FRA-DOS",
    designation: "Frais de dossier / étude devis",
    unit: "forfait",
    unitPriceHT: 80,
    purchaseCostHT: 0,
  },
  {
    type: "frais",
    category: "Frais & divers",
    ref: "FRA-ADM",
    designation: "Frais administratifs / gestion",
    unit: "forfait",
    unitPriceHT: 35,
    purchaseCostHT: 0,
  },
  {
    type: "frais",
    category: "Frais & divers",
    ref: "FRA-PER",
    designation: "Frais d'accès difficile / périmètre",
    unit: "forfait",
    unitPriceHT: 120,
    purchaseCostHT: 0,
  },
];

/** Les 3 modes de facturation véhicule proposés au devis. */
export const VEHICLE_FEE_OPTIONS = ["VEH-KM", "VEH-DEP", "VEH-JOUR"];

export const FEE_QUICK_DEFAULTS = {
  vehicule: FEE_CATALOG_ITEMS.find((item) => item.ref === "VEH-KM"),
  machine: FEE_CATALOG_ITEMS.find((item) => item.ref === "MAC-NAC"),
  equipement: FEE_CATALOG_ITEMS.find((item) => item.ref === "EQP-ECH"),
  frais: FEE_CATALOG_ITEMS.find((item) => item.ref === "FRA-DOS"),
};

export function getFeeCatalogItems(profile = {}) {
  const base = FEE_CATALOG_ITEMS.map((item) => ({ ...item, country: "FR" }));
  return mergeTravelFeesIntoCatalog(base, profile).map((item) => ({
    ...item,
    country: "FR",
  }));
}

export function getFeeTemplateByRef(ref, profile = {}) {
  return getFeeCatalogItems(profile).find((item) => item.ref === ref) ?? null;
}

export function catalogItemForTrade(tradeType, template, country = "FR") {
  return {
    id: uid(),
    tradeType,
    source: "catalog",
    clientVisible: true,
    country: template.country ?? country,
    imageUrl: resolvePrestationImageUrl(tradeType, template.category, template.type, template.designation),
    imageSyncVersion: IMAGE_SYNC_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...template,
  };
}

export function ensureFeeCatalogForTrade(tradeType, existingRefs, profile = {}) {
  const country = profile.country ?? "FR";
  const added = [];
  for (const template of getFeeCatalogItems(profile)) {
    const ref = template.ref.trim().toUpperCase();
    if (existingRefs.has(ref)) continue;
    added.push(catalogItemForTrade(tradeType, template, country));
    existingRefs.add(ref);
  }
  return added;
}

const LEGACY_FEE_REF_MAP = {
  "VEH-FOR": "VEH-JOUR",
};

/** Met à jour les prix des frais catalogue déjà en bibliothèque. */
export function patchFeeCatalogPrices(list, tradeType, profile = {}) {
  let patched = 0;
  const country = profile.country ?? "FR";
  const catalog = getFeeCatalogItems(profile);
  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    if (entry.tradeType !== tradeType) continue;
    if ((entry.country ?? "FR") !== country) continue;
    const mappedRef = LEGACY_FEE_REF_MAP[entry.ref] || entry.ref;
    const template = catalog.find((item) => item.ref === mappedRef);
    if (!template) continue;
    if (
      entry.ref === mappedRef &&
      entry.unitPriceHT === template.unitPriceHT &&
      entry.purchaseCostHT === template.purchaseCostHT &&
      entry.designation === template.designation &&
      entry.unit === template.unit &&
      entry.category === template.category
    ) {
      continue;
    }
    list[i] = {
      ...entry,
      ref: mappedRef,
      designation: template.designation,
      unit: template.unit,
      category: template.category,
      type: template.type,
      unitPriceHT: template.unitPriceHT,
      purchaseCostHT: template.purchaseCostHT,
      updatedAt: new Date().toISOString(),
    };
    patched += 1;
  }
  return patched;
}
