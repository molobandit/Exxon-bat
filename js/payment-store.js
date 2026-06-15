import { getDefaultPaymentTerms as getProfilePaymentTerms } from "./storage.js";

const PAYMENTS_KEY = "exone-devis-payments";

export const PAYMENT_STATUS_LABELS = {
  pending: "En attente",
  partial: "Partiel",
  paid: "Payé",
  overdue: "Impayé",
};

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(PAYMENTS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveAll(data) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(data));
}

export function getDefaultPaymentTerms() {
  return getProfilePaymentTerms();
}

export function getDevisPayment(devisId) {
  const terms = getDefaultPaymentTerms();
  const all = loadAll();
  return (
    all[devisId] ?? {
      status: "pending",
      totalPaid: 0,
      dueDate: "",
      paymentTerms: terms,
      depositAmount: 0,
      depositPaid: false,
      installments: [],
      reminders: [],
      autoReminders: false,
    }
  );
}

export function saveDevisPayment(devisId, patch) {
  const all = loadAll();
  all[devisId] = { ...getDevisPayment(devisId), ...patch };
  saveAll(all);
  return all[devisId];
}

function sumPaidInstallments(installments = []) {
  return Math.round(
    installments.reduce((sum, row) => sum + (row.paid ? Number(row.amount) || 0 : 0), 0) * 100,
  ) / 100;
}

function effectiveTotalPaid(payment) {
  if (payment.installments?.length) {
    const fromInstallments = sumPaidInstallments(payment.installments);
    if (fromInstallments > 0 || payment.planInitialized) return fromInstallments;
  }
  return Number(payment.totalPaid) || 0;
}

export function computeRemaining(totalAmount, payment) {
  const paid = effectiveTotalPaid(payment);
  return Math.max(0, (Number(totalAmount) || 0) - paid);
}

export function computePaymentStatus(devisId, totalAmount) {
  const payment = getDevisPayment(devisId);
  const total = Number(totalAmount) || 0;
  const paid = effectiveTotalPaid(payment);
  const today = new Date().toISOString().slice(0, 10);
  let status = "pending";

  if (total > 0 && paid >= total - 0.01) {
    status = "paid";
  } else if (paid > 0) {
    status = "partial";
  } else if (payment.dueDate && payment.dueDate < today) {
    status = "overdue";
  }

  return { ...payment, status, remaining: computeRemaining(total, payment) };
}

export function refreshPaymentStatus(devisId, totalAmount) {
  const computed = computePaymentStatus(devisId, totalAmount);
  return saveDevisPayment(devisId, {
    status: computed.status,
    remaining: computed.remaining,
  });
}

export function addManualReminder(devisId, note = "") {
  const payment = getDevisPayment(devisId);
  const reminders = [
    ...(payment.reminders ?? []),
    { date: new Date().toISOString(), type: "manual", note: note.trim() },
  ];
  return saveDevisPayment(devisId, { reminders });
}

export function addAutoReminder(devisId) {
  const payment = getDevisPayment(devisId);
  const reminders = [
    ...(payment.reminders ?? []),
    { date: new Date().toISOString(), type: "auto", note: "Relance automatique envoyée" },
  ];
  return saveDevisPayment(devisId, { reminders, lastAutoReminder: new Date().toISOString() });
}

export function shouldSendAutoReminder(devisId, totalAmount) {
  const payment = getDevisPayment(devisId);
  if (!payment.autoReminders) return false;
  const computed = computePaymentStatus(devisId, totalAmount);
  if (computed.status === "paid") return false;
  if (!computed.dueDate || computed.dueDate >= new Date().toISOString().slice(0, 10)) return false;
  if (!payment.lastAutoReminder) return true;
  const daysSince =
    (Date.now() - new Date(payment.lastAutoReminder).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 7;
}
