/**
 * Extensions catalogue BTP — références détaillées par métier (marques, gammes pro).
 * Complète les catalogues de base dans prestations-catalog.js.
 */

import { IMAGE_SYNC_VERSION, resolvePrestationImageUrl } from "./prestation-images.js";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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

const MARQUES_PLOMB = ["Grohe", "Hansgrohe", "Geberit", "Ideal Standard", "Jacob Delafon", "Porcher"];
const MARQUES_CHAUF = ["Daikin", "Mitsubishi Electric", "Atlantic", "Saunier Duval", "Viessmann", "De Dietrich"];
const MARQUES_PEINT = ["Tollens", "Zolpan", "Dulux Valentine", "Unikalo", "Seigneurie", "Ripolin"];
const MARQUES_MENU = ["Lapeyre", "KparK", "Finstral", "Internorm", "Velux", "Somfy"];

export function generatePlombierExt() {
  const t = "plombier";
  const out = [];

  const robinetsPro = [
    { type: "Mitigeur monocommande lavabo", sell: 95 },
    { type: "Mitigeur thermostatique douche", sell: 185 },
    { type: "Mitigeur cuisine avec douchette", sell: 165 },
    { type: "Robinet d'arrêt 15/21", sell: 12 },
    { type: "Robinet d'arrêt 20/27", sell: 14 },
    { type: "Mélangeur baignoire sur colonne", sell: 220 },
  ];
  const finitions = ["chromé", "noir mat", "brossé", "or brossé"];
  for (const m of MARQUES_PLOMB) {
    for (const r of robinetsPro) {
      for (const f of finitions) {
        out.push(item(t, "Robinetterie pro", `ROB-${m.slice(0, 3).toUpperCase()}-${r.type.slice(0, 4)}-${f.slice(0, 2)}`, `${m} — ${r.type} — ${f}`, "u", r.sell + finitions.indexOf(f) * 15, r.sell * 0.48));
      }
    }
  }

  const sanitaires = [
    { ref: "WC-SUS", label: "WC suspendu avec bâti-support", sell: 680 },
    { ref: "WC-SOL", label: "WC au sol sortie horizontale", sell: 320 },
    { ref: "WC-BRO", label: "WC avec broyeur intégré", sell: 890 },
    { ref: "LAV-60", label: "Lavabo 60 cm céramique", sell: 145 },
    { ref: "LAV-80", label: "Lavabo 80 cm double vasque", sell: 285 },
    { ref: "MEU-VAS", label: "Meuble vasque 80 cm avec plan", sell: 520 },
    { ref: "BAIG-170", label: "Baignoire acrylique 170 cm", sell: 380 },
    { ref: "REC-90", label: "Receveur douche extra-plat 90×90", sell: 420 },
    { ref: "PAROI-90", label: "Paroi douche fixe 90 cm", sell: 350 },
    { ref: "DOUC-IT", label: "Kit douche italienne complet", sell: 1650 },
  ];
  for (const m of MARQUES_PLOMB) {
    for (const s of sanitaires) {
      out.push(item(t, "Sanitaires & équipements", `${s.ref}-${m.slice(0, 3).toUpperCase()}`, `${m} — ${s.label}`, "u", s.sell + MARQUES_PLOMB.indexOf(m) * 25, s.sell * 0.5));
    }
  }

  const chauffeEau = [
    { label: "Chauffe-eau électrique 100 L vertical", sell: 420 },
    { label: "Chauffe-eau électrique 200 L vertical", sell: 580 },
    { label: "Chauffe-eau électrique 300 L horizontal", sell: 720 },
    { label: "Ballon thermodynamique 200 L", sell: 1850 },
    { label: "Ballon thermodynamique 270 L", sell: 2150 },
    { label: "Groupe de sécurité + clapet", sell: 45 },
    { label: "Vase d'expansion sanitaire 8 L", sell: 38 },
    { label: "Vase d'expansion sanitaire 12 L", sell: 52 },
  ];
  for (const ce of chauffeEau) {
    out.push(item(t, "Chauffe-eau & ECS", `CE-${ce.label.slice(0, 4).replace(/\s/g, "")}-${ce.sell}`, ce.label, "u", ce.sell, ce.sell * 0.52));
  }

  const tubes = [
    { type: "PER nu", sections: [12, 16, 20, 25, 32] },
    { type: "Multicouche nu", sections: [16, 20, 26, 32, 40] },
    { type: "Cuivre écroui", sections: [12, 14, 16, 18, 22] },
    { type: "PVC évacuation", sections: [32, 40, 50, 63, 80, 100, 125] },
    { type: "PVC pression", sections: [20, 25, 32, 40, 50] },
  ];
  for (const tube of tubes) {
    for (const d of tube.sections) {
      const sell = 1.5 + d * 0.14 + tubes.indexOf(tube) * 0.4;
      out.push(item(t, "Canalisations & tubes", `TUB-${tube.type.slice(0, 3).toUpperCase()}-${d}`, `Tube ${tube.type} Ø ${d} mm — au mètre`, "m", sell, sell * 0.52));
    }
  }

  const raccords = ["Coude 90°", "Coude 45°", "Té égal", "Té réduit", "Manchon", "Réduction", "Raccord PER à sertir", "Raccord multicouche", "Raccord cuivre à souder"];
  for (const r of raccords) {
    for (const d of [16, 20, 26, 32, 40]) {
      out.push(item(t, "Raccords & raccordement", `RAC-${r.slice(0, 3)}-${d}`, `${r} Ø ${d} mm`, "u", 2.8 + d * 0.18, 1.3));
    }
  }

  const traitement = [
    { label: "Adoucisseur d'eau monobloc 20 L", sell: 980 },
    { label: "Adoucisseur d'eau bi-bloc 30 L", sell: 1250 },
    { label: "Filtre anti-calcaire magnétique", sell: 85 },
    { label: "Filtre à sédiments 20 microns", sell: 45 },
    { label: "Surpresseur automatique", sell: 320 },
    { label: "Disconnecteur BA type EC", sell: 165 },
    { label: "Détendeur de pression", sell: 95 },
    { label: "Détecteur de fuite avec vanne", sell: 145 },
  ];
  for (const tr of traitement) {
    out.push(item(t, "Traitement de l'eau", `EAU-${tr.label.slice(0, 4)}`, tr.label, "u", tr.sell, tr.sell * 0.5));
  }

  const evac = ["Pipe WC", "Pipe lavabo", "Pipe douche", "Siphon bouteille", "Siphon plat", "Bonde de sol", "Regard de sol", "Mécanisme chasse double", "Abattant WC soft-close"];
  for (const e of evac) {
    for (const d of [32, 40, 50, 100]) {
      out.push(item(t, "Évacuation & vidages", `EVA-${e.slice(0, 3)}-${d}`, `${e} Ø ${d} mm`, "u", 8 + d * 0.12 + evac.indexOf(e) * 3, 4));
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-PLOMB-03", "Pose salle de bain complète — forfait", "forfait", 2800, 1600, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-PLOMB-04", "Raccordement chauffe-eau / ballon", "forfait", 280, 160, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-PLOMB-05", "Détection et réparation fuite — forfait", "forfait", 150, 85, "mo"));

  return out;
}

export function generateChauffagisteExt() {
  const t = "chauffagiste";
  const out = [];

  const chaudieres = [
    { label: "Chaudière gaz condensation 24 kW", sell: 3200 },
    { label: "Chaudière gaz condensation 30 kW", sell: 3600 },
    { label: "Chaudière gaz condensation 35 kW", sell: 4100 },
    { label: "Chaudière fioul condensation 30 kW", sell: 4800 },
    { label: "Chaudière biomasse granulés 25 kW", sell: 6200 },
    { label: "Chaudière électrique 6 kW", sell: 850 },
  ];
  for (const m of MARQUES_CHAUF) {
    for (const c of chaudieres) {
      out.push(item(t, "Chaudières", `CH-${m.slice(0, 3).toUpperCase()}-${c.label.slice(0, 4)}`, `${m} — ${c.label}`, "u", c.sell + MARQUES_CHAUF.indexOf(m) * 80, c.sell * 0.58));
    }
  }

  const splits = [2.5, 3.5, 5, 7, 9, 12, 14, 16];
  for (const m of MARQUES_CHAUF) {
    for (const kw of splits) {
      out.push(item(t, "Climatisation splits", `SPL-${m.slice(0, 3)}-${kw}KW`, `${m} — Split inverter ${kw} kW complet`, "u", 480 + kw * 55 + MARQUES_CHAUF.indexOf(m) * 40, 300 + kw * 35));
      out.push(item(t, "Climatisation splits", `SPL-UI-${m.slice(0, 3)}-${kw}KW`, `${m} — Unité intérieure ${kw} kW`, "u", 190 + kw * 22, 115));
      out.push(item(t, "Climatisation splits", `SPL-UE-${m.slice(0, 3)}-${kw}KW`, `${m} — Unité extérieure ${kw} kW`, "u", 340 + kw * 28, 210));
    }
  }

  const pac = [6, 8, 10, 12, 14, 16, 18];
  for (const m of MARQUES_CHAUF) {
    for (const p of pac) {
      out.push(item(t, "Pompes à chaleur", `PAC-AE-${m.slice(0, 3)}-${p}KW`, `${m} — PAC air/eau ${p} kW`, "u", 3400 + p * 200, 2550 + p * 150));
      out.push(item(t, "Pompes à chaleur", `PAC-AA-${m.slice(0, 3)}-${p}KW`, `${m} — PAC air/air ${p} kW`, "u", 2800 + p * 180, 2100 + p * 130));
    }
  }

  const poele = [
    { label: "Poêle à granulés 8 kW", sell: 3200 },
    { label: "Poêle à granulés 12 kW", sell: 4200 },
    { label: "Poêle à bois bûches 8 kW", sell: 1850 },
    { label: "Insert cheminée à granulés", sell: 3800 },
    { label: "Conduit de fumée inox double paroi", sell: 85 },
  ];
  for (const p of poele) {
    out.push(item(t, "Poêles & inserts", `POE-${p.label.slice(0, 4)}`, p.label, "u", p.sell, p.sell * 0.55));
  }

  const radiateurs = [
    { type: "Radiateur acier panneau Type 22", puissances: [500, 600, 800, 1000, 1200, 1400, 1600, 2000] },
    { type: "Radiateur fonte design", puissances: [600, 800, 1000, 1200] },
    { type: "Sèche-serviette électrique", puissances: [500, 750, 1000, 1250] },
    { type: "Radiateur sèche-serviette eau chaude", puissances: [400, 600, 800, 1000] },
    { type: "Plancher chauffant hydraulique", puissances: [0] },
  ];
  for (const rad of radiateurs) {
    if (rad.puissances[0] === 0) {
      out.push(item(t, "Radiateurs & émetteurs", `RAD-PC-1M2`, `${rad.type} — au m²`, "m²", 68, 38));
      continue;
    }
    for (const w of rad.puissances) {
      out.push(item(t, "Radiateurs & émetteurs", `RAD-${rad.type.slice(0, 3)}-${w}`, `${rad.type} — ${w} W`, "u", 75 + w * 0.09, 42));
    }
  }

  const vmc = [
    { label: "VMC simple flux hygroréglable", sell: 580 },
    { label: "VMC double flux autoréglable", sell: 2200 },
    { label: "VMC double flux thermodynamique", sell: 4200 },
    { label: "Caisson VMC basse consommation", sell: 380 },
    { label: "Bouche d'extraction hygroréglable", sell: 45 },
    { label: "Entrée d'air hygroréglable", sell: 38 },
    { label: "Gaine rigide isolée Ø 125", sell: 12 },
    { label: "Gaine rigide isolée Ø 160", sell: 15 },
  ];
  for (const v of vmc) {
    out.push(item(t, "Ventilation & VMC", `VMC-${v.label.slice(0, 4)}`, v.label, v.label.includes("Gaine") ? "m" : "u", v.sell, v.sell * 0.52));
  }

  const hydraulique = ["Circulateur classe A", "Vase expansion 12 L", "Vase expansion 18 L", "Disconnecteur", "Filtre à tamis", "Pot à boues magnétique", "Vanne mélangeuse 3 voies", "Collecteur chauffage 4 sorties", "Collecteur chauffage 6 sorties"];
  for (const h of hydraulique) {
    out.push(item(t, "Hydraulique chauffage", `HYD-${h.slice(0, 4)}`, h, "u", 45 + hydraulique.indexOf(h) * 22, 28));
  }

  out.push(item(t, "Main d'œuvre", "MO-CLIM-03", "Installation PAC air/eau complète — forfait", "forfait", 3500, 2000, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-CLIM-04", "Mise en service chaudière / PAC", "forfait", 350, 200, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-CLIM-05", "Entretien annuel chaudière / clim", "forfait", 120, 70, "mo"));

  return out;
}

export function generatePeintreExt() {
  const t = "peintre";
  const out = [];

  const gammes = [
    { type: "Acrylique mat intérieur", finitions: ["blanc", "blanc cassé", "ton sur teinte"] },
    { type: "Acrylique satin intérieur", finitions: ["blanc", "gris perle", "beige"] },
    { type: "Glycéro satin boiseries", finitions: ["blanc", "gris anthracite", "noir"] },
    { type: "Peinture façade siloxane", finitions: ["blanc", "ton pierre", "gris"] },
    { type: "Peinture pièce humide", finitions: ["blanc", "gris clair"] },
    { type: "Peinture sol époxy", finitions: ["gris clair", "gris foncé"] },
    { type: "Peinture intumescente feu", finitions: ["blanc"] },
    { type: "Lasure bois extérieur", finitions: ["chêne clair", "teck", "incolore"] },
  ];
  const contenances = [2.5, 5, 10, 15];
  for (const m of MARQUES_PEINT) {
    for (const g of gammes) {
      for (const l of contenances) {
        for (const fin of g.finitions) {
          const sell = (8 + l * 2.8 + gammes.indexOf(g) * 3) / l;
          out.push(item(t, "Peintures pro", `PEI-${m.slice(0, 3)}-${g.type.slice(0, 3)}-${l}L`, `${m} — ${g.type} ${l} L — ${fin}`, "L", Math.round(sell * 100) / 100, sell * 0.46));
        }
      }
    }
  }

  const enduits = ["Enduit de lissage", "Enduit de garnissage", "Enduit à joint", "Enduit décoratif taloché", "Enduit finition", "Sous-couche universelle", "Fixateur / accroche"];
  for (const e of enduits) {
    for (const l of [5, 10, 25]) {
      out.push(item(t, "Enduits & préparation", `END-${e.slice(0, 4)}-${l}L`, `${e} ${l} L`, "L", (6 + l * 1.5) / l, ((6 + l * 1.5) / l) * 0.48));
    }
  }

  const revetements = ["Toile de verre", "Papier peint intissé", "Papier peint vinyle", "Revêtement mural tissu", "Enduit effet béton", "Enduit effet stuc"];
  for (const r of revetements) {
    for (const l of ["10 m", "25 m", "50 m"]) {
      out.push(item(t, "Revêtements muraux pro", `REV-${r.slice(0, 4)}-${l.replace(/\s/g, "")}`, `${r} — rouleau ${l}`, "u", 28 + revetements.indexOf(r) * 8, 14));
    }
  }

  const outillage = ["Pistolet à peinture HVLP", "Compresseur 50 L", "Bac à enduit inox", "Couteau à enduire 40 cm", "Taloche inox", "Ponceuse girafe", "Aspirateur poussières fines", "Échafaudage roulant 3 m"];
  for (const o of outillage) {
    out.push(item(t, "Outillage peintre pro", `OUT-${o.slice(0, 4)}`, o, "u", 45 + outillage.indexOf(o) * 35, 25));
  }

  out.push(item(t, "Main d'œuvre", "MO-PEINT-03", "Peinture murs + plafond — au m²", "m²", 18, 10, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-PEINT-04", "Préparation murs anciens — au m²", "m²", 14, 8, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-PEINT-05", "Pose papier peint / toile de verre — au m²", "m²", 22, 12, "mo"));

  return out;
}

export function generateCarreleurExt() {
  const t = "carreleur";
  const out = [];

  const pierres = ["Grès cérame", "Grès émaillé", "Pierre naturelle travertin", "Pierre naturelle ardoise", "Ciment décoratif", "Terre cuite"];
  const formats = ["30×30", "45×45", "60×60", "60×120", "80×80", "120×120"];
  const finis = ["mat", "poli", "structuré", "antidérapant R11", "effet bois", "effet marbre"];
  for (const p of pierres) {
    for (const f of formats) {
      for (const fin of finis) {
        const sell = 22 + formats.indexOf(f) * 5 + pierres.indexOf(p) * 3 + finis.indexOf(fin) * 2;
        out.push(item(t, "Carrelage & revêtements", `CAR-${p.slice(0, 3)}-${f.replace(/×/g, "x")}-${fin.slice(0, 3)}`, `${p} ${f} cm ${fin}`, "m²", sell, sell * 0.48));
      }
    }
  }

  const faience = ["Faïence brillante", "Faïence mate", "Mosaïque verre", "Mosaïque pierre", "Crédence cuisine", "Zellige artisanal"];
  for (const fa of faience) {
    for (const fmt of ["20×50", "25×75", "30×60"]) {
      out.push(item(t, "Faïence & mosaïque pro", `FAI-${fa.slice(0, 3)}-${fmt.replace(/×/g, "x")}`, `${fa} ${fmt} cm`, "m²", 32 + faience.indexOf(fa) * 6, 16));
    }
  }

  const colles = ["Colle flexible C2 S1", "Colle flexible C2 TE", "Colle grande format C2 S2", "Colle extérieur gel", "Mortier-colle fibré", "Primaire d'accrochage"];
  for (const c of colles) {
    for (const poids of [25, 30]) {
      out.push(item(t, "Colles & mortiers-colle", `COL-${c.slice(0, 4)}-${poids}KG`, `${c} — sac ${poids} kg`, "u", 18 + colles.indexOf(c) * 4 + poids * 0.2, 9));
    }
  }

  const joints = ["Joint ciment CG2", "Joint époxy 2 composants", "Joint fin 2 mm", "Joint fin 3 mm", "Joint fin 5 mm", "Silicone sanitaire"];
  for (const j of joints) {
    for (const coul of ["blanc", "gris clair", "gris foncé", "noir", "beige"]) {
      out.push(item(t, "Joints & finitions carrelage", `JNT-${j.slice(0, 3)}-${coul.slice(0, 2)}`, `${j} — ${coul}`, "u", 8 + joints.indexOf(j) * 3, 4));
    }
  }

  const profils = ["Profil angle alu", "Profil nez de marche", "Profil de finition", "Profil de dilatation", "Profil de rive", "Barre de seuil"];
  const profilFins = ["alu naturel", "inox", "noir mat", "laiton"];
  for (const pr of profils) {
    for (const fin of profilFins) {
      out.push(item(t, "Profilés & finitions", `PRO-${pr.slice(0, 3)}-${fin.slice(0, 2)}`, `${pr} — ${fin}`, "m", 8 + profils.indexOf(pr) * 2 + profilFins.indexOf(fin) * 1.5, 4));
    }
  }

  const etancheite = ["Bande d'étanchéité angles", "Manchette étanchéité", "Kit étanchéité sous carrelage", "Membrane liquide SDB", "Receveur + bonde", "Siphon de sol linéaire"];
  for (const e of etancheite) {
    out.push(item(t, "Étanchéité carrelage", `ETA-${e.slice(0, 4)}`, e, e.includes("Kit") || e.includes("Receveur") ? "u" : "m", 15 + etancheite.indexOf(e) * 12, 8));
  }

  out.push(item(t, "Main d'œuvre", "MO-CARR-04", "Pose carrelage sol — au m²", "m²", 42, 24, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-CARR-05", "Pose faïence murale — au m²", "m²", 48, 28, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-CARR-06", "Étanchéité + carrelage SDB — forfait", "forfait", 850, 480, "mo"));

  return out;
}

export function generateMenuisierExt() {
  const t = "menuisier";
  const out = [];

  const portes = [
    { type: "Bloc-porte isoplane alisé", dims: ["73 cm", "83 cm", "93 cm"] },
    { type: "Bloc-porte postformé", dims: ["73 cm", "83 cm"] },
    { type: "Porte coulissante sur rail", dims: ["83 cm", "93 cm"] },
    { type: "Porte blindée A2P BP1", dims: ["83 cm", "93 cm"] },
    { type: "Porte palière isolante", dims: ["90 cm", "100 cm"] },
  ];
  for (const m of MARQUES_MENU.slice(0, 4)) {
    for (const p of portes) {
      for (const d of p.dims) {
        const sell = 180 + portes.indexOf(p) * 80 + p.dims.indexOf(d) * 40;
        out.push(item(t, "Portes & blocs-portes", `POR-${m.slice(0, 3)}-${p.type.slice(0, 3)}-${d.replace(/\s/g, "")}`, `${m} — ${p.type} ${d}`, "u", sell, sell * 0.5));
      }
    }
  }

  const fenetres = [
    { mat: "PVC double vitrage", vit: "4/16/4", ouv: ["oscillo-battant", "coulissant", "fixe"] },
    { mat: "PVC triple vitrage", vit: "4/12/4/12/4", ouv: ["oscillo-battant", "coulissant"] },
    { mat: "Aluminium rupture de pont", vit: "4/16/4", ouv: ["oscillo-battant", "coulissant", "fixe"] },
    { mat: "Bois massif", vit: "4/16/4", ouv: ["oscillo-battant", "à galandage"] },
  ];
  const dimFen = ["80×120", "100×120", "120×120", "140×120", "160×120"];
  for (const m of MARQUES_MENU) {
    for (const f of fenetres) {
      for (const dim of dimFen) {
        for (const ouv of f.ouv) {
          const sell = 320 + dimFen.indexOf(dim) * 45 + fenetres.indexOf(f) * 60;
          out.push(item(t, "Fenêtres & menuiseries ext.", `FEN-${m.slice(0, 3)}-${dim.replace(/×/g, "x")}-${ouv.slice(0, 3)}`, `${m} — Fenêtre ${f.mat} ${dim} cm ${ouv} ${f.vit}`, "u", sell, sell * 0.52));
        }
      }
    }
  }

  const volets = ["Volet roulant électrique", "Volet roulant solaire", "Volet battant PVC", "Volet battant alu", "Store banne", "Moustiquaire enroulable", "Porte de garage sectionnelle"];
  for (const v of volets) {
    for (const dim of ["120×120", "140×120", "240×200", "300×220"]) {
      out.push(item(t, "Volets & fermetures", `VOL-${v.slice(0, 3)}-${dim.replace(/×/g, "x")}`, `${v} ${dim} cm`, "u", 420 + volets.indexOf(v) * 80, 240));
    }
  }

  const agencements = ["Placard coulissant 2 portes", "Dressing sur mesure", "Verrière intérieure", "Escalier bois quart tournant", "Escalier bois droit", "Garde-corps bois + inox", "Plan de travail stratifié", "Plan de travail quartz"];
  for (const a of agencements) {
    out.push(item(t, "Agencements intérieurs", `AG-${a.slice(0, 4)}`, a, a.includes("Plan") ? "ml" : "u", 280 + agencements.indexOf(a) * 120, 160));
  }

  const parquets = ["Parquet contrecollé chêne", "Parquet massif chêne", "Parquet stratifié AC5", "Parquet stratifié AC4", "Sol vinyle LVT clipsable", "Sol vinyle LVT collé"];
  for (const p of parquets) {
    for (const ep of [7, 10, 14, 20]) {
      out.push(item(t, "Parquet & sols bois", `PAR-${p.slice(0, 3)}-${ep}`, `${p} ép. ${ep} mm`, "m²", 35 + parquets.indexOf(p) * 8 + ep * 0.5, 18));
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-MENU-04", "Pose fenêtre complète — à l'unité", "u", 180, 100, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-MENU-05", "Pose parquet flottant — au m²", "m²", 28, 16, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-MENU-06", "Pose volet roulant — à l'unité", "u", 220, 125, "mo"));

  return out;
}

export function generatePlaquisteExt() {
  const t = "plaquiste";
  const out = [];

  const plaques = [
    { type: "BA13 standard", ep: 13 },
    { type: "BA13 hydrofuge", ep: 13 },
    { type: "BA15", ep: 15 },
    { type: "BA18", ep: 18 },
    { type: "BA13 acoustique", ep: 13 },
    { type: "BA13 haute dureté", ep: 13 },
    { type: "BA25 feu", ep: 25 },
    { type: "Plaque ciment", ep: 12 },
  ];
  const dims = ["120×250", "120×300", "120×270"];
  for (const pl of plaques) {
    for (const d of dims) {
      out.push(item(t, "Plaques BA13 & cloisons", `PLQ-${pl.type.slice(0, 4)}-${d.replace(/×/g, "x")}`, `Plaque ${pl.type} ${d} cm`, "m²", 5.5 + plaques.indexOf(pl) * 1.5, 2.8));
    }
  }

  const ossatures = [
    { prof: "48 mm", long: 2.5, type: "Montant M48" },
    { prof: "48 mm", long: 3.0, type: "Montant M48" },
    { prof: "70 mm", long: 2.5, type: "Montant M70" },
    { prof: "70 mm", long: 3.0, type: "Montant M70" },
    { prof: "90 mm", long: 3.0, type: "Montant M90" },
    { prof: "48 mm", long: 3.0, type: "Rail R48" },
    { prof: "70 mm", long: 3.0, type: "Rail R70" },
    { prof: "90 mm", long: 3.0, type: "Rail R90" },
  ];
  for (const o of ossatures) {
    out.push(item(t, "Ossature métallique", `OSS-${o.type.slice(0, 3)}-${o.prof.replace(/\s/g, "")}-${o.long}`, `${o.type} ${o.prof} L ${o.long} m`, "m", 3.5 + ossatures.indexOf(o) * 0.8, 1.8));
  }

  const cloisons = [
    { ep: "70 mm", iso: "sans isolant", perf: "standard" },
    { ep: "70 mm", iso: "laine 45 mm", perf: "thermique" },
    { ep: "98 mm", iso: "laine 60 mm", perf: "thermo-acoustique" },
    { ep: "120 mm", iso: "laine 100 mm", perf: "acoustique renforcée" },
    { ep: "98 mm", iso: "laine 60 mm", perf: "coupe-feu 1 h" },
  ];
  for (const c of cloisons) {
    for (const h of [250, 270, 300]) {
      out.push(item(t, "Cloisons sèches pro", `CLO-${c.ep.replace(/\s/g, "")}-${c.perf.slice(0, 3)}-${h}`, `Cloison ${c.ep} ${c.iso} ${c.perf} H ${h} cm`, "m²", 32 + cloisons.indexOf(c) * 6, 16));
    }
  }

  const plafonds = ["Faux plafond BA13 sur suspentes", "Faux plafond dalle minérale 60×60", "Faux plafond dalle acoustique", "Plafond tendu", "Coffrage plenum VMC", "Trappe de visite 60×60"];
  for (const pl of plafonds) {
    out.push(item(t, "Faux plafonds pro", `PLF-${pl.slice(0, 4)}`, pl, pl.includes("Trappe") ? "u" : "m²", pl.includes("Trappe") ? 95 : 28 + plafonds.indexOf(pl) * 4, pl.includes("Trappe") ? 50 : 14));
  }

  const finitions = ["Bande à joint papier", "Bande à joint grille", "Enduit à joint prêt à l'emploi", "Enduit de lissage", "Vis TTPC 25 mm", "Vis TTPC 35 mm", "Vis TTPC 45 mm"];
  for (const f of finitions) {
    for (const lot of ["100 u", "250 u", "25 kg", "5 kg"]) {
      out.push(item(t, "Bandes & enduits placo", `FIN-${f.slice(0, 4)}-${lot.replace(/\s/g, "")}`, `${f} — ${lot}`, "u", 4 + finitions.indexOf(f) * 2, 2));
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-PLAQ-04", "Cloison BA13 — au m²", "m²", 38, 22, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-PLAQ-05", "Doublage collé — au m²", "m²", 28, 16, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-PLAQ-06", "Faux plafond sur suspentes — au m²", "m²", 32, 18, "mo"));

  const marquesPlaco = ["Placo", "Lafarge", "Siniat", "Fermacell", "Knauf", "Gyproc"];
  const typesPlaque = [
    { label: "BA13 standard", sell: 5.2 },
    { label: "BA13 hydrofuge", sell: 6.8 },
    { label: "BA13 acoustique", sell: 8.5 },
    { label: "BA18 haute dureté", sell: 9.2 },
    { label: "BA25 coupe-feu", sell: 12.5 },
    { label: "Plaque ciment", sell: 14 },
  ];
  for (const m of marquesPlaco) {
    for (const p of typesPlaque) {
      for (const d of ["120×250", "120×300", "120×270"]) {
        out.push(
          item(
            t,
            "Plaques BA13 & cloisons",
            `PLM-${m.slice(0, 3).toUpperCase()}-${p.label.slice(0, 4)}-${d.replace(/×/g, "x")}`,
            `${m} — Plaque ${p.label} ${d} cm`,
            "m²",
            p.sell + marquesPlaco.indexOf(m) * 0.4,
            p.sell * 0.48,
          ),
        );
      }
    }
  }

  const doublagesPro = [
    { ep: "40 mm", type: "collé direct", sell: 18 },
    { ep: "60 mm", type: "collé direct", sell: 22 },
    { ep: "80 mm", type: "sur ossature", sell: 28 },
    { ep: "100 mm", type: "sur ossature", sell: 34 },
    { ep: "120 mm", type: "contre-cloison", sell: 38 },
  ];
  const isolDoubl = ["sans isolant", "laine 45 mm", "laine 60 mm", "laine 100 mm", "PIR 40 mm"];
  for (const d of doublagesPro) {
    for (const iso of isolDoubl) {
      out.push(
        item(
          t,
          "Doublage",
          `DBL-${d.ep.replace(/\s/g, "")}-${iso.slice(0, 3)}`,
          `Doublage ${d.type} ${d.ep} — ${iso}`,
          "m²",
          d.sell + isolDoubl.indexOf(iso) * 4,
          d.sell * 0.5,
        ),
      );
    }
  }

  const profiles = [
    { label: "Cornière papier 50 mm", sell: 2.5 },
    { label: "Cornière métal 50 mm", sell: 3.2 },
    { label: "Profil de départ 48 mm", sell: 4.8 },
    { label: "Profil de départ 70 mm", sell: 5.5 },
    { label: "Profil d'angle 90°", sell: 3.8 },
    { label: "Profil fourrure F47", sell: 3.2 },
    { label: "Profil fourrure F530", sell: 3.6 },
    { label: "Joint de dilatation", sell: 6.5 },
    { label: "Renfort d'ouverture", sell: 8 },
    { label: "Montant renforcé porte", sell: 12 },
  ];
  for (const pr of profiles) {
    for (const l of [2.5, 3, 6]) {
      out.push(item(t, "Ossature métallique", `PRO-${pr.label.slice(0, 4)}-${l}M`, `${pr.label} L ${l} m`, "m", pr.sell + l * 0.3, pr.sell * 0.52));
    }
  }

  const accessoires = [
    { label: "Vis TTPC 25 mm", sell: 4.5 },
    { label: "Vis TTPC 35 mm", sell: 5 },
    { label: "Vis TTPC 45 mm", sell: 5.5 },
    { label: "Cheville Molly 8 mm", sell: 8 },
    { label: "Cheville métallique 6 mm", sell: 6 },
    { label: "Agrafes faux plafond", sell: 7 },
    { label: "Connecteur montant-rail", sell: 1.2 },
    { label: "Suspente réglable 60 cm", sell: 2.8 },
  ];
  for (const a of accessoires) {
    for (const lot of [100, 250, 500]) {
      out.push(item(t, "Fixations", `ACC-${a.label.slice(0, 4)}-${lot}`, `${a.label} (lot ${lot})`, "u", a.sell + lot * 0.008, a.sell * 0.48));
    }
  }

  const huisseries = [
    { label: "Bloc-porte isoplane 204×83", sell: 185 },
    { label: "Bloc-porte alvéolaire 204×73", sell: 145 },
    { label: "Huisserie métallique 204×83", sell: 220 },
    { label: "Huisserie bois 204×83", sell: 165 },
    { label: "Trappe de visite 60×60 hydro", sell: 95 },
    { label: "Trappe de visite 50×50 laquée", sell: 78 },
  ];
  const finHuiss = ["blanc", "prêt à peindre", "laqué"];
  for (const h of huisseries) {
    for (const fin of finHuiss) {
      out.push(item(t, "Trappes & accessoires", `HUI-${h.label.slice(0, 4)}-${fin.slice(0, 2)}`, `${h.label} — ${fin}`, "u", h.sell + finHuiss.indexOf(fin) * 12, h.sell * 0.52));
    }
  }

  return out;
}

export function generateIsolateurExt() {
  const t = "isolateur";
  const out = [];

  const laines = [
    { type: "Laine de verre rouleau", lambda: 0.032 },
    { type: "Laine de verre panneau", lambda: 0.032 },
    { type: "Laine de roche rouleau", lambda: 0.034 },
    { type: "Laine de roche panneau", lambda: 0.034 },
    { type: "Laine de bois flex", lambda: 0.038 },
    { type: "Ouate de cellulose soufflée", lambda: 0.039 },
  ];
  const epaisseurs = [60, 80, 100, 120, 140, 160, 200, 240, 300];
  for (const l of laines) {
    for (const ep of epaisseurs) {
      const sell = 4 + ep * 0.055 + laines.indexOf(l) * 0.6;
      out.push(item(t, "Laines & fibres", `LAI-${l.type.slice(0, 3)}-${ep}`, `${l.type} ép. ${ep} mm λ ${l.lambda}`, "m²", Math.round(sell * 100) / 100, sell * 0.48));
    }
  }

  const rigides = [
    { type: "PIR", ep: [20, 30, 40, 50, 60, 80, 100, 120] },
    { type: "PUR", ep: [30, 40, 50, 60, 80, 100] },
    { type: "Polystyrène expansé", ep: [20, 30, 40, 60, 80, 100, 140] },
    { type: "Polystyrène extrudé XPS", ep: [30, 40, 60, 80, 100, 120] },
  ];
  for (const r of rigides) {
    for (const ep of r.ep) {
      const sell = 7 + ep * 0.14 + rigides.indexOf(r) * 1.5;
      out.push(item(t, "Panneaux isolants rigides", `PAN-${r.type.slice(0, 3)}-${ep}`, `Panneau ${r.type} ép. ${ep} mm`, "m²", Math.round(sell * 100) / 100, sell * 0.5));
    }
  }

  const etics = [
    { label: "ITE polystyrène 140 mm + enduit", sell: 95 },
    { label: "ITE laine de roche 160 mm + enduit", sell: 110 },
    { label: "ITE PIR 120 mm + enduit", sell: 105 },
    { label: "Profilé de départ ITE", sell: 8 },
    { label: "Cheville à frapper ITE", sell: 0.85 },
    { label: "Armature fibre de verre ITE", sell: 4.5 },
    { label: "Enduit de finition ITE", sell: 12 },
    { label: "Sous-enduit d'accrochage ITE", sell: 8 },
  ];
  for (const e of etics) {
    out.push(item(t, "Isolation extérieure (ITE)", `ITE-${e.label.slice(0, 4)}`, e.label, e.label.includes("Cheville") ? "u" : "m²", e.sell, e.sell * 0.5));
  }

  const combles = [
    { type: "Soufflage ouate cellulose", r: ["R=4", "R=5", "R=6", "R=7", "R=8"] },
    { type: "Déroulé combles perdus laine de verre", r: ["R=4", "R=5", "R=6", "R=7"] },
    { type: "Isolation rampants sous toiture", r: ["R=4", "R=5", "R=6"] },
    { type: "Sarking toiture", r: ["R=4", "R=5", "R=6"] },
  ];
  for (const c of combles) {
    for (const r of c.r) {
      out.push(item(t, "Isolation combles & toiture", `COM-${c.type.slice(0, 3)}-${r.replace("=", "")}`, `${c.type} — ${r}`, "m²", 16 + combles.indexOf(c) * 4 + c.r.indexOf(r) * 2, 8));
    }
  }

  const phonique = ["Complexe acoustique 52 dB", "Complexe acoustique 58 dB", "Liège expansé", "Mousse acoustique", "Isolant phonique plancher", "Underlay acoustique parquet"];
  for (const ph of phonique) {
    for (const ep of [20, 30, 45, 60, 80]) {
      out.push(item(t, "Isolation phonique pro", `PHO-${ph.slice(0, 3)}-${ep}`, `${ph} ép. ${ep} mm`, "m²", 14 + phonique.indexOf(ph) * 3 + ep * 0.08, 7));
    }
  }

  out.push(item(t, "Main d'œuvre", "MO-ISOL-04", "Isolation extérieure ITE — au m²", "m²", 85, 48, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-ISOL-05", "Soufflage combles perdus — au m²", "m²", 14, 8, "mo"));
  out.push(item(t, "Main d'œuvre", "MO-ISOL-06", "Isolation rampants — au m²", "m²", 22, 12, "mo"));

  const marquesIsol = ["Isover", "Rockwool", "Knauf Insulation", "Ursa", "Saint-Gobain", "Recticel"];
  const refsLaine = [
    { label: "Laine de verre rouleau", sell: 4.2 },
    { label: "Laine de verre panneau", sell: 4.8 },
    { label: "Laine de roche rouleau", sell: 5.2 },
    { label: "Laine de roche panneau", sell: 5.8 },
  ];
  for (const m of marquesIsol) {
    for (const r of refsLaine) {
      for (const ep of [60, 80, 100, 120, 140, 160, 200]) {
        const sell = r.sell + ep * 0.05 + marquesIsol.indexOf(m) * 0.3;
        out.push(
          item(
            t,
            "Laines & fibres",
            `MAR-${m.slice(0, 3).toUpperCase()}-${r.label.slice(0, 3)}-${ep}`,
            `${m} — ${r.label} ép. ${ep} mm`,
            "m²",
            Math.round(sell * 100) / 100,
            sell * 0.48,
          ),
        );
      }
    }
  }

  const sols = [
    { label: "Underlay acoustique parquet", sell: 6.5 },
    { label: "Isolant plancher bas polystyrène", sell: 8 },
    { label: "Isolant plancher bas PIR", sell: 12 },
    { label: "Dalle support plancher chauffant", sell: 14 },
    { label: "Complexe plancher bois isolé", sell: 22 },
  ];
  for (const s of sols) {
    for (const ep of [20, 30, 40, 60, 80, 100]) {
      out.push(item(t, "Isolation phonique pro", `SOL-${s.label.slice(0, 3)}-${ep}`, `${s.label} ép. ${ep} mm`, "m²", s.sell + ep * 0.08, s.sell * 0.5));
    }
  }

  const calorifuge = [
    { label: "Coquille laine de roche DN15", sell: 4.5 },
    { label: "Coquille laine de roche DN20", sell: 5.2 },
    { label: "Coquille laine de roche DN26", sell: 6.8 },
    { label: "Manchon mousse élastomère DN15", sell: 3.2 },
    { label: "Manchon mousse élastomère DN22", sell: 4 },
    { label: "Adhésif calorifugeage", sell: 18 },
    { label: "Bande aluminium calorifuge", sell: 8 },
  ];
  for (const c of calorifuge) {
    for (const ep of [9, 13, 19, 25]) {
      out.push(item(t, "Fixations & accessoires", `CAL-${c.label.slice(0, 3)}-${ep}`, `${c.label} ép. ${ep} mm`, "m", c.sell + ep * 0.15, c.sell * 0.5));
    }
  }

  const pontsTherm = [
    { label: "Larmier ITE", sell: 12 },
    { label: "Appui de fenêtre ITE", sell: 18 },
    { label: "Profilé d'angle ITE", sell: 8 },
    { label: "Bande d'arrêt ITE", sell: 6 },
    { label: "Joint mousse dilatation ITE", sell: 4.5 },
    { label: "Membrane d'étanchéité à l'air", sell: 9 },
    { label: "Adhésif EPDM façade", sell: 14 },
    { label: "Plot support isolant terrasse", sell: 2.2 },
  ];
  for (const p of pontsTherm) {
    for (const l of [25, 50, 75]) {
      out.push(item(t, "Films & membranes", `PTH-${p.label.slice(0, 3)}-${l}`, `${p.label} — ${l} m`, p.label.includes("Plot") ? "u" : "m", p.sell + l * 0.1, p.sell * 0.52));
    }
  }

  const iteMarques = [
    { label: "ITE polystyrène graphité 140 mm", sell: 92 },
    { label: "ITE laine de roche 160 mm", sell: 108 },
    { label: "ITE PIR 120 mm", sell: 102 },
    { label: "ITE fibre de bois 160 mm", sell: 115 },
  ];
  for (const m of marquesIsol) {
    for (const i of iteMarques) {
      out.push(
        item(
          t,
          "Isolation extérieure (ITE)",
          `ITM-${m.slice(0, 3)}-${i.label.slice(0, 4)}`,
          `${m} — ${i.label}`,
          "m²",
          i.sell + marquesIsol.indexOf(m) * 3,
          i.sell * 0.5,
        ),
      );
    }
  }

  return out;
}

export const TRADE_EXTENSIONS = {
  plombier: generatePlombierExt,
  chauffagiste: generateChauffagisteExt,
  peintre: generatePeintreExt,
  carreleur: generateCarreleurExt,
  menuisier: generateMenuisierExt,
  plaquiste: generatePlaquisteExt,
  isolateur: generateIsolateurExt,
};
