import { prestationSearchText } from "./catalog-i18n.js";
import { rankPrestationSearch } from "./prestation-search.js";
import {
  BATIPRIX_TRADE,
  generateBatiprixCatalog,
  LIBRARY_TRADES,
} from "./batiprix-catalog.js";
import {
  CATALOG_TRADES,
  generateTradeCatalog,
} from "./prestations-catalog.js";
import { shouldAutoFetchItem } from "./auto-image-fetch.js";
import {
  catalogSyncImageUrl,
  getPrestationImageUrl,
  IMAGE_SYNC_VERSION,
  resolveProductKey,
  shouldSyncCatalogImage,
} from "./prestation-images.js";
import { normalizeLineType } from "./devis-line-types.js";
import { ensureFeeCatalogForTrade, patchFeeCatalogPrices } from "./devis-fee-templates.js";
import { getLibraryTradesForMarket, isBatiprixEnabled, isTradeAvailableInMarket, itemCountry, matchesMarket } from "./market.js";
import { loadProfile } from "./storage.js";

const CLIENTS_KEY = "exone-clients";
const CHANTIERS_KEY = "exone-chantiers";
const CAMPAGNES_KEY = "exone-campagnes";
const DEVIS_KEY = "exone-devis-history";
const DEVIS_COUNTER_KEY = "exone-devis-counter";
const FACTURE_COUNTER_KEY = "exone-facture-counter";
const EMPLOYEES_KEY = "exone-employees";
const METRES_KEY = "exone-metres";
const TASKS_KEY = "exone-tasks";
const ACTIVITIES_KEY = "exone-activities";
const DOCUMENTS_KEY = "exone-documents";
const PRESTATIONS_KEY = "exone-prestations-library";
const PRESTATIONS_PERSISTED_KEY = "exone-prestations-saved";
const CATALOG_SEED_VERSION = "fr-catalog-v4-runtime";
const CATALOG_SEED_KEY = "exone-catalog-seed-version";
const REVIEWS_KEY = "exone-client-reviews";
const ARTISAN_PUBLIC_KEY = "exone-artisan-public-profiles";

let persistedPrestationsCache = null;
let mergedLibraryCache = null;
/** Catalogue généré en mémoire — jamais écrit dans localStorage (trop volumineux pour iPhone). */
const runtimeCatalogByTrade = new Map();
/** Modifications temporaires du catalogue (session) — RAM uniquement, pas le téléphone. */
const catalogOverridesByKey = new Map();

function isRuntimeCatalogSource(source = "") {
  return (
    source === "catalog" ||
    source === "catalog-ch" ||
    source.startsWith("catalog") ||
    source === "batiprix"
  );
}

function prestationItemKey(item) {
  return `${item.tradeType}|${normalizePrestationRef(item.ref)}`;
}

function invalidatePrestationsCache() {
  mergedLibraryCache = null;
}

function isPersistedUserPrestation(item) {
  const src = item?.source ?? "";
  return src === "manual" || src === "import";
}

function scrubLibraryFromDeviceStorage() {
  try {
    localStorage.removeItem(PRESTATIONS_KEY);
    localStorage.removeItem("exone-wikimedia-image-cache-v1");
    window.ExoneStorageGuard?.freeExoneStorage?.();
    const raw = localStorage.getItem(PRESTATIONS_PERSISTED_KEY);
    if (!raw) return;
    if (raw.length > 300000) {
      localStorage.removeItem(PRESTATIONS_PERSISTED_KEY);
      persistedPrestationsCache = null;
      return;
    }
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) {
      localStorage.removeItem(PRESTATIONS_PERSISTED_KEY);
      persistedPrestationsCache = null;
      return;
    }
    const kept = list.filter(isPersistedUserPrestation);
    if (kept.length !== list.length) {
      try {
        localStorage.setItem(PRESTATIONS_PERSISTED_KEY, JSON.stringify(kept));
      } catch {
        localStorage.removeItem(PRESTATIONS_PERSISTED_KEY);
      }
      persistedPrestationsCache = null;
    }
  } catch {
    try {
      localStorage.removeItem(PRESTATIONS_KEY);
      localStorage.removeItem(PRESTATIONS_PERSISTED_KEY);
    } catch {
      /* ignore */
    }
    persistedPrestationsCache = null;
  }
}

function invalidateRuntimeCatalog(tradeType) {
  if (tradeType) runtimeCatalogByTrade.delete(tradeType);
  else runtimeCatalogByTrade.clear();
  mergedLibraryCache = null;
}

function setCatalogOverride(item) {
  catalogOverridesByKey.set(prestationItemKey(item), item);
  mergedLibraryCache = null;
}

