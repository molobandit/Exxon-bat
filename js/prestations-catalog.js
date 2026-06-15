/**
 * Catalogue de référence BTP — génération programmatique (200+ articles / métier).
 * Les prix sont indicatifs HT ; modifiables dans la bibliothèque.
 */

import { IMAGE_SYNC_VERSION, resolvePrestationImageUrl } from "./prestation-images.js";
import { TRADE_EXTENSIONS } from "./trade-catalog-extensions.js";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function idx(list, value) {
  const i = list.indexOf(value);
  return i >= 0 ? i : 0;
}

function item(tradeType, category, ref, designation, unit, unitPriceHT, purchaseCostHT, type = "fourniture") {
  return {
    id: uid(),
    tradeType,
    category,
    ref,
    designation,
    unit,
    unitPriceHT: Math.round(unitPriceHT * 100) / 100,
    purchaseCostHT: Math.round(purchaseCostHT * 100) / 100,
    type,
    imageUrl: resolvePrestationImageUrl(tradeType, category, type, designation),
    imageSyncVersion: IMAGE_SYNC_VERSION,
    source: "catalog",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generateElectricien() {
  const t = "electricien";
  const out = [];

  const prises = ["16A 2P+T", "20A 2P+T", "32A 2P+T", "RJ45 Cat.6", "USB double", "VE Type E/F"];
  const finitions = ["blanc", "ivoire", "anthracite", "alu"];
  const marques = ["Legrand", "Schneider", "Hager", "ABB"];
  for (const m of marques) {
    for (const p of prises) {
      for (const f of finitions) {
        const sell = 4.5 + prises.indexOf(p) * 2 + finitions.indexOf(f) * 0.8;
        out.push(
          item(t, "Appareillage", `${m.slice(0, 3).toUpperCase()}-PR-${p.replace(/\s/g, "")}-${f.slice(0, 2)}`, `${m} — Prise ${p} ${f}`, "u", sell, sell * 0.45),
        );
      }
    }
  }

  const inters = ["simple", "va-et-vient", "poussoir", "variateur LED", "télérupteur"];
  for (const m of marques) {
    for (const i of inters) {
      for (const f of finitions) {
        const sell = 6 + inters.indexOf(i) * 3;
        out.push(item(t, "Appareillage", `${m.slice(0, 3).toUpperCase()}-INT-${i.slice(0, 3)}-${f.slice(0, 2)}`, `${m} — Interrupteur ${i} ${f}`, "u", sell, sell * 0.42));
      }
    }
  }

  const calibres = [6, 10, 16, 20, 25, 32, 40, 50, 63];
  const poles = ["1P", "2P", "3P", "4P"];
  for (const c of calibres) {
    for (const p of poles) {
      const sell = 8 + c * 0.35 + poles.indexOf(p) * 4;
      out.push(item(t, "Protection", `DISJ-${p}-${c}A`, `Disjoncteur ${p} ${c} A courbe C`, "u", sell, sell * 0.5));
    }
  }

  const diffs = [25, 40, 63];
  const sens = [30, 300];
  for (const c of diffs) {
    for (const s of sens) {
      for (const p of ["2P", "4P"]) {
        const sell = 45 + c + (s === 300 ? 25 : 0);
        out.push(item(t, "Protection", `DIFF-${p}-${c}A-${s}mA`, `Interrupteur différentiel ${p} ${c} A ${s} mA`, "u", sell, sell * 0.48));
      }
    }
  }

  const sections = [1.5, 2.5, 4, 6, 10, 16, 25, 35];
  const cables = ["H07V-U", "R2V2", "U1000 R2V", "FTP Cat.6"];
  for (const cable of cables) {
    for (const s of sections) {
      const sell = 0.85 + s * 0.22;
      out.push(item(t, "Câblage", `CAB-${cable.replace(/\s/g, "")}-${s}`, `Câble ${cable} ${s} mm²`, "m", sell, sell * 0.55));
    }
  }

  const gaines = ["ICTA", "IRL", "ICTA+"];
  const diam = [16, 20, 25, 32, 40, 50, 63];
  for (const g of gaines) {
    for (const d of diam) {
      const sell = 0.45 + d * 0.04;
      out.push(item(t, "Canalisation", `GAINE-${g}-${d}`, `Gaine ${g} Ø ${d} mm`, "m", sell, sell * 0.5));
    }
  }

  const goulottes = [13, 17, 21, 31, 40, 60, 85, 130];
  for (const w of goulottes) {
    out.push(item(t, "Canalisation", `GTL-${w}`, `Goulotte GTL ${w} mm`, "m", 2.2 + w * 0.08, (2.2 + w * 0.08) * 0.52));
    out.push(item(t, "Canalisation", `GTL-ANG-${w}`, `Angle goulotte GTL ${w} mm`, "u", 3.5 + w * 0.05, 2));
  }

  const tableaux = [1, 2, 3, 4, 5, 6, 8, 12, 18, 24, 36, 48];
  for (const m of tableaux) {
    out.push(item(t, "Tableau électrique", `TG-${m}M`, `Tableau étanche ${m} modules`, "u", 35 + m * 4.5, 18 + m * 2));
    out.push(item(t, "Tableau électrique", `TGN-${m}M`, `Tableau nu ${m} modules`, "u", 22 + m * 3, 11 + m * 1.5));
    out.push(item(t, "Tableau électrique", `PORTE-${m}M`, `Porte ${m} modules`, "u", 12 + m * 0.8, 6 + m * 0.4));
  }

  const rails = [12, 18, 24, 36];
  for (const r of rails) {
    out.push(item(t, "Tableau électrique", `RAIL-DIN-${r}`, `Rail DIN ${r} modules`, "u", 4 + r * 0.15, 2));
  }

  const boites = ["simple", "double", "triple", "étanche IP55", "encastrée cloison"];
  const profs = [40, 50, 60, 80];
  for (const b of boites) {
    for (const pr of profs) {
      out.push(item(t, "Boîtes & encastrement", `BOITE-${b.slice(0, 3)}-${pr}`, `Boîte ${b} prof. ${pr} mm`, "u", 1.2 + profs.indexOf(pr) * 0.4, 0.6));
    }
  }

  const eclairage = ["Spot LED encastré", "Dalle LED 60×60", "Réglette LED", "Applique murale", "Détecteur présence", "Minuterie"];
  for (const e of eclairage) {
    for (const pu of [6, 9, 12, 18, 24]) {
      out.push(item(t, "Éclairage", `ECL-${e.slice(0, 3)}-${pu}W`, `${e} ${pu} W`, "u", 12 + pu * 1.2, 6 + pu * 0.5));
    }
  }

  out.push(...generateElectricienInfra());
  out.push(...generateElectricienMobilite());

  out.push(item(t, "Main d'œuvre", "MO-ELEC-01", "Heure électricien qualifié", "h", 48, 28, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-ELEC-02", "Heure apprenti / aide", "h", 32, 18, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-ELEC-03", "Déplacement intervention", "forfait", 45, 25, "mo"));

  return out;
}

/** Tableaux pré-câblés, gaines préfilées et filerie — références métier détaillées. */
function generateElectricienInfra() {
  const t = "electricien";
  const out = [];

  const marquesTableaux = [
    { code: "LEG", name: "Legrand", line: "Resi9 XP" },
    { code: "SCH", name: "Schneider Electric", line: "Resi9" },
    { code: "HAG", name: "Hager", line: "Volta" },
  ];
  const rangees = [1, 2, 3, 4];
  const basePrixRangee = { 1: 215, 2: 365, 3: 495, 4: 685 };
  const configs = [
    { suffix: "STD", label: "standard", extra: 0 },
    { suffix: "SON", label: "avec sonnette", extra: 58 },
    { suffix: "TR", label: "avec télérupteur", extra: 45 },
    { suffix: "SON-TR", label: "avec sonnette et télérupteur", extra: 95 },
  ];

  for (const marque of marquesTableaux) {
    for (const r of rangees) {
      for (const cfg of configs) {
        const sell = basePrixRangee[r] + cfg.extra + (marque.code === "SCH" ? 12 : marque.code === "HAG" ? 8 : 0);
        const ref = `TGP-${marque.code}-${r}R-${cfg.suffix}`;
        const designation = `Tableau pré-câblé ${marque.name} ${marque.line} — ${r} rangée${r > 1 ? "s" : ""} — ${cfg.label}`;
        out.push(item(t, "Tableaux pré-câblés", ref, designation, "u", sell, sell * 0.52));
      }
    }
  }

  const gainesTypes = [
    { code: "ICTA+", label: "ICTA+" },
    { code: "IRL", label: "IRL" },
  ];
  const gainesConfigs = [
    { wires: "3G1,5", section: 1.5, sell: 1.75 },
    { wires: "3G2,5", section: 2.5, sell: 2.35 },
    { wires: "3G4", section: 4, sell: 3.15 },
    { wires: "3G6", section: 6, sell: 4.45 },
    { wires: "5G1,5", section: 1.5, sell: 2.55 },
    { wires: "5G2,5", section: 2.5, sell: 3.45 },
    { wires: "5G4", section: 4, sell: 4.85 },
    { wires: "5G6", section: 6, sell: 6.75 },
    { wires: "5G10", section: 10, sell: 9.8 },
    { wires: "5G16", section: 16, sell: 14.5 },
  ];

  for (const g of gainesTypes) {
    for (const cfg of gainesConfigs) {
      const ref = `GPREF-${g.code.replace("+", "P")}-${cfg.wires.replace(",", "")}`;
      const designation = `Gaine ${g.label} préfilée ${cfg.wires} mm²`;
      out.push(item(t, "Gaines préfilées", ref, designation, "m", cfg.sell, cfg.sell * 0.54));
    }
  }

  const filerieRigide = [1.5, 2.5, 4, 6, 10, 16, 25, 35];
  for (const s of filerieRigide) {
    const sell = 0.35 + s * 0.18;
    out.push(
      item(t, "Filerie", `FIL-H07VU-${String(s).replace(".", "")}`, `Fil rigide H07V-U ${s} mm² — au mètre`, "m", sell, sell * 0.52),
    );
    out.push(
      item(t, "Filerie", `FIL-H07VR-${String(s).replace(".", "")}`, `Fil souple H07V-R ${s} mm² — au mètre`, "m", sell * 1.15, sell * 1.15 * 0.52),
    );
  }

  const filerieMultis = [
    { ref: "2X15", label: "2 × 1,5 mm²", sell: 1.05 },
    { ref: "2X25", label: "2 × 2,5 mm²", sell: 1.45 },
    { ref: "3G15", label: "3G1,5 mm²", sell: 1.35 },
    { ref: "3G25", label: "3G2,5 mm²", sell: 1.85 },
    { ref: "3G4", label: "3G4 mm²", sell: 2.65 },
    { ref: "3G6", label: "3G6 mm²", sell: 3.75 },
    { ref: "5G15", label: "5G1,5 mm²", sell: 2.05 },
    { ref: "5G25", label: "5G2,5 mm²", sell: 2.75 },
    { ref: "5G4", label: "5G4 mm²", sell: 3.95 },
    { ref: "5G6", label: "5G6 mm²", sell: 5.45 },
    { ref: "5G10", label: "5G10 mm²", sell: 8.2 },
    { ref: "5G16", label: "5G16 mm²", sell: 12.5 },
    { ref: "5G25", label: "5G25 mm²", sell: 18.5 },
    { ref: "4X16P25", label: "4 × 16 mm² + 25 mm² (terre)", sell: 22 },
  ];

  for (const c of filerieMultis) {
    out.push(
      item(t, "Filerie", `CAB-U1000-${c.ref}`, `Câble U1000 R2V ${c.label}`, "m", c.sell, c.sell * 0.55),
    );
    out.push(
      item(t, "Filerie", `CAB-RO2V-${c.ref}`, `Câble RO2V ${c.label} — enterrement`, "m", c.sell * 1.35, c.sell * 1.35 * 0.55),
    );
  }

  for (const s of [1.5, 2.5, 4, 6]) {
    const sell = 1.2 + s * 0.35;
    out.push(
      item(t, "Filerie", `CAB-FTP-${String(s).replace(".", "")}`, `Câble FTP Cat.6 ${s} mm² — réseau / VDI`, "m", sell, sell * 0.5),
    );
  }

  for (const marque of marquesTableaux) {
    for (const r of rangees) {
      const sell = 28 + r * 18 + (marque.code === "SCH" ? 6 : 0);
      out.push(
        item(
          t,
          "Tableaux pré-câblés",
          `TGP-PORTE-${marque.code}-${r}R`,
          `Porte ${marque.name} ${r} rangée${r > 1 ? "s" : ""} — tableau pré-câblé`,
          "u",
          sell,
          sell * 0.48,
        ),
      );
    }
  }

  return out;
}

/** Recharge véhicule électrique et DDR spécialisés (Type A, AC, B, F, EV). */
function generateElectricienMobilite() {
  const t = "electricien";
  const out = [];

  const marques = [
    { code: "LEG", name: "Legrand" },
    { code: "SCH", name: "Schneider Electric" },
    { code: "HAG", name: "Hager" },
    { code: "ABB", name: "ABB" },
  ];

  const ddrTypes = [
    {
      code: "AC",
      label: "Type AC",
      desc: "courant alternatif sinusoïdal — usage général",
      factor: 1,
    },
    {
      code: "A",
      label: "Type A",
      desc: "courant alternatif + composante continue — lave-linge, VMC, photovoltaïque",
      factor: 1.35,
    },
    {
      code: "F",
      label: "Type F",
      desc: "courant alternatif + fréquences variables — électroménager récent",
      factor: 1.45,
    },
    {
      code: "B",
      label: "Type B",
      desc: "toutes fréquences + courant continu lissé — bornes VE, onduleurs",
      factor: 2.4,
    },
    {
      code: "EV",
      label: "Type EV",
      desc: "dédié recharge véhicule électrique — conforme NFC 15-100",
      factor: 2.1,
    },
  ];

  const calibres = [25, 40, 63];
  const sensibilites = [
    { ma: 30, label: "30 mA", extra: 0 },
    { ma: 300, label: "300 mA sélectif", extra: 18 },
  ];
  const poles = ["2P", "4P"];

  for (const marque of marques) {
    for (const type of ddrTypes) {
      for (const cal of calibres) {
        for (const sens of sensibilites) {
          for (const pole of poles) {
            const base = 42 + cal * 0.85 + (pole === "4P" ? 38 : 0) + sens.extra;
            const sell = Math.round(base * type.factor * (marque.code === "ABB" ? 1.08 : 1) * 100) / 100;
            const ref = `DDR-${type.code}-${marque.code}-${pole}-${cal}A-${sens.ma}MA`;
            const designation = `Interrupteur différentiel ${type.label} ${marque.name} — ${pole} ${cal} A ${sens.label} — ${type.desc}`;
            out.push(item(t, "DDR & différentiels", ref, designation, "u", sell, sell * 0.48));
          }
        }
      }
    }
  }

  const prisesVe = [
    {
      ref: "PRISE-VE-16",
      label: "Prise renforcée 16 A — charge lente (3,7 kW)",
      sell: 85,
      unit: "u",
    },
    {
      ref: "PRISE-VE-32",
      label: "Prise renforcée 32 A — charge accélérée (7,4 kW)",
      sell: 125,
      unit: "u",
    },
    {
      ref: "PRISE-T2-SOCLE",
      label: "Socle prise Type 2 (chargeur portable)",
      sell: 165,
      unit: "u",
    },
    {
      ref: "PRISE-T2-ENC",
      label: "Prise Type 2 encastrée IP55",
      sell: 195,
      unit: "u",
    },
    {
      ref: "PRISE-T2-SAIL",
      label: "Prise Type 2 saillie IP55",
      sell: 175,
      unit: "u",
    },
  ];

  const finitions = ["blanc", "anthracite", "IP55"];

  for (const marque of marques) {
    for (const prise of prisesVe) {
      for (const fin of finitions) {
        const sell = prise.sell + finitions.indexOf(fin) * 12 + (marque.code === "SCH" ? 8 : 0);
        out.push(
          item(
            t,
            "Recharge véhicule électrique",
            `${prise.ref}-${marque.code}-${fin.slice(0, 3).toUpperCase()}`,
            `${marque.name} — ${prise.label} — ${fin}`,
            prise.unit,
            sell,
            sell * 0.46,
          ),
        );
      }
    }
  }

  const wallboxes = [
    { ref: "WB-37", label: "Borne 3,7 kW monophasé (16 A)", sell: 520 },
    { ref: "WB-74", label: "Borne 7,4 kW monophasé (32 A)", sell: 680 },
    { ref: "WB-11", label: "Borne 11 kW triphasé (16 A)", sell: 890 },
    { ref: "WB-22", label: "Borne 22 kW triphasé (32 A)", sell: 1150 },
    { ref: "WB-CON", label: "Borne connectée Wi-Fi / RFID", sell: 780 },
    { ref: "WB-SOL", label: "Borne sol avec gestionnaire d'énergie", sell: 1350 },
  ];

  for (const marque of marques) {
    for (const wb of wallboxes) {
      const sell = wb.sell + (marque.code === "LEG" ? 40 : marque.code === "SCH" ? 55 : marque.code === "ABB" ? 70 : 35);
      out.push(
        item(
          t,
          "Recharge véhicule électrique",
          `${wb.ref}-${marque.code}`,
          `Borne de recharge ${marque.name} — ${wb.label}`,
          "u",
          sell,
          sell * 0.5,
        ),
      );
    }
  }

  const accessoiresVe = [
    { ref: "VE-CAB-3G6", label: "Câble dédié charge VE 3G6 mm² — au mètre", sell: 4.85, unit: "m" },
    { ref: "VE-CAB-3G10", label: "Câble dédié charge VE 3G10 mm² — au mètre", sell: 7.2, unit: "m" },
    { ref: "VE-CAB-5G6", label: "Câble dédié charge VE 5G6 mm² triphasé — au mètre", sell: 8.5, unit: "m" },
    { ref: "VE-CAB-5G10", label: "Câble dédié charge VE 5G10 mm² triphasé — au mètre", sell: 12.8, unit: "m" },
    { ref: "VE-DISJ-20", label: "Disjoncteur 1P+N 20 A courbe C — circuit charge VE", sell: 18, unit: "u" },
    { ref: "VE-DISJ-32", label: "Disjoncteur 1P+N 32 A courbe C — circuit charge VE", sell: 22, unit: "u" },
    { ref: "VE-DELEST", label: "Module délestage / gestionnaire de charge", sell: 185, unit: "u" },
    { ref: "VE-PRISE-ETANCHE", label: "Prise étanche 32 A avec volet — garage / extérieur", sell: 145, unit: "u" },
    { ref: "VE-KIT-MONO", label: "Kit installation charge lente — prise 16 A + DDR Type A + câble 3G6 (10 m)", sell: 320, unit: "forfait" },
    { ref: "VE-KIT-32A", label: "Kit installation 7,4 kW — prise 32 A + DDR Type A + câble 3G6 (10 m)", sell: 420, unit: "forfait" },
    { ref: "VE-KIT-WB", label: "Kit installation wallbox — DDR Type EV + protection surintensité", sell: 280, unit: "forfait" },
  ];

  for (const acc of accessoiresVe) {
    out.push(item(t, "Recharge véhicule électrique", acc.ref, acc.label, acc.unit, acc.sell, acc.sell * 0.52));
  }

  out.push(
    item(t, "Main d'œuvre", "MO-ELEC-VE-01", "Installation prise ou borne de recharge VE — forfait", "forfait", 380, 220, "mo"),
  );
  out.push(
    item(t, "Main d'œuvre", "MO-ELEC-VE-02", "Mise en service et essai charge véhicule électrique", "forfait", 120, 70, "mo"),
  );
  out.push(
    item(t, "Main d'œuvre", "MO-ELEC-VE-03", "Tirage câble dédié charge VE — au mètre linéaire", "m", 12, 7, "mo"),
  );

  return out;
}

function generatePeintre() {
  const t = "peintre";
  const out = [];

  const types = ["acrylique mat", "acrylique satin", "glycéro satin", "plafond", "façade", "anti-humidité"];
  const litres = [0.5, 1, 2.5, 5, 10, 15];
  const couleurs = ["blanc", "blanc cassé", "magnolia", "gris perle", "bleu ciel", "vert sauge", "ton sur teinte"];
  for (const ty of types) {
    for (const l of litres) {
      for (const c of couleurs) {
        const sell = 8 + l * 3.2 + types.indexOf(ty) * 2;
        out.push(item(t, "Peinture", `PEINT-T${idx(types, ty)}-${l}L-C${idx(couleurs, c)}`, `Peinture ${ty} ${l} L — ${c}`, "L", sell / l, (sell / l) * 0.48));
      }
    }
  }

  const enduits = ["enduit lissage", "enduit garnissant", "enduit rebouchage", "sous-couche universelle", "fixateur"];
  for (const e of enduits) {
    for (const l of [1, 5, 10, 25]) {
      const sell = 6 + l * 1.8;
      out.push(item(t, "Préparation", `PREP-${e.slice(0, 4)}-${l}`, `${e} ${l} L`, "L", sell / l, (sell / l) * 0.5));
    }
  }

  const pinceaux = ["plat 20 mm", "plat 40 mm", "plat 60 mm", "plat 100 mm", "rond 8 mm", "rond 12 mm", "réchampir"];
  for (const p of pinceaux) {
    for (const q of ["standard", "pro", "premium"]) {
      out.push(item(t, "Outils", `PINCEAU-${p.replace(/\s/g, "")}-${q}`, `Pinceau ${p} ${q}`, "u", 4 + pinceaux.indexOf(p) * 1.5, 2));
    }
  }

  const rouleaux = ["microfibre 110 mm", "microfibre 180 mm", "laqueur 110 mm", "manchon façade", "brosse à récurer"];
  for (const r of rouleaux) {
    out.push(item(t, "Outils", `ROUL-${r.slice(0, 4)}`, `Rouleau ${r}`, "u", 6 + rouleaux.indexOf(r) * 2, 3));
    out.push(item(t, "Outils", `MANCHON-${r.slice(0, 4)}`, `Manchon rechange ${r}`, "u", 3.5, 1.8));
  }

  const scotchs = ["masquage 19 mm", "masquage 48 mm", "masquage 96 mm", "de masquage extérieur", "adhésif double face"];
  for (const s of scotchs) {
    for (const len of [25, 50, 100]) {
      out.push(item(t, "Protection", `SCOTCH-${s.slice(0, 3)}-${len}m`, `Scotch ${s} ${len} m`, "u", 2 + len * 0.04, 1));
    }
  }

  const colles = ["colle acrylique", "colle plinthes", "colle toile de verre", "mastic acrylique", "mastic silicone"];
  const formats = ["cartouche 310 ml", "seau 5 kg", "tube 800 ml"];
  for (const c of colles) {
    for (const fmt of formats) {
      out.push(item(t, "Colles & mastics", `COLLE-C${idx(colles, c)}-F${idx(formats, fmt)}`, `${c} — ${fmt}`, "u", 5 + colles.indexOf(c) * 2, 2.5));
    }
  }

  const baches = ["bâche polyane 3×4", "bâche 4×5", "film protection sol", "carton ondulé"];
  for (const b of baches) {
    out.push(item(t, "Protection", `BACHE-${b.slice(0, 4)}`, b, "u", 8 + baches.indexOf(b) * 3, 4));
  }

  const abrasifs = [80, 120, 180, 240, 320];
  for (const g of abrasifs) {
    out.push(item(t, "Ponçage", `PAPIER-${g}`, `Papier abrasif grain ${g}`, "u", 1.2, 0.55));
    out.push(item(t, "Ponçage", `GRILLE-${g}`, `Grille abrasive ${g}`, "u", 2.5, 1.2));
  }

  const revetements = ["toile de verre", "papier peint intissé", "papier peint vinyle", "enduit décoratif ciré", "panneau mural 3D"];
  const largRev = ["53 cm", "70 cm", "1 m"];
  for (const rev of revetements) {
    for (const l of largRev) {
      for (const motif of ["uni", "rayures", "géométrique", "nature", "minéral"]) {
        const sell = 14 + revetements.indexOf(rev) * 4;
        out.push(item(t, "Revêtements muraux", `REV-${rev.slice(0, 4)}-${l.slice(0, 2)}-${motif.slice(0, 3)}`, `${rev} l. ${l} — ${motif}`, "m²", sell, sell * 0.48));
      }
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-PEINT-01", "Heure peintre professionnel", "h", 42, 24, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-PEINT-02", "Préparation supports (m²)", "m²", 8, 4.5, "mo"));
  out.push(...TRADE_EXTENSIONS.peintre());

  return out;
}

function generatePlombier() {
  const t = "plombier";
  const out = [];

  const tubes = ["PER", "multicouche", "cuivre", "PVC évacuation", "PVC pression"];
  const diam = [12, 14, 16, 20, 26, 32, 40, 50, 63, 75, 100];
  for (const tube of tubes) {
    for (const d of diam) {
      const sell = 1.8 + d * 0.12 + tubes.indexOf(tube) * 0.5;
      out.push(item(t, "Canalisations", `TUBE-T${idx(tubes, tube)}-${d}`, `Tube ${tube} Ø ${d} mm`, "m", sell, sell * 0.52));
    }
  }

  const raccords = ["coude 90°", "coude 45°", "té égal", "té réduit", "manchon", "réduction", "laiton à souder", "PER à sertir"];
  for (const r of raccords) {
    for (const d of [16, 20, 26, 32]) {
      out.push(item(t, "Raccords", `RACC-R${idx(raccords, r)}-${d}`, `Raccord ${r} Ø ${d}`, "u", 2.5 + d * 0.15, 1.2));
    }
  }

  const robinets = ["mélangeur lavabo", "mélangeur douche", "mitigeur cuisine", "mitigeur baignoire", "robinet arrêt", "vanne quart de tour"];
  for (const ro of robinets) {
    for (const fin of ["chromé", "noir mat", "brossé"]) {
      out.push(item(t, "Robinetterie", `ROB-R${idx(robinets, ro)}-${fin.slice(0, 2)}`, `${ro} ${fin}`, "u", 45 + robinets.indexOf(ro) * 12, 22));
    }
  }

  const sanitaires = ["WC suspendu", "WC au sol", "abattant WC", "lavabo 60 cm", "meuble vasque", "baignoire 170", "receveur douche", "paroi douche"];
  for (const s of sanitaires) {
    out.push(item(t, "Sanitaire", `SAN-${s.slice(0, 4)}`, s, "u", 120 + sanitaires.indexOf(s) * 35, 65));
  }

  const chauffe = ["chauffe-eau 100 L", "chauffe-eau 200 L", "ballon thermodynamique", "groupe sécurité", "groupe de sécurité + expansion"];
  for (const c of chauffe) {
    out.push(item(t, "Chauffe-eau", `CE-${c.slice(0, 4)}`, c, "u", 280 + chauffe.indexOf(c) * 80, 160));
  }

  const colliers = ["collier simple", "collier double", "collier isophonique", "selle PVC"];
  for (const c of colliers) {
    for (const d of diam.slice(0, 8)) {
      out.push(item(t, "Fixation", `COLL-C${idx(colliers, c)}-${d}`, `${c} Ø ${d}`, "u", 0.8 + d * 0.02, 0.35));
    }
  }

  const accessoires = ["siphon lavabo", "bonde baignoire", "flexible douche", "joint fibre", "pâte à joint", "détecteur fuite", "manomètre"];
  for (const a of accessoires) {
    for (const fmt of ["standard", "chromé", "inox"]) {
      out.push(item(t, "Accessoires", `ACC-${a.slice(0, 4)}-${fmt.slice(0, 2)}`, `${a} ${fmt}`, "u", 6 + accessoires.indexOf(a) * 2, 3));
    }
  }

  const evac = ["pipe WC", "pipe lavabo", "pipe douche", "réducteur", "cuvette WC", "mécanisme chasse"];
  for (const e of evac) {
    for (const d of [32, 40, 50, 100]) {
      out.push(item(t, "Évacuation", `EVAC-${e.slice(0, 4)}-${d}`, `${e} Ø ${d}`, "u", 8 + d * 0.1, 4));
    }
  }

  const isolation = ["manchon isolant", "coquille calorifuge", "ruban téflon", "pâte lubrifiante"];
  for (const iso of isolation) {
    for (const d of diam) {
      out.push(item(t, "Isolation", `ISO-${iso.slice(0, 3)}-${d}`, `${iso} Ø ${d}`, "u", 1.5 + d * 0.03, 0.7));
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-PLOMB-01", "Heure plombier", "h", 50, 28, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-PLOMB-02", "Débouchage / intervention", "forfait", 95, 50, "mo"));
  out.push(...TRADE_EXTENSIONS.plombier());

  return out;
}

function generateChauffagiste() {
  const t = "chauffagiste";
  const out = [];

  const splits = [2.5, 3.5, 5, 7, 9, 12, 14, 16];
  for (const kw of splits) {
    out.push(item(t, "Climatisation", `SPLIT-${kw}kW`, `Split inverter ${kw} kW complet`, "u", 450 + kw * 45, 280));
    out.push(item(t, "Climatisation", `UNITE-INT-${kw}kW`, `Unité intérieure ${kw} kW`, "u", 180 + kw * 20, 110));
    out.push(item(t, "Climatisation", `UNITE-EXT-${kw}kW`, `Unité extérieure ${kw} kW`, "u", 320 + kw * 25, 200));
  }

  const liaisons = [1, 3, 5, 10, 15, 20, 25];
  for (const l of liaisons) {
    out.push(item(t, "Liaisons frigorifiques", `LIAISON-${l}m`, `Liaison frigorifique ${l} m (paire)`, "u", 35 + l * 8, 20));
  }

  const fluides = ["R32 1 kg", "R410A 1 kg", "R407C 1 kg", "azote pression test"];
  for (const f of fluides) {
    out.push(item(t, "Fluides", `FLU-${f.slice(0, 4)}`, f, "u", 85 + fluides.indexOf(f) * 15, 55));
  }

  const radiateurs = [500, 600, 800, 1000, 1200, 1400, 1600];
  const types = ["panneau acier", "fonte alu", "sèche-serviette", "convecteur"];
  for (const ty of types) {
    for (const w of radiateurs) {
      out.push(item(t, "Chauffage", `RAD-${ty.slice(0, 3)}-${w}`, `Radiateur ${ty} ${w} W`, "u", 80 + w * 0.08, 45));
    }
  }

  const vannes = ["thermostatique droit", "thermostatique angle", "mélangeuse 3 voies", "vanne d'arrêt", "purgeur auto"];
  for (const v of vannes) {
    for (const d of [12, 15, 20]) {
      out.push(item(t, "Vannes & régulation", `VANNE-V${idx(vannes, v)}-${d}`, `${v} Ø ${d}`, "u", 12 + d * 0.8, 6));
    }
  }

  const cuivre = [12, 14, 16, 18, 22, 28, 35];
  for (const c of cuivre) {
    out.push(item(t, "Cuivre", `CUIVRE-${c}`, `Tube cuivre Ø ${c} mm`, "m", 4.5 + c * 0.2, 2.5));
  }

  const ventilation = ["VMC simple flux", "VMC double flux", "caisson VMC"];
  for (const v of ventilation) {
    for (const dim of ["80", "100", "125", "150", "200"]) {
      out.push(item(t, "Ventilation", `VENT-V${idx(ventilation, v)}-${dim}`, `${v} Ø ${dim} mm`, "u", 25 + Number(dim) * 0.15, 14));
    }
  }

  const reseauVent = ["bouche extraction", "gaine rigide", "gaine alu", "coude gaine", "manchon gaine"];
  for (const v of reseauVent) {
    for (const dim of ["80", "100", "125", "150", "200"]) {
      out.push(item(t, "Réseau ventilation", `RVENT-${v.slice(0, 4)}-${dim}`, `${v} Ø ${dim} mm`, "u", 8 + Number(dim) * 0.12, 4));
    }
  }

  const pompes = ["pompe circulation", "circulateur classe A", "vase expansion 8 L", "vase expansion 12 L", "disconnecteur", "filtre à tamis"];
  for (const p of pompes) {
    for (const cap of ["8L", "12L", "18L", "25L"]) {
      out.push(item(t, "Pompe & circuit", `POMP-P${idx(pompes, p)}-${cap}`, `${p} ${cap}`, "u", 45 + pompes.indexOf(p) * 18, 28));
    }
  }

  const regulation = ["thermostat ambiance", "sonde extérieure", "programmateur", "vanne motorisée", "tête thermostatique"];
  for (const r of regulation) {
    for (const prog of ["jour", "7j", "connecté"]) {
      out.push(item(t, "Régulation", `REG-R${idx(regulation, r)}-${prog}`, `${r} ${prog}`, "u", 35 + regulation.indexOf(r) * 12, 20));
    }
  }

  const entretien = ["nettoyant évaporateur", "nettoyant condenseur", "bombe détecteur fuite", "huile compresseur"];
  for (const e of entretien) {
    out.push(item(t, "Entretien", `ENT-${e.slice(0, 4)}`, e, "u", 12 + entretien.indexOf(e) * 4, 6));
    out.push(item(t, "Entretien", `KIT-${e.slice(0, 4)}`, `Kit ${e}`, "forfait", 28, 15));
  }

  const pac = [6, 8, 10, 12, 14, 16];
  for (const p of pac) {
    out.push(item(t, "Pompe à chaleur", `PAC-AIR-${p}kW`, `PAC air/eau ${p} kW`, "u", 3200 + p * 180, 2400));
    out.push(item(t, "Pompe à chaleur", `PAC-GEO-${p}kW`, `PAC géothermie ${p} kW`, "u", 4800 + p * 220, 3600));
  }

  const plancher = ["tube PER plancher", "collecteur 2 sorties", "collecteur 4 sorties", "collecteur 6 sorties", "isolant plancher", "nourrice"];
  for (const pl of plancher) {
    for (const sort of [2, 4, 6, 8, 10, 12]) {
      out.push(item(t, "Plancher chauffant", `PC-P${idx(plancher, pl)}-${sort}`, `${pl} ${sort} circuits`, "u", 45 + sort * 8, 28));
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-CLIM-01", "Heure frigoriste / chauffagiste", "h", 55, 32, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-CLIM-02", "Mise en service & contrôle étanchéité", "forfait", 180, 95, "mo"));
  out.push(...TRADE_EXTENSIONS.chauffagiste());

  return out;
}

function generateCarreleur() {
  const t = "carreleur";
  const out = [];

  const formatsSol = ["30×30", "45×45", "60×60", "60×120", "80×80", "20×120"];
  const finitionsSol = ["mat", "poli", "antidérapant R10", "antidérapant R11", "imitation bois", "imitation pierre"];
  const epaisseurs = [8, 9, 10, 11];
  for (const fmt of formatsSol) {
    for (const fin of finitionsSol) {
      for (const ep of epaisseurs) {
        const sell = 18 + formatsSol.indexOf(fmt) * 4 + finitionsSol.indexOf(fin) * 2 + ep * 0.5;
        out.push(
          item(
            t,
            "Carrelage sol",
            `SOL-${fmt.replace(/×/g, "x")}-${fin.slice(0, 3)}-${ep}`,
            `Carrelage sol ${fmt} cm ${fin} ép. ${ep} mm`,
            "m²",
            sell,
            sell * 0.48,
          ),
        );
      }
    }
  }

  const formatsMur = ["20×50", "25×60", "25×75", "30×60", "33×33"];
  const finitionsMur = ["brillant", "mat", "satiné", "effet zellige"];
  const decors = ["blanc", "gris", "beige", "bleu", "marbre", "béton"];
  for (const fmt of formatsMur) {
    for (const fin of finitionsMur) {
      for (const dec of decors) {
        const sell = 22 + formatsMur.indexOf(fmt) * 2 + finitionsMur.indexOf(fin) * 1.5;
        out.push(
          item(
            t,
            "Faïence murale",
            `FAI-${fmt.replace(/×/g, "x")}-${fin.slice(0, 3)}-${dec.slice(0, 3)}`,
            `Faïence ${fmt} cm ${fin} — ${dec}`,
            "m²",
            sell,
            sell * 0.5,
          ),
        );
      }
    }
  }

  const mosaics = ["verre", "pâte de verre", "marbre", "grès cérame"];
  for (const mos of mosaics) {
    for (const col of ["blanc", "noir", "doré", "bleu", "mix"]) {
      const sell = 45 + mosaics.indexOf(mos) * 8;
      out.push(item(t, "Mosaïque", `MOS-${mos.slice(0, 3)}-${col.slice(0, 3)}`, `Mosaïque ${mos} — ${col}`, "m²", sell, sell * 0.52));
    }
  }

  const solsSouples = ["parquet stratifié AC4", "parquet stratifié AC5", "sol vinyle LVT", "sol PVC en rouleau", "sol caoutchouc"];
  const decorSol = ["chêne clair", "chêne fumé", "noyer", "béton", "ardoise"];
  const larges = ["120", "180", "240"];
  for (const sol of solsSouples) {
    for (const dec of decorSol) {
      for (const l of larges) {
        const sell = 24 + solsSouples.indexOf(sol) * 5 + decorSol.indexOf(dec) * 2;
        out.push(
          item(
            t,
            "Sols souples",
            `SS-${sol.slice(0, 3)}-${dec.slice(0, 3)}-${l}`,
            `${sol} ${dec} l. ${l} cm`,
            "m²",
            sell,
            sell * 0.5,
          ),
        );
      }
    }
  }

  const plinthes = ["carrelage assorti", "MDF à peindre", "aluminium", "PVC"];
  const hauteurs = [6, 8, 10, 12];
  const finPlint = ["blanc", "gris", "bois", "anthracite"];
  for (const pl of plinthes) {
    for (const h of hauteurs) {
      for (const fin of finPlint) {
        const sell = 6 + h * 0.8 + plinthes.indexOf(pl) * 2;
        out.push(item(t, "Plinthes & profilés", `PLINT-${pl.slice(0, 3)}-${h}-${fin.slice(0, 2)}`, `Plinthe ${pl} H ${h} cm ${fin}`, "ml", sell, sell * 0.48));
      }
    }
  }

  const colles = ["colle ciment C1", "colle flexible C2 S1", "colle flexible C2 S2", "mortier colle grand format"];
  const sacs = [5, 15, 25];
  for (const c of colles) {
    for (const s of sacs) {
      const sell = 8 + s * 0.35 + colles.indexOf(c) * 3;
      out.push(item(t, "Colles & mortiers", `COL-${c.slice(0, 3)}-${s}K`, `${c} sac ${s} kg`, "u", sell, sell * 0.45));
    }
  }

  const joints = ["ciment blanc", "ciment gris", "époxy blanc", "époxy gris", "silicone sanitaire"];
  const couleurs = ["blanc", "gris clair", "anthracite", "beige", "noir"];
  for (const j of joints) {
    for (const col of couleurs) {
      out.push(item(t, "Joints & finitions", `JOINT-${j.slice(0, 3)}-${col.slice(0, 3)}`, `Joint ${j} — ${col}`, "u", 5 + joints.indexOf(j) * 2, 2.5));
    }
  }

  const prep = ["primaire accrochage", "étanchéité sous carrelage", "ragréage autolissant", "décapant ancien sol"];
  for (const p of prep) {
    for (const fmt of ["seau 5 kg", "seau 20 kg", "bidon 5 L"]) {
      out.push(item(t, "Préparation support", `PREP-${p.slice(0, 4)}-${fmt.slice(0, 3)}`, `${p} — ${fmt}`, "u", 12 + prep.indexOf(p) * 4, 6));
    }
  }

  const outils = ["croisillon 2 mm", "croisillon 3 mm", "peigne 8 mm", "peigne 10 mm", "raclette joint", "clameur"];
  for (const o of outils) {
    for (const q of ["lot 50", "lot 100", "lot 250"]) {
      out.push(item(t, "Outils & consommables", `OUT-${o.slice(0, 4)}-${q.slice(4)}`, `${o} (${q})`, "u", 3 + outils.indexOf(o) * 1.5, 1.5));
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-CARR-01", "Heure carreleur qualifié", "h", 44, 25, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-CARR-02", "Pose carrelage (m²)", "m²", 38, 20, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-CARR-03", "Préparation sol / ragréage (m²)", "m²", 14, 7, "mo"));
  out.push(...TRADE_EXTENSIONS.carreleur());

  return out;
}

function generateMenuisier() {
  const t = "menuisier";
  const out = [];

  const portes = ["isoplane", "postformée", "alvéolaire", "vitrée 1 vantail", "coulissante", "blindée"];
  const dims = ["63×204", "73×204", "83×204", "93×204"];
  const finitions = ["blanc", "chêne", "noyer", "gris anthracite"];
  for (const p of portes) {
    for (const d of dims) {
      for (const fin of finitions) {
        const sell = 85 + portes.indexOf(p) * 35 + dims.indexOf(d) * 12;
        out.push(
          item(
            t,
            "Portes intérieures",
            `PORT-${p.slice(0, 3)}-${d.replace(/×/g, "x")}-${fin.slice(0, 2)}`,
            `Porte ${p} ${d} cm ${fin}`,
            "u",
            sell,
            sell * 0.48,
          ),
        );
      }
    }
  }

  const blocs = ["standard", "phonique", "coupe-feu 30 min", "coupe-feu 60 min"];
  for (const b of blocs) {
    for (const d of dims) {
      const sell = 140 + blocs.indexOf(b) * 45;
      out.push(item(t, "Blocs-portes", `BP-${b.slice(0, 3)}-${d.replace(/×/g, "x")}`, `Bloc-porte ${b} ${d} cm`, "u", sell, sell * 0.5));
    }
  }

  const materiaux = ["PVC", "aluminium", "bois"];
  const dimFen = ["60×80", "90×120", "120×120", "140×120", "160×120", "200×120"];
  const vitrages = ["double vitrage", "triple vitrage"];
  const ouvrants = ["oscillo-battant", "française"];
  for (const mat of materiaux) {
    for (const d of dimFen) {
      for (const vit of vitrages) {
        for (const ouv of ouvrants) {
          const sell = 220 + dimFen.indexOf(d) * 35 + materiaux.indexOf(mat) * 40;
          out.push(
            item(
              t,
              "Fenêtres & menuiseries ext.",
              `FEN-${mat.slice(0, 2)}-${d.replace(/×/g, "x")}-${vit.slice(0, 2)}`,
              `Fenêtre ${mat} ${d} cm ${vit} ${ouv}`,
              "u",
              sell,
              sell * 0.52,
            ),
          );
        }
      }
    }
  }

  const placards = ["placard coulissant 2 vantaux", "dressing angle", "porte de placard battante", "aménagement sous-pente", "étagère murale", "verrière intérieure"];
  const larges = [120, 150, 180, 240];
  for (const pl of placards) {
    for (const l of larges) {
      const sell = 180 + placards.indexOf(pl) * 40 + l * 0.5;
      out.push(item(t, "Agencements", `AG-${pl.slice(0, 3)}-${l}`, `${pl} ${l} cm`, "u", sell, sell * 0.5));
    }
  }

  const essences = ["chêne", "hêtre", "frêne", "bambou"];
  const largParq = [70, 120, 190];
  const finParq = ["verni", "huilé", "brut"];
  for (const ess of essences) {
    for (const l of largParq) {
      for (const fin of finParq) {
        const sell = 42 + essences.indexOf(ess) * 6 + largParq.indexOf(l) * 4;
        out.push(item(t, "Parquet & plancher bois", `PARQ-${ess.slice(0, 3)}-${l}-${fin.slice(0, 2)}`, `Parquet massif ${ess} l. ${l} mm ${fin}`, "m²", sell, sell * 0.5));
      }
    }
  }

  const quinca = ["paumelle invisible", "paumelle à rouleau", "serrure 3 points", "serrure condamnation", "poignée bec de cane", "crémone fenêtre", "coulisse placard", "verrou simple"];
  for (const q of quinca) {
    for (const fin of ["nickelé", "noir", "laiton", "inox"]) {
      out.push(item(t, "Quincaillerie", `QUIN-${q.slice(0, 4)}-${fin.slice(0, 2)}`, `${q} ${fin}`, "u", 8 + quinca.indexOf(q) * 4, 4));
    }
  }

  const conso = ["vis agglo", "vis TF", "cheville nylon", "cheville métallique", "colle montage", "cartouche silicone menuiserie"];
  for (const c of conso) {
    for (const lot of ["boîte 100", "boîte 250", "cartouche", "seau 1 kg"]) {
      out.push(item(t, "Fixations & consommables", `CONS-${c.slice(0, 4)}-${lot.slice(0, 3)}`, `${c} — ${lot}`, "u", 4 + conso.indexOf(c) * 2, 2));
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-MENU-01", "Heure menuisier poseur", "h", 46, 26, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-MENU-02", "Pose porte complète", "u", 95, 50, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-MENU-03", "Pose fenêtre", "u", 160, 85, "mo"));
  out.push(...TRADE_EXTENSIONS.menuisier());

  return out;
}

function generatePlaquiste() {
  const t = "plaquiste";
  const out = [];

  const plaques = ["BA13 standard", "BA13 hydro", "BA15", "BA18", "BA13 acoustique", "BA25 feu"];
  const dims = ["120×250", "120×300", "60×250"];
  for (const pl of plaques) {
    for (const d of dims) {
      const sell = 5.5 + plaques.indexOf(pl) * 1.2;
      out.push(item(t, "Plaques & cloisons", `PLAQ-${pl.slice(0, 4)}-${d.replace(/×/g, "x")}`, `Plaque ${pl} ${d} cm`, "m²", sell, sell * 0.48));
    }
  }

  const cloisons = ["cloison 70 mm", "cloison 98 mm", "cloison 120 mm", "cloison acoustique", "cloison coupe-feu"];
  const isolants = ["laine 45 mm", "laine 60 mm", "laine 100 mm", "sans isolant"];
  const hauteurs = [250, 270, 300];
  for (const cl of cloisons) {
    for (const iso of isolants) {
      for (const h of hauteurs) {
        const sell = 28 + cloisons.indexOf(cl) * 6 + isolants.indexOf(iso) * 3;
        out.push(
          item(
            t,
            "Cloisons sèches",
            `CLO-${cl.slice(0, 3)}-${iso.slice(0, 3)}-${h}`,
            `${cl} ${iso} H ${h} cm`,
            "m²",
            sell,
            sell * 0.5,
          ),
        );
      }
    }
  }

  const doublages = ["doublage collé 40 mm", "doublage collé 60 mm", "doublage sur ossature", "contre-cloison acoustique"];
  for (const db of doublages) {
    for (const iso of isolants) {
      const sell = 22 + doublages.indexOf(db) * 5;
      out.push(item(t, "Doublage", `DOUB-${db.slice(0, 4)}-${iso.slice(0, 3)}`, `${db} — ${iso}`, "m²", sell, sell * 0.5));
    }
  }

  const dalles = ["dalles acoustiques", "dalles minérales", "dalles PVC", "plaque faux plafond"];
  const fmtDalle = ["60×60", "60×120", "120×120"];
  const finDalle = ["blanc", "perforé", "graphite", "bois"];
  for (const da of dalles) {
    for (const f of fmtDalle) {
      for (const fin of finDalle) {
        const sell = 12 + dalles.indexOf(da) * 3;
        out.push(item(t, "Faux plafonds", `FP-${da.slice(0, 3)}-${f.replace(/×/g, "x")}-${fin.slice(0, 2)}`, `${da} ${f} cm ${fin}`, "m²", sell, sell * 0.48));
      }
    }
  }

  const trappes = ["trappe de visite 40×40", "trappe 50×50", "trappe 60×60", "trappe hydro"];
  for (const tr of trappes) {
    for (const fin of ["blanc", "laqué"]) {
      out.push(item(t, "Trappes & accessoires", `TRAP-${tr.slice(0, 4)}-${fin}`, `${tr} ${fin}`, "u", 35 + trappes.indexOf(tr) * 8, 18));
    }
  }

  const rails = ["rail 48", "rail 70", "rail 90"];
  const longueurs = [3, 4, 6];
  for (const r of rails) {
    for (const l of longueurs) {
      out.push(item(t, "Ossature métallique", `RAIL-${r.slice(-2)}-${l}M`, `${r} long. ${l} m`, "u", 4 + l * 1.2, 2));
    }
  }

  const montants = ["M48", "M70", "M90", "M112"];
  const hMont = [2.5, 2.7, 3, 3.6];
  for (const m of montants) {
    for (const h of hMont) {
      out.push(item(t, "Ossature métallique", `MONT-${m}-${h}`, `Montant ${m} H ${h} m`, "u", 3.5 + h * 0.8, 1.8));
    }
  }

  const suspentes = ["suspente droite", "suspente pivotante", "cavalier", "étrier"];
  for (const s of suspentes) {
    for (const lot of [10, 50, 100]) {
      out.push(item(t, "Ossature métallique", `SUSP-${s.slice(0, 4)}-${lot}`, `${s} (lot ${lot})`, "u", 8 + lot * 0.05, 4));
    }
  }

  const fixations = ["vis TTPC 25", "vis TTPC 35", "vis TTPC 45", "cheville Molly 8", "cheville métal 6"];
  for (const f of fixations) {
    for (const lot of [100, 250, 500]) {
      out.push(item(t, "Fixations", `FIX-${f.slice(0, 4)}-${lot}`, `${f} (lot ${lot})`, "u", 5 + fixations.indexOf(f) * 2, 2.5));
    }
  }

  const bandes = ["bande papier", "bande armée", "angle métal", "cornière alu"];
  for (const b of bandes) {
    for (const l of [25, 50, 75]) {
      out.push(item(t, "Bandes & enduits", `BAND-${b.slice(0, 4)}-${l}M`, `${b} ${l} m`, "u", 3 + l * 0.04, 1.5));
    }
  }

  const enduits = ["enduit joint", "enduit lissage", "enduit finition", "enduit prêt à l'emploi"];
  for (const e of enduits) {
    for (const s of [5, 10, 25]) {
      out.push(item(t, "Bandes & enduits", `END-${e.slice(0, 4)}-${s}K`, `${e} sac ${s} kg`, "u", 6 + s * 0.3, 3));
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-PLAQ-01", "Heure plaquiste", "h", 40, 23, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-PLAQ-02", "Cloison sèche (m²)", "m²", 32, 17, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-PLAQ-03", "Faux plafond (m²)", "m²", 28, 15, "mo"));
  out.push(...TRADE_EXTENSIONS.plaquiste());

  return out;
}

function generateIsolateur() {
  const t = "isolateur";
  const out = [];

  const laines = ["laine de verre rouleau", "laine de verre panneau", "laine de roche rouleau", "laine de roche panneau"];
  const epaisseurs = [45, 60, 80, 100, 120, 140, 160, 200];
  const lambda = ["λ 0,032", "λ 0,034", "λ 0,035", "λ 0,038"];
  for (const l of laines) {
    for (const ep of epaisseurs) {
      for (const lam of lambda) {
        const sell = 4.5 + ep * 0.06 + laines.indexOf(l) * 0.8;
        out.push(
          item(
            t,
            "Isolation murs & combles",
            `LAINE-${l.slice(0, 3)}-${ep}-${lam.replace(/[λ ,]/g, "")}`,
            `${l} ép. ${ep} mm ${lam}`,
            "m²",
            sell,
            sell * 0.48,
          ),
        );
      }
    }
  }

  const pir = ["PIR", "PUR", "polyisocyanurate"];
  const epPir = [20, 30, 40, 50, 60, 80, 100, 120];
  for (const p of pir) {
    for (const ep of epPir) {
      const sell = 8 + ep * 0.15;
      out.push(item(t, "Panneaux isolants", `PAN-${p.slice(0, 3)}-${ep}`, `Panneau ${p} ép. ${ep} mm`, "m²", sell, sell * 0.5));
    }
  }

  const combles = ["soufflage ouate cellulose", "déroulé combles perdus", "rampants sous toiture", "plancher bas sur vide sanitaire"];
  const rendements = ["R=4", "R=5", "R=6", "R=7", "R=8"];
  for (const c of combles) {
    for (const r of rendements) {
      const sell = 18 + combles.indexOf(c) * 4 + rendements.indexOf(r) * 2;
      out.push(item(t, "Isolation combles", `COMB-${c.slice(0, 4)}-${r.replace("=", "")}`, `${c} — ${r}`, "m²", sell, sell * 0.5));
    }
  }

  const phonique = ["complexe acoustique mural", "isolant phonique plancher", "liège expansé", "mousse acoustique"];
  const epPhon = [20, 30, 45, 60];
  for (const ph of phonique) {
    for (const ep of epPhon) {
      const sell = 12 + phonique.indexOf(ph) * 3 + ep * 0.1;
      out.push(item(t, "Isolation phonique", `PHON-${ph.slice(0, 4)}-${ep}`, `${ph} ép. ${ep} mm`, "m²", sell, sell * 0.5));
    }
  }

  const etancheite = ["pare-vapeur", "écran sous-toiture HPV", "membrane d'étanchéité air", "adhésif EPDM"];
  for (const e of etancheite) {
    for (const l of [25, 50, 75]) {
      out.push(item(t, "Films & membranes", `FILM-${e.slice(0, 4)}-${l}M`, `${e} ${l} m²`, "u", 15 + l * 0.2, 8));
    }
  }

  const fixations = ["cheville à frapper", "vis plaque isolante", "agrafe pare-vapeur", "rail de fixation"];
  for (const f of fixations) {
    for (const lot of [50, 100, 200]) {
      out.push(item(t, "Fixations & accessoires", `FIX-${f.slice(0, 4)}-${lot}`, `${f} (lot ${lot})`, "u", 6 + fixations.indexOf(f) * 2, 3));
    }
  }

  const accessoires = ["bande adhésive pare-vapeur", "mousse pistolable", "joint acrylique façade", "plot support isolant"];
  for (const a of accessoires) {
    for (const fmt of ["rouleau", "cartouche", "seau"]) {
      out.push(item(t, "Fixations & accessoires", `ACC-${a.slice(0, 4)}-${fmt.slice(0, 3)}`, `${a} — ${fmt}`, "u", 5 + accessoires.indexOf(a) * 2, 2.5));
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-ISOL-01", "Heure isolateur", "h", 38, 22, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-ISOL-02", "Isolation combles perdus (m²)", "m²", 12, 6, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-ISOL-03", "Pose panneaux mur (m²)", "m²", 16, 8, "mo"));
  out.push(...TRADE_EXTENSIONS.isolateur());

  return out;
}

export const CATALOG_TRADES = [
  "electricien",
  "plombier",
  "chauffagiste",
  "peintre",
  "carreleur",
  "menuisier",
  "plaquiste",
  "isolateur",
];

const GENERATORS = {
  electricien: generateElectricien,
  peintre: generatePeintre,
  plombier: generatePlombier,
  chauffagiste: generateChauffagiste,
  carreleur: generateCarreleur,
  menuisier: generateMenuisier,
  plaquiste: generatePlaquiste,
  isolateur: generateIsolateur,
};

export function generateTradeCatalog(tradeType, options = {}) {
  const fn = GENERATORS[tradeType];
  if (!fn) return [];

  const items = fn();
  const seen = new Set();

  return items.map((entry, index) => {
    let ref = entry.ref;
    if (seen.has(ref)) {
      ref = `${ref}-D${index}`;
      entry = { ...entry, ref, country: entry.country ?? "FR" };
    } else {
      entry = { ...entry, country: entry.country ?? "FR" };
    }
    seen.add(ref);
    return entry;
  });
}

export function generateAllCatalogs() {
  const all = {};
  for (const trade of CATALOG_TRADES) {
    all[trade] = generateTradeCatalog(trade);
  }
  return all;
}
