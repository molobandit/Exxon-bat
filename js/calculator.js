import {
  getMaterialGrossMargin,
  getMaterialMarkupRatio,
  isMaterialMarkupOk,
  MATERIAL_MIN_MARKUP,
  normalizeQuote,
} from "./quote-pricing.js";
import { formatHourly, formatMoney } from "./currency-format.js";

export { formatHourly, formatMoney };

const DEFAULT_SOLO_CHARGE_RATE = 0.45;
const DEFAULT_OVERHEAD_RATE = 15;

export const ACTIVITY_TYPES = {
  bnc: {
    label: "Prestations de services (BNC)",
    hint: "Consultant, coach, développeur, graphiste…",
    urssafRate: 0.256,
    liberatoireRate: 0.022,
  },
  bic: {
    label: "Prestations de services (BIC)",
    hint: "Artisan, coiffeur, réparateur, traiteur…",
    urssafRate: 0.212,
    liberatoireRate: 0.022,
  },
  vente: {
    label: "Vente de marchandises",
    hint: "Commerce, e-commerce, revente…",
    urssafRate: 0.123,
    liberatoireRate: 0.01,
  },
  cipav: {
    label: "Profession libérale réglementée",
    hint: "Architecte, géomètre, agent immobilier…",
    urssafRate: 0.232,
    liberatoireRate: 0.022,
  },
};

export const BUSINESS_TYPES = {
  micro: {
    label: "Micro-entreprise",
    description: "Auto-entrepreneur, sans salarié",
  },
  solo: {
    label: "Entrepreneur seul",
    description: "EI, EURL, SASU — sans équipe",
  },
  tpe: {
    label: "TPE / PME",
    description: "Entreprise avec salariés",
  },
};

export function formatEuro(value) {
  return formatMoney(value, "FR", false);
}

export function formatEuroDetailed(value) {
  return formatMoney(value, "FR", true);
}

export function formatPercent(value) {
  return `${value.toFixed(1).replace(".", ",")}\u00a0%`;
}

function getActivity(activityType = "bnc") {
  return ACTIVITY_TYPES[activityType] ?? ACTIVITY_TYPES.bnc;
}

function microDeductionRate(profile) {
  const activity = getActivity(profile.activityType);
  return (
    activity.urssafRate +
    (profile.versementLiberatoire ? activity.liberatoireRate : 0)
  );
}

function materialBreakdownLines(quote, country = "FR") {
  const q = normalizeQuote(quote);
  const lines = [];
  const fmt = (v) => formatMoney(v, country, false);
  const fmtD = (v) => formatMoney(v, country, true);

  if (q.materialPurchaseCost > 0) {
    const ratio = getMaterialMarkupRatio(q);
    const margin = getMaterialGrossMargin(q);
    lines.push(
      `── Matériel (interne) ──`,
      `Coût achat fournisseur HT : ${fmt(q.materialPurchaseCost)}`,
      `Prix de vente client HT : ${fmt(q.materialSellPrice)}`,
      `Marge brute matériel : ${fmt(margin)} (coeff. ×${ratio?.toFixed(2) ?? "—"})`,
    );
    if (!isMaterialMarkupOk(q)) {
      lines.push(
        `⚠ Coefficient insuffisant — minimum ×${MATERIAL_MIN_MARKUP} requis (${fmt(q.materialPurchaseCost * MATERIAL_MIN_MARKUP)} client)`,
      );
    }
  }

  return lines;
}

