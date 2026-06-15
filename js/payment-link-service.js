import { formatProfileMoney } from "./market.js";
import { buildPaymentPageUrl, encodePaymentLinkPayload } from "./payment-link.codec.js";
import { getDevisPayment, refreshPaymentStatus, saveDevisPayment } from "./payment-store.js";
import { markInstallmentPaid, sumPaidInstallments } from "./payment-plan.js";
import { loadProfile } from "./storage.js";

const PENDING_KEY = "exone-payment-links-pending";
const HISTORY_KEY = "exone-payment-links-history";

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? [];
  } catch {
    return [];
  }
}

function saveJson(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildReference(devisNumber, type, installmentIndex = null) {
  const base = (devisNumber || "DEVIS").replace(/[^A-Z0-9]/gi, "").slice(0, 16);
  const suffixMap = {
    acompte: "AC",
    solde: "SOL",
    full: "TOT",
    custom: "PAY",
    plan: "PLAN",
    echeance: `ECH${(Number(installmentIndex) || 0) + 1}`,
  };
  const suffix = suffixMap[type] ?? "PAY";
  return `EXO-${base}-${suffix}`.toUpperCase();
}

export function getPendingPaymentLinks(devisId = null) {
  const list = loadJson(PENDING_KEY);
  return devisId ? list.filter((item) => item.devisId === devisId) : list;
}

export function getPaymentLinkHistory(devisId = null) {
  const list = loadJson(HISTORY_KEY);
  return devisId ? list.filter((item) => item.devisId === devisId) : list;
}

export function createPaymentLinkRequest({
  devis,
  amount,
  type = "custom",
  clientEmail = "",
  expiresInDays = 30,
  stripeCheckoutUrl = "",
  installmentIndex = null,
  installmentLabel = "",
  installments = null,
}) {
  const profile = loadProfile();
  const parsedAmount = Math.round((Number(amount) || 0) * 100) / 100;
  if (parsedAmount <= 0 && type !== "plan") {
    throw new Error("Montant invalide");
  }
  if (!profile.companyIban?.trim()) {
    throw new Error("Renseignez votre IBAN dans Mon profil pour générer un lien de paiement.");
  }

  const token = randomToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();
  const reference = buildReference(devis.devisNumber || devis.docNumber, type, installmentIndex);

  const payload = {
    token,
    devisId: devis.id,
    devisNumber: devis.devisNumber || devis.docNumber || "",
    jobName: devis.jobName || "",
    clientName: devis.clientName || "",
    clientEmail: clientEmail || devis.clientEmail || "",
    amount: parsedAmount,
    type,
    installmentIndex: installmentIndex ?? undefined,
    installmentLabel: installmentLabel || undefined,
    installments: installments ?? undefined,
    companyName: profile.companyName || "Exxon-bat",
    companyIban: profile.companyIban.trim(),
    companyBic: profile.companyBic?.trim() || "",
    companyEmail: profile.companyEmail || "",
    reference,
    expiresAt,
    stripeCheckoutUrl: stripeCheckoutUrl.trim() || profile.stripeCheckoutUrl?.trim() || "",
    devisTotal: Number(devis.price) || 0,
  };

  const url = buildPaymentPageUrl(payload);
  const record = {
    ...payload,
    url,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const pending = loadJson(PENDING_KEY).filter((item) => item.token !== token);
  pending.unshift(record);
  saveJson(PENDING_KEY, pending.slice(0, 100));

  return record;
}

/** Lien client avec le plan complet (toutes les échéances). */
export function createPaymentPlanLink(devis, { clientEmail = "" } = {}) {
  const payment = getDevisPayment(devis.id);
  const rows = payment.installments ?? [];
  if (!rows.length) {
    throw new Error("Aucun plan d'échéances. Validez d'abord le devis.");
  }

  const encodedInstallments = rows.map((row, index) => ({
    index,
    label: row.label || `Échéance ${index + 1}`,
    amount: Number(row.amount) || 0,
    dueDate: row.dueDate || "",
    paid: Boolean(row.paid),
    reference: buildReference(devis.devisNumber || devis.docNumber, "echeance", index),
  }));

  const nextDue = encodedInstallments.find((row) => !row.paid) ?? encodedInstallments[0];

  return createPaymentLinkRequest({
    devis,
    amount: nextDue?.amount ?? 0,
    type: "plan",
    clientEmail,
    installments: encodedInstallments,
  });
}

/** Lien client pour une échéance précise. */
export function createInstallmentPaymentLink(devis, installmentIndex, { clientEmail = "" } = {}) {
  const payment = getDevisPayment(devis.id);
  const row = payment.installments?.[installmentIndex];
  if (!row) throw new Error("Échéance introuvable.");
  if (row.paid) throw new Error("Cette échéance est déjà réglée.");

  return createPaymentLinkRequest({
    devis,
    amount: row.amount,
    type: "echeance",
    installmentIndex,
    installmentLabel: row.label || `Échéance ${installmentIndex + 1}`,
    clientEmail,
  });
}

export function markPaymentLinkStatus(token, status, extra = {}) {
  const pending = loadJson(PENDING_KEY);
  const index = pending.findIndex((item) => item.token === token);
  if (index < 0) return null;

  const updated = {
    ...pending[index],
    ...extra,
    status,
    updatedAt: new Date().toISOString(),
  };
  pending[index] = updated;
  saveJson(PENDING_KEY, pending);

  const history = loadJson(HISTORY_KEY);
  history.unshift(updated);
  saveJson(HISTORY_KEY, history.slice(0, 200));

  return updated;
}

export function applyPaymentConfirmation(token, { notify = true, installmentIndex = null } = {}) {
  const pending = loadJson(PENDING_KEY);
  const link = pending.find((item) => item.token === token && item.status === "pending");
  if (!link) return { ok: false, reason: "Lien introuvable ou déjà traité." };

  let amount = link.amount;
  let resolvedIndex = link.installmentIndex ?? installmentIndex;

  if (link.type === "plan" && installmentIndex != null && link.installments?.length) {
    const row = link.installments.find((item) => item.index === installmentIndex) ?? link.installments[installmentIndex];
    if (row && !row.paid) {
      amount = Number(row.amount) || amount;
      resolvedIndex = row.index ?? installmentIndex;
    }
  }

  refreshPaymentStatus(link.devisId, link.devisTotal ?? amount);
  const payment = getDevisPayment(link.devisId);
  const previousPaid = Number(payment.totalPaid) || 0;
  let nextPaid = Math.round((previousPaid + amount) * 100) / 100;

  const patch = {};

  if (resolvedIndex != null && (link.type === "echeance" || link.type === "plan")) {
    markInstallmentPaid(link.devisId, resolvedIndex, { amount });
    const updated = getDevisPayment(link.devisId);
    nextPaid = sumPaidInstallments(updated.installments) || nextPaid;
    patch.totalPaid = nextPaid;
    if (resolvedIndex === 0) {
      patch.depositAmount = amount;
      patch.depositPaid = true;
    }
  } else {
    patch.totalPaid = nextPaid;
    if (link.type === "acompte") {
      patch.depositAmount = amount;
      patch.depositPaid = true;
    }
  }

  saveDevisPayment(link.devisId, patch);
  refreshPaymentStatus(link.devisId, link.devisTotal ?? amount);

  if (link.type === "plan" && link.installments?.length) {
    const updatedInstallments = link.installments.map((row) =>
      row.index === resolvedIndex ? { ...row, paid: true } : row,
    );
    markPaymentLinkStatus(token, updatedInstallments.every((row) => row.paid) ? "paid" : "pending", {
      paidAt: new Date().toISOString(),
      installments: updatedInstallments,
    });
  } else {
    markPaymentLinkStatus(token, "paid", { paidAt: new Date().toISOString() });
  }

  if (notify) {
    window.dispatchEvent(
      new CustomEvent("exone-payment-confirmed", {
        detail: { token, devisId: link.devisId, amount },
      }),
    );
  }

  return {
    ok: true,
    devisId: link.devisId,
    amount,
    jobName: link.jobName,
    clientName: link.clientName,
  };
}

export function buildArtisanConfirmUrl(token, origin = window.location.origin, installmentIndex = null) {
  const url = new URL(`${origin}/devis.html`);
  url.searchParams.set("payConfirm", token);
  if (installmentIndex != null) url.searchParams.set("ech", String(installmentIndex));
  return url.toString();
}

export async function sendPaymentLinkEmail(link, { message = "" } = {}) {
  const clientEmail = link.clientEmail;
  if (!clientEmail) {
    throw new Error("E-mail client requis pour l'envoi.");
  }

  const profile = loadProfile();
  const artisanEmail = profile.companyEmail || "support@exxon-bat.com";
  const typeLabel =
    link.type === "acompte"
      ? "Acompte"
      : link.type === "solde"
        ? "Solde"
        : link.type === "full"
          ? "Paiement total"
          : link.type === "plan"
            ? "Plan de paiement en plusieurs fois"
            : link.type === "echeance"
              ? link.installmentLabel || "Échéance"
              : "Paiement";

  const body = {
    _subject: `[Exxon-bat] Lien de paiement — ${link.jobName || "Devis"}`,
    _template: "table",
    _captcha: "false",
    _replyto: artisanEmail,
    destinataire: clientEmail,
    type_paiement: typeLabel,
    montant_ht: formatProfileMoney(link.amount),
    reference_virement: link.reference,
    lien_paiement: link.url,
    message:
      message ||
      (link.type === "plan"
        ? `Bonjour, voici votre plan de paiement en plusieurs fois pour « ${link.jobName || "votre devis"} ». Ouvrez le lien pour consulter les échéances et effectuer vos virements.`
        : `Bonjour, voici votre lien sécurisé pour régler ${typeLabel.toLowerCase()} de ${formatProfileMoney(link.amount)} HT.`),
  };

  const response = await fetch("https://formsubmit.co/ajax/support@exxon-bat.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error("Envoi e-mail impossible");

  const data = await response.json();
  if (data.success !== "true" && data.success !== true) {
    throw new Error("E-mail refusé");
  }

  return { ok: true, channel: "email" };
}

export function buildMailtoPaymentLink(link, message = "") {
  const subject = encodeURIComponent(`Paiement — ${link.jobName || "Devis"} (${formatProfileMoney(link.amount)} HT)`);
  const lines = [
    message || "Bonjour,",
    "",
    `Voici votre lien sécurisé de paiement (${formatProfileMoney(link.amount)} HT) :`,
    link.url,
    "",
    `Référence virement : ${link.reference}`,
    "",
    "Cordialement,",
    link.companyName || "",
  ];
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:${encodeURIComponent(link.clientEmail || "")}?subject=${subject}&body=${body}`;
}

/** Enregistre le total devis sur le lien pour calcul reste à payer. */
export function attachDevisTotalToLink(token, devisTotal) {
  const pending = loadJson(PENDING_KEY);
  const index = pending.findIndex((item) => item.token === token);
  if (index < 0) return;
  pending[index].devisTotal = Number(devisTotal) || 0;
  saveJson(PENDING_KEY, pending);
}

export { encodePaymentLinkPayload, buildPaymentPageUrl };