function deleteCatalogOverrideById(id) {
  for (const [key, item] of catalogOverridesByKey) {
    if (item.id === id) {
      catalogOverridesByKey.delete(key);
      mergedLibraryCache = null;
      return true;
    }
  }
  return false;
}

/** Libère l'ancien stockage (~7 Mo) — suppression directe, sans lecture. */
export function purgeBloatedLibraryStorage() {
  try {
    localStorage.removeItem(PRESTATIONS_KEY);
  } catch {
    /* ignore */
  }
  persistedPrestationsCache = null;
  invalidateRuntimeCatalog();
  scrubLibraryFromDeviceStorage();
  return { freed: true, kept: load(PRESTATIONS_PERSISTED_KEY).length };
}

function loadPersistedPrestations() {
  if (persistedPrestationsCache) return persistedPrestationsCache;
  scrubLibraryFromDeviceStorage();
  persistedPrestationsCache = load(PRESTATIONS_PERSISTED_KEY).filter(isPersistedUserPrestation);
  return persistedPrestationsCache;
}

function savePersistedPrestations(list) {
  persistedPrestationsCache = list;
  mergedLibraryCache = null;
  save(PRESTATIONS_PERSISTED_KEY, list);
}

function savePrestationsLibrary(list) {
  const persisted = list.filter((item) => !isRuntimeCatalogSource(item.source));
  savePersistedPrestations(persisted);
}

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? [];
  } catch {
    return [];
  }
}

function save(key, data) {
  const payload = JSON.stringify(data);
  try {
    localStorage.setItem(key, payload);
    return;
  } catch (error) {
    if (error?.name !== "QuotaExceededError") throw error;

    window.ExoneStorageGuard?.freeExoneStorage?.();
    purgeBloatedLibraryStorage();

    try {
      localStorage.setItem(key, payload);
      return;
    } catch (retryError) {
      if (retryError?.name !== "QuotaExceededError") throw retryError;
      console.warn("[Exxon-bat] Stockage navigateur plein —", key);
      /* Pas d'alerte : le catalogue est en RAM ; seules les données métier comptent. */
    }
  }
}

export function getClients() {
  return load(CLIENTS_KEY);
}

export function getClientById(id) {
  return getClients().find((c) => c.id === id) ?? null;
}

export function updateClient(id, patch) {
  const clients = getClients();
  const index = clients.findIndex((c) => c.id === id);
  if (index < 0) return null;
  clients[index] = { ...clients[index], ...patch, updatedAt: new Date().toISOString() };
  save(CLIENTS_KEY, clients);
  return clients[index];
}

export function findOrCreateClient({
  name,
  firstName = "",
  email = "",
  phone = "",
  address = "",
  postalCode = "",
  city = "",
}) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) return null;

  const clients = getClients();
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedName = trimmedName.toLowerCase();

  let existing =
    (normalizedEmail &&
      clients.find((c) => c.email?.trim().toLowerCase() === normalizedEmail)) ||
    clients.find((c) => c.name?.trim().toLowerCase() === normalizedName);

  if (existing) {
    const patch = {};
    if (email && !existing.email) patch.email = email.trim();
    if (phone && !existing.phone) patch.phone = phone.trim();
    if (address && !existing.address) patch.address = address.trim();
    if (postalCode && !existing.postalCode) patch.postalCode = postalCode.trim();
    if (city && !existing.city) patch.city = city.trim();
    if (firstName && !existing.firstName) patch.firstName = firstName.trim();
    if (Object.keys(patch).length) return updateClient(existing.id, patch);
    return existing;
  }

  const entry = {
    name: trimmedName,
    firstName: firstName.trim(),
    email: email.trim(),
    phone: phone.trim(),
    address: address.trim(),
    postalCode: postalCode.trim(),
    city: city.trim(),
    status: "prospect",
    createdAt: new Date().toISOString(),
  };
  addClient(entry);
  return getClients().find((c) => c.name?.trim().toLowerCase() === normalizedName) ?? entry;
}

export function addClient(client) {
  const clients = getClients();
  const entry = {
    status: "prospect",
    createdAt: new Date().toISOString(),
    ...client,
    id: Date.now().toString(),
  };
  clients.push(entry);
  save(CLIENTS_KEY, clients);
  return entry;
}

const ACCESS_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateChantierAccessCode() {
  const year = new Date().getFullYear();
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix +=
      ACCESS_CODE_CHARS[
        Math.floor(Math.random() * ACCESS_CODE_CHARS.length)
      ];
  }
  return `CH-${year}-${suffix}`;
}

export function getChantiers() {
  return load(CHANTIERS_KEY);
}

