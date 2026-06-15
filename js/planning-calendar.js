import {
  APPOINTMENT_TYPES,
  getOpportunities,
  getTodayAppointments,
  getUpcomingAppointments,
} from "./commercial-store.js";
import { getChantiers, getTasks } from "./data.js";
import {
  addDays,
  EVENT_TYPES,
  getDayKey,
  getPlanningEvents,
  getPlanningSettings,
  getWorkWindowForDate,
  parseTimeOnDate,
  startOfWeek,
  toDateStr,
} from "./planning-store.js";

const MS_MIN = 60000;

function parseEventBounds(start, end, fallbackMinutes = 120) {
  const startMs = new Date(start).getTime();
  let endMs = end ? new Date(end).getTime() : startMs + fallbackMinutes * MS_MIN;
  if (endMs <= startMs) endMs = startMs + fallbackMinutes * MS_MIN;
  return { startMs, endMs };
}

function normalizeCalendarEvent(raw) {
  const meta = EVENT_TYPES[raw.type] ?? EVENT_TYPES.intervention;
  const { startMs, endMs } = parseEventBounds(raw.start, raw.end, raw.durationMinutes ?? 120);
  return {
    ...raw,
    startMs,
    endMs,
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    color: raw.color || meta.color,
    icon: raw.icon || meta.icon,
    typeLabel: raw.typeLabel || meta.label,
  };
}

/** Tous les événements calendrier (commercial + tâches + planning manuel). */
export function collectCalendarEvents({ from, to } = {}) {
  const fromMs = from ? new Date(from).setHours(0, 0, 0, 0) : Date.now() - 7 * 86400000;
  const toMs = to ? new Date(to).setHours(23, 59, 59, 999) : Date.now() + 60 * 86400000;
  const events = [];

  for (const opp of getOpportunities()) {
    for (const appt of opp.appointments || []) {
      if (appt.completed || !appt.at) continue;
      const { startMs, endMs } = parseEventBounds(appt.at, appt.endAt, 90);
      if (endMs < fromMs || startMs > toMs) continue;
      events.push(
        normalizeCalendarEvent({
          id: `rdv-${opp.id}-${appt.id}`,
          source: "commercial",
          type: "rdv",
          title: APPOINTMENT_TYPES[appt.type] || "Rendez-vous",
          subtitle: opp.clientName,
          start: appt.at,
          end: appt.endAt,
          durationMinutes: 90,
          opportunityId: opp.id,
          devisId: opp.devisId,
          clientName: opp.clientName,
          clientEmail: opp.clientEmail || "",
          location: opp.jobName,
          chantierId: opp.chantierId,
          meta: appt,
        }),
      );
    }
  }

  for (const task of getTasks()) {
    if (!task.startDate) continue;
    const startDay = toDateStr(task.startDate);
    const endDay = toDateStr(task.endDate || task.startDate);
    const window = getWorkWindowForDate(startDay);
    const start = window
      ? `${startDay}T${window.startTime}`
      : `${startDay}T08:00`;
    const endWindow = getWorkWindowForDate(endDay);
    const end = endWindow ? `${endDay}T${endWindow.endTime}` : `${endDay}T17:00`;
    const { startMs, endMs } = parseEventBounds(start, end, 480);
    if (endMs < fromMs || startMs > toMs) continue;

    const chantier = getChantiers().find((c) => c.id === task.chantierId);
    events.push(
      normalizeCalendarEvent({
        id: `task-${task.id}`,
        source: "task",
        type: "tache",
        title: task.name,
        subtitle: chantier?.name || chantier?.client || "Chantier",
        start,
        end,
        chantierId: task.chantierId,
        clientName: chantier?.client,
        location: chantier?.location,
        progress: task.progress,
        meta: task,
      }),
    );
  }

  for (const evt of getPlanningEvents()) {
    const { startMs, endMs } = parseEventBounds(evt.start, evt.end, 120);
    if (endMs < fromMs || startMs > toMs) continue;
    events.push(
      normalizeCalendarEvent({
        id: `plan-${evt.id}`,
        source: "planning",
        type: evt.type,
        title: evt.title,
        subtitle: evt.clientName || evt.location,
        start: evt.start,
        end: evt.end,
        chantierId: evt.chantierId,
        opportunityId: evt.opportunityId,
        devisId: evt.devisId,
        clientName: evt.clientName,
        clientEmail: evt.clientEmail || "",
        location: evt.location,
        planningEventId: evt.id,
        meta: evt,
      }),
    );
  }

  return events.sort((a, b) => a.startMs - b.startMs);
}