function analyzeMicro(profile, quote) {
  const country = "FR";
  const { monthlyNet, monthlyFixed, monthlyHours, versementLiberatoire } =
    profile;
  const q = normalizeQuote(quote);
  const { price, hours } = q;
  const materialCost = q.materialPurchaseCost;
  const activity = getActivity(profile.activityType);
  const deductionRate = microDeductionRate(profile);

  const socialCharges = price * activity.urssafRate;
  const liberatoireCharges = versementLiberatoire
    ? price * activity.liberatoireRate
    : 0;
  const fixedAllocation = (monthlyFixed / monthlyHours) * hours;
  const targetNet = (monthlyNet / monthlyHours) * hours;

  const netEstimated =
    price -
    socialCharges -
    liberatoireCharges -
    materialCost -
    fixedAllocation;

  const minPrice =
    (targetNet + materialCost + fixedAllocation) / (1 - deductionRate);

  const fmt = (v) => formatMoney(v, country, false);
  const fmtD = (v) => formatMoney(v, country, true);

  const breakdown = [
    `Chiffre d'affaires (prix HT) : ${fmt(price)}`,
    `Cotisations URSSAF (${formatPercent(activity.urssafRate * 100)}) : −${fmt(socialCharges)}`,
  ];

  if (versementLiberatoire) {
    breakdown.push(
      `Versement libératoire (${formatPercent(activity.liberatoireRate * 100)}) : −${fmt(liberatoireCharges)}`,
    );
  }

  breakdown.push(
    `Coût achat matériel (fournisseur) : −${fmt(materialCost)}`,
    ...materialBreakdownLines(q, country),
    `Part des frais fixes : −${fmt(fixedAllocation)}`,
    `Net estimé : ${fmtD(netEstimated)}`,
    `Objectif net pour ${hours} h : ${fmt(targetNet)}`,
    `Prix minimum conseillé : ${fmt(minPrice)}`,
  );

  return applyMaterialMarkupCheck(
    buildResult(netEstimated, hours, targetNet, minPrice, breakdown, {
      marginRate: price > 0 ? (netEstimated / price) * 100 : 0,
      directCost: materialCost,
    }, country),
    q,
    country,
  );
}

function analyzeSolo(profile, quote) {
  const country = "FR";
  const {
    monthlyNet,
    monthlyFixed,
    monthlyHours,
    chargeRate = DEFAULT_SOLO_CHARGE_RATE,
  } = profile;
  const q = normalizeQuote(quote);
  const { price, hours } = q;
  const materialCost = q.materialPurchaseCost;

  const socialCharges = price * chargeRate;
  const fixedAllocation = (monthlyFixed / monthlyHours) * hours;
  const targetNet = (monthlyNet / monthlyHours) * hours;

  const netEstimated = price - socialCharges - materialCost - fixedAllocation;
  const minPrice =
    (targetNet + materialCost + fixedAllocation) / (1 - chargeRate);

  const fmt = (v) => formatMoney(v, country, false);
  const fmtD = (v) => formatMoney(v, country, true);

  const breakdown = [
    `Chiffre d'affaires (prix HT) : ${fmt(price)}`,
    `Charges sociales & fiscales estimées (${formatPercent(chargeRate * 100)}) : −${fmt(socialCharges)}`,
    `Coût achat matériel (fournisseur) : −${fmt(materialCost)}`,
    ...materialBreakdownLines(q, country),
    `Part des frais fixes : −${fmt(fixedAllocation)}`,
    `Net estimé dirigeant : ${fmtD(netEstimated)}`,
    `Objectif net pour ${hours} h : ${fmt(targetNet)}`,
    `Prix minimum conseillé : ${fmt(minPrice)}`,
  ];

  return applyMaterialMarkupCheck(
    buildResult(netEstimated, hours, targetNet, minPrice, breakdown, {
      marginRate: price > 0 ? (netEstimated / price) * 100 : 0,
      directCost: materialCost,
    }, country),
    q,
    country,
  );
}

function analyzeTpe(profile, quote) {
  const country = "FR";
  const {
    monthlyNet,
    monthlyFixed,
    monthlyHours,
    payrollLoaded,
    overheadRate = DEFAULT_OVERHEAD_RATE,
  } = profile;
  const q = normalizeQuote(quote);
  const { price, hours, employeeHours } = q;
  const materialCost = q.materialPurchaseCost;

  const loadedHourlyRate = payrollLoaded / monthlyHours;
  const structurePerHour = (monthlyFixed + monthlyNet) / monthlyHours;
  const laborCost = employeeHours * loadedHourlyRate;
  const directCost = materialCost + laborCost;
  const fraisGeneraux = directCost * (overheadRate / 100);
  const structureAllocation = structurePerHour * hours;
  const targetNet = (monthlyNet / monthlyHours) * hours;

  const totalCost = directCost + fraisGeneraux + structureAllocation;
  const netEstimated = price - totalCost;
  const minPrice = totalCost + targetNet;

  const fmt = (v) => formatMoney(v, country, false);
  const fmtD = (v) => formatMoney(v, country, true);

  const breakdown = [
    `Prix HT de la prestation : ${fmt(price)}`,
    `Coûts directs (achats + main d'œuvre salariés) : ${fmt(directCost)}`,
    `— Coût achat matériel fournisseur : ${fmt(materialCost)}`,
    ...materialBreakdownLines(q, country).map((l) => `— ${l}`),
    `— Main d'œuvre salariés (${employeeHours} h × ${formatHourly(loadedHourlyRate, country)}) : ${fmt(laborCost)}`,
    `Frais généraux (${overheadRate} % sur coûts directs) : −${fmt(fraisGeneraux)}`,
    `Charges de structure (fixes + rémunération dirigeant) : −${fmt(structureAllocation)}`,
    `Coût total de la prestation : ${fmt(totalCost)}`,
    `Marge nette estimée : ${fmtD(netEstimated)}`,
    `Objectif rémunération dirigeant : ${fmt(targetNet)}`,
    `Prix minimum conseillé : ${fmt(minPrice)}`,
  ];

  return applyMaterialMarkupCheck(
    buildResult(netEstimated, hours, targetNet, minPrice, breakdown, {
      marginRate: price > 0 ? (netEstimated / price) * 100 : 0,
      directCost,
    }, country),
    q,
    country,
  );
}

