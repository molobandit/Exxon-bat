import { isFeeLineType, isMoLineType } from "./devis-line-types.js";
import { getTradeOverrideCoeff, loadDifficultyOverrides } from "./difficulty-coefficients-store.js";

/**
 * Modes de pose / difficulté — majorations sur le matériel (fournitures), pas la MO.
 */

export const INSTALLATION_MODES = {
  standard: {
    id: "standard",
    label: "Standard",
    shortLabel: "Standard",
    defaultCoeff: 1,
    pdfNote: "",
    hint: "Conditions normales de chantier",
  },
  apparent: {
    id: "apparent",
    label: "Pose apparente / en saillie",
    shortLabel: "Apparent",
    defaultCoeff: 1,
    pdfNote: "Pose en apparent (chemins de câbles, moulures, goulottes)",
    hint: "Installation visible — temps MO réduit vs encastré",
  },
  encastre_reservation: {
    id: "encastre_reservation",
    label: "Encastré — réservations existantes",
    shortLabel: "Enc. réserv.",
    defaultCoeff: 1.3,
    pdfNote: "Pose encastrée dans réservations prévues à la construction",
    hint: "Boîtes, fourreaux et saignées déjà réalisés",
  },
  encastre_gainage: {
    id: "encastre_gainage",
    label: "Encastré — gainage à réaliser",
    shortLabel: "Enc. gainage",
    defaultCoeff: 1.6,
    pdfNote: "Encastrement avec création de saignées, fourreaux ou plinthes techniques",
    hint: "Gainage réalisé par nos soins — difficulté élevée",
  },
  sous_plafond: {
    id: "sous_plafond",
    label: "Passage sous plafond / combles",
    shortLabel: "S/plafond",
    defaultCoeff: 1.35,
    pdfNote: "Intervention sous plafond, combles ou faux plafond",
    hint: "",
  },
  dalle_beton: {
    id: "dalle_beton",
    label: "Encastré dalle / béton",
    shortLabel: "Enc. béton",
    defaultCoeff: 1.75,
    pdfNote: "Saignées dans dalle ou mur béton",
    hint: "",
  },
  renovation_occupe: {
    id: "renovation_occupe",
    label: "Rénovation — logement occupé",
    shortLabel: "Rénov. occupé",
    defaultCoeff: 1.25,
    pdfNote: "Contraintes rénovation en site occupé (protection, accès, ménage)",
    hint: "",
  },
  hauteur_nacelle: {
    id: "hauteur_nacelle",
    label: "Grande hauteur / nacelle",
    shortLabel: "Hauteur",
    defaultCoeff: 1.4,
    pdfNote: "Intervention en hauteur (nacelle, échafaudage)",
    hint: "",
  },
  acces_difficile: {
    id: "acces_difficile",
    label: "Accès difficile",
    shortLabel: "Accès diff.",
    defaultCoeff: 1.3,
    pdfNote: "Accès contraint (parking, cage d'escalier, monte-charge)",
    hint: "",
  },
  reseau_existant: {
    id: "reseau_existant",
    label: "Reprise sur existant",
    shortLabel: "Existant",
    defaultCoeff: 1.2,
    pdfNote: "Reprise, modification ou extension sur installation existante",
    hint: "",
  },
};

export const TRADE_INSTALLATION_MODES = {
  electricien: [
    "standard",
    "apparent",
    "encastre_reservation",
    "encastre_gainage",
    "sous_plafond",
    "dalle_beton",
    "renovation_occupe",
    "hauteur_nacelle",
  ],
  plombier: [
    "standard",
    "apparent",
    "encastre_reservation",
    "encastre_gainage",
    "renovation_occupe",
    "dalle_beton",
    "acces_difficile",
    "reseau_existant",
  ],
  chauffagiste: [
    "standard",
    "apparent",
    "encastre_gainage",
    "sous_plafond",
    "renovation_occupe",
    "hauteur_nacelle",
    "reseau_existant",
  ],
  peintre: ["standard", "renovation_occupe", "hauteur_nacelle", "acces_difficile"],
  carreleur: ["standard", "renovation_occupe", "dalle_beton", "acces_difficile"],
  menuisier: ["standard", "renovation_occupe", "encastre_reservation", "encastre_gainage"],
  plaquiste: ["standard", "renovation_occupe", "hauteur_nacelle", "encastre_gainage"],
  isolateur: ["standard", "sous_plafond", "renovation_occupe", "hauteur_nacelle", "acces_difficile"],
  macon: ["standard", "renovation_occupe", "dalle_beton", "acces_difficile"],
  general: [
    "standard",
    "apparent",
    "encastre_reservation",
    "encastre_gainage",
    "renovation_occupe",
    "acces_difficile",
  ],
};

/** Tous les corps d'état configurables dans le profil. */
export const CONFIGURABLE_TRADES = [
  "electricien",
  "plombier",
  "chauffagiste",
  "peintre",
  "carreleur",
  "menuisier",
  "plaquiste",
  "isolateur",
  "macon",
  "general",
];

