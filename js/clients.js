import { formatProfileMoney } from "./market.js";
import {
  APPOINTMENT_TYPES,
  COMMERCIAL_STAGES,
  addAppointment,
  addOpportunityNote,
  completeAppointment,
  getCommercialDashboard,
  getOpportunityById,
  getOpportunitiesByClientId,
  getPipelineGrouped,
  getUpcomingAppointments,
  setOpportunityStage,
  upsertOpportunity,
} from "./commercial-store.js";
import {
  markDevisAwaitingResponse,
  markDevisCommerciallyValidated,
  markDevisLost,
  reconcileCommercialPipeline,
} from "./commercial-sync.js";
import { findOrCreateClient, getClients, getDevisById, markDevisCommercialValidated } from "./data.js";
import { notifyValidatedDevisPayment, onDevisValidated } from "./payment-plan.js";
import { initModule } from "./module-base.js";
import { escapeHtml } from "./utils.js";

initModule("clients", "clients");

reconcileCommercialPipeline();

const kpisEl = document.getElementById("commercial-kpis");
const actionItemsEl = document.getElementById("action-items");
const pipelineEl = document.getElementById("pipeline-board");
const agendaEl = document.getElementById("agenda-list");
const clientsListEl = document.getElementById("clients-list");
const detailEl = document.getElementById("commercial-detail");
const clientForm = document.getElementById("client-form");
const rdvForm = document.getElementById("rdv-form");
const noteForm = document.getElementById("note-form");

let activeOpportunityId = null;

function stagePill(stageId) {
  const meta = COMMERCIAL_STAGES[stageId] ?? COMMERCIAL_STAGES.prospect;
  const tone = meta.tone === "neutral" ? "neutral" : meta.tone;
  return `<span class="status-pill status-pill--${tone}">${meta.icon} ${meta.label}</span>`;
}

function formatDate(iso, opts = {}) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: opts.year === false ? undefined : "numeric",
    hour: opts.time ? "2-digit" : undefined,
    minute: opts.time ? "2-digit" : undefined,
  }).format(new Date(iso));
}

function formatShortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(d);
}

