const SETTINGS_KEY = "exone-planning-settings";
const EVENTS_KEY = "exone-planning-events";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const DAY_LABELS = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche",
};

export const DEFAULT_WORK_SCHEDULE = {
  mon: { enabled: true, start: "07:30", end: "18:30" },
  tue: { enabled: true, start: "07:30", end: "18:30" },
  wed: { enabled: true, start: "07:30", end: "18:30" },
  thu: { enabled: true, start: "07:30", end: "18:30" },
  fri: { enabled: true, start: "07:30", end: "18:30" },
  sat: { enabled: false, start: "08:00", end: "12:00" },
  sun: { enabled: false, start: "08:00", end: "12:00" },
};

export const EVENT_TYPES = {
  intervention: { label: "Intervention chantier", color: "#6665dd", icon: "🔨" },
  rdv: { label: "Rendez-vous client", color: "#0ea5e9", icon: "📅" },
  indispo: { label: "Indisponible", color: "#94a3b8", icon: "🚫" },
  tache: { label: "Tâche chantier", color: "#8b5cf6", icon: "📋" },
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadSettingsRaw() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function getPlanningSettings() {
  const raw = loadSettingsRaw();
  return {
    workSchedule: { ...DEFAULT_WORK_SCHEDULE, ...raw.workSchedule },
    defaultSlotMinutes: raw.defaultSlotMinutes ?? 120,
    weekStartsOn: raw.weekStartsOn ?? "mon",
    rdvReminders: {
      enabled: raw.rdvReminders?.enabled !== false,
      emailEnabled: raw.rdvReminders?.emailEnabled !== false,
      notificationEnabled: raw.rdvReminders?.notificationEnabled !== false,
      clientEmailEnabled: raw.rdvReminders?.clientEmailEnabled === true,
      reminderEmail: raw.rdvReminders?.reminderEmail ?? "",
    },
  };
}

export function saveRdvReminderSettings(patch) {
  const current = getPlanningSettings();
  return savePlanningSettings({
    rdvReminders: { ...current.rdvReminders, ...patch },
  });
}

export function savePlanningSettings(patch) {
  const current = getPlanningSettings();
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...current,
      ...patch,
      workSchedule: patch.workSchedule
        ? { ...current.workSchedule, ...patch.workSchedule }
        : current.workSchedule,
    }),
  );
  return getPlanningSettings();
}

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveEvents(list) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
}

export function getPlanningEvents() {
  return loadEvents();
}

export function addPlanningEvent(event) {
  const list = loadEvents();
  const entry = {
    id: uid(),
    type: event.type || "intervention",
    title: String(event.title || "").trim(),
    start: event.start,
    end: event.end,
    chantierId: event.chantierId || "",
    opportunityId: event.opportunityId || "",
    devisId: event.devisId || "",
    clientName: event.clientName || "",
    clientEmail: event.clientEmail || "",
    location: event.location || "",
    note: event.note || "",
    createdAt: new Date().toISOString(),
  };
  list.push(entry);
  saveEvents(list);
  return entry;
}

export function updatePlanningEvent(id, patch) {
  const list = loadEvents();
  const index = list.findIndex((e) => e.id === id);
  if (index < 0) return null;
  list[index] = { ...list[index], ...patch };
  saveEvents(list);
  return list[index];
}

export function deletePlanningEvent(id) {
  saveEvents(loadEvents().filter((e) => e.id !== id));
}

export function getDayKey(date) {
  return DAY_KEYS[new Date(date).getDay()];
}

export function parseTimeOnDate(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}`).getTime();
}

export function getWorkWindowForDate(dateStr, settings = getPlanningSettings()) {
  const key = getDayKey(dateStr);
  const day = settings.workSchedule[key];
  if (!day?.enabled) return null;
  return {
    start: parseTimeOnDate(dateStr, day.start),
    end: parseTimeOnDate(dateStr, day.end),
    startTime: day.start,
    endTime: day.end,
  };
}

export function startOfWeek(date = new Date(), weekStartsOn = "mon") {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const offset = weekStartsOn === "mon" ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + offset);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateStr(date) {
  return new Date(date).toISOString().slice(0, 10);
}
