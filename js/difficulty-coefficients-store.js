const STORAGE_KEY = "exone-difficulty-coefficients";

/** @typedef {Record<string, Record<string, number>>} DifficultyOverrides */

function loadRaw() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveRaw(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadDifficultyOverrides() {
  return loadRaw();
}

export function saveDifficultyOverrides(overrides) {
  saveRaw(overrides ?? {});
}

export function getTradeOverrideCoeff(tradeType, modeId, overrides = loadRaw()) {
  const value = overrides?.[tradeType]?.[modeId];
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function setTradeOverrideCoeff(tradeType, modeId, coeff, overrides = loadRaw()) {
  const next = { ...overrides };
  if (!next[tradeType]) next[tradeType] = {};

  if (!Number.isFinite(coeff) || coeff <= 0) {
    delete next[tradeType][modeId];
    if (!Object.keys(next[tradeType]).length) delete next[tradeType];
  } else {
    next[tradeType][modeId] = Math.round(coeff * 100) / 100;
  }

  saveRaw(next);
  return next;
}

export function resetTradeDifficultyOverrides(tradeType) {
  const next = loadRaw();
  delete next[tradeType];
  saveRaw(next);
  return next;
}

export function resetAllDifficultyOverrides() {
  saveRaw({});
  return {};
}

export function collectTradeCoeffsFromForm(tradeType, rows) {
  const next = loadRaw();
  if (!next[tradeType]) next[tradeType] = {};

  for (const row of rows) {
    const modeId = row.modeId;
    const defaultCoeff = row.defaultCoeff;
    const input = row.input;
    const parsed = Number(input?.value);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;

    const rounded = Math.round(parsed * 100) / 100;
    if (Math.abs(rounded - defaultCoeff) < 0.001) {
      delete next[tradeType][modeId];
    } else {
      next[tradeType][modeId] = rounded;
    }
  }

  if (next[tradeType] && !Object.keys(next[tradeType]).length) {
    delete next[tradeType];
  }

  saveRaw(next);
  return next;
}
