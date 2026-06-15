import { isDemoEnabled } from "./app-config.js";

const SESSION_KEY = "exone-employee-session";
const CHANTIER_CODE_KEY = "exone-employee-chantier-code";

/** Compte employé provisoire pour tests terrain — actif uniquement en local ou ?demo=1 */
export const DEMO_EMPLOYEE = {
  code: "EMP-DEMO",
  pin: "4826",
  firstname: "Jean",
  lastname: "Terrain",
  defaultRole: "chef_chantier",
};

export function getEmployeeSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveEmployeeSession(employee) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(employee));
}

export function logoutEmployee() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(CHANTIER_CODE_KEY);
}

export function setActiveChantierCode(code) {
  sessionStorage.setItem(CHANTIER_CODE_KEY, code.trim().toUpperCase());
}

export function getActiveChantierCode() {
  return sessionStorage.getItem(CHANTIER_CODE_KEY) ?? "";
}

export function clearActiveChantierCode() {
  sessionStorage.removeItem(CHANTIER_CODE_KEY);
}

export function requireEmployeeAuth(redirectTo) {
  if (!getEmployeeSession()) {
    const inEmployeArea = window.location.pathname.includes("/employe/");
    const target = redirectTo ?? (inEmployeArea ? "connexion.html" : "employe/connexion.html");
    window.location.href = target;
    return false;
  }
  return true;
}

export function isDemoEmployeeCode(code) {
  if (!isDemoEnabled()) return false;
  return code.trim().toUpperCase() === DEMO_EMPLOYEE.code;
}