export function ensureChantierAccessCodes() {
  const list = getChantiers();
  let changed = false;
  const updated = list.map((chantier) => {
    const patch = {};
    if (!chantier.accessCode) {
      patch.accessCode = generateChantierAccessCode();
      changed = true;
    }
    if (!chantier.tradeType) patch.tradeType = "general";
    if (!chantier.country) patch.country = "FR";
    return Object.keys(patch).length ? { ...chantier, ...patch } : chantier;
  });

  if (changed) save(CHANTIERS_KEY, updated);
  return updated;
}

export function addChantier(chantier) {
  const list = ensureChantierAccessCodes();
  list.push({
    ...chantier,
    id: Date.now().toString(),
    status: chantier.status ?? "en_cours",
    location: chantier.location ?? "",
    devisId: chantier.devisId ?? null,
    finalPrice: chantier.finalPrice ?? null,
    tradeType: chantier.tradeType ?? "general",
    country: chantier.country ?? "FR",
    accessCode: generateChantierAccessCode(),
  });
  save(CHANTIERS_KEY, list);
  return list;
}

export function getChantierByAccessCode(code) {
  const normalized = code.trim().toUpperCase();
  return (
    ensureChantierAccessCodes().find(
      (chantier) => chantier.accessCode?.toUpperCase() === normalized,
    ) ?? null
  );
}

export function getChantierById(id) {
  return getChantiers().find((c) => c.id === id) ?? null;
}

export function updateChantier(id, patch) {
  const list = getChantiers().map((c) =>
    c.id === id ? { ...c, ...patch } : c,
  );
  save(CHANTIERS_KEY, list);
  return list;
}

export function getCampagnes() {
  return load(CAMPAGNES_KEY);
}

export function addCampagne(campagne) {
  const list = getCampagnes();
  list.push({ ...campagne, id: Date.now().toString(), calls: 0 });
  save(CAMPAGNES_KEY, list);
  return list;
}

export function getDevisHistory() {
  return load(DEVIS_KEY);
}

/** Devis / factures officiellement imprimés (historique client). */
let devisHistoryMigrated = false;

export function getPrintedDevisHistory() {
  if (!devisHistoryMigrated) {
    migrateDevisHistory();
    devisHistoryMigrated = true;
  }
  return getDevisHistory().filter(
    (item) => item.printedAt || item.devisNumber || item.docNumber,
  );
}

/** Supprime les brouillons auto-sauvegardés ; marque les anciens numérotés comme imprimés. */
export function migrateDevisHistory() {
  const list = getDevisHistory();
  const cleaned = list
    .filter((item) => item.printedAt || item.devisNumber || item.docNumber)
    .map((item) => ({
      ...item,
      lifecycleStatus: "printed",
      printedAt: item.printedAt || item.date,
      devisNumber: item.devisNumber || item.docNumber || null,
      docNumber: item.docNumber || item.devisNumber || null,
    }));
  if (JSON.stringify(cleaned) !== JSON.stringify(list)) {
    save(DEVIS_KEY, cleaned.slice(0, 50));
  }
  return cleaned;
}

export function updateDevisRecord(id, patch) {
  const list = getDevisHistory();
  const index = list.findIndex((entry) => entry.id === id);
  if (index < 0) return null;
  list[index] = { ...list[index], ...patch };
  save(DEVIS_KEY, list);
  return list[index];
}

export function markDevisCommercialValidated(id) {
  return updateDevisRecord(id, { commercialValidatedAt: new Date().toISOString() });
}

export function upsertPrintedDevisRecord(record) {
  const docNumber = record.devisNumber || record.docNumber;
  const documentType = record.documentType === "facture" ? "facture" : "devis";
  const printedAt = new Date().toISOString();
  const payload = {
    ...record,
    devisNumber: docNumber,
    docNumber,
    documentType,
    lifecycleStatus: "printed",
    printedAt,
  };

  if (docNumber) {
    const existing = getDevisHistory().find(
      (entry) =>
        (entry.devisNumber || entry.docNumber) === docNumber &&
        (entry.documentType || "devis") === documentType,
    );
    if (existing) {
      return updateDevisRecord(existing.id, payload);
    }
  }

  return addDevisRecord(payload);
}

function readDevisCounter(year = new Date().getFullYear()) {
  try {
    const parsed = JSON.parse(localStorage.getItem(DEVIS_COUNTER_KEY));
    if (parsed?.year === year) return parsed.count ?? 0;
  } catch {
    /* ignore */
  }
  return 0;
}

export function peekNextDevisNumber() {
  const year = new Date().getFullYear();
  const next = readDevisCounter(year) + 1;
  return `DEV-${year}-${String(next).padStart(3, "0")}`;
}

