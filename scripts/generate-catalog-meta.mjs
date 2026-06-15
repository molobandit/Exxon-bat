/**
 * Génère js/locales/catalog-meta.js — métiers, catégories, unités, MO.
 * Exécuter : node scripts/generate-catalog-meta.mjs
 */
import { writeFileSync } from "fs";
import { generateAllCatalogs } from "../js/prestations-catalog.js";

const LOCALES = ["fr", "en", "pt", "it", "es"];

const TRADE_LABELS = {
  electricien: {
    fr: "Électricité",
    en: "Electrical",
    pt: "Eletricidade",
    it: "Elettricità",
    es: "Electricidad",
  },
  plombier: {
    fr: "Plomberie / Sanitaire",
    en: "Plumbing / Sanitary",
    pt: "Canalização / Sanitário",
    it: "Idraulica / Sanitari",
    es: "Fontanería / Sanitario",
  },
  chauffagiste: {
    fr: "Chauffage / Climatisation",
    en: "Heating / HVAC",
    pt: "Aquecimento / Climatização",
    it: "Riscaldamento / Climatizzazione",
    es: "Calefacción / Climatización",
  },
  peintre: {
    fr: "Peinture / Finitions",
    en: "Painting / Finishes",
    pt: "Pintura / Acabamentos",
    it: "Pittura / Finiture",
    es: "Pintura / Acabados",
  },
  carreleur: {
    fr: "Carrelage / Sols",
    en: "Tiling / Flooring",
    pt: "Azulejaria / Pavimentos",
    it: "Piastrellatura / Pavimenti",
    es: "Alicatados / Suelos",
  },
  menuisier: {
    fr: "Menuiserie / Charpente",
    en: "Joinery / Carpentry",
    pt: "Carpintaria / Serralharia",
    it: "Falegnameria / Carpenteria",
    es: "Carpintería / Ebanistería",
  },
  plaquiste: {
    fr: "Plâtrerie / Cloisons sèches",
    en: "Drywall / Partitioning",
    pt: "Pladur / Divisórias",
    it: "Cartongesso / Pareti",
    es: "Pladur / Tabiques",
  },
  isolateur: {
    fr: "Isolation thermique & phonique",
    en: "Thermal & acoustic insulation",
    pt: "Isolamento térmico e acústico",
    it: "Isolamento termico e acustico",
    es: "Aislamiento térmico y acústico",
  },
  macon: {
    fr: "Maçonnerie / Gros œuvre",
    en: "Masonry / Structural",
    pt: "Alvenaria / Estrutura",
    it: "Muratura / Struttura",
    es: "Albañilería / Estructura",
  },
  general: {
    fr: "Artisanat général",
    en: "General trades",
    pt: "Ofício geral",
    it: "Artigianato generale",
    es: "Oficio general",
  },
};

