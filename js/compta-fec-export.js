import { getCategoryById } from "./compta-store.js";

const FEC_HEADER =
  "JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise";

const CATEGORY_ACCOUNTS = {
  ventes_prestations: { num: "706000", lib: "Prestations de services" },
  acomptes: { num: "706000", lib: "Prestations de services" },
  autres_produits: { num: "708000", lib: "Produits divers" },
  materiaux: { num: "601000", lib: "Achats matières premières" },
  sous_traitance: { num: "604000", lib: "Achats études et prestations" },
  location_materiel: { num: "612000", lib: "Redevances crédit-bail" },
  carburant: { num: "606100", lib: "Carburants" },
  deplacement: { num: "625100", lib: "Voyages et déplacements" },
  assurances: { num: "616000", lib: "Primes d'assurances" },
  outillage: { num: "606300", lib: "Fournitures entretien" },
  honoraires: { num: "622600", lib: "Honoraires" },
  charges_sociales: { num: "645000", lib: "Charges de sécurité sociale" },
  salaires: { num: "641000", lib: "Rémunérations du personnel" },
  charges_fixes: { num: "613000", lib: "Locations immobilières" },
  divers: { num: "658000", lib: "Charges diverses" },
};

const SYSTEM_ACCOUNTS = {
  client: { num: "411000", lib: "Clients" },
  supplier: { num: "401000", lib: "Fournisseurs" },
  bank: { num: "512000", lib: "Banque" },
  vatCollected: { num: "445710", lib: "TVA collectée" },
  vatDeductible: { num: "445660", lib: "TVA déductible" },
};

function fecDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function fecAmount(value) {
  return (Math.round((Number(value) || 0) * 100) / 100).toFixed(2).replace(".", ",");
}

function sanitizeFec(value, max = 200) {
  return String(value ?? "")
    .replace(/\|/g, " ")
    .replace(/\r?\n/g, " ")
    .trim()
    .slice(0, max);
}

function accountForCategory(categoryId) {
  const cat = getCategoryById(categoryId);
  const mapped = CATEGORY_ACCOUNTS[categoryId];
  if (mapped) return mapped;
  return {
    num: cat?.kind === "income" ? "708000" : "658000",
    lib: cat?.label?.slice(0, 50) || "Compte divers",
  };
}

function pushLine(rows, payload) {
  rows.push(
    [
      payload.journalCode,
      payload.journalLib,
      payload.ecritureNum,
      payload.ecritureDate,
      payload.compteNum,
      payload.compteLib,
      payload.compAuxNum ?? "",
      payload.compAuxLib ?? "",
      payload.pieceRef ?? "",
      payload.pieceDate ?? payload.ecritureDate,
      payload.ecritureLib,
      payload.debit ? fecAmount(payload.debit) : "",
      payload.credit ? fecAmount(payload.credit) : "",
      "",
      "",
      payload.validDate ?? payload.ecritureDate,
      "",
      "",
    ].join("|"),
  );
}

function clientAux(name) {
  const clean = sanitizeFec(name, 40);
  return {
    compAuxNum: clean.slice(0, 20).replace(/\s+/g, "").toUpperCase() || "CLIENT",
    compAuxLib: clean || "Client divers",
  };
}

function supplierAux(name) {
  const clean = sanitizeFec(name, 40);
  return {
    compAuxNum: clean.slice(0, 20).replace(/\s+/g, "").toUpperCase() || "FOURN",
    compAuxLib: clean || "Fournisseur divers",
  };
}

function chantierSuffix(entry) {
  if (!entry.chantierCode) return "";
  return ` [${entry.chantierCode}]`;
}