export function commitNextDevisNumber() {
  const year = new Date().getFullYear();
  const counter = readDevisCounter(year) + 1;
  localStorage.setItem(
    DEVIS_COUNTER_KEY,
    JSON.stringify({ year, count: counter }),
  );
  return `DEV-${year}-${String(counter).padStart(3, "0")}`;
}

function readFactureCounter(year = new Date().getFullYear()) {
  try {
    const parsed = JSON.parse(localStorage.getItem(FACTURE_COUNTER_KEY));
    if (parsed?.year === year) return parsed.count ?? 0;
  } catch {
    /* ignore */
  }
  return 0;
}

export function peekNextFactureNumber() {
  const year = new Date().getFullYear();
  const next = readFactureCounter(year) + 1;
  return `FAC-${year}-${String(next).padStart(3, "0")}`;
}

export function commitNextFactureNumber() {
  const year = new Date().getFullYear();
  const counter = readFactureCounter(year) + 1;
  localStorage.setItem(
    FACTURE_COUNTER_KEY,
    JSON.stringify({ year, count: counter }),
  );
  return `FAC-${year}-${String(counter).padStart(3, "0")}`;
}

export function peekNextDocumentNumber(documentType = "devis") {
  return documentType === "facture" ? peekNextFactureNumber() : peekNextDevisNumber();
}

export function commitNextDocumentNumber(documentType = "devis") {
  return documentType === "facture" ? commitNextFactureNumber() : commitNextDevisNumber();
}

/** @deprecated Préférer peekNextDevisNumber + commitNextDevisNumber */
export function getNextDevisNumber() {
  return commitNextDevisNumber();
}

export function addDevisRecord(record) {
  const list = getDevisHistory();
  const entry = {
    ...record,
    id: Date.now().toString(),
    date: new Date().toISOString(),
  };
  list.unshift(entry);
  save(DEVIS_KEY, list.slice(0, 50));
  return entry;
}

export function getDevisById(id) {
  return getDevisHistory().find((d) => d.id === id) ?? null;
}

export function getSalesStats() {
  const devis = getPrintedDevisHistory();
  const clients = getClients();
  const totalCA = devis.reduce((s, d) => s + (d.price || 0), 0);
  const totalMarge = devis.reduce((s, d) => s + (d.margin || 0), 0);
  const rentables = devis.filter((d) => d.status === "success").length;

  return {
    totalCA,
    totalMarge,
    devisCount: devis.length,
    clientsCount: clients.length,
    tauxRentabilite: devis.length ? Math.round((rentables / devis.length) * 100) : 0,
    devis,
  };
}

export function getEmployees() {
  return load(EMPLOYEES_KEY);
}

export function addEmployee(employee) {
  const list = getEmployees();
  const entry = {
    ...employee,
    id: Date.now().toString(),
    active: true,
    createdAt: new Date().toISOString(),
  };
  list.push(entry);
  save(EMPLOYEES_KEY, list);
  return entry;
}

export function getEmployeeByCode(code) {
  const normalized = code.trim().toUpperCase();
  return (
    getEmployees().find(
      (e) => e.active && e.code?.toUpperCase() === normalized,
    ) ?? null
  );
}

export function getNextEmployeeCode() {
  const count = getEmployees().length + 1;
  return `EMP-${String(count).padStart(3, "0")}`;
}

export function getMetres() {
  return load(METRES_KEY);
}

