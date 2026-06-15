import { getChantiers, getDevisById } from "./data.js";
import { getOpportunities } from "./commercial-store.js";

function normalize(str) {
  return (str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function buildChantierIndex() {
  const chantiers = getChantiers();
  const byDevisId = new Map();
  const byClient = new Map();
  const byName = new Map();
  const oppChantierByDevisId = new Map();

  for (const ch of chantiers) {
    if (ch.devisId) byDevisId.set(ch.devisId, ch);
    if (ch.client) {
      const key = normalize(ch.client);
      if (!byClient.has(key)) byClient.set(key, ch);
    }
    if (ch.name) byName.set(normalize(ch.name), ch);
  }

  for (const opp of getOpportunities()) {
    if (opp.devisId && opp.chantierId) {
      oppChantierByDevisId.set(opp.devisId, opp.chantierId);
    }
  }

  return { chantiers, byDevisId, byClient, byName, oppChantierByDevisId };
}

const IMPUTATION_LABELS = {
  manual: "Manuel",
  devis_lie: "Devis lié",
  opportunite: "Pipeline commercial",
  client: "Client chantier",
  libelle_devis: "Libellé prestation",
  libelle: "Libellé chantier",
  none: "Non imputé",
};

export function getImputationLabel(method) {
  return IMPUTATION_LABELS[method] ?? method;
}

function imputationResult(chantier, method) {
  if (!chantier) {
    return {
      chantierId: null,
      chantierName: "Non imputé",
      chantierCode: "",
      chantierClient: "",
      imputationMethod: "none",
      imputationLabel: IMPUTATION_LABELS.none,
    };
  }
  return {
    chantierId: chantier.id,
    chantierName: chantier.name || "Chantier",
    chantierCode: chantier.accessCode || "",
    chantierClient: chantier.client || "",
    imputationMethod: method,
    imputationLabel: IMPUTATION_LABELS[method] ?? method,
  };
}

export function resolveChantierImputation(entry, index = buildChantierIndex()) {
  if (entry.chantierId) {
    const ch = index.chantiers.find((c) => c.id === entry.chantierId);
    if (ch) return imputationResult(ch, "manual");
  }

  if (entry.devisId) {
    const linked = index.byDevisId.get(entry.devisId);
    if (linked) return imputationResult(linked, "devis_lie");

    const oppChId = index.oppChantierByDevisId.get(entry.devisId);
    if (oppChId) {
      const ch = index.chantiers.find((c) => c.id === oppChId);
      if (ch) return imputationResult(ch, "opportunite");
    }

    const devis = getDevisById(entry.devisId);
    if (devis?.jobName) {
      const byJob = index.byName.get(normalize(devis.jobName));
      if (byJob) return imputationResult(byJob, "libelle_devis");
    }
  }

  if (entry.clientName) {
    const byClient = index.byClient.get(normalize(entry.clientName));
    if (byClient) return imputationResult(byClient, "client");
  }

  const labelKey = normalize(entry.label);
  for (const ch of index.chantiers) {
    const nameKey = normalize(ch.name);
    if (nameKey && labelKey.includes(nameKey)) {
      return imputationResult(ch, "libelle");
    }
  }

  return imputationResult(null, "none");
}

export function applyChantierImputation(entries) {
  const index = buildChantierIndex();
  return entries.map((entry) => ({
    ...entry,
    ...resolveChantierImputation(entry, index),
  }));
}

export function getChantierOptions() {
  return getChantiers()
    .map((c) => ({
      id: c.id,
      label: `${c.name}${c.client ? ` — ${c.client}` : ""}`,
      code: c.accessCode || "",
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export function resolveChantierIdForExpense(payload) {
  if (payload.chantierId) return payload.chantierId;
  const draft = {
    clientName: payload.clientName,
    devisId: payload.devisId,
    label: payload.label,
  };
  return resolveChantierImputation(draft).chantierId;
}