export const CANALISATION_OPTIONS = [
  { value: "", label: "—" },
  { value: "apparent", label: "Apparent" },
  { value: "encastre_reservation", label: "Encastré (réservations)" },
  { value: "encastre_gainage", label: "Encastré (gainage à faire)" },
  { value: "sous_plafond", label: "Sous plafond / combles" },
  { value: "dalle_beton", label: "Dalle / béton" },
];

function resolveTradeType(tradeType) {
  if (tradeType && TRADE_INSTALLATION_MODES[tradeType]) return tradeType;
  return "general";
}

export function getDefaultModeCoeff(modeId) {
  return INSTALLATION_MODES[normalizeInstallationMode(modeId)]?.defaultCoeff ?? 1;
}

export function getEffectiveModeCoeff(modeId, tradeType = "general", overrides = loadDifficultyOverrides()) {
  const normalized = normalizeInstallationMode(modeId);
  const override = getTradeOverrideCoeff(resolveTradeType(tradeType), normalized, overrides);
  if (override !== null) return override;
  return getDefaultModeCoeff(normalized);
}

export function getMode(modeId, tradeType = "general") {
  const base = INSTALLATION_MODES[normalizeInstallationMode(modeId)];
  const materialCoeff = getEffectiveModeCoeff(base.id, tradeType);
  return {
    ...base,
    materialCoeff,
    moCoeff: materialCoeff,
  };
}

export function getModesForTrade(tradeType) {
  const trade = resolveTradeType(tradeType);
  const ids = TRADE_INSTALLATION_MODES[trade] || TRADE_INSTALLATION_MODES.general;
  return ids.map((id) => getMode(id, trade));
}

export function normalizeInstallationMode(modeId) {
  if (!modeId || !INSTALLATION_MODES[modeId]) return "standard";
  return modeId;
}

export function getDifficultyCoeff(modeId, tradeType = "general") {
  return getEffectiveModeCoeff(modeId, tradeType);
}

export function getMetreDifficultyCoeff(metre = {}) {
  const modeId =
    metre.workConditions?.installationMode ||
    metre.workStatus?.installationMode ||
    "standard";
  return getDifficultyCoeff(modeId, metre.tradeType || "general");
}

export function difficultyAppliesToLine(line) {
  if (isFeeLineType(line.type) || isMoLineType(line.type)) return false;
  return normalizeInstallationMode(line.installationMode) !== "standard";
}

export function getLineDifficultyCoeff(line) {
  const modeId = normalizeInstallationMode(line.installationMode);
  if (modeId === "standard") return 1;
  if (isMoLineType(line.type) || isFeeLineType(line.type)) return 1;

  const tradeType = line.tradeType || "general";
  return getDifficultyCoeff(modeId, tradeType);
}

export function getLineEffectiveUnitPrice(line) {
  const base = Number(line.unitPriceHT) || 0;
  return Math.round(base * getLineDifficultyCoeff(line) * 100) / 100;
}

export function getLineEffectiveTotal(line) {
  const qty = Number(line.qty) || 0;
  return Math.round(qty * getLineEffectiveUnitPrice(line) * 100) / 100;
}

export function buildLinePdfDesignation(line) {
  const designation = line.designation?.trim() || "Prestation";
  const mode = getMode(line.installationMode, line.tradeType || "general");
  if (!mode || mode.id === "standard" || !mode.pdfNote) return designation;
  return `${designation} — ${mode.pdfNote}`;
}

export function formatDifficultyCoeffBadge(line) {
  const coeff = getLineDifficultyCoeff(line);
  if (coeff <= 1.001) return "";
  return `×${coeff.toFixed(2)}`;
}

export function buildInstallationModeOptions(tradeType, selectedId = "standard") {
  const selected = normalizeInstallationMode(selectedId);
  const trade = resolveTradeType(tradeType);
  return getModesForTrade(trade).map((mode) => ({
    value: mode.id,
    label: `${mode.shortLabel} (mat. ×${(mode.materialCoeff ?? mode.moCoeff).toFixed(2)})`,
    title: mode.hint || mode.label,
    selected: mode.id === selected,
  }));
}

export function renderInstallationModeSelectHtml(
  tradeType,
  selectedId,
  { lineId = "", cssClass = "installation-mode-select" } = {},
) {
  const options = buildInstallationModeOptions(tradeType, selectedId);
  const attr = lineId ? ` data-difficulty="${lineId}"` : "";
  return `<select class="${cssClass}"${attr} title="Mode de pose / coefficient difficulté">
    ${options
      .map(
        (opt) =>
          `<option value="${opt.value}"${opt.selected ? " selected" : ""} title="${opt.title}">${opt.label}</option>`,
      )
      .join("")}
  </select>`;
}

export function renderCanalisationSelectHtml(value = "") {
  return `<select class="table-input" data-tech-col="canalisation">
    ${CANALISATION_OPTIONS.map(
      (opt) =>
        `<option value="${opt.value}"${opt.value === value ? " selected" : ""}>${opt.label}</option>`,
    ).join("")}
  </select>`;
}

/** Invalide le cache mémoire après sauvegarde (coefficients relus depuis localStorage). */
export function notifyDifficultyCoeffsUpdated() {
  window.dispatchEvent(new CustomEvent("exone-difficulty-coeffs-updated"));
}
