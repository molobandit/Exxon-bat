const STORAGE_KEY = "exone-support-tickets";

function loadTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTickets(tickets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

function makeTicketId() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EXO-${ymd}-${rand}`;
}

export function getSupportTickets() {
  return loadTickets().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getSupportTicket(id) {
  return loadTickets().find((t) => t.id === id) ?? null;
}

export function createSupportTicket(payload) {
  const ticket = {
    id: makeTicketId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "ouvert",
    name: payload.name?.trim() ?? "",
    email: payload.email?.trim() ?? "",
    category: payload.category ?? "autre",
    subject: payload.subject?.trim() ?? "",
    message: payload.message?.trim() ?? "",
    priority: payload.priority ?? "normale",
    replies: [
      {
        at: new Date().toISOString(),
        from: "system",
        text: "Merci pour votre message. Un conseiller Exxon-bat vous répond sous 24 h ouvrées (Lun–Ven 8h–18h).",
      },
    ],
  };

  const tickets = loadTickets();
  tickets.unshift(ticket);
  saveTickets(tickets);
  return ticket;
}

export function updateTicketStatus(id, status) {
  const tickets = loadTickets();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tickets[idx].status = status;
  tickets[idx].updatedAt = new Date().toISOString();
  saveTickets(tickets);
  return tickets[idx];
}

export const SUPPORT_CHANNELS = {
  email: "support@exxon-bat.com",
  phone: "01 84 80 42 10",
  hours: "Lundi – Vendredi, 8h – 18h",
  responseTime: "Réponse sous 24 h ouvrées",
};

export const SUPPORT_EMAIL = SUPPORT_CHANNELS.email;
export const SUPPORT_FORM_ENDPOINT = `https://formsubmit.co/ajax/${SUPPORT_EMAIL}`;

function buildMailtoLink(ticket, diagnostic) {
  const lines = [
    `Ticket : ${ticket.id}`,
    `Nom : ${ticket.name}`,
    `E-mail : ${ticket.email}`,
    `Catégorie : ${ticket.category}`,
    `Priorité : ${ticket.priority}`,
    "",
    ticket.message,
  ];
  if (diagnostic) {
    lines.push("", "--- Rapport diagnostic (anonyme) ---", JSON.stringify(diagnostic, null, 2));
  }
  const subject = encodeURIComponent(`[Exxon-bat ${ticket.id}] ${ticket.subject}`);
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export async function sendTicketEmail(ticket, options = {}) {
  const payload = {
    _subject: `[Exxon-bat ${ticket.id}] ${ticket.subject}`,
    _template: "table",
    _captcha: "false",
    _replyto: ticket.email,
    ticket_id: ticket.id,
    nom: ticket.name,
    email: ticket.email,
    categorie: ticket.category,
    priorite: ticket.priority,
    objet: ticket.subject,
    message: ticket.message,
  };

  if (options.diagnostic) {
    payload.rapport_diagnostic = JSON.stringify(options.diagnostic, null, 2);
  }

  try {
    const response = await fetch(SUPPORT_FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("email-failed");

    const data = await response.json();
    if (data.success !== "true" && data.success !== true) {
      throw new Error("email-rejected");
    }

    return { ok: true, channel: "email" };
  } catch {
    window.location.href = buildMailtoLink(ticket, options.diagnostic);
    return { ok: true, channel: "mailto" };
  }
}

export async function sendDiagnosticEmail(report, contact = {}) {
  const payload = {
    _subject: `[Exxon-bat Diagnostic] Rapport technique ${report.generatedAt.slice(0, 10)}`,
    _template: "table",
    _captcha: "false",
    _replyto: contact.email || SUPPORT_EMAIL,
    type: "diagnostic-anonyme",
    email_contact: contact.email || "non-renseigné",
    rapport: JSON.stringify(report, null, 2),
  };

  try {
    const response = await fetch(SUPPORT_FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("email-failed");
    const data = await response.json();
    if (data.success !== "true" && data.success !== true) {
      throw new Error("email-rejected");
    }
    return { ok: true, channel: "email" };
  } catch {
    const subject = encodeURIComponent(`[Exxon-bat Diagnostic] ${report.generatedAt.slice(0, 10)}`);
    const body = encodeURIComponent(JSON.stringify(report, null, 2));
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    return { ok: true, channel: "mailto" };
  }
}

export function markTicketEmailSent(id) {
  const tickets = loadTickets();
  const index = tickets.findIndex((ticket) => ticket.id === id);
  if (index === -1) return null;
  tickets[index].emailSentAt = new Date().toISOString();
  tickets[index].updatedAt = new Date().toISOString();
  saveTickets(tickets);
  return tickets[index];
}

export const TICKET_CATEGORIES = [
  { value: "configuration", label: "Configuration & profil" },
  { value: "devis", label: "Devis & rentabilité" },
  { value: "bibliotheque", label: "Bibliothèque & photos" },
  { value: "facturation", label: "Facturation & abonnement" },
  { value: "technique", label: "Problème technique" },
  { value: "autre", label: "Autre demande" },
];
