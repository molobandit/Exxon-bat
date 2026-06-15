import { getLocale } from "./i18n.js";
import {
  CATEGORY_LABELS,
  MO_REF_LABELS,
  SOURCE_LABELS,
  TRADE_LABELS,
  TYPE_LABELS,
  UNIT_LABELS,
} from "./locales/catalog-meta.js";

function pick(map, key, locale) {
  if (!key || !map[key]) return key;
  return map[key][locale] ?? map[key].fr ?? key;
}

const DESIGNATION_PATTERNS = [
  {
    re: /^(.+) — Prise (.+) (.+)$/i,
    build: {
      en: (m) => `${m[1]} — Socket ${m[2]} ${m[3]}`,
      pt: (m) => `${m[1]} — Tomada ${m[2]} ${m[3]}`,
      it: (m) => `${m[1]} — Presa ${m[2]} ${m[3]}`,
      es: (m) => `${m[1]} — Enchufe ${m[2]} ${m[3]}`,
    },
  },
  {
    re: /^(.+) — Interrupteur (.+) (.+)$/i,
    build: {
      en: (m) => `${m[1]} — Switch ${m[2]} ${m[3]}`,
      pt: (m) => `${m[1]} — Interruptor ${m[2]} ${m[3]}`,
      it: (m) => `${m[1]} — Interruttore ${m[2]} ${m[3]}`,
      es: (m) => `${m[1]} — Interruptor ${m[2]} ${m[3]}`,
    },
  },
  {
    re: /^Disjoncteur (.+) (\d+) A courbe C$/i,
    build: {
      en: (m) => `Circuit breaker ${m[1]} ${m[2]} A curve C`,
      pt: (m) => `Disjuntor ${m[1]} ${m[2]} A curva C`,
      it: (m) => `Interruttore magnetotermico ${m[1]} ${m[2]} A curva C`,
      es: (m) => `Interruptor automático ${m[1]} ${m[2]} A curva C`,
    },
  },
  {
    re: /^Interrupteur différentiel (.+) (\d+) A (\d+) mA$/i,
    build: {
      en: (m) => `RCD ${m[1]} ${m[2]} A ${m[3]} mA`,
      pt: (m) => `Diferencial ${m[1]} ${m[2]} A ${m[3]} mA`,
      it: (m) => `Differenziale ${m[1]} ${m[2]} A ${m[3]} mA`,
      es: (m) => `Diferencial ${m[1]} ${m[2]} A ${m[3]} mA`,
    },
  },
  {
    re: /^Câble (.+) (.+) mm²$/i,
    build: {
      en: (m) => `Cable ${m[1]} ${m[2]} mm²`,
      pt: (m) => `Cabo ${m[1]} ${m[2]} mm²`,
      it: (m) => `Cavo ${m[1]} ${m[2]} mm²`,
      es: (m) => `Cable ${m[1]} ${m[2]} mm²`,
    },
  },
  {
    re: /^Gaine (.+) Ø (\d+) mm$/i,
    build: {
      en: (m) => `Conduit ${m[1]} Ø ${m[2]} mm`,
      pt: (m) => `Gama ${m[1]} Ø ${m[2]} mm`,
      it: (m) => `Guaina ${m[1]} Ø ${m[2]} mm`,
      es: (m) => `Canalización ${m[1]} Ø ${m[2]} mm`,
    },
  },
  {
    re: /^Goulotte GTL (\d+) mm$/i,
    build: {
      en: (m) => `GTL trunking ${m[1]} mm`,
      pt: (m) => `Calha GTL ${m[1]} mm`,
      it: (m) => `Canaletta GTL ${m[1]} mm`,
      es: (m) => `Canaleta GTL ${m[1]} mm`,
    },
  },
  {
    re: /^Angle goulotte GTL (\d+) mm$/i,
    build: {
      en: (m) => `GTL trunking angle ${m[1]} mm`,
      pt: (m) => `Ângulo calha GTL ${m[1]} mm`,
      it: (m) => `Angolo canaletta GTL ${m[1]} mm`,
      es: (m) => `Ángulo canaleta GTL ${m[1]} mm`,
    },
  },
  {
    re: /^Tableau étanche (\d+) modules$/i,
    build: {
      en: (m) => `Weatherproof panel ${m[1]} modules`,
      pt: (m) => `Quadro estanque ${m[1]} módulos`,
      it: (m) => `Quadro stagno ${m[1]} moduli`,
      es: (m) => `Cuadro estanco ${m[1]} módulos`,
    },
  },
  {
    re: /^Tableau nu (\d+) modules$/i,
    build: {
      en: (m) => `Bare panel ${m[1]} modules`,
      pt: (m) => `Quadro nu ${m[1]} módulos`,
      it: (m) => `Quadro nudo ${m[1]} moduli`,
      es: (m) => `Cuadro vacío ${m[1]} módulos`,
    },
  },
  {
    re: /^Porte (\d+) modules$/i,
    build: {
      en: (m) => `Door ${m[1]} modules`,
      pt: (m) => `Porta ${m[1]} módulos`,
      it: (m) => `Porta ${m[1]} moduli`,
      es: (m) => `Puerta ${m[1]} módulos`,
    },
  },
  {
    re: /^Rail DIN (\d+) modules$/i,
    build: {
      en: (m) => `DIN rail ${m[1]} modules`,
      pt: (m) => `Trilho DIN ${m[1]} módulos`,
      it: (m) => `Barra DIN ${m[1]} moduli`,
      es: (m) => `Riel DIN ${m[1]} módulos`,
    },
  },
  {
    re: /^Boîte (.+) prof\. (\d+) mm$/i,
    build: {
      en: (m) => `Box ${m[1]} depth ${m[2]} mm`,
      pt: (m) => `Caixa ${m[1]} prof. ${m[2]} mm`,
      it: (m) => `Scatola ${m[1]} prof. ${m[2]} mm`,
      es: (m) => `Caja ${m[1]} prof. ${m[2]} mm`,
    },
  },
  {
    re: /^Peinture (.+) (\d+) L — (.+)$/i,
    build: {
      en: (m) => `Paint ${m[1]} ${m[2]} L — ${m[3]}`,
      pt: (m) => `Tinta ${m[1]} ${m[2]} L — ${m[3]}`,
      it: (m) => `Vernice ${m[1]} ${m[2]} L — ${m[3]}`,
      es: (m) => `Pintura ${m[1]} ${m[2]} L — ${m[3]}`,
    },
  },
  {
    re: /^Tube (.+) Ø (\d+) mm$/i,
    build: {
      en: (m) => `Pipe ${m[1]} Ø ${m[2]} mm`,
      pt: (m) => `Tubo ${m[1]} Ø ${m[2]} mm`,
      it: (m) => `Tubo ${m[1]} Ø ${m[2]} mm`,
      es: (m) => `Tubo ${m[1]} Ø ${m[2]} mm`,
    },
  },
  {
    re: /^Raccord (.+) Ø (\d+)$/i,
    build: {
      en: (m) => `Fitting ${m[1]} Ø ${m[2]}`,
      pt: (m) => `Ligação ${m[1]} Ø ${m[2]}`,
      it: (m) => `Raccordo ${m[1]} Ø ${m[2]}`,
      es: (m) => `Racor ${m[1]} Ø ${m[2]}`,
    },
  },
  {
    re: /^Split inverter (.+) kW complet$/i,
    build: {
      en: (m) => `Inverter split ${m[1]} kW complete`,
      pt: (m) => `Split inverter ${m[1]} kW completo`,
      it: (m) => `Split inverter ${m[1]} kW completo`,
      es: (m) => `Split inverter ${m[1]} kW completo`,
    },
  },
  {
    re: /^Unité intérieure (.+) kW$/i,
    build: {
      en: (m) => `Indoor unit ${m[1]} kW`,
      pt: (m) => `Unidade interior ${m[1]} kW`,
      it: (m) => `Unità interna ${m[1]} kW`,
      es: (m) => `Unidad interior ${m[1]} kW`,
    },
  },
  {
    re: /^Unité extérieure (.+) kW$/i,
    build: {
      en: (m) => `Outdoor unit ${m[1]} kW`,
      pt: (m) => `Unidade exterior ${m[1]} kW`,
      it: (m) => `Unità esterna ${m[1]} kW`,
      es: (m) => `Unidad exterior ${m[1]} kW`,
    },
  },
  {
    re: /^Radiateur (.+) (\d+) W$/i,
    build: {
      en: (m) => `Radiator ${m[1]} ${m[2]} W`,
      pt: (m) => `Radiador ${m[1]} ${m[2]} W`,
      it: (m) => `Radiatore ${m[1]} ${m[2]} W`,
      es: (m) => `Radiador ${m[1]} ${m[2]} W`,
    },
  },
  {
    re: /^Plaque (.+) (.+) cm$/i,
    build: {
      en: (m) => `Board ${m[1]} ${m[2]} cm`,
      pt: (m) => `Placa ${m[1]} ${m[2]} cm`,
      it: (m) => `Pannello ${m[1]} ${m[2]} cm`,
      es: (m) => `Placa ${m[1]} ${m[2]} cm`,
    },
  },
  {
    re: /^Bloc-porte (.+) (.+) cm$/i,
    build: {
      en: (m) => `Door set ${m[1]} ${m[2]} cm`,
      pt: (m) => `Porta completa ${m[1]} ${m[2]} cm`,
      it: (m) => `Blocco porta ${m[1]} ${m[2]} cm`,
      es: (m) => `Puerta completa ${m[1]} ${m[2]} cm`,
    },
  },
  {
    re: /^Kit (.+)$/i,
    build: {
      en: (m) => `Kit ${m[1]}`,
      pt: (m) => `Kit ${m[1]}`,
      it: (m) => `Kit ${m[1]}`,
      es: (m) => `Kit ${m[1]}`,
    },
  },
];