export function buildFecRows(entries, { validDate } = {}) {
  const rows = [];
  let ecritureCounter = 1;

  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const entry of sorted) {
    const ecritureDate = fecDate(entry.date);
    const valid = validDate ? fecDate(validDate) : ecritureDate;
    const ecritureNum = String(ecritureCounter).padStart(6, "0");
    const pieceRef = sanitizeFec(entry.invoiceRef || entry.id, 35);
    const baseLib = sanitizeFec(`${entry.label}${chantierSuffix(entry)}`, 180);

    if (entry.kind === "income" && entry.source === "encaissement") {
      const ttc = entry.ttc ?? entry.amountHT + (entry.vatAmount || 0);
      const aux = clientAux(entry.clientName);
      pushLine(rows, {
        journalCode: "BQ",
        journalLib: "Banque",
        ecritureNum,
        ecritureDate,
        ...SYSTEM_ACCOUNTS.bank,
        pieceRef,
        ecritureLib: baseLib,
        debit: ttc,
        validDate: valid,
      });
      pushLine(rows, {
        journalCode: "BQ",
        journalLib: "Banque",
        ecritureNum,
        ecritureDate,
        ...SYSTEM_ACCOUNTS.client,
        ...aux,
        pieceRef,
        ecritureLib: baseLib,
        credit: ttc,
        validDate: valid,
      });
      ecritureCounter += 1;
      continue;
    }

    if (entry.kind === "income") {
      const account = accountForCategory(entry.categoryId);
      const aux = clientAux(entry.clientName);
      const ttc = entry.ttc ?? entry.amountHT + (entry.vatAmount || 0);
      pushLine(rows, {
        journalCode: "VT",
        journalLib: "Ventes",
        ecritureNum,
        ecritureDate,
        ...SYSTEM_ACCOUNTS.client,
        ...aux,
        pieceRef,
        ecritureLib: baseLib,
        debit: ttc,
        validDate: valid,
      });
      pushLine(rows, {
        journalCode: "VT",
        journalLib: "Ventes",
        ecritureNum,
        ecritureDate,
        ...account,
        pieceRef,
        ecritureLib: baseLib,
        credit: entry.amountHT,
        validDate: valid,
      });
      if (entry.vatAmount > 0) {
        pushLine(rows, {
          journalCode: "VT",
          journalLib: "Ventes",
          ecritureNum,
          ecritureDate,
          ...SYSTEM_ACCOUNTS.vatCollected,
          pieceRef,
          ecritureLib: baseLib,
          credit: entry.vatAmount,
          validDate: valid,
        });
      }
      ecritureCounter += 1;
      continue;
    }

    const account = accountForCategory(entry.categoryId);
    const aux = supplierAux(entry.supplier);
    const ttc = entry.ttc ?? entry.amountHT + (entry.vatAmount || 0);
    const creditAccount = entry.paid ? SYSTEM_ACCOUNTS.bank : SYSTEM_ACCOUNTS.supplier;
    const creditAux = entry.paid ? {} : aux;
    const journal = entry.source === "profil" ? { code: "OD", lib: "Opérations diverses" } : { code: "AC", lib: "Achats" };

    pushLine(rows, {
      journalCode: journal.code,
      journalLib: journal.lib,
      ecritureNum,
      ecritureDate,
      ...account,
      pieceRef,
      ecritureLib: baseLib,
      debit: entry.amountHT,
      validDate: valid,
    });
    if (entry.vatAmount > 0) {
      pushLine(rows, {
        journalCode: journal.code,
        journalLib: journal.lib,
        ecritureNum,
        ecritureDate,
        ...SYSTEM_ACCOUNTS.vatDeductible,
        pieceRef,
        ecritureLib: baseLib,
        debit: entry.vatAmount,
        validDate: valid,
      });
    }
    pushLine(rows, {
      journalCode: journal.code,
      journalLib: journal.lib,
      ecritureNum,
      ecritureDate,
      ...creditAccount,
      ...creditAux,
      pieceRef,
      ecritureLib: baseLib,
      credit: ttc,
      validDate: valid,
    });
    ecritureCounter += 1;
  }

  return rows;
}

export function exportFecContent(entries, { profile = {}, bounds = {} } = {}) {
  const body = buildFecRows(entries, { validDate: bounds.end ?? new Date() });
  return [FEC_HEADER, ...body].join("\n");
}

export function getFecFilename(profile, bounds) {
  const siret = String(profile?.companySiret ?? "").replace(/\s/g, "");
  const siren = (siret.slice(0, 9) || "000000000").padStart(9, "0");
  const end = bounds?.end ?? new Date();
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const d = String(end.getDate()).padStart(2, "0");
  return `${siren}FEC${y}${m}${d}.txt`;
}