export function addMetre(metre) {
  const list = getMetres();
  const entry = {
    ...metre,
    id: Date.now().toString(),
    status: metre.status ?? "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.unshift(entry);
  save(METRES_KEY, list);
  return entry;
}

export function updateMetre(id, patch) {
  const list = getMetres().map((m) =>
    m.id === id
      ? { ...m, ...patch, updatedAt: new Date().toISOString() }
      : m,
  );
  save(METRES_KEY, list);
  return list.find((m) => m.id === id) ?? null;
}

export function getMetreById(id) {
  return getMetres().find((m) => m.id === id) ?? null;
}

export function getMetresByChantier(chantierId) {
  return getMetres().filter((m) => m.chantierId === chantierId);
}

export function getMetresByEmployee(employeeId) {
  return getMetres().filter((m) => m.employeeId === employeeId);
}

export function getTasks() {
  return load(TASKS_KEY);
}

export function getTasksByChantier(chantierId) {
  return getTasks().filter((t) => t.chantierId === chantierId);
}

export function addTask(task) {
  const list = getTasks();
  const entry = {
    ...task,
    id: Date.now().toString(),
    progress: task.progress ?? 0,
    status: task.status ?? "todo",
    createdAt: new Date().toISOString(),
  };
  list.push(entry);
  save(TASKS_KEY, list);
  return entry;
}

export function updateTask(id, patch) {
  const list = getTasks().map((t) => (t.id === id ? { ...t, ...patch } : t));
  save(TASKS_KEY, list);
  return list.find((t) => t.id === id) ?? null;
}

export function deleteTask(id) {
  save(
    TASKS_KEY,
    getTasks().filter((t) => t.id !== id),
  );
}

export function getActivities() {
  return load(ACTIVITIES_KEY);
}

export function getActivitiesByChantier(chantierId) {
  return getActivities()
    .filter((a) => a.chantierId === chantierId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function addActivity(activity) {
  const list = getActivities();
  const entry = {
    ...activity,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  save(ACTIVITIES_KEY, list.slice(0, 200));
  return entry;
}

export function getDocuments() {
  return load(DOCUMENTS_KEY);
}

export function getDocumentsByChantier(chantierId) {
  return getDocuments()
    .filter((d) => d.chantierId === chantierId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function addDocument(doc) {
  const list = getDocuments();
  const entry = {
    ...doc,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  save(DOCUMENTS_KEY, list);
  return entry;
}

export function deleteDocument(id) {
  save(
    DOCUMENTS_KEY,
    getDocuments().filter((d) => d.id !== id),
  );
}

function normalizePrestationRef(ref = "") {
  return String(ref).trim().toUpperCase();
}

function isVisibleInMarket(item) {
  if (!item || item.tradeType === undefined) return false;
  return matchesMarket(item);
}

function buildRuntimeCatalogForTrade(tradeType) {
  if (runtimeCatalogByTrade.has(tradeType)) {
    return runtimeCatalogByTrade.get(tradeType);
  }

  const profile = loadProfile();
  const country = "FR";
  let items = [];

  if (tradeType === BATIPRIX_TRADE) {
    if (isBatiprixEnabled()) {
      items = generateBatiprixCatalog().map((item) => ({ ...item, source: "batiprix" }));
    }
  } else if (isTradeAvailableInMarket(tradeType)) {
    try {
      const deprecated = DEPRECATED_CATALOG_CATEGORIES[tradeType] || [];
      const catalog = generateTradeCatalog(tradeType, { moHourlyRate: profile.moHourlyRate }).filter(
        (item) => !deprecated.includes(item.category),
      );
      const existingRefs = new Set();

      for (const item of catalog) {
        const ref = normalizePrestationRef(item.ref);
        if (existingRefs.has(ref)) continue;
        existingRefs.add(ref);
        items.push({
          ...item,
          source: item.source?.startsWith("catalog") ? item.source : "catalog",
          country: item.country ?? country,
        });
      }

      for (const feeItem of ensureFeeCatalogForTrade(tradeType, existingRefs, { ...profile, country })) {
        items.push(feeItem);
      }

      patchFeeCatalogPrices(items, tradeType, { ...profile, country });

      for (let i = 0; i < items.length; i += 1) {
        const entry = items[i];
        if (entry.source !== "catalog" && entry.source !== "catalog-ch") continue;
        if (!matchesMarket(entry)) continue;
        if (!shouldSyncCatalogImage(entry)) continue;
        items[i] = {
          ...entry,
          imageUrl: catalogSyncImageUrl(entry),
          imageSyncVersion: IMAGE_SYNC_VERSION,
        };
      }
    } catch (error) {
      console.error(`[Exxon-bat] Catalogue ${tradeType} indisponible`, error);
      items = [];
    }
  }

  runtimeCatalogByTrade.set(tradeType, items);
  return items;
}

function mergePrestationsLibrary() {
  const custom = loadPersistedPrestations();
  const merged = [...custom];
  const seen = new Set(custom.map(prestationItemKey));

  for (const trade of getLibraryTradesForMarket()) {
    for (const item of buildRuntimeCatalogForTrade(trade)) {
      const key = prestationItemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(catalogOverridesByKey.get(key) ?? item);
    }
  }

  for (const item of catalogOverridesByKey.values()) {
    if (!seen.has(prestationItemKey(item))) merged.push(item);
  }

  return merged;
}

export function getPrestationsLibrary() {
  if (mergedLibraryCache) return mergedLibraryCache;
  mergedLibraryCache = mergePrestationsLibrary();
  return mergedLibraryCache;
}

export function getPrestationById(id) {
  return getPrestationsLibrary().find((item) => item.id === id) ?? null;
}

export function getPrestationsByTrade(tradeType) {
  if (!isTradeAvailableInMarket(tradeType)) return [];
  return getPrestationsLibrary().filter(
    (item) => item.tradeType === tradeType && itemCountry(item) !== "CH",
  );
}

export function findPrestationByRef(tradeType, ref) {
  const normalized = normalizePrestationRef(ref);
  return (
    getPrestationsLibrary().find(
      (item) =>
        item.tradeType === tradeType &&
        normalizePrestationRef(item.ref) === normalized &&
        itemCountry(item) !== "CH",
    ) ?? null
  );
}

export function upsertPrestation(entry) {
  const now = new Date().toISOString();
  const payload = {
    id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    tradeType: entry.tradeType,
    category: entry.category?.trim() || "Divers",
    ref: String(entry.ref || "").trim(),
    designation: String(entry.designation || "").trim(),
    unit: entry.unit?.trim() || "u",
    unitPriceHT: Math.round((Number(entry.unitPriceHT) || 0) * 100) / 100,
    purchaseCostHT: Math.round((Number(entry.purchaseCostHT) || 0) * 100) / 100,
    type: normalizeLineType(entry.type),
    imageUrl: String(entry.imageUrl || "").trim(),
    imageSource: entry.imageSource || "",
    lmProductUrl: String(entry.lmProductUrl || "").trim(),
    source: entry.source || "manual",
    batiprixCode: String(entry.batiprixCode || "").trim(),
    batiprixLot: String(entry.batiprixLot || "").trim(),
    country: entry.country ?? "FR",
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };

  if (!payload.imageUrl) {
    payload.imageUrl = getPrestationImageUrl(payload);
  }

  if (!payload.tradeType || !payload.ref || !payload.designation) {
    return null;
  }

  const sameMarketRef = (item) =>
    item.tradeType === payload.tradeType &&
    normalizePrestationRef(item.ref) === normalizePrestationRef(payload.ref) &&
    matchesMarket(item);

  const existing = entry.id ? getPrestationById(entry.id) : getPrestationsLibrary().find(sameMarketRef);

  if (isRuntimeCatalogSource(payload.source) || isRuntimeCatalogSource(existing?.source)) {
    const merged = getPrestationsLibrary();
    const base =
      (entry.id && merged.find((item) => item.id === entry.id)) ||
      merged.find(sameMarketRef) ||
      payload;

    const clash = merged.find(
      (item) =>
        item.id !== base.id &&
        item.tradeType === payload.tradeType &&
        normalizePrestationRef(item.ref) === normalizePrestationRef(payload.ref) &&
        matchesMarket(item),
    );
    if (clash) return null;

    const saved = {
      ...base,
      ...payload,
      id: base.id || payload.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };

    const persisted = loadPersistedPrestations().filter(
      (item) => item.id !== saved.id && !sameMarketRef(item),
    );
    savePersistedPrestations(persisted);
    setCatalogOverride(saved);
    return saved;
  }

  const list = loadPersistedPrestations();

  const index = entry.id
    ? list.findIndex((item) => item.id === entry.id)
    : list.findIndex(sameMarketRef);

  if (entry.id && index < 0) return null;

  const duplicate = list.findIndex(
    (item, idx) => idx !== index && sameMarketRef(item),
  );
  if (duplicate >= 0) return null;

  if (index >= 0) {
    list[index] = {
      ...list[index],
      ...payload,
      id: list[index].id,
      createdAt: list[index].createdAt,
    };
  } else {
    list.push(payload);
  }

  savePersistedPrestations(list);
  return index >= 0 ? list[index] : list[list.length - 1];
}

export function bulkImportPrestations(rows, tradeType) {
  const list = loadPersistedPrestations();
  const market = "FR";
  let added = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const ref = String(row.ref || "").trim();
    const designation = String(row.designation || "").trim();
    if (!ref || !designation) continue;

    const index = list.findIndex(
      (item) =>
        item.tradeType === tradeType &&
        normalizePrestationRef(item.ref) === normalizePrestationRef(ref) &&
        matchesMarket(item),
    );

    const payload = {
      id:
        index >= 0
          ? list[index].id
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      tradeType,
      category: row.category?.trim() || "Import",
      ref,
      designation,
      unit: row.unit?.trim() || "u",
      unitPriceHT: Math.round((Number(row.unitPriceHT) || 0) * 100) / 100,
      purchaseCostHT: Math.round((Number(row.purchaseCostHT) || 0) * 100) / 100,
      type: normalizeLineType(row.type),
      source: row.source || (tradeType === BATIPRIX_TRADE ? "batiprix" : "import"),
      batiprixCode: row.batiprixCode?.trim() || "",
      batiprixLot: row.batiprixLot?.trim() || "",
      country: market,
      createdAt: index >= 0 ? list[index].createdAt : now,
      updatedAt: now,
    };

    if (index >= 0) {
      list[index] = { ...list[index], ...payload };
      updated += 1;
    } else {
      list.push(payload);
      added += 1;
    }
  }

  savePersistedPrestations(list);
  return {
    added,
    updated,
    total: list.filter(
      (item) => item.tradeType === tradeType && matchesMarket(item),
    ).length,
  };
}

export function deletePrestation(id) {
  if (deleteCatalogOverrideById(id)) return;
  savePersistedPrestations(loadPersistedPrestations().filter((item) => item.id !== id));
  mergedLibraryCache = null;
}

export function searchPrestations({ tradeType, query = "", category = "", type = "" }) {
  let items = getPrestationsByTrade(tradeType).filter((item) => {
    if (category && item.category !== category) return false;
    if (type === "frais") {
      if (!["vehicule", "machine", "equipement", "frais"].includes(item.type)) return false;
    } else if (type && item.type !== type) return false;
    return true;
  });

  const trimmed = query.trim();
  if (!trimmed) return items;

  return rankPrestationSearch(items, trimmed, (item) => prestationSearchText(item));
}

export function getPrestationCategories(tradeType) {
  return [
    ...new Set(getPrestationsByTrade(tradeType).map((item) => item.category)),
  ].sort((a, b) => a.localeCompare(b, "fr"));
}

const DEPRECATED_CATALOG_CATEGORIES = {
  electricien: ["Visserie & fixation"],
};

export function ensureBatiprixSeed() {
  if (!isBatiprixEnabled()) return 0;
  const items = buildRuntimeCatalogForTrade(BATIPRIX_TRADE);
  mergedLibraryCache = null;
  return items.length;
}

export function ensureSeedForTrade(tradeType) {
  if (!isTradeAvailableInMarket(tradeType) && tradeType !== BATIPRIX_TRADE) return 0;
  const before = runtimeCatalogByTrade.has(tradeType);
  const items = buildRuntimeCatalogForTrade(tradeType);
  mergedLibraryCache = null;
  return before ? 0 : items.length;
}

export function bulkApplyAutoImages(tradeType, keyToUrl) {
  if (!tradeType || !keyToUrl || !Object.keys(keyToUrl).length) return 0;

  const items = buildRuntimeCatalogForTrade(tradeType);
  const now = new Date().toISOString();
  let updated = 0;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!matchesMarket(item)) continue;
    if (!shouldAutoFetchItem(item)) continue;

    const key = resolveProductKey(
      item.tradeType,
      item.category,
      item.type,
      item.designation,
    );
    const imageUrl = keyToUrl[key];
    if (!imageUrl) continue;

    items[i] = {
      ...item,
      imageUrl,
      imageSource: "auto",
      updatedAt: now,
    };
    updated += 1;
  }

  if (updated) mergedLibraryCache = null;
  return updated;
}

export function ensureAllCatalogSeeds() {
  let total = 0;
  for (const trade of getLibraryTradesForMarket()) {
    total += ensureSeedForTrade(trade);
  }
  invalidatePrestationsCache();
  return total;
}

/** Purge les références d'un ancien marché (ex. Suisse) masquées mais encore en stockage. */
export function purgeLegacyMarketCatalog(marketCode = "CH") {
  const list = loadPersistedPrestations();
  const filtered = list.filter((item) => itemCountry(item) !== marketCode);
  if (filtered.length === list.length) return 0;
  savePersistedPrestations(filtered);
  return list.length - filtered.length;
}

function resetCatalogSeedsIfVersionMismatch() {
  const prev = localStorage.getItem(CATALOG_SEED_KEY);
  if (prev === CATALOG_SEED_VERSION) return false;
  localStorage.setItem(CATALOG_SEED_KEY, CATALOG_SEED_VERSION);
  invalidateRuntimeCatalog();
  purgeBloatedLibraryStorage();
  const list = loadPersistedPrestations().filter((item) => !isRuntimeCatalogSource(item.source));
  savePersistedPrestations(list);
  return true;
}

let fullCatalogSeedScheduled = false;

function scheduleFullCatalogSeed() {
  if (fullCatalogSeedScheduled) return;
  fullCatalogSeedScheduled = true;

  const run = () => {
    try {
      ensureAllCatalogSeeds();
      invalidatePrestationsCache();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("exone-catalog-ready"));
      }
    } catch (error) {
      console.error("[Exxon-bat] Chargement catalogue complet", error);
    }
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 12000 });
  } else {
    setTimeout(run, 600);
  }
}

