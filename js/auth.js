import {
  hasAppAccess,
  isTrialActive,
  normalizeTrialUser,
} from "./trial.js";
import { isDemoEnabled } from "./app-config.js";

const USER_KEY = "exone-solution-user";

/** Compte provisoire pour tests internes — actif uniquement en local ou ?demo=1 */
export const DEMO_ACCOUNT = {
  email: "demo@exone-solution.test",
  password: "ExoneDemo2026!",
  firstname: "Démo",
};

export function isDemoAccount(email) {
  if (!isDemoEnabled()) return false;
  return email.toLowerCase() === DEMO_ACCOUNT.email;
}

export function checkDemoPassword(password) {
  if (!isDemoEnabled()) return false;
  return password === DEMO_ACCOUNT.password;
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    const user = JSON.parse(raw);
    const normalized = normalizeTrialUser(user);
    if (normalized !== user) {
      localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(USER_KEY);
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Comptes créés avant la vérification e-mail restent autorisés. */
export function isEmailVerified(user) {
  if (!user) return false;
  if (user.isDemo) return true;
  if (user.emailVerified === undefined || user.emailVerified === null) return true;
  return Boolean(user.emailVerified);
}

function buildTrialRedirect(path = "inscription.html") {
  const file = window.location.pathname.split("/").pop() || "index.html";
  const next = encodeURIComponent(`${file}${window.location.search}${window.location.hash}`);
  return `${path}?next=${next}`;
}

/** Redirection vers la page connexion avec retour après authentification. */
export function buildConnexionRedirect(nextPath) {
  const target =
    nextPath ??
    `${window.location.pathname.split("/").pop() || "index.html"}${window.location.search}${window.location.hash}`;
  return `connexion.html?next=${encodeURIComponent(target)}`;
}

/** Devis, factures et rentabilité — accès réservé aux utilisateurs connectés. */
export function requireConnexion(nextPath) {
  return requireAuth(buildConnexionRedirect(nextPath));
}

export function requireAuth(redirectTo) {
  const user = getUser();

  if (!user) {
    window.location.href = redirectTo ?? buildTrialRedirect("inscription.html");
    return false;
  }

  if (!hasAppAccess(user)) {
    const file = window.location.pathname.split("/").pop() || "index.html";
    const next = encodeURIComponent(`${file}${window.location.search}${window.location.hash}`);
    window.location.href = `tarifs.html?expired=trial&next=${next}`;
    return false;
  }

  if (!isEmailVerified(user)) {
    const file = window.location.pathname.split("/").pop() || "index.html";
    const next = encodeURIComponent(`${file}${window.location.search}${window.location.hash}`);
    window.location.href = `verification.html?next=${next}`;
    return false;
  }

  return true;
}

export { hasAppAccess, isTrialActive };
