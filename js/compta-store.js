const CATEGORIES_KEY = "exone-compta-categories";
const EXPENSES_KEY = "exone-compta-expenses";

export const DEFAULT_COMPTA_CATEGORIES = [
  { id: "ventes_prestations", kind: "income", group: "Recettes", label: "Ventes prestations (devis / factures)", icon: "🔧" },
  { id: "acomptes", kind: "income", group: "Recettes", label: "Acomptes encaissés", icon: "💰" },
  { id: "autres_produits", kind: "income", group: "Recettes", label: "Autres produits", icon: "➕" },
  { id: "materiaux", kind: "expense", group: "Achats", label: "Matériaux & fournitures", icon: "📦" },
  { id: "sous_traitance", kind: "expense", group: "Achats", label: "Sous-traitance", icon: "🤝" },
  { id: "location_materiel", kind: "expense", group: "Achats", label: "Location matériel", icon: "🏗️" },
  { id: "carburant", kind: "expense", group: "Frais", label: "Carburant & véhicule", icon: "⛽" },
  { id: "deplacement", kind: "expense", group: "Frais", label: "Frais de déplacement", icon: "🚐" },
  { id: "assurances", kind: "expense", group: "Frais", label: "Assurances & abonnements", icon: "🛡️" },
  { id: "outillage", kind: "expense", group: "Frais", label: "Outillage & petit matériel", icon: "🔩" },
  { id: "honoraires", kind: "expense", group: "Frais", label: "Honoraires (comptable, avocat…)", icon: "📑" },
  { id: "charges_sociales", kind: "expense", group: "Charges", label: "Cotisations URSSAF / charges sociales", icon: "🏛️" },
  { id: "salaires", kind: "expense", group: "Charges", label: "Salaires & charges patronales", icon: "👷" },
  { id: "charges_fixes", kind: "expense", group: "Charges", label: "Charges fixes (loyer, crédit…)", icon: "🏢" },
  { id: "divers", kind: "expense", group: "Frais", label: "Frais divers", icon: "📎" },
];

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getComptaCategories() {
  const custom = loadJson(CATEGORIES_KEY, []);
  const ids = new Set(DEFAULT_COMPTA_CATEGORIES.map((c) => c.id));
  return [
    ...DEFAULT_COMPTA_CATEGORIES,
    ...custom.filter((c) => c.custom && !ids.has(c.id)),
  ];
}

export function getCategoryById(id) {
  return getComptaCategories().find((c) => c.id === id) ?? null;
}

export function addCustomCategory({ label, kind = "expense", group = "Frais" }) {
  const trimmed = label?.trim();
  if (!trimmed) throw new Error("Libellé de catégorie requis.");

  const custom = loadJson(CATEGORIES_KEY, []);
  const entry = {
    id: `custom-${Date.now()}`,
    kind,
    group,
    label: trimmed,
    icon: kind === "income" ? "💶" : "📎",
    custom: true,
  };
  custom.push(entry);
  saveJson(CATEGORIES_KEY, custom);
  return entry;
}

export function getManualExpenses() {
  return loadJson(EXPENSES_KEY, []);
}

export function addManualExpense(payload) {
  const list = getManualExpenses();
  const entry = {
    id: `exp-${Date.now()}`,
    date: payload.date || new Date().toISOString().slice(0, 10),
    type: payload.type || "achat",
    categoryId: payload.categoryId || "divers",
    label: payload.label?.trim() || "Dépense",
    supplier: payload.supplier?.trim() || "",
    clientName: payload.clientName?.trim() || "",
    chantierId: payload.chantierId || "",
    devisId: payload.devisId || "",
    invoiceRef: payload.invoiceRef?.trim() || "",
    amountHT: Math.round((Number(payload.amountHT) || 0) * 100) / 100,
    vatRate: Number(payload.vatRate) || 20,
    paid: Boolean(payload.paid),
    notes: payload.notes?.trim() || "",
    source: "manual",
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  saveJson(EXPENSES_KEY, list.slice(0, 500));
  return entry;
}

export function updateManualExpense(id, patch) {
  const list = getManualExpenses();
  const index = list.findIndex((e) => e.id === id);
  if (index < 0) return null;
  list[index] = { ...list[index], ...patch };
  saveJson(EXPENSES_KEY, list);
  return list[index];
}

export function deleteManualExpense(id) {
  const list = getManualExpenses().filter((e) => e.id !== id);
  saveJson(EXPENSES_KEY, list);
}

export function computeVat(amountHT, vatRate = 20) {
  const ht = Number(amountHT) || 0;
  const rate = Number(vatRate) || 0;
  return Math.round(ht * (rate / 100) * 100) / 100;
}

export function computeTTC(amountHT, vatRate = 20) {
  return Math.round((Number(amountHT) + computeVat(amountHT, vatRate)) * 100) / 100;
}
