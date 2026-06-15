import { formatProfileMoney } from "./market.js";
import { getDevisPayment, saveDevisPayment } from "./payment-store.js";
import {
  buildMailtoPaymentLink,
  createPaymentPlanLink,
  sendPaymentLinkEmail,
} from "./payment-link-service.js";
import { hasPaymentCapability } from "./subscription.js";
import { loadProfile } from "./storage.js";

export const DEFAULT_PAYMENT_SCHEDULE = [
  { label: "Acompte à la commande", percent: 30, daysAfter: 0 },
  { label: "Solde à réception des travaux", percent: 70, daysAfter: 30 },
];

export function getDefaultPaymentSchedule(profile = loadProfile()) {
  const schedule = profile.defaultPaymentSchedule;
  if (Array.isArray(schedule) && schedule.length) {
    return schedule.map((row, index) => ({
      label: row.label?.trim() || `Échéance ${index + 1}`,
      percent: Number(row.percent) || 0,
      daysAfter: Math.max(0, Number(row.daysAfter) || 0),
    }));
  }
  return DEFAULT_PAYMENT_SCHEDULE.map((row) => ({ ...row }));
}

export function validatePaymentSchedule(schedule) {
  if (!Array.isArray(schedule) || !schedule.length) {
    return { ok: false, total: 0, error: "Ajoutez au moins une échéance." };
  }
  if (schedule.length > 8) {
    return { ok: false, total: 0, error: "Maximum 8 échéances." };
  }
  const total = schedule.reduce((sum, row) => sum + (Number(row.percent) || 0), 0);
  if (Math.abs(total - 100) > 0.01) {
    return { ok: false, total, error: `Les pourcentages doivent totaliser 100 % (actuellement ${total} %).` };
  }
  return { ok: true, total, error: "" };
}

/** Échéances calculées depuis le modèle profil (pourcentages + délais). */
export function buildDefaultInstallments(total, profile = loadProfile()) {
  const amount = Math.round((Number(total) || 0) * 100) / 100;
  if (amount <= 0) return [];

  const schedule = getDefaultPaymentSchedule(profile);
  const today = new Date();
  let remaining = amount;

  return schedule.map((row, index) => {
    const isLast = index === schedule.length - 1;
    const installmentAmount = isLast
      ? Math.round(remaining * 100) / 100
      : Math.round(amount * ((Number(row.percent) || 0) / 100) * 100) / 100;
    remaining = Math.round((remaining - installmentAmount) * 100) / 100;

    const dueDate = new Date(today.getTime() + (Number(row.daysAfter) || 0) * 86400000)
      .toISOString()
      .slice(0, 10);

    return {
      label: row.label || `Échéance ${index + 1}`,
      dueDate,
      amount: installmentAmount,
      paid: false,
    };
  });
}

export function formatInstallmentsAsTerms(installments) {
  return installments
    .map((row, index) => {
      const label = row.label || `Échéance ${index + 1}`;
      const datePart = row.dueDate
        ? ` avant le ${new Date(row.dueDate).toLocaleDateString("fr-FR")}`
        : "";
      return `${label} : ${formatProfileMoney(row.amount)} HT${datePart}`;
    })
    .join(" — ");
}

export function scheduleToPaymentTerms(schedule, exampleTotal = 10000) {
  const preview = buildDefaultInstallments(exampleTotal, {
    ...loadProfile(),
    defaultPaymentSchedule: schedule,
  });
  return formatInstallmentsAsTerms(preview);
}

export function sumPaidInstallments(installments = []) {
  return Math.round(
    installments.reduce((sum, row) => sum + (row.paid ? Number(row.amount) || 0 : 0), 0) * 100,
  ) / 100;
}

/** Initialise le plan de paiement après validation commerciale du devis. */
export function initPaymentPlanForDevis(devis) {
  if (!devis?.id) return null;

  const existing = getDevisPayment(devis.id);
  if (existing.planInitialized && existing.installments?.length) {
    return existing;
  }

  const installments = buildDefaultInstallments(devis.price);
  if (!installments.length) {
    return existing.planInitialized ? existing : null;
  }

  const paymentTerms = formatInstallmentsAsTerms(installments);

  return saveDevisPayment(devis.id, {
    installments,
    planInitialized: true,
    depositAmount: installments[0]?.amount ?? 0,
    paymentTerms,
    dueDate: installments[0]?.dueDate ?? "",
    status: "pending",
    totalPaid: sumPaidInstallments(installments),
  });
}