const CATEGORY_LABELS = {
  "Accessoires": ["Accessoires", "Accessories", "Acessórios", "Accessori", "Accesorios"],
  "Agencements": ["Agencements", "Fitted furniture", "Mobiliário", "Arredamenti", "Mobiliario"],
  "Appareillage": ["Appareillage", "Wiring devices", "Aparelhagem", "Apparecchiature", "Mecanismos"],
  "Bandes & enduits": ["Bandes & enduits", "Tapes & compounds", "Fitas e massas", "Nastri e stucchi", "Cintas y masillas"],
  "Blocs-portes": ["Blocs-portes", "Door sets", "Portas completas", "Blocchi porta", "Puertas completas"],
  "Boîtes & encastrement": ["Boîtes & encastrement", "Boxes & flush mounts", "Caixas e embutir", "Scatole e incasso", "Cajas y empotrar"],
  Canalisation: ["Canalisation", "Cable management", "Canalização", "Canalizzazione", "Canalización"],
  Canalisations: ["Canalisations", "Piping", "Tubagens", "Tubazioni", "Tuberías"],
  "Carrelage sol": ["Carrelage sol", "Floor tiles", "Azulejo de chão", "Piastrelle pavimento", "Baldosas suelo"],
  Chauffage: ["Chauffage", "Heating", "Aquecimento", "Riscaldamento", "Calefacción"],
  "Chauffe-eau": ["Chauffe-eau", "Water heaters", "Esquentadores", "Scaldabagni", "Calentadores"],
  Climatisation: ["Climatisation", "Air conditioning", "Climatização", "Climatizzazione", "Climatización"],
  "Cloisons sèches": ["Cloisons sèches", "Dry partitions", "Divisórias secas", "Pareti a secco", "Tabiques secos"],
  "Colles & mastics": ["Colles & mastics", "Adhesives & sealants", "Colas e mastiques", "Colle e mastici", "Adhesivos y selladores"],
  "Colles & mortiers": ["Colles & mortiers", "Adhesives & mortars", "Colas e argamassas", "Colle e malte", "Adhesivos y morteros"],
  Cuivre: ["Cuivre", "Copper", "Cobre", "Rame", "Cobre"],
  Câblage: ["Câblage", "Cabling", "Cablagem", "Cablaggio", "Cableado"],
  Doublage: ["Doublage", "Lining / insulation boards", "Revestimento", "Controsoffitto isolante", "Revestimiento"],
  Entretien: ["Entretien", "Maintenance", "Manutenção", "Manutenzione", "Mantenimiento"],
  "Faux plafonds": ["Faux plafonds", "Suspended ceilings", "Falsos tetos", "Controsoffitti", "Falsos techos"],
  "Faïence murale": ["Faïence murale", "Wall tiles", "Azulejo de parede", "Piastrelle parete", "Azulejo mural"],
  "Fenêtres & menuiseries ext.": [
    "Fenêtres & menuiseries ext.",
    "Windows & external joinery",
    "Janelas e carpintaria ext.",
    "Finestre e serramenti est.",
    "Ventanas y carpintería ext.",
  ],
  "Films & membranes": ["Films & membranes", "Films & membranes", "Películas e membranas", "Film e membrane", "Películas y membranas"],
  Fixation: ["Fixation", "Fixings", "Fixação", "Fissaggio", "Fijación"],
  Fixations: ["Fixations", "Fasteners", "Fixações", "Fissaggi", "Fijaciones"],
  "Fixations & accessoires": ["Fixations & accessoires", "Fixings & accessories", "Fixações e acessórios", "Fissaggi e accessori", "Fijaciones y accesorios"],
  "Fixations & consommables": ["Fixations & consommables", "Fixings & consumables", "Fixações e consumíveis", "Fissaggi e consumabili", "Fijaciones y consumibles"],
  Fluides: ["Fluides", "Refrigerants", "Fluidos", "Fluidi", "Fluidos"],
  Isolation: ["Isolation", "Insulation", "Isolamento", "Isolamento", "Aislamiento"],
  "Isolation combles": ["Isolation combles", "Loft insulation", "Isolamento sótão", "Isolamento sottotetto", "Aislamiento buhardilla"],
  "Isolation murs & combles": ["Isolation murs & combles", "Wall & loft insulation", "Isolamento paredes e sótão", "Isolamento pareti e sottotetto", "Aislamiento muros y buhardilla"],
  "Isolation phonique": ["Isolation phonique", "Acoustic insulation", "Isolamento acústico", "Isolamento acustico", "Aislamiento acústico"],
  "Joints & finitions": ["Joints & finitions", "Grout & finishes", "Juntas e acabamentos", "Stucchi e finiture", "Juntas y acabados"],
  "Liaisons frigorifiques": ["Liaisons frigorifiques", "Refrigerant lines", "Ligações frigoríficas", "Linee frigorifere", "Líneas frigoríficas"],
  "Main d'œuvre": ["Main d'œuvre", "Labour", "Mão de obra", "Manodopera", "Mano de obra"],
  Mosaïque: ["Mosaïque", "Mosaic", "Mosaico", "Mosaico", "Mosaico"],
  "Ossature métallique": ["Ossature métallique", "Metal framing", "Estrutura metálica", "Struttura metallica", "Estructura metálica"],
  Outils: ["Outils", "Tools", "Ferramentas", "Utensili", "Herramientas"],
  "Outils & consommables": ["Outils & consommables", "Tools & consumables", "Ferramentas e consumíveis", "Utensili e consumabili", "Herramientas y consumibles"],
  "Panneaux isolants": ["Panneaux isolants", "Insulation boards", "Painéis isolantes", "Pannelli isolanti", "Paneles aislantes"],
  "Parquet & plancher bois": ["Parquet & plancher bois", "Wood flooring", "Parquet e soalho", "Parquet e pavimento legno", "Parquet y suelo madera"],
  Peinture: ["Peinture", "Paint", "Tinta", "Vernice", "Pintura"],
  "Plancher chauffant": ["Plancher chauffant", "Underfloor heating", "Piso radiante", "Pavimento radiante", "Suelo radiante"],
  "Plaques & cloisons": ["Plaques & cloisons", "Boards & partitions", "Placas e divisórias", "Pannelli e pareti", "Placas y tabiques"],
  "Plinthes & profilés": ["Plinthes & profilés", "Skirting & profiles", "Rodapés e perfis", "Battiscopa e profili", "Rodapiés y perfiles"],
  "Pompe & circuit": ["Pompe & circuit", "Pump & circuit", "Bomba e circuito", "Pompa e circuito", "Bomba y circuito"],
  "Pompe à chaleur": ["Pompe à chaleur", "Heat pump", "Bomba de calor", "Pompa di calore", "Bomba de calor"],
  Ponçage: ["Ponçage", "Sanding", "Lixiviação", "Levigatura", "Lijado"],
  "Portes intérieures": ["Portes intérieures", "Interior doors", "Portas interiores", "Porte interne", "Puertas interiores"],
  Protection: ["Protection", "Protection", "Proteção", "Protezione", "Protección"],
  Préparation: ["Préparation", "Surface prep", "Preparação", "Preparazione", "Preparación"],
  "Préparation support": ["Préparation support", "Substrate preparation", "Preparação suporte", "Preparazione supporto", "Preparación soporte"],
  Quincaillerie: ["Quincaillerie", "Hardware", "Ferragens", "Ferramenta", "Ferretería"],
  Raccords: ["Raccords", "Fittings", "Ligações", "Raccordi", "Racores"],
  "Revêtements muraux": ["Revêtements muraux", "Wall coverings", "Revestimentos de parede", "Rivestimenti murali", "Revestimientos murales"],
  Robinetterie: ["Robinetterie", "Taps & valves", "Torneiras e válvulas", "Rubinetteria", "Grifería"],
  Régulation: ["Régulation", "Controls", "Regulação", "Regolazione", "Regulación"],
  "Réseau ventilation": ["Réseau ventilation", "Ventilation ducting", "Rede ventilação", "Rete ventilazione", "Red ventilación"],
  Sanitaire: ["Sanitaire", "Sanitary ware", "Sanitários", "Sanitari", "Sanitarios"],
  "Sols souples": ["Sols souples", "Resilient flooring", "Pavimentos flexíveis", "Pavimenti resilienti", "Suelos flexibles"],
  "Tableau électrique": ["Tableau électrique", "Electrical panel", "Quadro elétrico", "Quadro elettrico", "Cuadro eléctrico"],
  "Tableaux pré-câblés": ["Tableaux pré-câblés", "Pre-wired panels", "Quadros pré-cabeados", "Quadri pre-cablati", "Cuadros precableados"],
  "Gaines préfilées": ["Gaines préfilées", "Pre-wired conduits", "Gamas pré-enchidas", "Canali preincernati", "Canalizaciones precableadas"],
  Filerie: ["Filerie", "Wiring & cables", "Filaria", "Fileria", "Cablería"],
  "DDR & différentiels": ["DDR & différentiels", "RCD & differential protection", "DDR e diferenciais", "DDR e differenziali", "DDR y diferenciales"],
  "Recharge véhicule électrique": [
    "Recharge véhicule électrique",
    "EV charging",
    "Carregamento veículo elétrico",
    "Ricarica veicolo elettrico",
    "Recarga vehículo eléctrico",
  ],
  "Trappes & accessoires": ["Trappes & accessoires", "Hatches & accessories", "Alçapões e acessórios", "Botole e accessori", "Trampillas y accesorios"],
  "Vannes & régulation": ["Vannes & régulation", "Valves & controls", "Válvulas e regulação", "Valvole e regolazione", "Válvulas y regulación"],
  Ventilation: ["Ventilation", "Ventilation", "Ventilação", "Ventilazione", "Ventilación"],
  Éclairage: ["Éclairage", "Lighting", "Iluminação", "Illuminazione", "Iluminación"],
  Évacuation: ["Évacuation", "Drainage", "Evacuação", "Scarico", "Evacuación"],
};

