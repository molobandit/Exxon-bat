import { ensureStaticNavPrefs } from "./nav-prefs-html.js";
import { APP_UI } from "./locales/app-ui.js";
import { MESSAGES, SUPPORTED_LOCALES } from "./locales/messages.js";

const MERGED_MESSAGES = Object.fromEntries(
  SUPPORTED_LOCALES.map(({ code }) => [
    code,
    { ...MESSAGES[code], ...APP_UI[code] },
  ]),
);

const INTL_LOCALES = {
  fr: "fr-FR",
  en: "en-GB",
  pt: "pt-PT",
  it: "it-IT",
  es: "es-ES",
};

const STORAGE_KEY = "exxon-bat-locale";
const DEFAULT_LOCALE = "fr";

let currentLocale = DEFAULT_LOCALE;

function normalizeLocale(value) {
  const code = String(value ?? "").toLowerCase().slice(0, 2);
  return SUPPORTED_LOCALES.some((l) => l.code === code) ? code : DEFAULT_LOCALE;
}

export function getLocale() {
  return currentLocale;
}

export function getIntlLocale(locale = currentLocale) {
  return INTL_LOCALES[locale] ?? INTL_LOCALES.fr;
}

export function onLocaleChange(callback) {
  window.addEventListener("localechange", callback);
  return () => window.removeEventListener("localechange", callback);
}

export function setLocale(locale) {
  currentLocale = normalizeLocale(locale);
  localStorage.setItem(STORAGE_KEY, currentLocale);
  document.documentElement.lang = currentLocale;
  applyTranslations();
  window.dispatchEvent(new CustomEvent("localechange", { detail: { locale: currentLocale } }));
}

export function t(key, vars = {}) {
  const pack = MERGED_MESSAGES[currentLocale] ?? MERGED_MESSAGES[DEFAULT_LOCALE];
  const fallback = MERGED_MESSAGES[DEFAULT_LOCALE];
  let text = pack[key] ?? fallback[key] ?? key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const value = t(key);
    if (el.dataset.i18nAttr) {
      el.setAttribute(el.dataset.i18nAttr, value);
    } else if (el.dataset.i18nHtml === "true") {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  document.title = t(document.body.dataset.pageTitleKey ?? "meta.title");
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc?.dataset.i18nContent) {
    metaDesc.content = t(metaDesc.dataset.i18nContent);
  }
}

function ensureLangSwitcherStyles() {
  if (document.getElementById("lang-switcher-css")) return;
  const link = document.createElement("link");
  link.id = "lang-switcher-css";
  link.rel = "stylesheet";
  const base = window.location.pathname.includes("/employe/") ? "../css/lang-switcher.css" : "css/lang-switcher.css";
  link.href = `${base}?v=120`;
  document.head.appendChild(link);
}

function ensureNavPrefs(container) {
  let prefs = container.querySelector(".nav-prefs");
  if (prefs) return prefs;

  prefs = document.createElement("div");
  prefs.className = "nav-prefs";
  prefs.setAttribute("aria-label", "Préférences");

  const navRight = container.querySelector(".nav__right");
  const auth = container.querySelector(".nav__auth");
  const actions = container.querySelector(".nav__actions");
  const navUser = container.querySelector("#nav-user");
  const links = container.querySelector(".nav__links");

  if (navRight) navRight.insertBefore(prefs, navRight.firstChild);
  else if (auth) auth.prepend(prefs);
  else if (actions) actions.prepend(prefs);
  else if (navUser) navUser.parentElement.insertBefore(prefs, navUser);
  else if (links) links.appendChild(prefs);
  else container.appendChild(prefs);

  return prefs;
}

export function initLangSwitcher(containerSelector = ".nav__inner") {
  ensureLangSwitcherStyles();
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const prefs = ensureNavPrefs(container);
  ensureStaticNavPrefs(prefs);

  let wrap = prefs.querySelector(".lang-switcher");
  let select = wrap?.querySelector("#lang-select");

  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "lang-switcher";
    wrap.innerHTML = `
      <label class="lang-switcher__label" for="lang-select">${t("lang.label")}</label>
      <select id="lang-select" class="lang-switcher__select pref-switcher__select" aria-label="${t("lang.label")}">
        ${SUPPORTED_LOCALES.map(
          (l) => `<option value="${l.code}">${l.flag} ${l.label}</option>`,
        ).join("")}
      </select>
    `;
    prefs.appendChild(wrap);
    select = wrap.querySelector("#lang-select");
  }

  if (!select || select.dataset.wired === "1") return;

  select.dataset.wired = "1";
  select.value = currentLocale;
  select.addEventListener("change", () => setLocale(select.value));

  window.addEventListener("localechange", () => {
    select.value = currentLocale;
    const label = wrap.querySelector(".lang-switcher__label");
    if (label) label.textContent = t("lang.label");
    select.setAttribute("aria-label", t("lang.label"));
  });
}

export function initI18n() {
  currentLocale = normalizeLocale(localStorage.getItem(STORAGE_KEY) || document.documentElement.lang || DEFAULT_LOCALE);
  document.documentElement.lang = currentLocale;
  applyTranslations();
  initLangSwitcher();
}
