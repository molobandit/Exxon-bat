import { getUser } from "./auth.js";
import {
  addActivity,
  addTask,
  deleteTask,
  ensureChantierAccessCodes,
  getChantiers,
  getTasksByChantier,
  updateTask,
} from "./data.js";
import { computeChantierProgress } from "./chantier-hub.js";
import { initModule } from "./module-base.js";
import { addAppointment } from "./commercial-store.js";
import { escapeHtml } from "./utils.js";
import {
  addPlanningEvent,
  DAY_LABELS,
  DEFAULT_WORK_SCHEDULE,
  getPlanningSettings,
  savePlanningSettings,
  startOfWeek,
  addDays,
  toDateStr,
} from "./planning-store.js";
import {
  collectCalendarEvents,
  eventsForDay,
  formatSlotLabel,
  formatTimeRange,
  getPlanningDashboard,
  loadTone,
} from "./planning-calendar.js";
import {
  getNotificationPermission,
  getReminderEmail,
  getRdvReminderLog,
  getTomorrowRemindableEvents,
  processDueReminders,
  requestNotificationPermission,
  saveRdvReminderSettings,
  sendTestReminder,
} from "./rdv-reminder-service.js";

initModule("planning", "planning");

const user = getUser();
let currentWeekStart = startOfWeek(new Date(), getPlanningSettings().weekStartsOn);
let currentChantierId = "";

const kpisEl = document.getElementById("planning-kpis");
const nextFreeEl = document.getElementById("planning-next-free");
const toScheduleEl = document.getElementById("to-schedule-list");
const weekEl = document.getElementById("planning-week");
const weekLabelEl = document.getElementById("week-label");
const availabilityEl = document.getElementById("availability-list");
const chantierSelect = document.getElementById("chantier-select");
const ganttChart = document.getElementById("gantt-chart");
const tasksList = document.getElementById("tasks-list");
const ganttProgress = document.getElementById("gantt-progress");
const scheduleModal = document.getElementById("schedule-modal");
const hoursForm = document.getElementById("hours-form");

