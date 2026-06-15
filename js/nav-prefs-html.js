/** HTML statique Langue (injecté dans la barre de navigation). */
export const NAV_PREFS_HTML = `
  <div class="lang-switcher">
    <label class="lang-switcher__label" for="lang-select" data-i18n="lang.label">Langue</label>
    <select id="lang-select" class="lang-switcher__select pref-switcher__select" aria-label="Langue">
      <option value="fr">🇫🇷 Français</option>
      <option value="en">🇬🇧 English</option>
      <option value="pt">🇵🇹 Português</option>
      <option value="it">🇮🇹 Italiano</option>
      <option value="es">🇪🇸 Español</option>
    </select>
  </div>
`;

export function ensureStaticNavPrefs(prefsRoot) {
  if (!prefsRoot || prefsRoot.querySelector(".lang-switcher")) return;
  prefsRoot.innerHTML = NAV_PREFS_HTML;
}
