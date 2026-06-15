import { formatProfileMoney } from "./market.js";
import {
  getChantierById,
  getDevisById,
  getMetresByChantier,
  getTasksByChantier,
} from "./data.js";
import { aggregateMetres } from "./metre-calculator.js";

export function computeChantierProgress(chantierId) {
  const tasks = getTasksByChantier(chantierId);
  if (!tasks.length) return 0;
  const total = tasks.reduce((sum, task) => sum + (Number(task.progress) || 0), 0);
  return Math.round(total / tasks.length);
}

export function computeChantierMargin(chantier) {
  const devis = chantier.devisId ? getDevisById(chantier.devisId) : null;
  const metres = aggregateMetres(getMetresByChantier(chantier.id), chantier.country ?? "FR");
  const budget = Number(chantier.finalPrice ?? chantier.budget) || 0;
  const devisPrice = Number(devis?.price) || budget;
  const actualCost = metres.totalCost;
  const margin = devisPrice - actualCost;
  const marginRate = devisPrice > 0 ? (margin / devisPrice) * 100 : 0;

  let status = "success";
  if (marginRate < 10) status = "warning";
  if (margin < 0) status = "danger";

  return {
    budget: devisPrice,
    actualCost,
    margin,
    marginRate,
    status,
    metresCount: metres.count,
  };
}

export function formatMarginSummary(marginData) {
  return {
    budget: formatProfileMoney(marginData.budget),
    cost: formatProfileMoney(marginData.actualCost),
    margin: formatProfileMoney(marginData.margin),
    rate: `${marginData.marginRate.toFixed(1).replace(".", ",")} %`,
  };
}

export function getChantierStatusLabel(status) {
  const map = {
    en_cours: { label: "En cours", class: "warning" },
    valide: { label: "Validé", class: "success" },
    revision: { label: "Révision", class: "danger" },
    termine: { label: "Terminé", class: "success" },
    planifie: { label: "Planifié", class: "warning" },
  };
  return map[status] ?? map.en_cours;
}
