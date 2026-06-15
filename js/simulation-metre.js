import { DEMO_ACCOUNT, getUser, saveUser } from "./auth.js";
import { isDemoEnabled } from "./app-config.js";
import { createTrialUser, withSubscription } from "./trial.js";
import { setPlan } from "./subscription.js";
import { getMetresByChantier } from "./data.js";
import {
  DEMO_CHANTIER_ACCESS_CODE,
  DEMO_DEVIS_NUMBER,
  ensureDemoMetreSimulation,
} from "./demo-seed.js";
import { DEMO_EMPLOYEE } from "./employee-auth.js";
import { aggregateMetres, compareDevisToMetre } from "./metre-calculator.js";
import { formatProfileMoney } from "./market.js";

function ensureEmployeurSession() {
  if (getUser()) return;

  if (!isDemoEnabled()) {
    window.location.replace("connexion.html?next=simulation-metre.html");
    return;
  }

  saveUser(
    withSubscription(
      createTrialUser({
        email: DEMO_ACCOUNT.email,
        firstname: DEMO_ACCOUNT.firstname,
        isDemo: true,
      }),
    ),
  );
  setPlan("business");
}

function row(label, value) {
  return `<tr><th>${label}</th><td>${value}</td></tr>`;
}

function renderChantierFields(chantier, devis) {
  const el = document.getElementById("sim-chantier-fields");
  if (!el || !chantier) return;

  el.innerHTML = [
    row("Nom du chantier", chantier.name),
    row("Client", chantier.client || "—"),
    row("Lieu", chantier.location || "—"),
    row("Métier", chantier.tradeType || "—"),
    row("Devis lié", devis ? `${devis.devisNumber || devis.docNumber} — ${formatProfileMoney(devis.price)} HT` : "—"),
    row("Budget prévisionnel", formatProfileMoney(chantier.budget || 0)),
    row("Code accès terrain", `<code>${chantier.accessCode || DEMO_CHANTIER_ACCESS_CODE}</code> (transmis à l'équipe)`),
  ].join("");
}

function renderEmployeeFields(employee) {
  const el = document.getElementById("sim-employee-fields");
  if (!el) return;

  el.innerHTML = [
    row("Prénom", employee?.firstname || DEMO_EMPLOYEE.firstname),
    row("Nom", employee?.lastname || DEMO_EMPLOYEE.lastname),
    row("Rôle", employee?.role || DEMO_EMPLOYEE.defaultRole),
    row("PIN (choisi par l'employeur)", `<code>${employee?.pin || DEMO_EMPLOYEE.pin}</code>`),
    row("Identifiant auto", `<code>${employee?.code || DEMO_EMPLOYEE.code}</code>`),
  ].join("");
}

function renderCompare(chantier, devis) {
  const el = document.getElementById("sim-compare");
  if (!el || !chantier) return;

  const metres = getMetresByChantier(chantier.id);
  const aggregated = aggregateMetres(metres, chantier.country ?? "FR");
  const comparison = compareDevisToMetre(devis, aggregated);

  el.innerHTML = `
    <div class="sim-compare-card">
      <span>Devis initial HT</span>
      <strong>${formatProfileMoney(comparison.devisPrice)}</strong>
    </div>
    <div class="sim-compare-card">
      <span>Métré terrain total</span>
      <strong>${formatProfileMoney(aggregated.totalCost)}</strong>
    </div>
    <div class="sim-compare-card">
      <span>Écart</span>
      <strong>${formatProfileMoney(comparison.deltaPrice)}</strong>
    </div>`;
}

function renderStatus(chantier, devis, metreCount) {
  const el = document.getElementById("sim-status");
  if (!el) return;

  const metreLabel =
    metreCount > 0
      ? `${metreCount} bulletin signé prêt à valider`
      : "En attente du bulletin terrain";

  el.innerHTML = `
    <div><strong>Simulation active</strong> — compte employeur connecté automatiquement.</div>
    <div>Chantier : <strong>${chantier?.name ?? "—"}</strong> · Code <code>${chantier?.accessCode ?? DEMO_CHANTIER_ACCESS_CODE}</code></div>
    <div>Devis : <strong>${devis?.devisNumber ?? DEMO_DEVIS_NUMBER}</strong> · Métré : <strong>${metreLabel}</strong></div>`;
}

function wireLinks(chantier) {
  const metreLink = document.getElementById("sim-link-metre");
  if (metreLink && chantier?.id) {
    metreLink.href = `metre.html?chantier=${encodeURIComponent(chantier.id)}`;
  }

  const employeLink = document.getElementById("sim-link-employe");
  if (employeLink) {
    employeLink.href = `employe/connexion.html?code=${encodeURIComponent(chantier?.accessCode ?? DEMO_CHANTIER_ACCESS_CODE)}`;
  }
}

ensureEmployeurSession();

const { chantier, employee, devis, metreCount } = ensureDemoMetreSimulation();

renderStatus(chantier, devis, metreCount);
renderChantierFields(chantier, devis);
renderEmployeeFields(employee);
renderCompare(chantier, devis);
wireLinks(chantier);
