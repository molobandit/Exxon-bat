import { TRADES } from "./metre-templates.js";
import {
  CONFIGURABLE_TRADES,
  getDefaultModeCoeff,
  getModesForTrade,
} from "./installation-difficulty.js";
import {
  collectTradeCoeffsFromForm,
  loadDifficultyOverrides,
  resetAllDifficultyOverrides,
  resetTradeDifficultyOverrides,
} from "./difficulty-coefficients-store.js";
import { notifyDifficultyCoeffsUpdated } from "./installation-difficulty.js";

function tradeLabel(tradeType) {
  return TRADES[tradeType]?.label || tradeType;
}

export function initDifficultySettings({
  tradeSelect,
  tableRoot,
  resetTradeBtn,
  resetAllBtn,
  defaultTrade = "electricien",
}) {
  if (!tradeSelect || !tableRoot) return null;

  let activeTrade = defaultTrade;
  const inputByMode = new Map();

  tradeSelect.innerHTML = CONFIGURABLE_TRADES.map(
    (trade) => `<option value="${trade}">${tradeLabel(trade)}</option>`,
  ).join("");
  tradeSelect.value = CONFIGURABLE_TRADES.includes(defaultTrade)
    ? defaultTrade
    : CONFIGURABLE_TRADES[0];

  function renderTable(tradeType) {
    activeTrade = tradeType;
    inputByMode.clear();
    const overrides = loadDifficultyOverrides();
    const tradeOverrides = overrides[tradeType] ?? {};

    const rows = getModesForTrade(tradeType)
      .filter((mode) => mode.id !== "standard")
      .map((mode) => {
        const defaultCoeff = getDefaultModeCoeff(mode.id);
        const effective = tradeOverrides[mode.id] ?? defaultCoeff;
        const customized = mode.id in tradeOverrides;
        return `
          <tr>
            <td>
              <strong>${mode.label}</strong>
              ${mode.hint ? `<br><small style="color:var(--text-muted)">${mode.hint}</small>` : ""}
            </td>
            <td>
              <input
                type="number"
                class="difficulty-coeff-input"
                data-mode="${mode.id}"
                min="0.5"
                max="5"
                step="0.05"
                value="${effective.toFixed(2)}"
              />
            </td>
            <td style="color:var(--text-muted);font-size:0.88rem">×${defaultCoeff.toFixed(2)}</td>
            <td>${customized ? '<span class="status-pill status-pill--warning">Personnalisé</span>' : "—"}</td>
          </tr>`;
      })
      .join("");

    tableRoot.innerHTML = rows
      ? `<div class="table-wrap">
          <table class="data-table difficulty-coeff-table">
            <thead>
              <tr>
                <th>Mode de pose</th>
                <th>Votre coefficient matériel</th>
                <th>Défaut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
      : `<p style="color:var(--text-muted)">Aucun mode configurable pour ce métier.</p>`;

    tableRoot.querySelectorAll(".difficulty-coeff-input").forEach((input) => {
      inputByMode.set(input.dataset.mode, input);
      input.addEventListener("change", () => persistActiveTrade());
    });
  }

  function persistActiveTrade() {
    const rows = [...inputByMode.entries()].map(([modeId, input]) => ({
      modeId,
      input,
      defaultCoeff: getDefaultModeCoeff(modeId),
    }));
    collectTradeCoeffsFromForm(activeTrade, rows);
    notifyDifficultyCoeffsUpdated();
  }

  tradeSelect.addEventListener("change", () => {
    persistActiveTrade();
    renderTable(tradeSelect.value);
  });

  resetTradeBtn?.addEventListener("click", () => {
    resetTradeDifficultyOverrides(activeTrade);
    renderTable(activeTrade);
    notifyDifficultyCoeffsUpdated();
  });

  resetAllBtn?.addEventListener("click", () => {
    if (!confirm("Réinitialiser tous les coefficients personnalisés pour tous les métiers ?")) {
      return;
    }
    resetAllDifficultyOverrides();
    renderTable(activeTrade);
    notifyDifficultyCoeffsUpdated();
  });

  renderTable(tradeSelect.value);

  return {
    persist: persistActiveTrade,
    refresh: () => renderTable(tradeSelect.value),
  };
}