const WORD_REPLACEMENTS = {
  en: [
    [/Disjoncteur/gi, "Circuit breaker"],
    [/Interrupteur/gi, "Switch"],
    [/différentiel/gi, "RCD"],
    [/Câble/gi, "Cable"],
    [/Gaine/gi, "Conduit"],
    [/Goulotte/gi, "Trunking"],
    [/Tableau/gi, "Panel"],
    [/étanche/gi, "weatherproof"],
    [/modules/gi, "modules"],
    [/Porte/gi, "Door"],
    [/Boîte/gi, "Box"],
    [/Prise/gi, "Socket"],
    [/Peinture/gi, "Paint"],
    [/Tube/gi, "Pipe"],
    [/Raccord/gi, "Fitting"],
    [/Robinet/gi, "Tap"],
    [/Radiateur/gi, "Radiator"],
    [/Van(?:ne)?/gi, "Valve"],
    [/Carrelage/gi, "Tile"],
    [/Faïence/gi, "Wall tile"],
    [/Mosaïque/gi, "Mosaic"],
    [/Plinthe/gi, "Skirting"],
    [/Plaque/gi, "Board"],
    [/Cloison/gi, "Partition"],
    [/Faux plafond/gi, "Suspended ceiling"],
    [/Isolation/gi, "Insulation"],
    [/Panneau/gi, "Panel"],
    [/Parquet/gi, "Parquet"],
    [/Pose/gi, "Installation"],
    [/Heure/gi, "Hour"],
    [/Déplacement/gi, "Call-out"],
    [/intervention/gi, "call-out"],
    [/Préparation/gi, "Preparation"],
    [/Pompe à chaleur/gi, "Heat pump"],
    [/géothermie/gi, "geothermal"],
    [/Plancher chauffant/gi, "Underfloor heating"],
    [/Liaison frigorifique/gi, "Refrigerant line"],
    [/Unité/gi, "Unit"],
    [/intérieure/gi, "indoor"],
    [/extérieure/gi, "outdoor"],
    [/combles perdus/gi, "loft blow-in"],
    [/qualifié/gi, "qualified"],
    [/professionnel/gi, "professional"],
    [/apprenti/gi, "apprentice"],
    [/aide/gi, "helper"],
    [/courbe C/gi, "curve C"],
    [/sac/gi, "bag"],
    [/grain/gi, "grit"],
    [/abrasif/gi, "abrasive"],
    [/Rouleau/gi, "Roller"],
    [/Pinceau/gi, "Brush"],
    [/Manchon/gi, "Sleeve"],
    [/Scotch/gi, "Tape"],
    [/Bâche/gi, "Tarpaulin"],
    [/Angle/gi, "Angle"],
    [/prof\./gi, "depth"],
  ],
  pt: [
    [/Disjoncteur/gi, "Disjuntor"],
    [/Interrupteur/gi, "Interruptor"],
    [/différentiel/gi, "Diferencial"],
    [/Câble/gi, "Cabo"],
    [/Gaine/gi, "Gama"],
    [/Goulotte/gi, "Calha"],
    [/Tableau/gi, "Quadro"],
    [/étanche/gi, "estanque"],
    [/Porte/gi, "Porta"],
    [/Boîte/gi, "Caixa"],
    [/Prise/gi, "Tomada"],
    [/Peinture/gi, "Tinta"],
    [/Tube/gi, "Tubo"],
    [/Raccord/gi, "Ligação"],
    [/Radiateur/gi, "Radiador"],
    [/Carrelage/gi, "Azulejo"],
    [/Faïence/gi, "Azulejo parede"],
    [/Plaque/gi, "Placa"],
    [/Cloison/gi, "Divisória"],
    [/Faux plafond/gi, "Falso teto"],
    [/Isolation/gi, "Isolamento"],
    [/Pose/gi, "Montagem"],
    [/Heure/gi, "Hora"],
    [/Déplacement/gi, "Deslocação"],
    [/intervention/gi, "intervenção"],
    [/Préparation/gi, "Preparação"],
    [/Pompe à chaleur/gi, "Bomba de calor"],
    [/qualifié/gi, "qualificado"],
    [/professionnel/gi, "profissional"],
  ],
  it: [
    [/Disjoncteur/gi, "Interruttore magnetotermico"],
    [/Interrupteur/gi, "Interruttore"],
    [/différentiel/gi, "Differenziale"],
    [/Câble/gi, "Cavo"],
    [/Gaine/gi, "Guaina"],
    [/Goulotte/gi, "Canaletta"],
    [/Tableau/gi, "Quadro"],
    [/étanche/gi, "stagno"],
    [/Porte/gi, "Porta"],
    [/Boîte/gi, "Scatola"],
    [/Prise/gi, "Presa"],
    [/Peinture/gi, "Vernice"],
    [/Tube/gi, "Tubo"],
    [/Raccord/gi, "Raccordo"],
    [/Radiateur/gi, "Radiatore"],
    [/Carrelage/gi, "Piastrella"],
    [/Plaque/gi, "Pannello"],
    [/Cloison/gi, "Parete"],
    [/Faux plafond/gi, "Controsoffitto"],
    [/Isolation/gi, "Isolamento"],
    [/Pose/gi, "Posa"],
    [/Heure/gi, "Ora"],
    [/Préparation/gi, "Preparazione"],
    [/Pompe à chaleur/gi, "Pompa di calore"],
    [/qualifié/gi, "qualificato"],
    [/professionnel/gi, "professionista"],
  ],
  es: [
    [/Disjoncteur/gi, "Interruptor automático"],
    [/Interrupteur/gi, "Interruptor"],
    [/différentiel/gi, "Diferencial"],
    [/Câble/gi, "Cable"],
    [/Gaine/gi, "Canalización"],
    [/Goulotte/gi, "Canaleta"],
    [/Tableau/gi, "Cuadro"],
    [/étanche/gi, "estanco"],
    [/Porte/gi, "Puerta"],
    [/Boîte/gi, "Caja"],
    [/Prise/gi, "Enchufe"],
    [/Peinture/gi, "Pintura"],
    [/Tube/gi, "Tubo"],
    [/Raccord/gi, "Racor"],
    [/Radiateur/gi, "Radiador"],
    [/Carrelage/gi, "Azulejo"],
    [/Plaque/gi, "Placa"],
    [/Cloison/gi, "Tabique"],
    [/Faux plafond/gi, "Falso techo"],
    [/Isolation/gi, "Aislamiento"],
    [/Pose/gi, "Instalación"],
    [/Heure/gi, "Hora"],
    [/Préparation/gi, "Preparación"],
    [/Pompe à chaleur/gi, "Bomba de calor"],
    [/qualifié/gi, "cualificado"],
    [/professionnel/gi, "profesional"],
  ],
};