function applyMaterialMarkupCheck(result, quote, country = "FR") {
  const q = normalizeQuote(quote);
  if (q.materialPurchaseCost <= 0 || isMaterialMarkupOk(q)) {
    return result;
  }

  const minSell = q.materialPurchaseCost * MATERIAL_MIN_MARKUP;
  return {
    ...result,
    status: result.status === "success" ? "warning" : result.status,
    label:
      result.status === "success"
        ? "Marge matériel insuffisante"
        : result.label,
    message: `Prix matériel client trop bas : ${formatMoney(q.materialSellPrice, country, false)} — minimum ×${MATERIAL_MIN_MARKUP} soit ${formatMoney(minSell, country, false)}.`,
  };
}

function buildResult(
  netEstimated,
  hours,
  targetNet,
  minPrice,
  breakdown,
  extra,
  country = "FR",
) {
  const realHourly = hours > 0 ? netEstimated / hours : 0;
  const fmt = (v) => formatMoney(v, country, false);

  let status;
  let label;
  let message;

  if (netEstimated <= 0) {
    status = "danger";
    label = "Prestation déficitaire";
    message = `À ce prix, vous perdez ${fmt(Math.abs(netEstimated))}. Prix minimum : ${fmt(minPrice)}.`;
  } else if (netEstimated < targetNet * 0.85) {
    status = "warning";
    label = "Marge insuffisante";
    message = `Marge de ${fmt(netEstimated)} — en dessous de votre objectif (${fmt(targetNet)}).`;
  } else {
    status = "success";
    label = "Prestation rentable";
    message = `Bonne marge : environ ${fmt(netEstimated)} après toutes les charges.`;
  }

  return {
    status,
    label,
    message,
    netEstimated,
    realHourly,
    minPrice,
    targetNet,
    breakdown,
    ...extra,
  };
}

export function computeProfileSummary(profile) {
  const country = "FR";
  const { businessType, monthlyNet, monthlyFixed, monthlyHours } = profile;
  const fmtH = (v) => formatHourly(v, country);

  if (businessType === "tpe") {
    const { payrollLoaded } = profile;
    const structurePerHour = (monthlyFixed + monthlyNet) / monthlyHours;
    const loadedHourlyRate = payrollLoaded / monthlyHours;
    const minHourlyRate = structurePerHour + loadedHourlyRate * 0.5;

    return {
      minHourlyRate,
      targetHourlyNet: monthlyNet / monthlyHours,
      extraLabel: "Coût salarié chargé",
      extraValue: fmtH(loadedHourlyRate),
    };
  }

  if (businessType === "solo") {
    const chargeRate = profile.chargeRate ?? DEFAULT_SOLO_CHARGE_RATE;
    const monthlyTargetGross =
      (monthlyNet + monthlyFixed) / (1 - chargeRate);

    return {
      minHourlyRate: monthlyTargetGross / monthlyHours,
      targetHourlyNet: monthlyNet / monthlyHours,
      extraLabel: "Charges estimées",
      extraValue: formatPercent(chargeRate * 100),
    };
  }

  const activity = getActivity(profile.activityType);
  const deductionRate = microDeductionRate(profile);
  const monthlyTargetGross =
    (monthlyNet + monthlyFixed) / (1 - deductionRate);

  return {
    minHourlyRate: monthlyTargetGross / monthlyHours,
    targetHourlyNet: monthlyNet / monthlyHours,
    extraLabel: "Cotisations URSSAF",
    extraValue: formatPercent(activity.urssafRate * 100),
  };
}

export function analyzeQuote(profile, quote) {
  if (profile.businessType === "tpe") {
    return analyzeTpe(profile, quote);
  }

  if (profile.businessType === "solo") {
    return analyzeSolo(profile, quote);
  }

  return analyzeMicro(profile, quote);
}
