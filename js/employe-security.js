import { getEmployeeSession, logoutEmployee } from "./employee-auth.js";

const ACTIVITY_KEY = "exone-employee-activity";
const EMPLOYEE_IDLE_MS = 4 * 60 * 60 * 1000;

let initialized = false;

function touchActivity() {
  sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

function isExpired() {
  const raw = sessionStorage.getItem(ACTIVITY_KEY);
  if (!raw) {
    touchActivity();
    return false;
  }
  return Date.now() - Number(raw) > EMPLOYEE_IDLE_MS;
}

function redirectConnexion() {
  logoutEmployee();
  const inEmploye = window.location.pathname.includes("/employe/");
  window.location.href = inEmploye ? "connexion.html?reason=idle" : "employe/connexion.html?reason=idle";
}

export function initEmployeSecurity() {
  if (initialized || !getEmployeeSession()) return;
  initialized = true;

  if (isExpired()) {
    redirectConnexion();
    return;
  }

  touchActivity();

  const bump = () => touchActivity();
  for (const event of ["click", "keydown", "touchstart", "pointerdown"]) {
    document.addEventListener(event, bump, { passive: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isExpired()) redirectConnexion();
  });

  window.setInterval(() => {
    if (getEmployeeSession() && isExpired()) redirectConnexion();
  }, 60_000);
}
