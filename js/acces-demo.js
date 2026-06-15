import { DEMO_ACCOUNT, saveUser, buildConnexionRedirect } from "./auth.js";
import { isDemoEnabled } from "./app-config.js";
import { createTrialUser, withSubscription } from "./trial.js";
import { DEMO_EMPLOYEE, saveEmployeeSession, setActiveChantierCode } from "./employee-auth.js";
import { getEmployees } from "./data.js";
import { setPlan } from "./subscription.js";
import { startQuickTest } from "./quick-test.js";
import {
  ensureDemoChantier,
  ensureDemoEmployee,
  ensureDemoMetreSimulation,
  ensureDemoProfile,
  ensureDemoTasks,
} from "./demo-seed.js";

const params = new URLSearchParams(window.location.search);
const go = params.get("go");

function showProductionNotice() {
  const grid = document.querySelector(".acces-grid");
  const links = document.querySelector(".acces-links");
  const notes = document.querySelectorAll(".acces-note");
  notes.forEach((el) => el.remove());
  if (links) links.hidden = true;

  if (grid) {
    grid.innerHTML = `
      <article class="acces-card acces-card--primary" style="grid-column:1/-1;text-align:center">
        <div class="acces-card__icon">🔒</div>
        <h2>Mode démo désactivé</h2>
        <p>Cette page est réservée aux tests locaux. En production, connectez-vous avec votre compte ou créez un essai gratuit.</p>
        <a href="inscription.html" class="acces-card__btn">Essai gratuit 30 jours</a>
        <a href="connexion.html" class="acces-card__btn" style="margin-left:10px;background:white;color:var(--primary-dark);border:2px solid var(--primary)">Se connecter</a>
      </article>`;
  }
}

function openSimulationMetre() {
  ensureDemoProfile();

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
  ensureDemoMetreSimulation();
  window.location.replace("simulation-metre.html");
}

function openEmployeur() {
  startQuickTest("dashboard.html");
}

function openEmploye() {
  ensureDemoEmployee();
  const chantier = ensureDemoChantier();

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
  ensureDemoProfile();

  const employee = getEmployees().find((e) => e.code === DEMO_EMPLOYEE.code);
  if (!employee) {
    alert("Employé démo introuvable — rechargez la page ou réessayez depuis l'accueil.");
    return;
  }

  saveEmployeeSession({
    id: employee.id,
    code: DEMO_EMPLOYEE.code,
    firstname: DEMO_EMPLOYEE.firstname,
    lastname: DEMO_EMPLOYEE.lastname,
    role: DEMO_EMPLOYEE.defaultRole,
  });

  setActiveChantierCode(chantier.accessCode);
  window.location.replace(`employe/metre.html?code=${chantier.accessCode}`);
}

function openDevis() {
  window.location.replace(buildConnexionRedirect("devis.html"));
}

if (go && !isDemoEnabled()) {
  window.location.replace("connexion.html");
} else if (go === "employeur") {
  openEmployeur();
} else if (go === "employe") {
  openEmploye();
} else if (go === "simulation-metre") {
  openSimulationMetre();
} else if (go === "devis") {
  openDevis();
} else if (!isDemoEnabled()) {
  showProductionNotice();
}
