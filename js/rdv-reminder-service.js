import { getUser } from "./auth.js";
import { loadProfile } from "./storage.js";
import { addDays, getPlanningSettings, saveRdvReminderSettings, toDateStr } from "./planning-store.js";
import { collectCalendarEvents, formatTimeRange } from "./planning-calendar.js";

const SENT_KEY = "exone-rdv-reminders-sent";
const LOG_KEY = "exone-rdv-reminders-log";

const REMINDABLE_TYPES = new Set(["rdv", "intervention"]);

function loadSent() {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveSent(data) {
  localStorage.setItem(SENT_KEY, JSON.stringify(data));
}

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY)) ?? [];
  } catch {
    return [];
  }
}

function appendLog(entry) {
  const log = [entry, ...loadLog()].slice(0, 40);
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
  return log;
}

export function getRdvReminderLog() {
  return loadLog();
}

function reminderKey(eventId, appointmentDateStr) {
  return `${eventId}@${appointmentDateStr}`;
}

export function wasReminderSent(eventId, appointmentDateStr) {
  return Boolean(loadSent()[reminderKey(eventId, appointmentDateStr)]);
}

function markReminderSent(eventId, appointmentDateStr, channels) {
  const sent = loadSent();
  sent[reminderKey(eventId, appointmentDateStr)] = {
    at: new Date().toISOString(),
    ...channels,
  };
  saveSent(sent);
}

export function getReminderEmail(settings = getPlanningSettings()) {
  const profile = loadProfile();
  const user = getUser();
  return (
    settings.rdvReminders.reminderEmail?.trim() ||
    profile.companyEmail?.trim() ||
    user?.email?.trim() ||
    ""
  );
}

/** RDV / interventions de demain éligibles au rappel veille. */
export function getTomorrowRemindableEvents() {
  const tomorrow = toDateStr(addDays(new Date(), 1));
  const events = collectCalendarEvents({
    from: `${tomorrow}T00:00:00`,
    to: `${tomorrow}T23:59:59`,
  });

  return events.filter(
    (ev) =>
      REMINDABLE_TYPES.has(ev.type) &&
      toDateStr(ev.start) === tomorrow &&
      !ev.meta?.completed,
  );
}

function formatLongDate(iso) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function buildReminderContent(event) {
  const when = formatLongDate(event.start);
  const time = formatTimeRange(event.startMs, event.endMs);
  const client = event.clientName || event.subtitle || "—";
  const place = event.location || "—";

  const subject = `Rappel RDV demain — ${client}${event.title ? ` · ${event.title}` : ""}`;
  const lines = [
    "Bonjour,",
    "",
    "Rappel automatique Exxon-bat : vous avez un rendez-vous demain.",
    "",
    `📅 ${when}`,
    `🕐 ${time}`,
    `📋 ${event.title}`,
    `👤 Client : ${client}`,
    `📍 Lieu / note : ${place}`,
    "",
    "—",
    "Exxon-bat · Planning",
    "Ouvrez planning.html pour voir votre agenda complet.",
  ];

  return { subject, body: lines.join("\n"), when, time, client, place };
}

