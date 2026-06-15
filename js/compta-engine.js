import { getPrintedDevisHistory, getClients, getChantierById } from "./data.js";
import { getCountryProfile } from "./country-config.js";
import { computePaymentStatus } from "./payment-store.js";
import {
  computeVat,
  getCategoryById,
  getComptaCategories,
  getManualExpenses,
} from "./compta-store.js";
import { applyChantierImputation } from "./compta-imputation.js";

function parseDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getPeriodBounds(period, refDate = new Date()) {
  const ref = new Date(refDate);
  ref.setHours(12, 0, 0, 0);

  if (period === "all") {
    return { start: null, end: null, label: "Toute la période" };
  }

  if (period === "year") {
    const start = new Date(ref.getFullYear(), 0, 1);
    const end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59);
    return { start, end, label: `Année ${ref.getFullYear()}` };
  }

  if (period === "quarter") {
    const q = Math.floor(ref.getMonth() / 3);
    const start = new Date(ref.getFullYear(), q * 3, 1);
    const end = new Date(ref.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
    return { start, end, label: `T${q + 1} ${ref.getFullYear()}` };
  }

  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(start);
  return { start, end, label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) };
}

export function isInPeriod(iso, bounds) {
  if (!bounds.start && !bounds.end) return true;
  const d = parseDate(iso);
  if (!d) return false;
  if (bounds.start && d < bounds.start) return false;
  if (bounds.end && d > bounds.end) return false;
  return true;
}

function journalBase(entry) {
  const category = getCategoryById(entry.categoryId);
  return {
    ...entry,
    categoryLabel: category?.label ?? entry.categoryId,
    categoryGroup: category?.group ?? "—",
    categoryKind: category?.kind ?? entry.kind,
    vatAmount: computeVat(entry.amountHT, entry.vatRate),
    ttc: entry.amountHT + computeVat(entry.amountHT, entry.vatRate),
  };
}

function resolveDocVatRate(profile, doc) {
  if (doc.vatRate != null && doc.vatRate !== "") return Number(doc.vatRate);
  const country = doc.country ?? profile?.country ?? "FR";
  return getCountryProfile(country).defaultVatRate;
}

export function buildIncomeEntries(devisList = getPrintedDevisHistory(), profile = {}) {
  const entries = [];

  for (const doc of devisList) {
    const date = doc.printedAt || doc.date;
    const isFacture = doc.documentType === "facture";
    const docLabel = isFacture ? "Facture" : "Devis";
    const ref = doc.devisNumber || doc.docNumber || "—";
    const vatRate = resolveDocVatRate(profile, doc);

    entries.push(
      journalBase({
        id: `income-${doc.id}`,
        date,
        kind: "income",
        categoryId: "ventes_prestations",
        label: `${docLabel} ${ref} — ${doc.jobName || "Prestation"}`,
        clientName: doc.clientName || "",
        supplier: "",
        devisId: doc.id,
        invoiceRef: ref,
        amountHT: Number(doc.price) || 0,
        vatRate,
        paid: false,
        source: "devis",
        documentType: doc.documentType || "devis",
      }),
    );

    const payment = computePaymentStatus(doc.id, doc.price);
    const paid = Number(payment.totalPaid) || 0;
    if (paid > 0) {
      entries.push(
        journalBase({
          id: `encaisse-${doc.id}`,
          date,
          kind: "income",
          categoryId: paid >= (Number(doc.price) || 0) - 0.01 ? "ventes_prestations" : "acomptes",
          label: `Encaissement — ${doc.clientName || "Client"} (${ref})`,
          clientName: doc.clientName || "",
          supplier: "",
          devisId: doc.id,
          invoiceRef: ref,
          amountHT: paid,
          vatRate: 0,
          paid: true,
          source: "encaissement",
          documentType: doc.documentType || "devis",
        }),
      );
    }

    const materialCost = Number(doc.materialPurchaseCost ?? doc.materialCost) || 0;
    if (materialCost > 0) {
      entries.push(
        journalBase({
          id: `mat-${doc.id}`,
          date,
          kind: "expense",
          categoryId: "materiaux",
          label: `Achat matériel lié — ${doc.jobName || "Prestation"}`,
          clientName: doc.clientName || "",
          supplier: "Fournisseur (devis)",
          devisId: doc.id,
          invoiceRef: "",
          amountHT: materialCost,
          vatRate,
          paid: true,
          source: "devis-materiel",
        }),
      );
    }
  }

  return entries;
}

