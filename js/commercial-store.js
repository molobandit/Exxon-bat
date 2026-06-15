const COMMERCIAL_KEY = "exone-commercial";

export const COMMERCIAL_STAGES = {
  prospect: {
    id: "prospect",
    label: "Prospect",
    short: "Prospect",
    order: 1,
    tone: "neutral",
    icon: "👤",
    hint: "Contact identifié, pas encore de devis",
  },
  devis_envoye: {
    id: "devis_envoye",
    label: "Devis envoyé",
    short: "Envoyé",
    order: 2,
    tone: "info",
    icon: "📄",
    hint: "Devis imprimé / transmis au client",
  },
  en_attente: {
    id: "en_attente",
    label: "En attente",
    short: "Attente",
    order: 3,
    tone: "warning",
    icon: "⏳",
    hint: "Réponse client en cours",
  },
  rdv_planifie: {
    id: "rdv_planifie",
    label: "RDV planifié",
    short: "RDV",
    order: 4,
    tone: "primary",
    icon: "📅",
    hint: "Visite ou rendez-vous programmé",
  },
  valide: {
    id: "valide",
    label: "Devis validé",
    short: "Validé",
    order: 5,
    tone: "success",
    icon: "✅",
    hint: "Bon pour accord — travaux à planifier",
  },
  en_cours: {
    id: "en_cours",
    label: "En cours",
    short: "Chantier",
    order: 6,
    tone: "warning",
    icon: "🔨",
    hint: "Chantier ou travaux démarrés",
  },
  paye: {
    id: "paye",
    label: "Payé / clos",
    short: "Payé",
    order: 7,
    tone: "success",
    icon: "💰",
    hint: "Encaissement complet",
  },
  perdu: {
    id: "perdu",
    label: "Perdu",
    short: "Perdu",
    order: 8,
    tone: "danger",
    icon: "✕",
    hint: "Devis refusé ou sans suite",
  },
};

export const PIPELINE_STAGES = [
  "prospect",
  "devis_envoye",
  "en_attente",
  "rdv_planifie",
  "valide",
  "en_cours",
  "paye",
];

export const APPOINTMENT_TYPES = {
  visite: "Visite chantier",
  signature: "Signature devis",
  rappel: "Rappel client",
  pose: "Intervention / pose",
  autre: "Autre",
};

const STAGE_RANK = Object.fromEntries(
  Object.entries(COMMERCIAL_STAGES).map(([id, s]) => [id, s.order]),
);