/**
 * Garantit un catalogue FR prêt — généré en mémoire (compatible iPhone).
 * Par défaut : charge le métier principal tout de suite, le reste en arrière-plan.
 */
export function ensureLibraryReady(options = {}) {
  try {
    purgeBloatedLibraryStorage();
    scrubLibraryFromDeviceStorage();
    purgeLegacyMarketCatalog("CH");
    const reset = resetCatalogSeedsIfVersionMismatch();
    let added = 0;
    const trades = getLibraryTradesForMarket();
    const preferred =
      options.preferredTrade ||
      loadProfile()?.tradeType ||
      trades[0];

    if (options.eager) {
      added = ensureAllCatalogSeeds();
      for (const trade of trades) {
        if (getPrestationsByTrade(trade).length === 0) {
          added += ensureSeedForTrade(trade);
        }
      }
    } else {
      if (preferred && getPrestationsByTrade(preferred).length === 0) {
        added += ensureSeedForTrade(preferred);
      }
      const hasAny = trades.some((trade) => getPrestationsByTrade(trade).length > 0);
      if (!hasAny && trades[0]) {
        added += ensureSeedForTrade(trades[0]);
      }
      if (!options.skipBackground) scheduleFullCatalogSeed();
    }

    invalidatePrestationsCache();

    const stats = getLibraryStats();
    const totalVisible = Object.values(stats).reduce((sum, row) => sum + row.count, 0);

    return { added, reset, stats, totalVisible, ready: totalVisible > 0 };
  } catch (error) {
    console.error("[Exxon-bat] Catalogue indisponible", error);
    return { added: 0, reset: false, stats: {}, totalVisible: 0, ready: false };
  }
}