const MO_REF_LABELS = {
  "MO-ELEC-01": ["Heure électricien qualifié", "Qualified electrician hour", "Hora eletricista qualificado", "Ora elettricista qualificato", "Hora electricista cualificado"],
  "MO-ELEC-02": ["Heure apprenti / aide", "Apprentice / helper hour", "Hora aprendiz / ajudante", "Ora apprendista / aiuto", "Hora aprendiz / ayudante"],
  "MO-ELEC-03": ["Déplacement intervention", "Call-out fee", "Deslocação intervenção", "Trasferta intervento", "Desplazamiento intervención"],
  "MO-ELEC-VE-01": ["Installation prise ou borne de recharge VE — forfait", "EV charger installation — flat rate", "Instalação tomada ou posto VE — forfait", "Installazione presa o colonnina VE — forfait", "Instalación toma o punto recarga VE — forfait"],
  "MO-ELEC-VE-02": ["Mise en service et essai charge véhicule électrique", "EV charging commissioning & test", "Entrada em serviço e teste carga VE", "Messa in servizio e prova ricarica VE", "Puesta en marcha y prueba carga VE"],
  "MO-ELEC-VE-03": ["Tirage câble dédié charge VE — au mètre linéaire", "Dedicated EV cable run — per linear metre", "Passagem cabo dedicado VE — por metro linear", "Passaggio cavo dedicato VE — al metro lineare", "Tendido cable dedicado VE — por metro lineal"],
  "MO-PLOMB-01": ["Heure plombier", "Plumber hour", "Hora canalizador", "Ora idraulico", "Hora fontanero"],
  "MO-PLOMB-02": ["Débouchage / intervention", "Unblocking / call-out", "Desentupimento / intervenção", "Disostruzione / intervento", "Desatasco / intervención"],
  "MO-CLIM-01": ["Heure frigoriste / chauffagiste", "HVAC technician hour", "Hora frigorista / AVAC", "Ora frigorista / termotecnico", "Hora frigorista / climatización"],
  "MO-CLIM-02": ["Mise en service & contrôle étanchéité", "Commissioning & leak test", "Entrada em serviço e teste estanqueidade", "Messa in servizio e test tenuta", "Puesta en marcha y prueba estanqueidad"],
  "MO-PEINT-01": ["Heure peintre professionnel", "Professional painter hour", "Hora pintor profissional", "Ora pittore professionista", "Hora pintor profesional"],
  "MO-PEINT-02": ["Préparation supports (m²)", "Surface preparation (m²)", "Preparação suportes (m²)", "Preparazione supporti (m²)", "Preparación soportes (m²)"],
  "MO-CARR-01": ["Heure carreleur qualifié", "Qualified tiler hour", "Hora azulejista qualificado", "Ora piastrellista qualificato", "Hora alicatador cualificado"],
  "MO-CARR-02": ["Pose carrelage (m²)", "Tile installation (m²)", "Assentamento azulejo (m²)", "Posa piastrelle (m²)", "Colocación azulejo (m²)"],
  "MO-CARR-03": ["Préparation sol / ragréage (m²)", "Floor prep / levelling (m²)", "Preparação chão / autonivelante (m²)", "Preparazione pavimento / autolivellante (m²)", "Preparación suelo / autonivelante (m²)"],
  "MO-MENU-01": ["Heure menuisier poseur", "Joiner fitter hour", "Hora carpinteiro montador", "Ora falegname posatore", "Hora carpintero montador"],
  "MO-MENU-02": ["Pose porte complète", "Full door installation", "Montagem porta completa", "Posa porta completa", "Instalación puerta completa"],
  "MO-MENU-03": ["Pose fenêtre", "Window installation", "Montagem janela", "Posa finestra", "Instalación ventana"],
  "MO-PLAQ-01": ["Heure plaquiste", "Drywall installer hour", "Hora placador", "Ora cartongessista", "Hora pladurista"],
  "MO-PLAQ-02": ["Cloison sèche (m²)", "Drywall partition (m²)", "Divisória seca (m²)", "Parete a secco (m²)", "Tabique seco (m²)"],
  "MO-PLAQ-03": ["Faux plafond (m²)", "Suspended ceiling (m²)", "Falso teto (m²)", "Controsoffitto (m²)", "Falso techo (m²)"],
  "MO-ISOL-01": ["Heure isolateur", "Insulation installer hour", "Hora isolador", "Ora isolatore", "Hora aislador"],
  "MO-ISOL-02": ["Isolation combles perdus (m²)", "Loft insulation blow-in (m²)", "Isolamento sótão perdido (m²)", "Isolamento sottotetto (m²)", "Aislamiento buhardilla (m²)"],
  "MO-ISOL-03": ["Pose panneaux mur (m²)", "Wall panel insulation (m²)", "Montagem painéis parede (m²)", "Posa pannelli parete (m²)", "Colocación paneles muro (m²)"],
};