export function buildExpenseEntries(manual = getManualExpenses()) {
  return manual.map((row) =>
    journalBase({
      ...row,
      kind: "expense",
      categoryId: row.categoryId || "divers",
    }),
  );
}

export function buildFixedChargeEntries(profile, bounds) {
  const monthlyFixed = Number(profile?.monthlyFixed) || 0;
  if (monthlyFixed <= 0) return [];

  const entries = [];
  const ref = bounds.end ?? new Date();
  const months = bounds.start
    ? Math.max(
        1,
        (ref.getFullYear() - bounds.start.getFullYear()) * 12 +
          (ref.getMonth() - bounds.start.getMonth()) +
          1,
      )
    : 1;

  for (let i = 0; i < months; i++) {
    const d = bounds.start
      ? new Date(bounds.start.getFullYear(), bounds.start.getMonth() + i, 1)
      : new Date(ref.getFullYear(), ref.getMonth(), 1);
    entries.push(
      journalBase({
        id: `fixed-${d.getFullYear()}-${d.getMonth()}`,
        date: d.toISOString(),
        kind: "expense",
        categoryId: "charges_fixes",
        label: "Charges fixes mensuelles (profil)",
        clientName: "",
        supplier: "Charges récurrentes",
        amountHT: monthlyFixed,
        vatRate: 0,
        paid: true,
        source: "profil",
      }),
    );
  }

  return entries;
}

export function buildComptaLedger({ period = "month", profile = {}, refDate = new Date() } = {}) {
  const bounds = getPeriodBounds(period, refDate);
  const all = [
    ...buildIncomeEntries(getPrintedDevisHistory(), profile),
    ...buildExpenseEntries(),
    ...buildFixedChargeEntries(profile, bounds),
  ]
    .filter((e) => isInPeriod(e.date, bounds))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return { bounds, entries: applyChantierImputation(all) };
}

export function summarizeLedger(entries) {
  let incomeHT = 0;
  let expenseHT = 0;
  let encaisse = 0;
  let vatCollected = 0;
  let vatDeductible = 0;

  for (const row of entries) {
    if (row.kind === "income") {
      if (row.source === "encaissement") encaisse += row.amountHT;
      else {
        incomeHT += row.amountHT;
        vatCollected += row.vatAmount;
      }
    } else {
      expenseHT += row.amountHT;
      vatDeductible += row.vatAmount;
    }
  }

  return {
    incomeHT,
    expenseHT,
    encaisse,
    result: incomeHT - expenseHT,
    tresorerie: encaisse - expenseHT,
    vatCollected,
    vatDeductible,
    vatBalance: vatCollected - vatDeductible,
  };
}

export function groupByCategory(entries) {
  const map = new Map();
  for (const row of entries) {
    const key = row.categoryId;
    const prev = map.get(key) ?? {
      categoryId: key,
      label: row.categoryLabel,
      group: row.categoryGroup,
      kind: row.categoryKind,
      totalHT: 0,
      count: 0,
    };
    prev.totalHT += row.amountHT;
    prev.count += 1;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.totalHT - a.totalHT);
}

export function groupByClient(entries) {
  const map = new Map();

  for (const row of entries) {
    const client = row.clientName?.trim() || "Sans client";
    const prev = map.get(client) ?? {
      clientName: client,
      incomeHT: 0,
      expenseHT: 0,
      encaisse: 0,
      docs: 0,
    };

    if (row.kind === "income") {
      if (row.source === "encaissement") prev.encaisse += row.amountHT;
      else {
        prev.incomeHT += row.amountHT;
        if (row.source === "devis") prev.docs += 1;
      }
    } else if (row.clientName?.trim()) {
      prev.expenseHT += row.amountHT;
    }

    map.set(client, prev);
  }

  return [...map.values()]
    .filter((c) => c.clientName !== "Sans client" || c.incomeHT > 0 || c.encaisse > 0)
    .sort((a, b) => b.incomeHT - a.incomeHT);
}

