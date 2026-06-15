import { getUser, logout } from "./auth.js";

const ACTIVITY_KEY = "exone-session-activity";
const DEFAULT_IDLE_MS = 8 * 60 * 60 * 1000;

let initialized = false;

export function touchSessionActivity() {
  sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function isSessionExpired(idleMs = DEFAULT_IDLE_MS) {
  const raw = sessionStorage.getItem(ACTIVITY_KEY);
  if (!raw) {
    touchSessionActivity();
    return false;
  }
  return Date.now() - Number(raw) > idleMs;
}

function redirectIdle(reason) {
  logout();
  const next = encodeURIComponent(
    `${window.location.pathname.split("/").pop() || "dashboard.html"}${window.location.search}${window.location.hash}`,
  );
  window.location.href = `connexion.html?reason=${reason}&next=${next}`;
}

export function initAppSecurity(options = {}) {
  if (initialized || !getUser()) return;
  initialized = true;

  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
  const onExpire = options.onExpire ?? (() => redirectIdle("idle"));

  if (isSessionExpired(idleMs)) {
    onExpire();
    return;
  }

  touchSessionActivity();

  const bump = () => touchSessionActivity();
  for (const event of ["click", "keydown", "touchstart", "pointerdown", "scroll"]) {
    document.addEventListener(event, bump, { passive: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isSessionExpired(idleMs)) {
      onExpire();
    }
  });

  window.setInterval(() => {
    if (getUser() && isSessionExpired(idleMs)) onExpire();
  }, 60_000);
}