function formatShortDate(value) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function formatWeekRange(start, end) {
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function isToday(dateStr) {
  return dateStr === toDateStr(new Date());
}

function renderHoursForm() {
  const settings = getPlanningSettings();
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  hoursForm.innerHTML = order
    .map(
      (key) => `
    <label class="planning-hours__row">
      <input type="checkbox" name="enabled-${key}" ${settings.workSchedule[key]?.enabled ? "checked" : ""} />
      <span>${DAY_LABELS[key]}</span>
      <input type="time" name="start-${key}" value="${settings.workSchedule[key]?.start ?? DEFAULT_WORK_SCHEDULE[key].start}" />
      <input type="time" name="end-${key}" value="${settings.workSchedule[key]?.end ?? DEFAULT_WORK_SCHEDULE[key].end}" />
    </label>`,
    )
    .join("");
}

function renderReminderSettings() {
  const settings = getPlanningSettings();
  const r = settings.rdvReminders;
  document.getElementById("reminder-enabled").checked = r.enabled;
  document.getElementById("reminder-email").checked = r.emailEnabled;
  document.getElementById("reminder-notif").checked = r.notificationEnabled;
  document.getElementById("reminder-client").checked = r.clientEmailEnabled;
  document.getElementById("reminder-email-to").value = r.reminderEmail || getReminderEmail(settings);

  const perm = getNotificationPermission();
  const tomorrowCount = getTomorrowRemindableEvents().length;
  const statusEl = document.getElementById("reminder-status");
  if (statusEl) {
    const permLabel =
      perm === "granted"
        ? "Notifications autorisées"
        : perm === "denied"
          ? "Notifications bloquées — autorisez dans les réglages du navigateur"
          : "Cliquez « Autoriser notifications »";
    statusEl.textContent =
      tomorrowCount > 0
        ? `${tomorrowCount} RDV demain · ${permLabel}. Rappel envoyé automatiquement à l'ouverture de l'app la veille.`
        : `${permLabel}. Aucun RDV demain pour l'instant.`;
  }
}

function renderReminderLog() {
  const logEl = document.getElementById("reminder-log");
  if (!logEl) return;
  const log = getRdvReminderLog().slice(0, 5);
  logEl.innerHTML = log.length
    ? log
        .map(
          (entry) => `
      <li>
        ${entry.test ? "🧪 Test" : "✓"} ${escapeHtml(entry.title || "RDV")} — ${escapeHtml(entry.client || "")}
        <small>${formatShortDate(entry.at)}${entry.channels?.email ? " · e-mail" : ""}${entry.channels?.notification ? " · notif" : ""}</small>
      </li>`,
        )
        .join("")
    : "";
}

async function runReminderCheck(showAlert = false) {
  const result = await processDueReminders();
  renderReminderLog();
  renderReminderSettings();
  if (showAlert && result.processed > 0) {
    alert(`${result.processed} rappel(s) envoyé(s) pour vos RDV de demain.`);
  }
  return result;
}

function renderKpis(dashboard) {
  kpisEl.innerHTML = `
    <article class="planning-kpi${dashboard.todayRdv ? " planning-kpi--alert" : ""}">
      <span>RDV aujourd'hui</span>
      <strong>${dashboard.todayRdv}</strong>
    </article>
    <article class="planning-kpi">
      <span>RDV 14 jours</span>
      <strong>${dashboard.upcomingRdv}</strong>
    </article>
    <article class="planning-kpi">
      <span>Charge semaine</span>
      <strong>${dashboard.avgLoad} %</strong>
    </article>
    <article class="planning-kpi${dashboard.toSchedule.length ? " planning-kpi--alert" : ""}">
      <span>À planifier</span>
      <strong>${dashboard.toSchedule.length}</strong>
    </article>
  `;

  if (dashboard.nextFree) {
    nextFreeEl.hidden = false;
    nextFreeEl.innerHTML = `
      <div class="planning-next-free__icon">✨</div>
      <div>
        <strong>Prochain créneau libre</strong>
        <p>${formatShortDate(dashboard.nextFree.dateStr)} · ${formatTimeRange(new Date(dashboard.nextFree.start).getTime(), new Date(dashboard.nextFree.end).getTime())}</p>
      </div>
      <button type="button" class="btn btn--primary btn--sm" id="use-next-free">Utiliser ce créneau</button>
    `;
    document.getElementById("use-next-free")?.addEventListener("click", () => {
      openScheduleModal({
        title: "Intervention",
        date: dashboard.nextFree.dateStr,
        start: new Date(dashboard.nextFree.start).toTimeString().slice(0, 5),
        end: new Date(dashboard.nextFree.end).toTimeString().slice(0, 5),
      });
    });
  } else {
    nextFreeEl.hidden = true;
  }
}

function renderToSchedule(dashboard) {
  if (!dashboard.toSchedule.length) {
    toScheduleEl.innerHTML = `<p class="planning-queue__empty">Rien en attente — votre calendrier est à jour.</p>`;
    return;
  }

  toScheduleEl.innerHTML = dashboard.toSchedule
    .map((item) => {
      const name = item.chantier?.name || item.opp?.clientName || "Dossier";
      const sub = item.opp?.jobName || item.chantier?.client || "";
      const title = item.chantier?.name || item.opp?.jobName || "Intervention";
      return `
      <article class="planning-queue__item">
        <div>
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml(item.label)}${sub ? ` · ${escapeHtml(sub)}` : ""}</small>
        </div>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          data-schedule-opp="${escapeHtml(item.opp?.id || "")}"
          data-schedule-chantier="${escapeHtml(item.chantier?.id || item.opp?.chantierId || "")}"
          data-schedule-title="${escapeHtml(title)}"
          data-schedule-client="${escapeHtml(item.opp?.clientName || item.chantier?.client || "")}"
          data-schedule-email="${escapeHtml(item.opp?.clientEmail || "")}"
          data-schedule-location="${escapeHtml(item.chantier?.location || "")}"
        >Planifier</button>
      </article>`;
    })
    .join("");
}

function renderWeek(dashboard) {
  weekLabelEl.textContent = formatWeekRange(dashboard.weekStart, dashboard.weekEnd);

  weekEl.innerHTML = dashboard.weekDays
    .map((day) => {
      const dayEvents = eventsForDay(dashboard.events, day.dateStr);
      const tone = loadTone(day.loadPercent);
      const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(
        new Date(day.dateStr),
      );
      const dayNum = new Date(day.dateStr).getDate();

      return `
      <article class="planning-day${isToday(day.dateStr) ? " planning-day--today" : ""}${!day.isWorkDay ? " planning-day--off" : ""}">
        <header class="planning-day__head">
          <span class="planning-day__weekday">${weekday}</span>
          <span class="planning-day__num">${dayNum}</span>
          ${
            day.isWorkDay
              ? `<span class="planning-day__load status-pill status-pill--${tone}">${day.loadPercent} %</span>`
              : `<span class="planning-day__load status-pill status-pill--neutral">Repos</span>`
          }
        </header>
        <div class="planning-day__events">
          ${
            dayEvents.length
              ? dayEvents
                  .map(
                    (ev) => `
            <div class="planning-event" style="--ev-color:${ev.color}" title="${escapeHtml(ev.typeLabel)}">
              <span class="planning-event__time">${formatTimeRange(ev.startMs, ev.endMs)}</span>
              <strong>${escapeHtml(ev.title)}</strong>
              <small>${escapeHtml(ev.subtitle || ev.clientName || "")}</small>
            </div>`,
                  )
                  .join("")
              : `<p class="planning-day__empty">${day.isWorkDay ? "Libre" : "—"}</p>`
          }
        </div>
        ${
          day.isWorkDay && day.freeSlots.length
            ? `<footer class="planning-day__free">${day.freeSlots.length} créneau(x) libre(s)</footer>`
            : ""
        }
      </article>`;
    })
    .join("");
}

function renderAvailability(dashboard) {
  availabilityEl.innerHTML = dashboard.weekDays
    .map((day) => {
      const weekday = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(day.dateStr));
      const tone = loadTone(day.loadPercent);

      if (!day.isWorkDay) {
        return `
        <article class="planning-avail-row planning-avail-row--off">
          <div><strong>${weekday}</strong><p>Jour non travaillé</p></div>
        </article>`;
      }

      const slots =
        day.freeSlots.length > 0
          ? day.freeSlots
              .map(
                (s) =>
                  `<button type="button" class="planning-slot" data-slot-date="${day.dateStr}" data-slot-start="${new Date(s.start).toTimeString().slice(0, 5)}" data-slot-end="${new Date(s.end).toTimeString().slice(0, 5)}">${formatSlotLabel(s)}</button>`,
              )
              .join("")
          : `<span class="planning-avail-full">Complet — aucun créneau de ${getPlanningSettings().defaultSlotMinutes} min</span>`;

      return `
      <article class="planning-avail-row">
        <div class="planning-avail-row__head">
          <strong>${weekday}</strong>
          <span class="status-pill status-pill--${tone}">${day.loadPercent} % occupé · ${day.availableMinutes} min libres</span>
        </div>
        <div class="planning-avail-row__bar">
          <div class="planning-avail-row__fill status-pill--${tone}" style="width:${day.loadPercent}%"></div>
        </div>
        <div class="planning-avail-row__slots">${slots}</div>
      </article>`;
    })
    .join("");
}

