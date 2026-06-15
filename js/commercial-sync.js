import {
  findOrCreateClient,
  getChantiers,
  getPrintedDevisHistory,
  updateClient,
} from "./data.js";
import { computePaymentStatus } from "./payment-store.js";
import {
  advanceOpportunityStage,
  getOpportunityByDevisId,
  getOpportunities,
  upsertOpportunity,
} from "./commercial-store.js";

const STAGE_FROM_PAYMENT = {
  paid: "paye",
  partial: "en_cours",
};

/** Synchronise une opportunité depuis un devis imprimé. */
export function syncOpportunityFromDevis(devis, clientId = "") {
  if (!devis?.id || !devis.clientName?.trim()) return null;

  const client = clientId
    ? { id: clientId }
    : findOrCreateClient({
        name: devis.clientName,
        email: devis.clientEmail,
        phone: devis.clientPhone,
        address: devis.clientAddress,
      });

  const existing = getOpportunityByDevisId(devis.id);
  const stage = existing?.stage === "perdu" ? "perdu" : existing?.stage || "devis_envoye";

  return upsertOpportunity({
    id: existing?.id,
    clientId: client.id,
    clientName: devis.clientName,
    clientEmail: devis.clientEmail || "",
    clientPhone: devis.clientPhone || "",
    devisId: devis.id,
    devisNumber: devis.devisNumber || devis.docNumber || "",
    jobName: devis.jobName || "Prestation",
    amount: devis.price || 0,
    stage: existing ? existing.stage : "devis_envoye",
    sentAt: existing?.sentAt || devis.printedAt || devis.date || new Date().toISOString(),
    validatedAt: existing?.validatedAt || devis.commercialValidatedAt || "",
    appointments: existing?.appointments || [],
    notes: existing?.notes || [],
    nextFollowUp: existing?.nextFollowUp || "",
    chantierId: existing?.chantierId || "",
  });
}

/** Marque un devis comme validé côté commercial (depuis devis ou CRM). */
export function markDevisCommerciallyValidated(devisId, { note = "" } = {}) {
  const opp = getOpportunityByDevisId(devisId);
  if (!opp) return null;

  if (note) {
    upsertOpportunity({
      id: opp.id,
      notes: [{ id: Date.now().toString(), text: note, at: new Date().toISOString() }, ...opp.notes].slice(
        0,
        30,
      ),
    });
  }

  return advanceOpportunityStage(opp.id, "valide", { validatedAt: new Date().toISOString() });
}

export function markDevisAwaitingResponse(devisId) {
  const opp = getOpportunityByDevisId(devisId);
  if (!opp) return null;
  return advanceOpportunityStage(opp.id, "en_attente");
}

export function markDevisLost(devisId, reason = "") {
  const opp = getOpportunityByDevisId(devisId);
  if (!opp) return null;
  return advanceOpportunityStage(opp.id, "perdu", { lostReason: reason });
}

function applyPaymentStage(opp, devis) {
  if (opp.stage === "perdu") return opp;
  const payment = computePaymentStatus(devis.id, devis.price);
  if (payment.status === "paid") {
    return advanceOpportunityStage(opp.id, "paye");
  }
  if (payment.status === "partial" && opp.stage !== "paye") {
    return advanceOpportunityStage(opp.id, "en_cours");
  }
  return opp;
}

function applyChantierStage(opp, chantiers) {
  if (opp.stage === "perdu" || opp.stage === "paye") return opp;
  const linked = chantiers.find((c) => c.devisId === opp.devisId);
  if (!linked) return opp;
  return advanceOpportunityStage(opp.id, "en_cours", { chantierId: linked.id });
}

/** Réconciliation globale : devis imprimés, paiements, chantiers. */
export function reconcileCommercialPipeline() {
  const devisList = getPrintedDevisHistory().filter((d) => d.documentType !== "facture");
  const chantiers = getChantiers();

  for (const devis of devisList) {
    let opp = syncOpportunityFromDevis(devis);
    if (!opp) continue;

    if (devis.commercialValidatedAt && opp.stage !== "perdu" && opp.stage !== "paye") {
      opp = advanceOpportunityStage(opp.id, "valide", { validatedAt: devis.commercialValidatedAt });
    }

    opp = applyChantierStage(opp, chantiers);
    opp = applyPaymentStage(opp, devis);
  }

  for (const opp of getOpportunities()) {
    if (opp.clientId) {
      updateClient(opp.clientId, {
        lastContactAt: opp.updatedAt,
        commercialStage: opp.stage,
      });
    }
  }

  return getOpportunities();
}

export function syncChantierCreated(chantier) {
  if (!chantier?.devisId) return null;
  const opp = getOpportunityByDevisId(chantier.devisId);
  if (!opp) return reconcileCommercialPipeline();
  return advanceOpportunityStage(opp.id, "en_cours", { chantierId: chantier.id });
}

export function syncPaymentValidated(devisId, devisTotal) {
  const opp = getOpportunityByDevisId(devisId);
  if (!opp) {
    reconcileCommercialPipeline();
    return getOpportunityByDevisId(devisId);
  }
  const payment = computePaymentStatus(devisId, devisTotal);
  if (payment.status === "paid") {
    return advanceOpportunityStage(opp.id, "paye");
  }
  if (payment.status === "partial") {
    return advanceOpportunityStage(opp.id, "en_cours");
  }
  return opp;
}

export { STAGE_FROM_PAYMENT };