function formatTime(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function refresh() {
  reconcileCommercialPipeline();
  renderKpis();
  renderActionItems();
  renderPipeline();
  renderAgenda();
  renderClients();
  if (activeOpportunityId) openDetail(activeOpportunityId);
}

function renderKpis() {
  const d = getCommercialDashboard();
  kpisEl.innerHTML = `
    <div class="commercial-kpi${d.actionItems.length ? " commercial-kpi--alert" : ""}">
      <div class="commercial-kpi__value">${d.actionItems.length}</div>
      <div class="commercial-kpi__label">À traiter</div>
    </div>
    <div class="commercial-kpi${d.todayRdv ? " commercial-kpi--alert" : ""}">
      <div class="commercial-kpi__value">${d.todayRdv}</div>
      <div class="commercial-kpi__label">RDV aujourd'hui</div>
    </div>
    <div class="commercial-kpi">
      <div class="commercial-kpi__value">${d.awaitingResponse}</div>
      <div class="commercial-kpi__label">Devis en attente</div>
    </div>
    <div class="commercial-kpi">
      <div class="commercial-kpi__value">${formatProfileMoney(d.pipelineValue)}</div>
      <div class="commercial-kpi__label">Pipeline actif</div>
    </div>
  `;
}

function renderActionItems() {
  const { actionItems } = getCommercialDashboard();

  if (!actionItems.length) {
    actionItemsEl.innerHTML = `
      <div class="commercial-empty">
        Rien d'urgent — votre suivi commercial est à jour.<br>
        <small>Imprimez un devis pour qu'il apparaisse automatiquement dans le pipeline.</small>
      </div>`;
    return;
  }

  actionItemsEl.innerHTML = actionItems
    .slice(0, 12)
    .map((item) => {
      const opp = item.opp;
      const urgent = item.priority <= 2;
      const today = item.priority === 2 || item.priority === 3;
      return `
      <article class="commercial-action${urgent ? " commercial-action--urgent" : today ? " commercial-action--today" : ""}">
        <span class="commercial-action__icon">${COMMERCIAL_STAGES[opp.stage]?.icon ?? "📋"}</span>
        <div class="commercial-action__body">
          <div class="commercial-action__title">${escapeHtml(item.label)}</div>
          <div class="commercial-action__meta">
            <strong>${escapeHtml(opp.clientName)}</strong> — ${escapeHtml(opp.jobName || "Prestation")}
            ${opp.amount ? ` · ${formatProfileMoney(opp.amount)}` : ""}
            ${item.at ? ` · ${formatShortDate(item.at)}${item.at.includes("T") ? " " + formatTime(item.at) : ""}` : ""}
          </div>
          <div class="commercial-action__btns">
            <button type="button" class="btn btn--primary btn--sm" data-open-opp="${opp.id}">Voir dossier</button>
            ${opp.devisId ? `<a href="devis.html?load=${opp.devisId}" class="btn btn--ghost btn--sm">Devis</a>` : ""}
            ${opp.clientPhone ? `<a href="tel:${escapeHtml(opp.clientPhone)}" class="btn btn--ghost btn--sm">Appeler</a>` : ""}
            ${item.kind === "devis" ? `<button type="button" class="btn btn--ghost btn--sm" data-mark-validated="${opp.id}">Marquer validé</button>` : ""}
          </div>
        </div>
      </article>`;
    })
    .join("");
}

function renderPipeline() {
  const columns = getPipelineGrouped();

  pipelineEl.innerHTML = columns
    .map(
      ({ stage, meta, items }) => `
    <div class="commercial-column">
      <div class="commercial-column__head">
        <span class="commercial-column__title">${meta.icon} ${meta.label}</span>
        <span class="commercial-column__count">${items.length}</span>
      </div>
      <div class="commercial-column__body">
        ${
          items.length
            ? items
                .map((opp) => {
                  const nextAppt = opp.appointments
                    .filter((a) => !a.completed && a.at)
                    .sort((a, b) => new Date(a.at) - new Date(b.at))[0];
                  return `
            <article class="commercial-card" data-open-opp="${opp.id}">
              <div class="commercial-card__client">${escapeHtml(opp.clientName)}</div>
              <div class="commercial-card__job">${escapeHtml(opp.jobName || "—")}${opp.devisNumber ? ` · ${escapeHtml(opp.devisNumber)}` : ""}</div>
              ${opp.amount ? `<div class="commercial-card__amount">${formatProfileMoney(opp.amount)}</div>` : ""}
              <div class="commercial-card__foot">
                ${nextAppt ? `<span class="commercial-card__date">📅 ${formatShortDate(nextAppt.at)} ${formatTime(nextAppt.at)}</span>` : ""}
              </div>
            </article>`;
                })
                .join("")
            : `<p class="commercial-card__date" style="padding:8px;text-align:center">—</p>`
        }
      </div>
    </div>`,
    )
    .join("");
}

function renderAgenda() {
  const items = getUpcomingAppointments({ days: 21 });

  if (!items.length) {
    agendaEl.innerHTML = `<div class="commercial-empty">Aucun rendez-vous planifié — ouvrez un dossier client pour en ajouter.</div>`;
    return;
  }

  agendaEl.innerHTML = items
    .map(({ at, type, note, opportunity: opp, id }) => {
      const d = new Date(at);
      return `
    <article class="commercial-agenda__item">
      <div class="commercial-agenda__when">
        <div class="commercial-agenda__day">${d.getDate()}</div>
        <div class="commercial-agenda__time">${formatShortDate(at).split(" ")[0]}<br>${formatTime(at)}</div>
      </div>
      <div class="commercial-agenda__info">
        <strong>${escapeHtml(APPOINTMENT_TYPES[type] || type)}</strong> — ${escapeHtml(opp.clientName)}<br>
        <small>${escapeHtml(opp.jobName || "")}${note ? ` · ${escapeHtml(note)}` : ""}</small>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" data-open-opp="${opp.id}">Dossier</button>
      <button type="button" class="btn btn--primary btn--sm" data-complete-rdv="${opp.id}" data-appt-id="${id}">Fait ✓</button>
    </article>`;
    })
    .join("");
}

function clientStageLabel(client) {
  const opps = getOpportunitiesByClientId(client.id);
  const active = opps.find((o) => !["paye", "perdu"].includes(o.stage));
  if (active) return stagePill(active.stage);
  if (client.status === "client") {
    return `<span class="status-pill status-pill--success">Client</span>`;
  }
  return `<span class="status-pill status-pill--neutral">Prospect</span>`;
}

function renderClients() {
  const clients = getClients();
  clientsListEl.innerHTML = clients.length
    ? clients
        .map((c) => {
          const opps = getOpportunitiesByClientId(c.id);
          const activeCount = opps.filter((o) => !["paye", "perdu"].includes(o.stage)).length;
          return `
        <tr>
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td>${escapeHtml(c.email || "—")}<br><small>${escapeHtml(c.phone || "")}</small></td>
          <td>${activeCount ? `${activeCount} dossier(s) actif(s)` : "—"}</td>
          <td>${clientStageLabel(c)}</td>
        </tr>`;
        })
        .join("")
    : `<tr><td colspan="4" style="color:var(--text-muted)">Aucun contact — ajoutez un prospect ou imprimez un devis.</td></tr>`;
}

function openDetail(id) {
  const opp = getOpportunityById(id);
  if (!opp) return;

  activeOpportunityId = id;
  detailEl.hidden = false;
  document.body.style.overflow = "hidden";

  document.getElementById("detail-title").textContent = opp.clientName;
  document.getElementById("detail-stage").innerHTML = stagePill(opp.stage);

  document.getElementById("detail-meta").innerHTML = `
    <div><dt>Chantier / prestation</dt><dd>${escapeHtml(opp.jobName || "—")}</dd></div>
    <div><dt>Montant HT</dt><dd>${opp.amount ? formatProfileMoney(opp.amount) : "—"}</dd></div>
    <div><dt>Devis n°</dt><dd>${escapeHtml(opp.devisNumber || "—")}</dd></div>
    <div><dt>Contact</dt><dd>${escapeHtml(opp.clientEmail || opp.clientPhone || "—")}</dd></div>
    <div><dt>Envoyé le</dt><dd>${formatDate(opp.sentAt)}</dd></div>
    <div><dt>Validé le</dt><dd>${formatDate(opp.validatedAt)}</dd></div>
  `;

  const actions = [];
  if (opp.stage !== "valide" && opp.stage !== "paye" && opp.stage !== "perdu") {
    actions.push(`<button type="button" class="btn btn--primary btn--sm" data-detail-action="valide">✅ Devis validé</button>`);
  }
  if (opp.stage === "devis_envoye") {
    actions.push(`<button type="button" class="btn btn--ghost btn--sm" data-detail-action="attente">⏳ En attente réponse</button>`);
  }
  if (opp.devisId) {
    actions.push(`<a href="devis.html?load=${opp.devisId}" class="btn btn--ghost btn--sm">📋 Ouvrir devis</a>`);
  }
  if (opp.chantierId) {
    actions.push(`<a href="chantier-detail.html?id=${opp.chantierId}" class="btn btn--ghost btn--sm">🏗️ Chantier</a>`);
  } else if (opp.stage === "valide") {
    actions.push(`<a href="chantiers.html" class="btn btn--ghost btn--sm">🏗️ Créer chantier</a>`);
  }
  if (opp.clientPhone) {
    actions.push(`<a href="tel:${escapeHtml(opp.clientPhone)}" class="btn btn--ghost btn--sm">📞 Appeler</a>`);
  }
  if (opp.clientEmail) {
    actions.push(
      `<a href="mailto:${encodeURIComponent(opp.clientEmail)}" class="btn btn--ghost btn--sm">✉️ E-mail</a>`,
    );
  }
  if (opp.stage !== "perdu" && opp.stage !== "paye") {
    actions.push(`<button type="button" class="btn btn--ghost btn--sm" data-detail-action="perdu">✕ Perdu</button>`);
  }

  document.getElementById("detail-actions").innerHTML = actions.join("");

  const notesEl = document.getElementById("detail-notes");
  notesEl.innerHTML = opp.notes.length
    ? opp.notes
        .map(
          (n) =>
            `<li>${escapeHtml(n.text)}<small>${formatDate(n.at, { time: true })}</small></li>`,
        )
        .join("")
    : `<li style="background:transparent;color:var(--text-muted)">Aucune note pour l'instant.</li>`;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById("rdv-date").value = tomorrow.toISOString().slice(0, 10);
}

function closeDetail() {
  activeOpportunityId = null;
  detailEl.hidden = true;
  document.body.style.overflow = "";
}

async function handleDetailAction(action) {
  const opp = getOpportunityById(activeOpportunityId);
  if (!opp) return;

  if (action === "valide") {
    if (opp.devisId) {
      markDevisCommercialValidated(opp.devisId);
      markDevisCommerciallyValidated(opp.devisId);
      const devis = getDevisById(opp.devisId);
      if (devis) {
        onDevisValidated(devis);
        await notifyValidatedDevisPayment(devis);
      }
    } else {
      setOpportunityStage(opp.id, "valide", { validatedAt: new Date().toISOString() });
    }
    refresh();
    return;
  }

  if (action === "attente") {
    if (opp.devisId) markDevisAwaitingResponse(opp.devisId);
    else setOpportunityStage(opp.id, "en_attente");
    refresh();
    return;
  }

  if (action === "perdu") {
    const reason = prompt("Motif (optionnel) :") || "";
    if (opp.devisId) markDevisLost(opp.devisId, reason);
    else setOpportunityStage(opp.id, "perdu", { lostReason: reason });
    refresh();
    return;
  }
}

document.querySelectorAll(".commercial-tabs__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".commercial-tabs__btn").forEach((b) => b.classList.remove("commercial-tabs__btn--active"));
    btn.classList.add("commercial-tabs__btn--active");
    const tab = btn.dataset.tab;
    document.querySelectorAll(".commercial-panel").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tab;
    });
  });
});