function applyWordReplacements(text, locale) {
  let out = text;
  for (const [re, rep] of WORD_REPLACEMENTS[locale] ?? []) {
    out = out.replace(re, rep);
  }
  return out;
}

export function translateCategory(category, locale = getLocale()) {
  return pick(CATEGORY_LABELS, category, locale);
}

export function translateTrade(tradeType, locale = getLocale()) {
  return pick(TRADE_LABELS, tradeType, locale);
}

const UNIT_PLURALS_FR = {
  unité: "unités",
  mètre: "mètres",
  "mètre carré": "mètres carrés",
  heure: "heures",
  litre: "litres",
  "mètre linéaire": "mètres linéaires",
};

export function translateUnit(unit, locale = getLocale(), qty = 1) {
  const label = pick(UNIT_LABELS, unit, locale) ?? unit;
  if (locale === "fr" && qty > 1 && UNIT_PLURALS_FR[label]) {
    return UNIT_PLURALS_FR[label];
  }
  return label;
}

export function translateType(type, locale = getLocale()) {
  return pick(TYPE_LABELS, type, locale) ?? type;
}

export function translateSource(source, locale = getLocale()) {
  return pick(SOURCE_LABELS, source, locale) ?? source;
}

export function translateDesignation(item, locale = getLocale()) {
  const designation = item?.designation ?? "";
  const ref = item?.ref ?? "";
  if (!designation || locale === "fr") return designation;

  if (ref && MO_REF_LABELS[ref]) {
    return pick(MO_REF_LABELS, ref, locale);
  }

  for (const pattern of DESIGNATION_PATTERNS) {
    const match = designation.match(pattern.re);
    if (match) {
      const builder = pattern.build[locale] ?? pattern.build.en;
      if (builder) return builder(match);
    }
  }

  if (item?.source === "catalog") {
    return applyWordReplacements(designation, locale);
  }

  return designation;
}

export function localizePrestation(item, locale = getLocale()) {
  if (!item) return item;
  return {
    ...item,
    designation: translateDesignation(item, locale),
    category: translateCategory(item.category, locale),
    unit: translateUnit(item.unit, locale, item.qty ?? 1),
    typeLabel: translateType(item.type, locale),
    sourceLabel: translateSource(item.source, locale),
    tradeLabel: translateTrade(item.tradeType, locale),
  };
}

export function prestationSearchText(item, locale = getLocale()) {
  const loc = localizePrestation(item, locale);
  return `${item.ref} ${item.batiprixCode ?? ""} ${item.batiprixLot ?? ""} ${item.designation} ${loc.designation} ${item.category} ${loc.category}`.toLowerCase();
}
