/**
 * Ouvrages Batiprix intégrés — structure et codification type Batiprix.
 * Prix HT indicatifs (marché français) — modifiables ; import CSV compatible exports Batiprix.
 */

import { CATALOG_TRADES } from "./prestations-catalog.js";
import { IMAGE_SYNC_VERSION, resolvePrestationImageUrl } from "./prestation-images.js";

export const BATIPRIX_TRADE = "batiprix";
export const LIBRARY_TRADES = [...CATALOG_TRADES, BATIPRIX_TRADE];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function ouvrage(lotCode, lotName, seq, designation, unit, unitPriceHT, type = "fourniture") {
  const code = `${lotCode}.${String(seq).padStart(3, "0")}`;
  const purchase = Math.round(unitPriceHT * (type === "mo" ? 0.58 : 0.62) * 100) / 100;
  const category = `${lotCode} — ${lotName}`;
  const entry = {
    id: uid(),
    tradeType: BATIPRIX_TRADE,
    batiprixCode: code,
    batiprixLot: lotName,
    category,
    ref: `BP-${lotCode}-${String(seq).padStart(3, "0")}`,
    designation,
    unit,
    unitPriceHT: Math.round(unitPriceHT * 100) / 100,
    purchaseCostHT: purchase,
    type,
    imageUrl: resolvePrestationImageUrl(BATIPRIX_TRADE, category, type, designation),
    imageSyncVersion: IMAGE_SYNC_VERSION,
    source: "batiprix",
    country: "FR",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return entry;
}

/** @type {Array<{ code: string, name: string, items: Array<[string, string, number, string?]> }>} */
const BATIPRIX_LOTS = [
  {
    code: "01",
    name: "Terrassements & fondations",
    items: [
      ["Fouille en rigole largeur 0,40 m, prof. 0,60 m", "ml", 28],
      ["Fouille en pleine masse prof. 1,00 m", "m³", 42],
      ["Évacuation des terres excédentaires", "m³", 18],
      ["Remblai compacté autour fondations", "m³", 35],
      ["Béton propreté épaisseur 5 cm", "m²", 12],
      ["Semelle filante béton C25/30", "ml", 95],
      ["Longrine béton armé 20×40 cm", "ml", 78],
      ["Radier béton armé épaisseur 15 cm", "m²", 68],
      ["Drainage périphérique + géotextile", "ml", 32],
      ["Hérisson + film polyane sous dalle", "m²", 14],
    ],
  },
  {
    code: "02",
    name: "Maçonnerie & gros œuvre",
    items: [
      ["Mur parpaing creux 20 cm mortier traditionnel", "m²", 58],
      ["Mur béton cellulaire 20 cm", "m²", 62],
      ["Mur pierre naturelle joint traditionnel", "m²", 145],
      ["Chaînage horizontal 20×20 cm", "ml", 38],
      ["Chaînage vertical 20×20 cm", "ml", 42],
      ["Linteau béton armé", "ml", 55],
      ["Dalle béton armé épaisseur 12 cm", "m²", 72],
      ["Escalier béton 1/4 tournant", "u", 2800],
      ["Enduit monocouche sur parpaing", "m²", 32],
      ["Seuil béton porte garage", "u", 180],
    ],
  },
  {
    code: "03",
    name: "Charpente & couverture",
    items: [
      ["Charpente traditionnelle sapin", "m²", 95],
      ["Charpente fermette industrielle", "m²", 78],
      ["Couverture tuiles mécaniques", "m²", 48],
      ["Couverture ardoise naturelle", "m²", 125],
      ["Écran sous-toiture HPV", "m²", 12],
      ["Liteaux + contre-liteaux", "m²", 18],
      ["Zinguerie noue + solin plomb", "ml", 65],
      ["Gouttière zinc demi-ronde", "ml", 42],
      ["Descente EP zinc", "ml", 38],
      ["Fenêtre de toit standard posée", "u", 680],
    ],
  },
  {
    code: "04",
    name: "Menuiseries extérieures",
    items: [
      ["Porte d'entrée PVC double vitrage", "u", 1250],
      ["Porte d'entrée alu double vitrage", "u", 1850],
      ["Fenêtre PVC 1 vantail", "u", 420],
      ["Fenêtre PVC 2 vantaux", "u", 680],
      ["Baie coulissante PVC 2 rails", "u", 1450],
      ["Volet roulant électrique", "u", 520],
      ["Porte garage sectionnelle motorisée", "u", 2200],
      ["Seuil PMR acier", "u", 95],
      ["Moustiquaire enroulable", "u", 145],
      ["Vitrage phonique renforcé", "m²", 185],
    ],
  },
  {
    code: "05",
    name: "Plomberie & sanitaire",
    items: [
      ["Point d'eau EF (alimentation + évacuation)", "u", 285],
      ["Point d'eau ECS", "u", 320],
      ["Pose lavabo sur colonne", "u", 380],
      ["Pose WC au sol sortie horizontale", "u", 420],
      ["Pose WC suspendu + bâti-support", "u", 780],
      ["Pose douche italienne complète", "u", 1650],
      ["Pose baignoire acrylique 170 cm", "u", 620],
      ["Pose receveur + paroi douche", "u", 890],
      ["Réseau PER gainé (distribution)", "ml", 28],
      ["Évacuation PVC Ø 100", "ml", 22],
      ["Chauffe-eau électrique 200 L", "u", 680],
      ["Adoucisseur d'eau posé", "u", 950],
    ],
  },
  {
    code: "06",
    name: "Chauffage & ventilation",
    items: [
      ["Radiateur fonte 6 éléments posé", "u", 420],
      ["Radiateur acier design", "u", 380],
      ["Sèche-serviette électrique", "u", 340],
      ["Plancher chauffant hydraulique", "m²", 68],
      ["Chaudière gaz condensation murale", "u", 4200],
      ["Pompe à chaleur air/eau 8 kW", "u", 9800],
      ["Split climatisation mono-split", "u", 1850],
      ["VMC simple flux hygroréglable", "u", 680],
      ["VMC double flux", "u", 4200],
      ["Thermostat connecté posé", "u", 145],
      ["Désembouage installation", "forfait", 380],
    ],
  },
  {
    code: "07",
    name: "Électricité & courants faibles",
    items: [
      ["Point lumineux encastré", "u", 95],
      ["Point lumineux en saillie", "u", 78],
      ["Prise 16 A 2P+T", "u", 68],
      ["Prise 32 A cuisinière", "u", 95],
      ["Interrupteur simple allumage", "u", 58],
      ["Va-et-vient", "u", 82],
      ["Tableau divisionnaire 2 rangées", "u", 420],
      ["Tableau divisionnaire 3 rangées", "u", 580],
      ["Mise à la terre complète", "forfait", 380],
      ["Câblage RJ45", "u", 85],
      ["Interphone vidéo", "u", 680],
      ["Alarme intrusion 4 détecteurs", "forfait", 1250],
    ],
  },
  {
    code: "08",
    name: "Cloisons & plafonds",
    items: [
      ["Cloison BA13 sur ossature 48 mm", "m²", 42],
      ["Cloison BA13 double parement", "m²", 58],
      ["Doublage collé BA13", "m²", 32],
      ["Doublage sur ossature isolant 45 mm", "m²", 48],
      ["Faux plafond BA13 sur suspentes", "m²", 38],
      ["Faux plafond dalles minérales 60×60", "m²", 35],
      ["Trappe de visite 60×60", "u", 95],
      ["Jointement + enduit prêt à l'emploi", "m²", 14],
      ["Cloison phonique haute performance", "m²", 72],
      ["Habillage tuyaux BA13", "ml", 28],
    ],
  },
  {
    code: "09",
    name: "Revêtements de sols",
    items: [
      ["Carrelage grès cérame 60×60 pose collée", "m²", 58],
      ["Parquet contrecollé pose flottante", "m²", 48],
      ["Parquet massif pose collée", "m²", 78],
      ["Sol PVC lames clipsables", "m²", 38],
      ["Sol résine époxy garage", "m²", 65],
      ["Moquette aiguilletée", "m²", 28],
      ["Ragréage autolissant", "m²", 18],
      ["Plinthe MDF peinte", "ml", 12],
      ["Plinthe carrelage", "ml", 18],
      ["Seuil de porte alu", "u", 35],
    ],
  },
  {
    code: "10",
    name: "Peinture & finitions murales",
    items: [
      ["Peinture acrylique mat 2 couches sur mur", "m²", 18],
      ["Peinture satinée pièce humide", "m²", 22],
      ["Peinture façade siloxane", "m²", 32],
      ["Enduit de lissage avant peinture", "m²", 12],
      ["Papier peint intissé posé", "m²", 28],
      ["Toile de verre + peinture", "m²", 24],
      ["Lasure bois extérieur 2 couches", "m²", 22],
      ["Vernis parquet 2 couches", "m²", 18],
      ["Préparation murs anciens (lessivage + rebouchage)", "m²", 14],
      ["Peinture plafond blanc mat", "m²", 16],
    ],
  },
  {
    code: "11",
    name: "Carrelage & faïence",
    items: [
      ["Faïence murale 20×60 pose collée", "m²", 52],
      ["Mosaïque salle de bain", "m²", 85],
      ["Carrelage antidérapant extérieur", "m²", 62],
      ["Grand format 120×120", "m²", 78],
      ["Bande de rivage alu", "ml", 15],
      ["Joint époxy", "m²", 12],
      ["Seuil carrelage nez de marche", "u", 45],
      ["Receveur extra-plat + étanchéité", "u", 420],
      ["Kit étanchéité sous carrelage SDB", "m²", 28],
      ["Découpe et pose niche", "u", 95],
    ],
  },
  {
    code: "12",
    name: "Menuiseries intérieures",
    items: [
      ["Bloc-porte isoplane 83 cm", "u", 280],
      ["Bloc-porte postformé 83 cm", "u", 320],
      ["Porte coulissante sur rail", "u", 480],
      ["Placard coulissant 2 portes", "ml", 420],
      ["Dressing sur mesure", "ml", 580],
      ["Escalier bois droit", "u", 3200],
      ["Garde-corps bois + inox", "ml", 280],
      ["Habillage trémie", "u", 180],
      ["Plinthe bois massif", "ml", 18],
      ["Plan de travail stratifié posé", "ml", 145],
    ],
  },
];

export function generateBatiprixCatalog() {
  const out = [];
  for (const lot of BATIPRIX_LOTS) {
    lot.items.forEach((row, index) => {
      const [designation, unit, price, type] = row;
      out.push(ouvrage(lot.code, lot.name, index + 1, designation, unit, price, type));
    });
  }
  return out;
}

export function getBatiprixLots() {
  return BATIPRIX_LOTS.map((lot) => ({
    code: lot.code,
    name: lot.name,
    count: lot.items.length,
  }));
}
