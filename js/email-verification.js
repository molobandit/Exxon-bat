import { getUser, saveUser, hasAppAccess } from "./auth.js";
import { createTrialUser, normalizeTrialUser } from "./trial.js";
import { SUPPORT_FORM_ENDPOINT } from "./support-store.js";

export const CODE_LENGTH = 4;

const PENDING_KEY = "exone-email-verification-pending";
const TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function safeNextPath(value) {
  if (!value || value.includes("://") || value.startsWith("//")) return "dashboard.html";
  return value;
}

function normalizeCode(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, CODE_LENGTH);
}

export function generateVerificationCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function isLocalTestHost(hostname = window.location.hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname)
  );
}

function readPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    if (!pending?.email || !pending?.token) return null;
    if (Date.now() > Number(pending.expiresAt)) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    const rawDigits = String(pending.code ?? "").replace(/\D/g, "");
    if (rawDigits.length !== CODE_LENGTH) {
      pending.code = generateVerificationCode();
      pending.expiresAt = Date.now() + TTL_MS;
      writePending(pending);
    } else {
      pending.code = rawDigits;
    }
    return pending;
  } catch {
    localStorage.removeItem(PENDING_KEY);
    return null;
  }
}

function writePending(pending) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function getPendingVerification() {
  return readPending();
}

export function clearPendingVerification() {
  localStorage.removeItem(PENDING_KEY);
}

export function getResendCooldownSeconds() {
  const pending = readPending();
  if (!pending?.sentAt) return 0;
  const elapsed = Date.now() - Number(pending.sentAt);
  const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
  return remaining > 0 ? remaining : 0;
}

function buildVerifyUrl(token, next) {
  const url = new URL("verification.html", window.location.origin);
  url.searchParams.set("token", token);
  if (next) url.searchParams.set("next", safeNextPath(next));
  return url.toString();
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.length <= 2 ? local[0] : `${local.slice(0, 2)}•••`;
  return `${visible}@${domain}`;
}

function emailCopy(pending) {
  const isLogin = pending.mode === "login";
  const greeting = pending.firstname ? `Bonjour ${pending.firstname},` : "Bonjour,";
  const subject = isLogin
    ? `Code de connexion Exxon-bat : ${pending.code}`
    : `Activez votre essai Exxon-bat : ${pending.code}`;
  const headline = isLogin
    ? "Connexion sécurisée à votre espace artisan"
    : "Confirmation de votre essai gratuit Exxon-bat";
  const intro = isLogin
    ? "Utilisez le code à 4 chiffres ci-dessous pour vous connecter. Il est valable 30 minutes."
    : "Entrez ce code à 4 chiffres pour activer votre essai Pro 30 jours. Valable 30 minutes.";

  const body = [
    greeting,
    "",
    headline,
    intro,
    "",
    `▸ Votre code : ${pending.code}`,
    "",
    "Ou validez en un clic :",
    buildVerifyUrl(pending.token, pending.next),
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    "",
    "— L'équipe Exxon-bat",
    "Devis, rentabilité & encaissements pour artisans BTP",
  ].join("\n");

  return { subject, body };
}

export async function sendVerificationEmail(pending) {
  const verifyUrl = buildVerifyUrl(pending.token, pending.next);
  const copy = emailCopy(pending);

  const response = await fetch(SUPPORT_FORM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: copy.subject,
      _template: "table",
      _captcha: "false",
      _autoresponse: copy.body,
      email: pending.email,
      prenom: pending.firstname,
      code_connexion: pending.code,
      lien_validation: verifyUrl,
      email_masque: maskEmail(pending.email),
      type_demande: pending.mode === "login" ? "Connexion" : "Inscription",
      message: copy.body,
    }),
  });

  if (!response.ok) {
    throw new Error("Envoi e-mail impossible");
  }

  const data = await response.json().catch(() => ({}));
  if (data.success !== "true" && data.success !== true && data.success !== undefined) {
    throw new Error("Envoi e-mail refusé");
  }

  pending.emailSent = true;
  pending.emailSendFailed = false;
  writePending(pending);
  return data;
}