export function getLibraryStats() {
  const stats = {};
  for (const trade of getLibraryTradesForMarket()) {
    const count = getPrestationsByTrade(trade).length;
    const minReady = trade === BATIPRIX_TRADE ? 100 : 500;
    stats[trade] = { count, ready: count >= minReady };
  }
  return stats;
}

export { BATIPRIX_TRADE, LIBRARY_TRADES, getLibraryTradesForMarket };

export function getReviews() {
  return load(REVIEWS_KEY);
}

export function getReviewById(id) {
  return getReviews().find((review) => review.id === id) ?? null;
}

export function addReview(review) {
  const list = getReviews();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: review.type ?? "exone",
    artisanEmail: review.artisanEmail?.toLowerCase() ?? null,
    authorName: String(review.authorName || "").trim(),
    trade: String(review.trade || "").trim(),
    city: String(review.city || "").trim(),
    rating: Math.min(5, Math.max(1, Number(review.rating) || 5)),
    text: String(review.text || "").trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
    approvedAt: null,
  };
  list.unshift(entry);
  save(REVIEWS_KEY, list.slice(0, 200));
  return entry;
}

export function updateReview(id, patch) {
  const list = getReviews().map((review) =>
    review.id === id ? { ...review, ...patch } : review,
  );
  save(REVIEWS_KEY, list);
  return list.find((review) => review.id === id) ?? null;
}