/** Chantiers / devis validés sans date planifiée. */
export function getItemsToSchedule() {
  const items = [];
  const events = collectCalendarEvents();
  const tasks = getTasks();
  const chantiers = getChantiers();
  const now = Date.now();

  for (const opp of getOpportunities()) {
    if (!["valide", "en_cours", "rdv_planifie"].includes(opp.stage)) continue;

    const hasFutureRdv = (opp.appointments || []).some(
      (a) => !a.completed && a.at && new Date(a.at).getTime() >= now,
    );
    const hasTask = opp.chantierId && tasks.some((t) => t.chantierId === opp.chantierId);
    const hasPlanEvent = events.some(
      (e) =>
        e.opportunityId === opp.id ||
        (e.devisId && e.devisId === opp.devisId) ||
        (opp.chantierId && e.chantierId === opp.chantierId),
    );

    if (opp.stage === "valide" && !hasTask && !hasPlanEvent && !hasFutureRdv) {
      items.push({
        priority: 1,
        kind: "valide",
        label: "Devis validé — planifier l'intervention",
        opp,
        chantier: chantiers.find((c) => c.id === opp.chantierId) || null,
      });
    }

    if (opp.stage === "en_cours" && opp.chantierId && !hasTask && !hasPlanEvent) {
      const ch = chantiers.find((c) => c.id === opp.chantierId);
      items.push({
        priority: 2,
        kind: "chantier",
        label: "Chantier démarré — aucune tâche planifiée",
        opp,
        chantier: ch,
      });
    }
  }

  for (const ch of chantiers) {
    if (ch.status === "termine") continue;
    const chTasks = tasks.filter((t) => t.chantierId === ch.id);
    if (chTasks.length) continue;
    const linked = getOpportunities().find((o) => o.chantierId === ch.id);
    if (linked && items.some((i) => i.chantier?.id === ch.id)) continue;
    items.push({
      priority: 3,
      kind: "chantier",
      label: "Chantier sans planning",
      opp: linked,
      chantier: ch,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i += 1) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

function eventsOnDate(events, dateStr) {
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  const dayEnd = new Date(`${dateStr}T23:59:59`).getTime();
  return events.filter((e) => e.endMs >= dayStart && e.startMs <= dayEnd);
}

function busyIntervalsForDay(events, dateStr, workWindow) {
  if (!workWindow) return [];
  const dayStart = workWindow.start;
  const dayEnd = workWindow.end;

  return mergeIntervals(
    eventsOnDate(events, dateStr)
      .map((e) => ({
        start: Math.max(e.startMs, dayStart),
        end: Math.min(e.endMs, dayEnd),
      }))
      .filter((i) => i.end > i.start),
  );
}

function freeSlotsFromBusy(busy, workWindow, slotMinutes) {
  if (!workWindow) return [];
  const slots = [];
  let cursor = workWindow.start;
  const slotMs = slotMinutes * MS_MIN;

  for (const block of busy) {
    while (cursor + slotMs <= block.start) {
      slots.push({ start: cursor, end: cursor + slotMs });
      cursor += slotMs;
    }
    cursor = Math.max(cursor, block.end);
  }

  while (cursor + slotMs <= workWindow.end) {
    slots.push({ start: cursor, end: cursor + slotMs });
    cursor += slotMs;
  }

  return slots;
}

export function getDayAvailability(dateStr, settings = getPlanningSettings()) {
  const workWindow = getWorkWindowForDate(dateStr, settings);
  const events = collectCalendarEvents({
    from: `${dateStr}T00:00:00`,
    to: `${dateStr}T23:59:59`,
  });

  if (!workWindow) {
    return {
      dateStr,
      dayKey: getDayKey(dateStr),
      isWorkDay: false,
      loadPercent: 0,
      busyMinutes: 0,
      availableMinutes: 0,
      totalWorkMinutes: 0,
      freeSlots: [],
      events,
    };
  }

  const totalWorkMinutes = (workWindow.end - workWindow.start) / MS_MIN;
  const busy = busyIntervalsForDay(events, dateStr, workWindow);
  const busyMinutes = busy.reduce((s, b) => s + (b.end - b.start) / MS_MIN, 0);
  const loadPercent = Math.min(100, Math.round((busyMinutes / totalWorkMinutes) * 100));
  const freeSlots = freeSlotsFromBusy(busy, workWindow, settings.defaultSlotMinutes);

  return {
    dateStr,
    dayKey: getDayKey(dateStr),
    isWorkDay: true,
    loadPercent,
    busyMinutes: Math.round(busyMinutes),
    availableMinutes: Math.max(0, Math.round(totalWorkMinutes - busyMinutes)),
    totalWorkMinutes: Math.round(totalWorkMinutes),
    freeSlots,
    events,
    workWindow,
  };
}

export function getWeekAvailability(weekStartDate, settings = getPlanningSettings()) {
  const start = startOfWeek(weekStartDate, settings.weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => getDayAvailability(toDateStr(addDays(start, i)), settings));
}

export function findNextFreeSlot({ fromDate = new Date(), slotMinutes, maxDays = 21 } = {}) {
  const settings = getPlanningSettings();
  const duration = slotMinutes ?? settings.defaultSlotMinutes;
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  for (let d = 0; d < maxDays; d += 1) {
    const dateStr = toDateStr(addDays(start, d));
    const day = getDayAvailability(dateStr, settings);
    const futureSlots = day.freeSlots.filter((s) => s.start >= fromDate.getTime());
    if (futureSlots.length) {
      return {
        dateStr,
        start: new Date(futureSlots[0].start).toISOString(),
        end: new Date(futureSlots[0].end).toISOString(),
        day,
      };
    }
  }
  return null;
}

export function getPlanningDashboard(weekStartDate = new Date()) {
  const settings = getPlanningSettings();
  const weekStart = startOfWeek(weekStartDate, settings.weekStartsOn);
  const weekEnd = addDays(weekStart, 6);
  const weekDays = getWeekAvailability(weekStart, settings);
  const events = collectCalendarEvents({
    from: weekStart,
    to: weekEnd,
  });
  const toSchedule = getItemsToSchedule();
  const nextFree = findNextFreeSlot();
  const avgLoad =
    weekDays.filter((d) => d.isWorkDay).length > 0
      ? Math.round(
          weekDays.filter((d) => d.isWorkDay).reduce((s, d) => s + d.loadPercent, 0) /
            weekDays.filter((d) => d.isWorkDay).length,
        )
      : 0;

  return {
    weekStart,
    weekEnd,
    weekDays,
    events,
    toSchedule,
    todayRdv: getTodayAppointments().length,
    upcomingRdv: getUpcomingAppointments({ days: 14 }).length,
    nextFree,
    avgLoad,
    workDaysCount: weekDays.filter((d) => d.isWorkDay).length,
  };
}

export function formatTimeRange(startMs, endMs) {
  const fmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt.format(new Date(startMs))} – ${fmt.format(new Date(endMs))}`;
}

export function formatSlotLabel(slot) {
  return formatTimeRange(slot.start, slot.end);
}

export function eventsForDay(events, dateStr) {
  return eventsOnDate(events, dateStr).sort((a, b) => a.startMs - b.startMs);
}

export function loadTone(percent) {
  if (percent >= 85) return "danger";
  if (percent >= 55) return "warning";
  if (percent > 0) return "success";
  return "neutral";
}