export function groupByChantier(entries) {
  const map = new Map();

  for (const row of entries) {
    const key = row.chantierId || "_none";
    const prev = map.get(key) ?? {
      chantierId: row.chantierId,
      chantierName: row.chantierName || "Non imputé",
      chantierCode: row.chantierCode || "",
      chantierClient: row.chantierClient || "",
      budget: 0,
      incomeHT: 0,
      encaisse: 0,
      expenseHT: 0,
      result: 0,
      marginRate: 0,
      lines: 0,
      imputed: 0,
    };

    prev.lines += 1;
    if (row.chantierId) prev.imputed += 1;

    if (row.kind === "income") {
      if (row.source === "encaissement") prev.encaisse += row.amountHT;
      else prev.incomeHT += row.amountHT;
    } else {
      prev.expenseHT += row.amountHT;
    }

    map.set(key, prev);
  }

  return [...map.values()]
    .map((row) => {
      if (row.chantierId) {
        const ch = getChantierById(row.chantierId);
        row.budget = Number(ch?.finalPrice ?? ch?.budget) || 0;
      }
      row.result = row.incomeHT - row.expenseHT;
      row.marginRate = row.incomeHT > 0 ? (row.result / row.incomeHT) * 100 : 0;
      return row;
    })
    .sort((a, b) => {
      if (a.chantierId && !b.chantierId) return -1;
      if (!a.chantierId && b.chantierId) return 1;
      return b.incomeHT - a.incomeHT;
    });
}

export function exportJournalCsv(entries) {
  const header = [
    "Date",
    "Pièce",
    "Libellé",
    "Catégorie",
    "Groupe",
    "Chantier",
    "Code chantier",
    "Imputation",
    "Client",
    "Fournisseur",
    "Type",
    "Montant HT",
    "TVA %",
    "TVA €",
    "TTC",
    "Payé",
    "Source",
  ];
  const rows = entries.map((e) => [
    new Date(e.date).toLocaleDateString("fr-FR"),
    e.invoiceRef || "",
    e.label,
    e.categoryLabel,
    e.categoryGroup,
    e.chantierName || "",
    e.chantierCode || "",
    e.imputationLabel || "",
    e.clientName || "",
    e.supplier || "",
    e.kind === "income" ? "Produit" : "Charge",
    e.amountHT.toFixed(2).replace(".", ","),
    e.vatRate,
    e.vatAmount.toFixed(2).replace(".", ","),
    e.ttc.toFixed(2).replace(".", ","),
    e.paid ? "Oui" : "Non",
    e.source,
  ]);
  return [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
}

export function exportChantierCsv(entries) {
  const groups = groupByChantier(entries);
  const header = [
    "Chantier",
    "Code",
    "Client",
    "Budget HT",
    "Facturé HT",
    "Encaissé",
    "Charges HT",
    "Résultat HT",
    "Marge %",
    "Lignes",
    "Lignes imputées",
  ];
  const rows = groups.map((g) => [
    g.chantierName,
    g.chantierCode,
    g.chantierClient,
    g.budget.toFixed(2).replace(".", ","),
    g.incomeHT.toFixed(2).replace(".", ","),
    g.encaisse.toFixed(2).replace(".", ","),
    g.expenseHT.toFixed(2).replace(".", ","),
    g.result.toFixed(2).replace(".", ","),
    g.marginRate.toFixed(1).replace(".", ","),
    g.lines,
    g.imputed,
  ]);
  return [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
}

export function exportChantierDetailCsv(entries) {
  const header = [
    "Chantier",
    "Code",
    "Date",
    "Libellé",
    "Catégorie",
    "Type",
    "HT",
    "Imputation",
    "Source",
  ];
  const rows = entries
    .filter((e) => e.chantierId)
    .sort((a, b) => a.chantierName.localeCompare(b.chantierName, "fr") || new Date(a.date) - new Date(b.date))
    .map((e) => [
      e.chantierName,
      e.chantierCode,
      new Date(e.date).toLocaleDateString("fr-FR"),
      e.label,
      e.categoryLabel,
      e.kind === "income" ? "Produit" : "Charge",
      e.amountHT.toFixed(2).replace(".", ","),
      e.imputationLabel || "",
      e.source,
    ]);
  return [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
}

export function getClientOptions() {
  const fromClients = getClients().map((c) => c.name).filter(Boolean);
  const fromDevis = getPrintedDevisHistory().map((d) => d.clientName).filter(Boolean);
  return [...new Set([...fromClients, ...fromDevis])].sort((a, b) => a.localeCompare(b, "fr"));
}

export function getExpenseCategoryOptions() {
  return getComptaCategories().filter((c) => c.kind === "expense");
}