function refreshCalendarViews() {
  const dashboard = getPlanningDashboard(currentWeekStart);
  renderKpis(dashboard);
  renderToSchedule(dashboard);
  renderWeek(dashboard);
  renderAvailability(dashboard);
}

function openScheduleModal(payload = {}) {
  scheduleModal.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("schedule-opp-id").value = payload.oppId || "";
  document.getElementById("schedule-chantier-id").value = payload.chantierId || "";
  document.getElementById("schedule-client-name").value = payload.clientName || "";
  document.getElementById("schedule-client-email").value = payload.clientEmail || "";
  document.getElementById("schedule-modal-title").textContent = payload.title
    ? `Planifier — ${payload.title}`
    : "Planifier une intervention";
  document.getElementById("schedule-modal-desc").textContent =
    payload.clientName
      ? `Client : ${payload.clientName}${payload.location ? ` · ${payload.location}` : ""}`
      : "Choisissez date et horaires — le calendrier et le Gantt seront mis à jour.";

  const tomorrow = addDays(new Date(), 1);
  document.getElementById("schedule-date").value =
    payload.date || toDateStr(tomorrow);
  document.getElementById("schedule-start").value = payload.start || "08:00";
  document.getElementById("schedule-end").value = payload.end || "12:00";
  document.getElementById("schedule-title").value = payload.title || "Intervention";
  document.getElementById("schedule-location").value = payload.location || "";
  document.getElementById("schedule-type").value = payload.type || "intervention";
  document.getElementById("schedule-create-task").checked = Boolean(payload.chantierId);
}

