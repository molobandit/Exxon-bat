/**
 * Tarifs de déplacement configurables (profil + devis personnalisé).
 */

export const DEFAULT_TRAVEL_FEES = {
  travelKmRate: 1.2,
  travelDepannageHT: 65,
  travelDayHT: 45,
};

export function resolveTravelFees(profile = {}) {
  return {
    kmRate: Number(profile.travelKmRate) || DEFAULT_TRAVEL_FEES.travelKmRate,
    depannageHT: Number(profile.travelDepannageHT) || DEFAULT_TRAVEL_FEES.travelDepannageHT,
    dayHT: Number(profile.travelDayHT) || DEFAULT_TRAVEL_FEES.travelDayHT,
  };
}

function purchaseFromSell(sell, ratio = 0.54) {
  return Math.round(sell * ratio * 100) / 100;
}

/** Modèles véhicule avec tarifs issus du profil. */
export function buildVehicleFeeTemplates(profile = {}) {
  const { kmRate, depannageHT, dayHT } = resolveTravelFees(profile);

  return [
    {
      type: "vehicule",
      category: "Véhicule & déplacement",
      ref: "VEH-KM",
      designation: "Frais kilométriques véhicule",
      unit: "km",
      unitPriceHT: kmRate,
      purchaseCostHT: purchaseFromSell(kmRate, 0.54),
    },
    {
      type: "vehicule",
      category: "Véhicule & déplacement",
      ref: "VEH-DEP",
      designation: "Forfait dépannage / intervention de base",
      unit: "forfait",
      unitPriceHT: depannageHT,
      purchaseCostHT: purchaseFromSell(depannageHT, 0.54),
    },
    {
      type: "vehicule",
      category: "Véhicule & déplacement",
      ref: "VEH-JOUR",
      designation: "Frais de déplacement — journée",
      unit: "j",
      unitPriceHT: dayHT,
      purchaseCostHT: purchaseFromSell(dayHT, 0.55),
    },
  ];
}

export function mergeTravelFeesIntoCatalog(baseItems, profile = {}) {
  const travelByRef = new Map(
    buildVehicleFeeTemplates(profile).map((item) => [item.ref, item]),
  );

  return baseItems.map((item) => {
    const travel = travelByRef.get(item.ref);
    return travel ? { ...item, ...travel } : item;
  });
}