export function createPendingVerification({
  email,
  firstname,
  next = "dashboard.html",
  mode = "signup",
}) {
  const pending = {
    email: email.trim().toLowerCase(),
    firstname: firstname.trim(),
    code: generateVerificationCode(),
    token: crypto.randomUUID(),
    next: safeNextPath(next),
    mode: mode === "login" ? "login" : "signup",
    expiresAt: Date.now() + TTL_MS,
    sentAt: Date.now(),
    emailSent: false,
    emailSendFailed: false,
  };
  writePending(pending);
  return pending;
}

async function deliverVerificationEmail(pending) {
  try {
    await sendVerificationEmail(pending);
    return { pending, emailFailed: false };
  } catch {
    pending.emailSendFailed = true;
    pending.emailSent = false;
    writePending(pending);
    return { pending, emailFailed: true };
  }
}

export async function startEmailVerification({ email, firstname, next }) {
  const pending = createPendingVerification({ email, firstname, next, mode: "signup" });
  return deliverVerificationEmail(pending);
}

/** Connexion par code — compte existant ou première activation sur cet appareil. */
export async function startLoginVerification({ email, next }) {
  const normalized = email.trim().toLowerCase();
  const stored = getUser();
  const isReturning = stored?.email === normalized;
  const firstname = isReturning
    ? stored.firstname || normalized.split("@")[0]
    : normalized.split("@")[0].replace(/[._-]+/g, " ");
  const pending = createPendingVerification({
    email: normalized,
    firstname,
    next,
    mode: isReturning ? "login" : "signup",
  });
  return deliverVerificationEmail(pending);
}

export async function resendVerificationEmail() {
  const pending = readPending();
  if (!pending) throw new Error("Aucune demande en attente.");
  const cooldown = getResendCooldownSeconds();
  if (cooldown > 0) {
    throw new Error(`Attendez ${cooldown}s avant un nouvel envoi.`);
  }
  pending.expiresAt = Date.now() + TTL_MS;
  pending.sentAt = Date.now();
  pending.code = generateVerificationCode();
  writePending(pending);
  const result = await deliverVerificationEmail(pending);
  if (result.emailFailed) {
    throw new Error("Envoi e-mail impossible — utilisez le code affiché sur cet appareil.");
  }
  return result.pending;
}

function finalizeVerification(pending) {
  const stored = normalizeTrialUser(getUser());
  const email = pending.email;
  let user;

  if (stored?.email === email) {
    user = {
      ...stored,
      email,
      firstname: pending.firstname || stored.firstname,
      emailVerified: true,
    };
  } else {
    user = createTrialUser({
      email,
      firstname: pending.firstname,
      emailVerified: true,
    });
  }

  saveUser(user);
  clearPendingVerification();
  return user;
}

export function verifyEmailCode(inputCode) {
  const pending = readPending();
  if (!pending) {
    return { ok: false, error: "Session expirée — retournez à la connexion et recevez un nouveau code." };
  }

  const entered = normalizeCode(inputCode);
  if (entered.length !== CODE_LENGTH) {
    return {
      ok: false,
      error: `Entrez les ${CODE_LENGTH} chiffres du code reçu par e-mail.`,
    };
  }
  if (entered !== pending.code) {
    return {
      ok: false,
      error: `Code incorrect. Vérifiez les ${CODE_LENGTH} chiffres reçus par e-mail.`,
    };
  }

  const nextPath = pending.next;
  const mode = pending.mode;
  const user = finalizeVerification(pending);
  const destination = hasAppAccess(user) ? safeNextPath(nextPath) : "tarifs.html?verified=1";

  return { ok: true, user, next: destination, mode };
}

export function verifyEmailToken(token) {
  const pending = readPending();
  if (!pending) return { ok: false, error: "Lien expiré ou déjà utilisé." };
  if (pending.token !== token) return { ok: false, error: "Lien invalide." };

  const nextPath = pending.next;
  const mode = pending.mode;
  const user = finalizeVerification(pending);
  const destination = hasAppAccess(user) ? safeNextPath(nextPath) : "tarifs.html?verified=1";
  return { ok: true, user, next: destination, mode };
}

export { maskEmail, normalizeCode };