const UNIT_LABELS = {
  u: ["unité", "unit", "unidade", "unità", "unidad"],
  m: ["mètre", "metre", "metro", "metro", "metro"],
  "m²": ["mètre carré", "square metre", "metro quadrado", "metro quadrato", "metro cuadrado"],
  h: ["heure", "hour", "hora", "ora", "hora"],
  forfait: ["forfait", "lump sum", "forfait", "forfait", "forfait"],
  L: ["litre", "litre", "litro", "litro", "litro"],
  ml: ["mètre linéaire", "linear metre", "metro linear", "metro lineare", "metro lineal"],
};

const TYPE_LABELS = {
  fourniture: ["Fourniture", "Material", "Material", "Materiale", "Material"],
  mo: ["Main d'œuvre", "Labour", "Mão de obra", "Manodopera", "Mano de obra"],
};

const SOURCE_LABELS = {
  catalog: ["Catalogue", "Catalog", "Catálogo", "Catalogo", "Catálogo"],
  manual: ["Manuel", "Manual", "Manual", "Manuale", "Manual"],
  import: ["Import", "Import", "Importação", "Importazione", "Importación"],
};

// Compléter catégories manquantes depuis le catalogue
const cats = new Set();
for (const items of Object.values(generateAllCatalogs())) {
  for (const it of items) cats.add(it.category);
}
for (const cat of cats) {
  if (!CATEGORY_LABELS[cat]) {
    CATEGORY_LABELS[cat] = [cat, cat, cat, cat, cat];
  }
}