function closeScheduleModal() {
  scheduleModal.hidden = true;
  document.body.style.overflow = "";
}

function submitSchedule(event) {
  event.preventDefault();
  const date = document.getElementById("schedule-date").value;
  const startTime = document.getElementById("schedule-start").value;
  const endTime = document.getElementById("schedule-end").value;
  const title = document.getElementById("schedule-title").value.trim();
  const location = document.getElementById("schedule-location").value.trim();
  const type = document.getElementById("schedule-type").value;
  const oppId = document.getElementById("schedule-opp-id").value;
  const chantierId = document.getElementById("schedule-chantier-id").value;
  const createTask = document.getElementById("schedule-create-task").checked;

  const start = `${date}T${startTime}`;
  const end = `${date}T${endTime}`;

  addPlanningEvent({
    type,
    title,
    start,
    end,
    chantierId,
    opportunityId: oppId,
    location,
    clientName: document.getElementById("schedule-client-name").value.trim(),
    clientEmail: document.getElementById("schedule-client-email").value.trim(),
  });

  if (type === "rdv" && oppId) {
    addAppointment(oppId, { at: start, type: "pose", note: location });
  }

  if (createTask && chantierId) {
    const task = addTask({
      chantierId,
      name: title,
      startDate: date,
      endDate: date,
      assignee: user?.firstname ?? "Employeur",
      progress: 0,
      status: "todo",
    });
    addActivity({
      chantierId,
      type: "task",
      icon: "📅",
      title: "Intervention planifiée",
      message: `${task.name} — ${formatShortDate(date)} ${startTime}–${endTime}`,
      author: user?.firstname ?? "Employeur",
    });
  }

  closeScheduleModal();
  refreshCalendarViews();
  renderGanttSection();
}

/* ——— Gantt (existant, par chantier) ——— */

function populateChantiers() {
  const chantiers = ensureChantierAccessCodes();
  chantierSelect.innerHTML = chantiers.length
    ? chantiers.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")
    : `<option value="">Aucun chantier</option>`;
  currentChantierId = chantierSelect.value;
}

function dayMs(date) {
  return new Date(date).setHours(0, 0, 0, 0);
}

function getTimelineRange(tasks) {
  if (!tasks.length) {
    const today = new Date();
    const end = addDays(today, 14);
    return { start: dayMs(today), end: dayMs(end) };
  }
  const starts = tasks.map((t) => dayMs(t.startDate));
  const ends = tasks.map((t) => dayMs(t.endDate));
  return { start: Math.min(...starts), end: Math.max(...ends) };
}

function renderGantt(tasks) {
  if (!tasks.length) {
    ganttChart.innerHTML = `<p style="padding:24px;color:var(--text-muted);margin:0">Aucune tâche — planifiez depuis l'agenda ou ajoutez une tâche ci-dessus.</p>`;
    return;
  }

  const range = getTimelineRange(tasks);
  const totalDays = Math.max(1, Math.round((range.end - range.start) / 86400000) + 1);
  const dayLabels = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(range.start + index * 86400000);
    return `<div class="gantt__day">${formatShortDate(date)}</div>`;
  });

  const rows = tasks
    .map((task) => {
      const startOffset = Math.max(0, (dayMs(task.startDate) - range.start) / 86400000);
      const duration = Math.max(1, (dayMs(task.endDate) - dayMs(task.startDate)) / 86400000 + 1);
      const left = (startOffset / totalDays) * 100;
      const width = (duration / totalDays) * 100;
      const isLate = task.progress < 100 && dayMs(task.endDate) < dayMs(new Date());
      const barClass = task.progress >= 100 ? "gantt__bar--done" : isLate ? "gantt__bar--late" : "";

      return `
      <div class="gantt__row">
        <div class="gantt__task-col">
          <strong>${escapeHtml(task.name)}</strong><br>
          <small>${escapeHtml(task.assignee || "—")} · ${task.progress} %</small>
        </div>
        <div class="gantt__timeline-col">
          <div class="gantt__days">${dayLabels.join("")}</div>
          <div class="gantt__bar ${barClass}" style="left:${left}%;width:${width}%">${escapeHtml(task.name)}</div>
        </div>
      </div>`;
    })
    .join("");

  ganttChart.innerHTML = `
    <div class="gantt">
      <div class="gantt__head">
        <div class="gantt__task-col">Tâche</div>
        <div class="gantt__timeline-col" style="min-height:auto;padding:8px 0">
          <div class="gantt__days">${dayLabels.join("")}</div>
        </div>
      </div>
      ${rows}
    </div>`;
}

