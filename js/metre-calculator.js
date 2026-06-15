import { formatProfileMoney } from "./market.js";
import { getCountryProfile } from "./country-config.js";
import { getMetreDifficultyCoeff, getDifficultyCoeff } from "./installation-difficulty.js";
import { PERSONNEL_ROLES } from "./metre-constants.js";

export function computeMaterialTotal(materials = [], tradeType = "general") {
  return materials.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const coeff = getDifficultyCoeff(item.installationMode || "standard", tradeType);
    return sum + qty * price * coeff;
  }, 0);
}

export function sumWeeklyHours(weeklyHours = {}) {
  return Object.values(weeklyHours).reduce(
    (sum, hours) => sum + (Number(hours) || 0),
    0,
  );
}

export function computePersonnelHours(personnel = []) {
  return personnel.reduce((sum, person) => {
    if (person.weeklyHours) {
      return sum + sumWeeklyHours(person.weeklyHours);
    }
    return sum + (Number(person.hours) || 0);
  }, 0);
}

export function computePersonnelTotal(personnel = [], difficultyCoeff = 1) {
  const base = personnel.reduce((sum, person) => {
    const role = PERSONNEL_ROLES[person.role];
    const rate = Number(person.hourlyRate) || role?.hourlyRate || 0;
    const hours = person.weeklyHours
      ? sumWeeklyHours(person.weeklyHours)
      : Number(person.hours) || 0;
    return sum + hours * rate;
  }, 0);
  const coeff = Number(difficultyCoeff) > 0 ? Number(difficultyCoeff) : 1;
  return Math.round(base * coeff * 100) / 100;
}

export function computeLogisticsTotal(logistics = {}, country = "FR") {
  const cfg = getCountryProfile(country);
  const defaultKm = cfg.travelDefaults?.km ?? 1.2;
  const km = Number(logistics.km) || 0;
  const kmRate = Number(logistics.kmRate) || defaultKm;
  const frais = Number(logistics.frais) || 0;
  const machineCost = Number(logistics.machineCost) || 0;
  return frais + km * kmRate + machineCost;
}

export function computeMetreTotals(metre, country = metre?.country ?? "FR") {
  const tradeType = metre.tradeType || "general";
  const materialCost = computeMaterialTotal(metre.materials, tradeType);
  const difficultyCoeff = getMetreDifficultyCoeff(metre);
  const personnelCost = computePersonnelTotal(metre.personnel, 1);
  const logisticsCost = computeLogisticsTotal(metre.logistics, country);
  const travelCost =
    Number(metre.travelCost) || logisticsCost || 0;
  const totalHours = computePersonnelHours(metre.personnel);
  const totalCost = materialCost + personnelCost + travelCost;

  return {
    materialCost,
    personnelCost,
    logisticsCost,
    travelCost,
    totalHours,
    totalCost,
    difficultyCoeff,
  };
}

export function aggregateMetres(metres = [], country = "FR") {
  return metres.reduce(
    (acc, metre) => {
      const totals = computeMetreTotals(metre, country);
      acc.materialCost += totals.materialCost;
      acc.personnelCost += totals.personnelCost;
      acc.travelCost += totals.travelCost;
      acc.totalHours += totals.totalHours;
      acc.totalCost += totals.totalCost;
      acc.count += 1;
      return acc;
    },
    {
      materialCost: 0,
      personnelCost: 0,
      travelCost: 0,
      totalHours: 0,
      totalCost: 0,
      count: 0,
    },
  );
}

export function compareDevisToMetre(devis, aggregated) {
  const devisPrice = Number(devis?.price) || 0;
  const devisHours = Number(devis?.hours) || 0;
  const devisMaterial =
    Number(devis?.materialPurchaseCost ?? devis?.materialCost) || 0;
  const actualCost = aggregated.totalCost;
  const deltaPrice = devisPrice - actualCost;
  const deltaHours = devisHours - aggregated.totalHours;
  const deltaMaterial = devisMaterial - aggregated.materialCost;

  let status = "match";
  let message = "Le métré correspond au devis initial.";

  if (Math.abs(deltaPrice) > 50 || Math.abs(deltaHours) > 2) {
    status = deltaPrice < 0 ? "overrun" : "underrun";
    message =
      deltaPrice < 0
        ? `Dépassement estimé de ${formatProfileMoney(Math.abs(deltaPrice))} par rapport au devis.`
        : `Économie estimée de ${formatProfileMoney(deltaPrice)} par rapport au devis.`;
  }

  return {
    status,
    message,
    devisPrice,
    devisHours,
    devisMaterial,
    actualCost,
    deltaPrice,
    deltaHours,
    deltaMaterial,
    suggestedFinalPrice: Math.max(actualCost * 1.15, devisPrice + deltaPrice),
  };
}

export function formatMetreSummary(totals) {
  return [
    `Matériel : ${formatProfileMoney(totals.materialCost)}`,
    `Main d'œuvre : ${formatProfileMoney(totals.personnelCost)}`,
    `Déplacements : ${formatProfileMoney(totals.travelCost)}`,
    `Total : ${formatProfileMoney(totals.totalCost)}`,
  ];
}
