import { formatProfileMoney } from "./market.js";
import { requireEmployeeAuth, getEmployeeSession } from "./employee-auth.js";
import {
  getChantierById,
  getMetresByEmployee,
} from "./data.js";
import { computeMetreTotals } from "./metre-calculator.js";
import { METRE_STATUS } from "./metre-constants.js";
import { TRADES, COUNTRIES } from "./metre-templates.js";
import { initEmployeNav } from "./employe-nav.js";

if (!requireEmployeeAuth()) return;
initEmployeNav("historique");

const session = getEmployeeSession();
const list = document.getElementById("history-list");
const metres = getMetresByEmployee(session.id);

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

list.innerHTML = metres.length
  ? metres
      .map((metre) => {
        const chantier = getChantierById(metre.chantierId);
        const totals = computeMetreTotals(metre);
        const status = METRE_STATUS[metre.status] ?? METRE_STATUS.draft;

        return `
        <article class="metre-card">
          <div class="metre-card__top">
            <strong>${chantier?.name ?? "Chantier"}</strong>
            <span class="status-pill status-pill--${status.class}">${status.label}</span>
          </div>
          <div class="metre-card__meta">
            ${TRADES[metre.tradeType]?.label ?? "Métré"} · ${COUNTRIES[metre.country]?.label ?? "—"} · ${formatDate(metre.date || metre.createdAt)}<br>
            ${metre.location || "—"} · Client : ${metre.clientName || "—"}
            ${metre.workStatus?.billingType ? ` · ${metre.workStatus.billingType === "regie" ? "Régie" : "Métré"}` : ""}
          </div>
          <p style="margin:10px 0 0;font-size:0.88rem">
            ${totals.totalHours} h · Matériel ${formatProfileMoney(totals.materialCost)} · Total ${formatProfileMoney(totals.totalCost)}
          </p>
          ${metre.notes ? `<p style="margin:8px 0 0;color:var(--text-muted);font-size:0.85rem">${metre.notes}</p>` : ""}
          ${metre.clientSignature ? `<img src="${metre.clientSignature}" alt="Signature client" style="margin-top:12px;max-height:80px;border:1px solid var(--border);border-radius:8px;background:#fff" />` : ""}
        </article>`;
      })
      .join("")
  : `<div class="card"><p style="margin:0;color:var(--text-muted)">Aucun métré enregistré pour le moment.</p></div>`;