function renderTasksTable(tasks) {
  tasksList.innerHTML = tasks.length
    ? tasks
        .map(
          (task) => `
      <tr>
        <td><strong>${escapeHtml(task.name)}</strong></td>
        <td>${formatShortDate(task.startDate)} → ${formatShortDate(task.endDate)}</td>
        <td>${escapeHtml(task.assignee || "—")}</td>
        <td>
          <input type="range" min="0" max="100" step="5" value="${task.progress}" data-task-progress="${task.id}" style="width:120px" />
          <span>${task.progress} %</span>
        </td>
        <td><button type="button" class="btn btn--ghost btn--sm" data-delete-task="${task.id}">Supprimer</button></td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" style="color:var(--text-muted)">Aucune tâche.</td></tr>`;

  tasksList.querySelectorAll("[data-task-progress]").forEach((input) => {
    input.addEventListener("input", () => {
      const progress = Number(input.value);
      const status = progress >= 100 ? "done" : progress > 0 ? "in_progress" : "todo";
      updateTask(input.dataset.taskProgress, { progress, status });
      input.nextElementSibling.textContent = `${progress} %`;
      renderGanttSection();
      refreshCalendarViews();
    });
  });

  tasksList.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteTask(button.dataset.deleteTask);
      renderGanttSection();
      refreshCalendarViews();
    });
  });
}

function renderGanttSection() {
  const tasks = getTasksByChantier(currentChantierId);
  const progress = computeChantierProgress(currentChantierId);
  ganttProgress.textContent = `${progress} %`;
  ganttProgress.className = `status-pill status-pill--${progress >= 100 ? "success" : "warning"}`;
  renderGantt(tasks);
  renderTasksTable(tasks);
}

/* ——— Events ——— */

document.querySelectorAll(".planning-tabs__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".planning-tabs__btn").forEach((b) => b.classList.remove("planning-tabs__btn--active"));
    btn.classList.add("planning-tabs__btn--active");
    document.querySelectorAll(".planning-panel").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== btn.dataset.tab;
    });
  });
});

document.getElementById("week-prev")?.addEventListener("click", () => {
  currentWeekStart = addDays(currentWeekStart, -7);
  refreshCalendarViews();
});

document.getElementById("week-next")?.addEventListener("click", () => {
  currentWeekStart = addDays(currentWeekStart, 7);
  refreshCalendarViews();
});

document.getElementById("week-today")?.addEventListener("click", () => {
  currentWeekStart = startOfWeek(new Date(), getPlanningSettings().weekStartsOn);
  refreshCalendarViews();
});

document.getElementById("block-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const date = document.getElementById("block-date").value;
  const start = document.getElementById("block-start").value;
  const end = document.getElementById("block-end").value;
  const title = document.getElementById("block-title").value.trim();
  addPlanningEvent({
    type: "indispo",
    title,
    start: `${date}T${start}`,
    end: `${date}T${end}`,
  });
  e.target.reset();
  document.getElementById("block-date").value = toDateStr(new Date());
  refreshCalendarViews();
});

document.getElementById("schedule-form")?.addEventListener("submit", submitSchedule);