export function getApprovedExoneReviews() {
  return getReviews().filter(
    (review) => review.type === "exone" && review.status === "approved",
  );
}

export function getReviewsByArtisan(email) {
  const normalized = email?.trim().toLowerCase();
  return getReviews().filter(
    (review) => review.artisanEmail === normalized,
  );
}

export function getReviewsStats() {
  const reviews = getReviews();
  const approved = reviews.filter((r) => r.status === "approved");
  const exoneApproved = approved.filter((r) => r.type === "exone");
  const avg =
    exoneApproved.length > 0
      ? exoneApproved.reduce((sum, r) => sum + r.rating, 0) / exoneApproved.length
      : 4.9;
  return {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    approvedCount: approved.length,
    averageRating: Math.round(avg * 10) / 10,
  };
}

function loadArtisanPublicStore() {
  try {
    const raw = localStorage.getItem(ARTISAN_PUBLIC_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function saveArtisanPublicProfile(email, profile) {
  const key = email?.trim().toLowerCase();
  if (!key) return;
  const store = loadArtisanPublicStore();
  store[key] = {
    companyName: profile.companyName?.trim() || "",
    tradeType: profile.tradeType || "general",
    city: profile.companyCity?.trim() || profile.city?.trim() || "",
    updatedAt: new Date().toISOString(),
  };
  save(ARTISAN_PUBLIC_KEY, store);
}

export function getArtisanPublicProfile(email) {
  const key = email?.trim().toLowerCase();
  if (!key) return null;
  return loadArtisanPublicStore()[key] ?? null;
}

export function getComptaSummary(profile) {
  const stats = getSalesStats();
  const monthlyNet = profile?.monthlyNet ?? 0;
  const monthlyFixed = profile?.monthlyFixed ?? 0;

  return {
    caMois: stats.totalCA,
    chargesFixes: monthlyFixed,
    remunerationCible: monthlyNet,
    margeEstimee: stats.totalMarge,
    resultatEstime: stats.totalMarge - monthlyFixed,
  };
}