/** Réapplique le modèle du profil sur un devis (si aucun encaissement). */
export function applyProfilePlanToDevis(devis, { force = false } = {}) {
  if (!devis?.id) return { ok: false, reason: "Devis introuvable." };

  const existing = getDevisPayment(devis.id);
  const hasPayments =
    sumPaidInstallments(existing.installments) > 0 || Number(existing.totalPaid) > 0;

  if (!force && hasPayments) {
    return { ok: false, reason: "Des encaissements existent déjà — modifiez les échéances manuellement." };
  }

  const installments = buildDefaultInstallments(devis.price);
  const paymentTerms = formatInstallmentsAsTerms(installments);

  saveDevisPayment(devis.id, {
    installments,
    planInitialized: true,
    depositAmount: installments[0]?.amount ?? 0,
    paymentTerms,
    dueDate: installments[0]?.dueDate ?? "",
    totalPaid: 0,
    depositPaid: false,
    status: "pending",
  });

  return { ok: true, installments };
}

/** Appelé quand l'artisan valide le devis (devis.html ou CRM). */
export function onDevisValidated(devis) {
  return initPaymentPlanForDevis(devis);
}

/** Crée et envoie le lien plan de paiement au client après validation. */
export async function sendValidatedDevisPaymentLink(devis) {
  if (!devis?.id) {
    return { ok: false, reason: "no_devis", message: "Devis introuvable." };
  }

  initPaymentPlanForDevis(devis);

  if (!hasPaymentCapability("tracking")) {
    return {
      ok: false,
      reason: "no_capability",
      message: "Le suivi des paiements nécessite l'offre Pro.",
    };
  }

  const profile = loadProfile();
  if (!profile.companyIban?.trim()) {
    return {
      ok: false,
      reason: "no_iban",
      message: "Renseignez votre IBAN dans Mon profil pour envoyer un lien de paiement.",
    };
  }

  let link;
  try {
    link = createPaymentPlanLink(devis, { clientEmail: devis.clientEmail?.trim() || "" });
  } catch (error) {
    return { ok: false, reason: "link_error", message: error.message || "Impossible de créer le lien." };
  }

  const clientEmail = devis.clientEmail?.trim();
  if (!clientEmail) {
    return {
      ok: false,
      reason: "no_email",
      link,
      message: "Ajoutez l'e-mail du client sur le devis pour l'envoi automatique.",
    };
  }

  const customMessage = `Bonjour ${devis.clientName || ""}, votre devis « ${devis.jobName || "prestation"} » est validé. Voici votre plan de paiement en plusieurs fois (${formatProfileMoney(devis.price)} HT) :`;

  try {
    await sendPaymentLinkEmail(link, { message: customMessage.trim() });
    return {
      ok: true,
      channel: "email",
      link,
      message: `Lien de paiement envoyé à ${clientEmail}.`,
    };
  } catch {
    return {
      ok: true,
      channel: "mailto",
      link,
      mailto: buildMailtoPaymentLink(link, customMessage),
      message: "Envoi automatique indisponible — ouvrez votre messagerie pour envoyer le lien.",
    };
  }
}

export async function notifyValidatedDevisPayment(devis) {
  const result = await sendValidatedDevisPaymentLink(devis);
  const clientEmail = devis.clientEmail?.trim();

  if (result.link?.url) {
    try {
      await navigator.clipboard.writeText(result.link.url);
    } catch {
      /* ignore */
    }
  }

  if (result.ok && result.channel === "email") {
    alert(
      `Devis validé.\n\nLien de paiement envoyé à ${clientEmail}.\nLe lien est aussi copié — vous pouvez le renvoyer par SMS ou WhatsApp si besoin.`,
    );
    return result;
  }

  if (result.link && clientEmail) {
    const mailto =
      result.mailto ||
      buildMailtoPaymentLink(
        result.link,
        `Bonjour ${devis.clientName || ""}, votre devis « ${devis.jobName || "prestation"} » est validé. Voici votre plan de paiement en plusieurs fois :`,
      );
    window.location.href = mailto;
    return { ...result, channel: "mailto" };
  }

  if (result.link?.url) {
    alert(`Devis validé.\n\nLien de paiement copié — partagez-le au client (e-mail, SMS, WhatsApp).`);
    return result;
  }

  if (result.message) {
    alert(`Devis validé.\n\n${result.message}`);
  }

  return result;
}

export function getUnpaidInstallments(payment) {
  return (payment.installments ?? []).filter((row) => !row.paid);
}

export function markInstallmentPaid(devisId, installmentIndex, { amount } = {}) {
  const payment = getDevisPayment(devisId);
  const installments = [...(payment.installments ?? [])];
  const row = installments[installmentIndex];
  if (!row) return payment;

  installments[installmentIndex] = { ...row, paid: true, paidAt: new Date().toISOString() };
  const totalPaid = sumPaidInstallments(installments);

  return saveDevisPayment(devisId, {
    installments,
    totalPaid,
    depositPaid: installmentIndex === 0 || payment.depositPaid,
    depositAmount: installments[0]?.amount ?? payment.depositAmount,
  });
}
