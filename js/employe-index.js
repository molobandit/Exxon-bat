import {
  getActiveChantierCode,
  requireEmployeeAuth,
  setActiveChantierCode,
} from "./employee-auth.js";
import { getChantierByAccessCode } from "./data.js";
import { initEmployeNav } from "./employe-nav.js";

if (!requireEmployeeAuth()) return;
initEmployeNav("accueil");

const codeForm = document.getElementById("chantier-code-form");
const codeInput = document.getElementById("chantier-code");
const activePanel = document.getElementById("active-chantier");
const codeError = document.getElementById("code-error");

function renderActiveChantier(code) {
  const chantier = getChantierByAccessCode(code);
  if (!chantier) {
    activePanel.hidden = true;
    return;
  }

  activePanel.hidden = false;
  document.getElementById("active-name").textContent = chantier.name;
  document.getElementById("active-client").textContent = chantier.client || "—";
  document.getElementById("active-location").textContent =
    chantier.location || "Lieu à préciser";
  document.getElementById("active-code").textContent = chantier.accessCode;
  document.getElementById("start-metre").href = `metre.html?code=${chantier.accessCode}`;
}

codeForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = codeInput.value.trim();

  if (!code) {
    codeError.textContent = "Saisissez le code chantier fourni par l'employeur.";
    codeError.hidden = false;
    return;
  }

  const chantier = getChantierByAccessCode(code);
  if (!chantier) {
    codeError.textContent = "Code chantier invalide ou chantier introuvable.";
    codeError.hidden = false;
    return;
  }

  if (chantier.status === "termine") {
    codeError.textContent = "Ce chantier est terminé — contactez l'employeur.";
    codeError.hidden = false;
    return;
  }

  codeError.hidden = true;
  setActiveChantierCode(chantier.accessCode);
  renderActiveChantier(chantier.accessCode);
});

document.getElementById("change-chantier")?.addEventListener("click", () => {
  activePanel.hidden = true;
  codeInput.value = "";
  codeInput.focus();
});

const params = new URLSearchParams(window.location.search);
const urlCode = params.get("code") ?? "";
const savedCode = urlCode || getActiveChantierCode();

if (urlCode) {
  setActiveChantierCode(urlCode);
}

if (savedCode) {
  codeInput.value = savedCode;
  const chantier = getChantierByAccessCode(savedCode);
  if (chantier && chantier.status !== "termine") {
    renderActiveChantier(savedCode);
  }
}