document.body.addEventListener("click", (e) => {
  const openBtn = e.target.closest("[data-open-opp]");
  if (openBtn) {
    openDetail(openBtn.dataset.openOpp);
    return;
  }

  const validatedBtn = e.target.closest("[data-mark-validated]");
  if (validatedBtn) {
    const opp = getOpportunityById(validatedBtn.dataset.markValidated);
    if (opp?.devisId) {
      markDevisCommercialValidated(opp.devisId);
      markDevisCommerciallyValidated(opp.devisId);
      const devis = getDevisById(opp.devisId);
      if (devis) {
        onDevisValidated(devis);
        await notifyValidatedDevisPayment(devis);
      }
    } else if (opp) {
      setOpportunityStage(opp.id, "valide", { validatedAt: new Date().toISOString() });
    }
    refresh();
    return;
  }

  const completeRdv = e.target.closest("[data-complete-rdv]");
  if (completeRdv) {
    completeAppointment(completeRdv.dataset.completeRdv, completeRdv.dataset.apptId);
    refresh();
    return;
  }

  const detailAction = e.target.closest("[data-detail-action]");
  if (detailAction) {
    handleDetailAction(detailAction.dataset.detailAction);
    return;
  }

  if (e.target.closest("[data-close-detail]")) {
    closeDetail();
  }
});

clientForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("client-name").value.trim();
  const email = document.getElementById("client-email").value.trim();
  const phone = document.getElementById("client-phone").value.trim();

  const client = findOrCreateClient({ name, email, phone });
  if (client) {
    upsertOpportunity({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email || email,
      clientPhone: client.phone || phone,
      jobName: "Nouveau prospect",
      stage: "prospect",
    });
  }

  clientForm.reset();
  refresh();
});

rdvForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!activeOpportunityId) return;

  const date = document.getElementById("rdv-date").value;
  const time = document.getElementById("rdv-time").value;
  const type = document.getElementById("rdv-type").value;
  const note = document.getElementById("rdv-note").value.trim();
  const at = new Date(`${date}T${time}`).toISOString();

  addAppointment(activeOpportunityId, { at, type, note });
  document.getElementById("rdv-note").value = "";
  refresh();
});

noteForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!activeOpportunityId) return;
  const text = document.getElementById("note-text").value.trim();
  if (!text) return;
  addOpportunityNote(activeOpportunityId, text);
  document.getElementById("note-text").value = "";
  refresh();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !detailEl.hidden) closeDetail();
});

refresh();