document.getElementById("reminder-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  saveRdvReminderSettings({
    enabled: document.getElementById("reminder-enabled").checked,
    emailEnabled: document.getElementById("reminder-email").checked,
    notificationEnabled: document.getElementById("reminder-notif").checked,
    clientEmailEnabled: document.getElementById("reminder-client").checked,
    reminderEmail: document.getElementById("reminder-email-to").value.trim(),
  });
  renderReminderSettings();
  alert("Préférences de rappel enregistrées.");
});

document.getElementById("reminder-permission")?.addEventListener("click", async () => {
  const perm = await requestNotificationPermission();
  renderReminderSettings();
  if (perm === "granted") alert("Notifications activées — vous recevrez un rappel la veille de chaque RDV.");
  else if (perm === "denied") alert("Notifications refusées. Autorisez Exxon-bat dans les réglages de votre navigateur.");
});

document.getElementById("reminder-test")?.addEventListener("click", async () => {
  const result = await sendTestReminder();
  renderReminderLog();
  if (result.processed) {
    alert("Rappel test envoyé — vérifiez vos notifications et votre boîte e-mail.");
  } else {
    alert("Impossible d'envoyer le test — vérifiez e-mail et notifications.");
  }
});

document.getElementById("hours-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(hoursForm);
  const workSchedule = {};
  for (const key of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]) {
    workSchedule[key] = {
      enabled: fd.get(`enabled-${key}`) === "on",
      start: fd.get(`start-${key}`),
      end: fd.get(`end-${key}`),
    };
  }
  savePlanningSettings({ workSchedule });
  refreshCalendarViews();
});

document.body.addEventListener("click", (e) => {
  const scheduleBtn = e.target.closest("[data-schedule-title]");
  if (scheduleBtn) {
    openScheduleModal({
      oppId: scheduleBtn.dataset.scheduleOpp,
      chantierId: scheduleBtn.dataset.scheduleChantier,
      title: scheduleBtn.dataset.scheduleTitle,
      clientName: scheduleBtn.dataset.scheduleClient,
      clientEmail: scheduleBtn.dataset.scheduleEmail,
      location: scheduleBtn.dataset.scheduleLocation,
    });
    return;
  }

  const slotBtn = e.target.closest(".planning-slot");
  if (slotBtn) {
    openScheduleModal({
      date: slotBtn.dataset.slotDate,
      start: slotBtn.dataset.slotStart,
      end: slotBtn.dataset.slotEnd,
      title: "Intervention",
    });
    return;
  }

  if (e.target.closest("[data-close-modal]")) closeScheduleModal();
});

chantierSelect?.addEventListener("change", () => {
  currentChantierId = chantierSelect.value;
  renderGanttSection();
});

document.getElementById("task-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentChantierId) return;

  const startDate = document.getElementById("task-start").value;
  const endDate = document.getElementById("task-end").value;
  const task = addTask({
    chantierId: currentChantierId,
    name: document.getElementById("task-name").value.trim(),
    startDate,
    endDate,
    assignee: document.getElementById("task-assignee").value.trim(),
    progress: 0,
    status: "todo",
  });

  addActivity({
    chantierId: currentChantierId,
    type: "task",
    icon: "📅",
    title: "Nouvelle tâche planifiée",
    message: `${task.name} — ${formatShortDate(startDate)} au ${formatShortDate(endDate)}`,
    author: user?.firstname ?? "Employeur",
  });

  event.target.reset();
  const today = toDateStr(new Date());
  document.getElementById("task-start").value = today;
  document.getElementById("task-end").value = toDateStr(addDays(new Date(), 7));
  renderGanttSection();
  refreshCalendarViews();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !scheduleModal.hidden) closeScheduleModal();
});

const today = toDateStr(new Date());
document.getElementById("block-date").value = today;
document.getElementById("task-start").value = today;
document.getElementById("task-end").value = toDateStr(addDays(new Date(), 7));

renderHoursForm();
renderReminderSettings();
renderReminderLog();
populateChantiers();

const preselected = new URLSearchParams(window.location.search).get("chantier");
if (preselected && chantierSelect?.querySelector(`option[value="${preselected}"]`)) {
  chantierSelect.value = preselected;
  currentChantierId = preselected;
  document.querySelector('[data-tab="gantt"]')?.click();
}

refreshCalendarViews();
renderGanttSection();
runReminderCheck();
