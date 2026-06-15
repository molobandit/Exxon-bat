/** Types de lignes de devis (matériel, MO, frais annexes). */

export const FEE_LINE_TYPES = ["vehicule", "machine", "equipement", "frais"];

export const LINE_TYPE_LABELS = {
  fourniture: "Fourniture",
  mo: "Main d'œuvre",
  vehicule: "Véhicule & km",
  machine: "Location machine",
  equipement: "Équipement spécial",
  frais: "Frais divers",
};

export function isFeeLineType(type) {
  return FEE_LINE_TYPES.includes(type);
}

export function isMoLineType(type) {
  return type === "mo";
}

export function normalizeLineType(type) {
  if (type === "mo") return "mo";
  if (isFeeLineType(type)) return type;
  return "fourniture";
}

export function linePdfSection(type) {
  if (type === "mo") return "mo";
  if (type === "vehicule") return "travel";
  if (type === "machine" || type === "equipement") return "equipment";
  if (type === "frais") return "misc";
  return "materials";
}

export function matchesLineTypeFilter(itemType, filterType) {
  if (!filterType) return true;
  if (filterType === "frais") return isFeeLineType(itemType);
  return itemType === filterType;
}