function formEndpoint(email) {
  return `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;
}

export async function sendReminderEmail(event, { toEmail, copyClient = false } = {}) {
  const email = toEmail || getReminderEmail();
  if (!email) {
    return { ok: false, reason: "Aucune adresse e-mail configurée (profil ou rappels)." };
  }

  const { subject, body, client } = buildReminderContent(event);

  try {
    const response = await fetch(formEndpoint(email), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: subject,
        _template: "table",
        _captcha: "false",
        message: body,
        client,
        rdv: event.title,
        date: formatLongDate(event.start),
      }),
    });

    if (!response.ok) {
      throw new Error("network");
    }

    const result = { ok: true, channel: "email", to: email };

    if (copyClient && event.clientEmail) {
      try {
        await fetch(formEndpoint(event.clientEmail), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: `Rappel — rendez-vous demain avec ${loadProfile().companyName || "votre artisan"}`,
            _template: "table",
            _captcha: "false",
            message: `Bonjour,\n\nNous vous rappelons notre rendez-vous demain.\n\n${body}`,
          }),
        });
        result.clientCopy = true;
      } catch {
        result.clientCopy = false;
        result.clientCopyFallback = buildClientMailto(event);
      }
    }

    return result;
  } catch {
    return {
      ok: true,
      channel: "mailto",
      mailto: buildArtisanMailto(event, email),
    };
  }
}

export function buildArtisanMailto(event, email) {
  const { subject, body } = buildReminderContent(event);
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildClientMailto(event) {
  if (!event.clientEmail) return "";
  const { body } = buildReminderContent(event);
  const company = loadProfile().companyName || "Votre artisan";
  const subject = `Rappel — rendez-vous demain (${company})`;
  return `mailto:${encodeURIComponent(event.clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Bonjour,\n\n${body}`)}`;
}

export async function showReminderNotification(event) {
  if (!("Notification" in window)) {
    return { ok: false, reason: "Notifications non supportées par ce navigateur." };
  }

  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }

  if (Notification.permission !== "granted") {
    return { ok: false, reason: "Autorisez les notifications dans votre navigateur." };
  }

  const { subject, when, time, client } = buildReminderContent(event);

  const notification = new Notification(subject, {
    body: `${when}\n${time} · ${client}`,
    icon: "/icons/logo-mark.svg",
    badge: "/icons/logo-mark.svg",
    tag: `rdv-reminder-${event.id}`,
    requireInteraction: true,
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = "/planning.html";
    notification.close();
  };

  return { ok: true, channel: "notification" };
}

export async function processDueReminders(options = {}) {
  const settings = getPlanningSettings();
  const reminders = settings.rdvReminders;

  if (!reminders.enabled && !options.force) {
    return { processed: 0, skipped: "disabled" };
  }

  const tomorrow = toDateStr(addDays(new Date(), 1));
  const events = options.testEvent ? [options.testEvent] : getTomorrowRemindableEvents();
  const results = [];

  for (const event of events) {
    const apptDate = toDateStr(event.start);
    if (!options.force && !options.test && wasReminderSent(event.id, apptDate)) continue;

    const channels = {};
    let ok = false;

    if (reminders.notificationEnabled || options.forceNotification) {
      const notif = await showReminderNotification(event);
      channels.notification = notif.ok;
      if (notif.ok) ok = true;
    }

    if (reminders.emailEnabled || options.forceEmail) {
      const mail = await sendReminderEmail(event, {
        copyClient: reminders.clientEmailEnabled,
      });
      channels.email = mail.ok;
      if (mail.channel === "mailto" && mail.mailto) {
        channels.mailtoFallback = mail.mailto;
      }
      if (mail.ok) ok = true;
    }

    if (ok || options.force) {
      if (!options.test) {
        markReminderSent(event.id, apptDate, channels);
      }
      appendLog({
        at: new Date().toISOString(),
        eventId: event.id,
        title: event.title,
        client: event.clientName,
        appointmentDate: apptDate,
        channels,
        test: Boolean(options.test),
      });
      results.push({ event, channels, ok: true });
    }
  }

  return { processed: results.length, results, tomorrow };
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function getNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function sendTestReminder() {
  const tomorrow = addDays(new Date(), 1);
  tomorrow.setHours(10, 0, 0, 0);
  const end = new Date(tomorrow);
  end.setHours(12, 0, 0, 0);

  const testEvent = {
    id: "test-rdv",
    type: "rdv",
    title: "Visite test (démo)",
    clientName: "Client exemple",
    subtitle: "Client exemple",
    location: "Adresse test",
    start: tomorrow.toISOString(),
    end: end.toISOString(),
    startMs: tomorrow.getTime(),
    endMs: end.getTime(),
  };

  return processDueReminders({
    force: true,
    test: true,
    testEvent,
    forceNotification: true,
    forceEmail: true,
  });
}

export { saveRdvReminderSettings, getPlanningSettings };