function load() {
  try {
    return JSON.parse(localStorage.getItem(COMMERCIAL_KEY)) ?? [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(COMMERCIAL_KEY, JSON.stringify(list));
}

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getOpportunities() {
  return load();
}

export function getOpportunityById(id) {
  return getOpportunities().find((o) => o.id === id) ?? null;
}

export function getOpportunityByDevisId(devisId) {
  if (!devisId) return null;
  return getOpportunities().find((o) => o.devisId === devisId) ?? null;
}

export function getOpportunitiesByClientId(clientId) {
  return getOpportunities().filter((o) => o.clientId === clientId);
}

function normalizeOpportunity(entry) {
  const stage = COMMERCIAL_STAGES[entry.stage] ? entry.stage : "prospect";
  return {
    id: entry.id || uid(),
    clientId: entry.clientId || "",
    clientName: String(entry.clientName || "").trim(),
    clientEmail: String(entry.clientEmail || "").trim(),
    clientPhone: String(entry.clientPhone || "").trim(),
    devisId: entry.devisId || "",
    devisNumber: entry.devisNumber || "",
    jobName: String(entry.jobName || "").trim(),
    amount: Number(entry.amount) || 0,
    stage,
    stageAt: entry.stageAt || entry.createdAt || nowIso(),
    sentAt: entry.sentAt || "",
    validatedAt: entry.validatedAt || "",
    lostReason: entry.lostReason || "",
    nextFollowUp: entry.nextFollowUp || "",
    chantierId: entry.chantierId || "",
    appointments: Array.isArray(entry.appointments) ? entry.appointments : [],
    notes: Array.isArray(entry.notes) ? entry.notes : [],
    updatedAt: entry.updatedAt || nowIso(),
    createdAt: entry.createdAt || nowIso(),
  };
}

export function upsertOpportunity(patch) {
  const list = getOpportunities();
  const index = patch.id
    ? list.findIndex((o) => o.id === patch.id)
    : patch.devisId
      ? list.findIndex((o) => o.devisId === patch.devisId)
      : -1;

  const base =
    index >= 0
      ? list[index]
      : normalizeOpportunity({ id: uid(), createdAt: nowIso(), stage: "prospect" });

  const merged = normalizeOpportunity({
    ...base,
    ...patch,
    id: base.id,
    createdAt: base.createdAt,
    updatedAt: nowIso(),
  });

  if (index >= 0) list[index] = merged;
  else list.unshift(merged);

  save(list);
  return merged;
}

/** Ne régresse pas automatiquement vers un stade antérieur (sauf « perdu » manuel). */
export function setOpportunityStage(id, stage, extra = {}) {
  const opp = getOpportunityById(id);
  if (!opp || !COMMERCIAL_STAGES[stage]) return null;

  const patch = {
    id,
    stage,
    stageAt: nowIso(),
    ...extra,
  };

  if (stage === "valide" && !opp.validatedAt) {
    patch.validatedAt = nowIso();
  }
  if (stage === "devis_envoye" && !opp.sentAt) {
    patch.sentAt = nowIso();
  }
  if (stage === "perdu") {
    patch.lostReason = extra.lostReason || opp.lostReason || "";
  }

  return upsertOpportunity(patch);
}

export function advanceOpportunityStage(id, stage, extra = {}) {
  const opp = getOpportunityById(id);
  if (!opp || !COMMERCIAL_STAGES[stage]) return null;
  if (stage !== "perdu" && STAGE_RANK[stage] < STAGE_RANK[opp.stage]) {
    return opp;
  }
  return setOpportunityStage(id, stage, extra);
}

export function addOpportunityNote(id, text) {
  const opp = getOpportunityById(id);
  if (!opp || !text?.trim()) return null;
  const note = { id: uid(), text: text.trim(), at: nowIso() };
  return upsertOpportunity({
    id,
    notes: [note, ...opp.notes].slice(0, 30),
  });
}

export function addAppointment(id, { at, type = "visite", note = "" }) {
  const opp = getOpportunityById(id);
  if (!opp || !at) return null;

  const appointment = {
    id: uid(),
    at,
    type,
    note: String(note || "").trim(),
    completed: false,
    createdAt: nowIso(),
  };

  const updated = upsertOpportunity({
    id,
    appointments: [...opp.appointments, appointment],
    nextFollowUp: at.slice(0, 10),
  });

  if (STAGE_RANK[updated.stage] < STAGE_RANK.rdv_planifie && updated.stage !== "perdu") {
    return setOpportunityStage(id, "rdv_planifie");
  }
  return updated;
}

export function completeAppointment(oppId, appointmentId) {
  const opp = getOpportunityById(oppId);
  if (!opp) return null;
  return upsertOpportunity({
    id: oppId,
    appointments: opp.appointments.map((a) =>
      a.id === appointmentId ? { ...a, completed: true, completedAt: nowIso() } : a,
    ),
  });
}

export function deleteOpportunity(id) {
  save(getOpportunities().filter((o) => o.id !== id));
}

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a, b) {
  return Math.floor((startOfDay(b) - startOfDay(a)) / 86400000);
}

export function getUpcomingAppointments({ days = 14 } = {}) {
  const end = new Date();
  end.setDate(end.getDate() + days);
  const now = new Date();

  return getOpportunities()
    .flatMap((opp) =>
      opp.appointments
        .filter((a) => !a.completed && a.at)
        .map((a) => ({ ...a, opportunity: opp })),
    )
    .filter((a) => {
      const dt = new Date(a.at);
      return dt >= now && dt <= end;
    })
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

export function getTodayAppointments() {
  const today = new Date().toISOString().slice(0, 10);
  return getOpportunities()
    .flatMap((opp) =>
      opp.appointments
        .filter((a) => !a.completed && a.at?.startsWith(today))
        .map((a) => ({ ...a, opportunity: opp })),
    )
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

export function getActionItems() {
  const today = new Date();
  const items = [];

  for (const opp of getOpportunities()) {
    if (opp.stage === "perdu" || opp.stage === "paye") continue;

    const nextAppt = opp.appointments
      .filter((a) => !a.completed && a.at)
      .sort((a, b) => new Date(a.at) - new Date(b.at))[0];

    if (nextAppt) {
      const apptDate = new Date(nextAppt.at);
      const diff = daysBetween(today, apptDate);
      if (diff <= 0) {
        items.push({
          priority: diff < 0 ? 1 : 2,
          kind: "rdv",
          label:
            diff < 0
              ? `RDV en retard — ${APPOINTMENT_TYPES[nextAppt.type] || "RDV"}`
              : `RDV aujourd'hui — ${APPOINTMENT_TYPES[nextAppt.type] || "RDV"}`,
          opp,
          at: nextAppt.at,
          appointmentId: nextAppt.id,
        });
      } else if (diff === 1) {
        items.push({
          priority: 3,
          kind: "rdv",
          label: "RDV demain",
          opp,
          at: nextAppt.at,
          appointmentId: nextAppt.id,
        });
      }
    }

    if (opp.nextFollowUp) {
      const followDiff = daysBetween(new Date(opp.nextFollowUp), today);
      if (followDiff >= 0 && !nextAppt) {
        items.push({
          priority: followDiff > 0 ? 4 : 2,
          kind: "relance",
          label: followDiff > 0 ? "Relance en retard" : "Relance prévue aujourd'hui",
          opp,
          at: opp.nextFollowUp,
        });
      }
    }

    if (opp.stage === "devis_envoye" || opp.stage === "en_attente") {
      const ref = opp.sentAt || opp.stageAt || opp.createdAt;
      const waiting = daysBetween(new Date(ref), today);
      if (waiting >= 7) {
        items.push({
          priority: 5,
          kind: "devis",
          label: `Devis sans réponse (${waiting} j)`,
          opp,
          at: ref,
        });
      }
    }

    if (opp.stage === "valide" && !opp.chantierId) {
      items.push({
        priority: 6,
        kind: "valide",
        label: "Devis validé — planifier le chantier",
        opp,
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority || new Date(a.at || 0) - new Date(b.at || 0));
}

export function getCommercialDashboard() {
  const opps = getOpportunities().filter((o) => o.stage !== "perdu");
  const pipelineValue = opps
    .filter((o) => !["paye", "prospect"].includes(o.stage))
    .reduce((s, o) => s + (o.amount || 0), 0);

  const byStage = {};
  for (const stage of PIPELINE_STAGES) {
    byStage[stage] = opps.filter((o) => o.stage === stage);
  }

  return {
    totalActive: opps.length,
    pipelineValue,
    awaitingResponse: byStage.en_attente.length + byStage.devis_envoye.length,
    validated: byStage.valide.length + byStage.en_cours.length,
    todayRdv: getTodayAppointments().length,
    actionItems: getActionItems(),
    byStage,
    upcoming: getUpcomingAppointments({ days: 7 }),
  };
}

export function getPipelineGrouped() {
  const dashboard = getCommercialDashboard();
  return PIPELINE_STAGES.map((stage) => ({
    stage,
    meta: COMMERCIAL_STAGES[stage],
    items: dashboard.byStage[stage] ?? [],
  }));
}
