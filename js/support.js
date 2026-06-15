import { initAppNav } from "./nav-app.js";
import { getUser, requireAuth } from "./auth.js";
import {
  buildDiagnosticReport,
  downloadDiagnosticReport,
  enrichDiagnosticReport,
} from "./diagnostic-report.js";
import {
  createSupportTicket,
  getSupportTickets,
  markTicketEmailSent,
  sendDiagnosticEmail,
  sendTicketEmail,
  SUPPORT_CHANNELS,
  TICKET_CATEGORIES,
} from "./support-store.js";
import { escapeHtml } from "./utils.js";

if (!requireAuth()) return;

initAppNav("support");

const user = getUser();

const els = {
  email: document.getElementById("support-email"),
  phone: document.getElementById("support-phone"),
  hours: document.getElementById("support-hours"),
  response: document.getElementById("support-response"),
  form: document.getElementById("support-form"),
  success: document.getElementById("support-success"),
  ticketList: document.getElementById("support-ticket-list"),
  category: document.getElementById("ticket-category"),
  submit: document.getElementById("support-submit"),
  diagnosticConsent: document.getElementById("diagnostic-consent"),
  diagnosticDownload: document.getElementById("diagnostic-download"),
  diagnosticSend: document.getElementById("diagnostic-send"),
  diagnosticFeedback: document.getElementById("diagnostic-feedback"),
};

if (els.email) els.email.textContent = SUPPORT_CHANNELS.email;
if (els.phone) els.phone.textContent = SUPPORT_CHANNELS.phone;
if (els.hours) els.hours.textContent = SUPPORT_CHANNELS.hours;
if (els.response) els.response.textContent = SUPPORT_CHANNELS.responseTime;

if (els.category) {
  for (const cat of TICKET_CATEGORIES) {
    const opt = document.createElement("option");
    opt.value = cat.value;
    opt.textContent = cat.label;
    els.category.appendChild(opt);
  }
}

const nameInput = document.getElementById("ticket-name");
const emailInput = document.getElementById("ticket-email");
const diagnosticCheckbox = document.getElementById("ticket-diagnostic");

if (user) {
  if (nameInput && user.firstname) nameInput.value = user.firstname;
  if (emailInput) emailInput.value = user.email;
}

function statusLabel(status) {
  const map = { ouvert: "Ouvert", "en-cours": "En cours", resolu: "Résolu" };
  return map[status] ?? status;
}

function renderTickets() {
  if (!els.ticketList) return;
  const tickets = getSupportTickets();

  if (tickets.length === 0) {
    els.ticketList.innerHTML = `<div class="support-empty">Aucun ticket pour le moment. Utilisez le formulaire ci-dessus pour nous écrire.</div>`;
    return;
  }

  els.ticketList.innerHTML = tickets
    .map((ticket) => {
      const date = new Date(ticket.createdAt).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const statusClass = `support-ticket__status--${ticket.status}`;
      const sentNote = ticket.emailSentAt
        ? `<p class="support-ticket__meta">Envoyé à ${SUPPORT_CHANNELS.email}</p>`
        : "";
      return `
        <article class="support-ticket">
          <div class="support-ticket__head">
            <span class="support-ticket__id">${escapeHtml(ticket.id)}</span>
            <span class="support-ticket__status ${statusClass}">${escapeHtml(statusLabel(ticket.status))}</span>
          </div>
          <strong>${escapeHtml(ticket.subject)}</strong>
          <p class="support-ticket__meta">${escapeHtml(date)} · ${escapeHtml(ticket.category)}</p>
          ${sentNote}
          <p>${escapeHtml(ticket.message)}</p>
        </article>
      `;
    })
    .join("");
}

async function buildFullDiagnosticReport() {
  const report = buildDiagnosticReport();
  return enrichDiagnosticReport(report);
}

function setSubmitLoading(loading) {
  if (!els.submit) return;
  els.submit.disabled = loading;
  els.submit.textContent = loading ? "Envoi en cours…" : "Envoyer ma demande";
}

function showDiagnosticFeedback(message, tone = "success") {
  if (!els.diagnosticFeedback) return;
  els.diagnosticFeedback.hidden = false;
  els.diagnosticFeedback.className = `support-diagnostic__feedback support-diagnostic__feedback--${tone}`;
  els.diagnosticFeedback.textContent = message;
}

renderTickets();

if (els.diagnosticConsent && els.diagnosticSend) {
  els.diagnosticConsent.addEventListener("change", () => {
    els.diagnosticSend.disabled = !els.diagnosticConsent.checked;
  });
}

if (els.diagnosticDownload) {
  els.diagnosticDownload.addEventListener("click", async () => {
    const report = await buildFullDiagnosticReport();
    downloadDiagnosticReport(report);
    showDiagnosticFeedback("Rapport téléchargé sur votre appareil.", "success");
  });
}

if (els.diagnosticSend) {
  els.diagnosticSend.addEventListener("click", async () => {
    if (!els.diagnosticConsent?.checked) return;

    els.diagnosticSend.disabled = true;
    els.diagnosticSend.textContent = "Envoi…";

    const report = await buildFullDiagnosticReport();
    const result = await sendDiagnosticEmail(report, { email: user?.email });

    els.diagnosticSend.textContent = "Envoyer au support";
    els.diagnosticSend.disabled = !els.diagnosticConsent.checked;

    showDiagnosticFeedback(
      result.channel === "email"
        ? "Rapport envoyé à support@exxon-bat.com. Réponse sous 24 h ouvrées."
        : "Votre client mail s'ouvre avec le rapport — validez l'envoi pour nous le transmettre.",
      "success",
    );
  });
}

if (els.form) {
  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(els.form);

    setSubmitLoading(true);

    const ticket = createSupportTicket({
      name: formData.get("name"),
      email: formData.get("email"),
      category: formData.get("category"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      priority: formData.get("priority"),
    });

    let diagnostic = null;
    if (diagnosticCheckbox?.checked) {
      diagnostic = await buildFullDiagnosticReport();
    }

    const delivery = await sendTicketEmail(ticket, { diagnostic });
    markTicketEmailSent(ticket.id);

    els.form.reset();
    if (user) {
      if (nameInput && user.firstname) nameInput.value = user.firstname;
      if (emailInput) emailInput.value = user.email;
    }

    if (els.success) {
      els.success.hidden = false;
      const channelMsg =
        delivery.channel === "email"
          ? `Votre demande <strong>${escapeHtml(ticket.id)}</strong> a été envoyée à <strong>${escapeHtml(SUPPORT_CHANNELS.email)}</strong>. Un conseiller vous répond sous 24 h ouvrées.`
          : `Votre demande <strong>${escapeHtml(ticket.id)}</strong> est enregistrée. Votre client mail s'ouvre — validez l'envoi pour nous contacter.`;
      els.success.innerHTML = channelMsg;
    }

    setSubmitLoading(false);
    renderTickets();
    els.success?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}