function toLocaleObject(rows) {
  const out = {};
  for (const [key, val] of Object.entries(rows)) {
    if (Array.isArray(val)) {
      out[key] = {};
      LOCALES.forEach((loc, i) => {
        out[key][loc] = val[i] ?? val[0];
      });
    } else {
      out[key] = val;
    }
  }
  return out;
}

const content = `/** Généré par scripts/generate-catalog-meta.mjs — ne pas éditer à la main */
export const CATALOG_LOCALES = ${JSON.stringify(LOCALES)};
export const TRADE_LABELS = ${JSON.stringify(toLocaleObject(TRADE_LABELS), null, 2)};
export const CATEGORY_LABELS = ${JSON.stringify(toLocaleObject(CATEGORY_LABELS), null, 2)};
export const MO_REF_LABELS = ${JSON.stringify(toLocaleObject(MO_REF_LABELS), null, 2)};
export const UNIT_LABELS = ${JSON.stringify(toLocaleObject(UNIT_LABELS), null, 2)};
export const TYPE_LABELS = ${JSON.stringify(toLocaleObject(TYPE_LABELS), null, 2)};
export const SOURCE_LABELS = ${JSON.stringify(toLocaleObject(SOURCE_LABELS), null, 2)};
`;

writeFileSync(new URL("../js/locales/catalog-meta.js", import.meta.url), content);
console.log("Wrote js/locales/catalog-meta.js");
