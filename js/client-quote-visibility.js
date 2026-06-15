/**
 * Règles de visibilité des lignes sur le devis client.
 * L'employeur / le chiffreur voit tout ; le client ne voit que l'essentiel.
 */

/** Catégories masquées sur le devis client (détail technique / consommables). */
export const CLIENT_HIDDEN_CATEGORIES = {
  electricien: [
    "Boîtes & encastrement",
    "Visserie & fixation",
    "Câblage",
    "Canalisation",
  ],
  peintre: ["Outils", "Ponçage", "Protection", "Colles & mastics", "Préparation"],
  plombier: ["Canalisations", "Raccords", "Fixation", "Accessoires", "Évacuation", "Isolation"],
  chauffagiste: [
    "Liaisons frigorifiques",
    "Fluides",
    "Vannes & régulation",
    "Cuivre",
    "Pompe & circuit",
    "Entretien",
    "Plancher chauffant",
    "Réseau ventilation",
  ],
  carreleur: [
    "Colles & mortiers",
    "Joints & finitions",
    "Préparation support",
    "Outils & consommables",
  ],
  menuisier: ["Quincaillerie", "Fixations & consommables"],
  plaquiste: [
    "Ossature métallique",
    "Fixations",
    "Bandes & enduits",
    "Plaques & cloisons",
  ],
  isolateur: ["Films & membranes", "Fixations & accessoires"],
};

/** Désignations techniques à masquer même si la catégorie est autrement visible. */
export const CLIENT_HIDDEN_KEYWORDS = {
  electricien: [
    "gaine ",
    "goulotte",
    "boîte ",
    "boite ",
    "câble ",
    "cable ",
    "visserie",
    "cheville",
    "collier serre",
  ],
  peintre: ["pinceau", "rouleau", "manchon", "scotch", "bâche", "abrasif", "papier ", "grille ", "enduit lissage", "enduit garnissant", "fixateur", "sous-couche"],
  plombier: ["tube ", "raccord ", "collier ", "siphon", "joint fibre", "pâte à joint", "manchon isolant", "ruban téflon", "pipe "],
  chauffagiste: [
    "liaison frigorifique",
    "gaine ",
    "bouche extraction",
    "vase expansion",
    "purgeur",
    "tube cuivre",
    "azote ",
    "r32",
    "r410",
    "collecteur ",
    "nourrice",
  ],
  carreleur: ["colle ", "mortier ", "joint ", "croisillon", "peigne ", "primaire", "ragréage", "décapant"],
  menuisier: ["vis ", "cheville", "colle montage", "paumelle", "crémone", "coulisse ", "serrure 3 points"],
  plaquiste: ["rail ", "montant ", "suspente", "vis ttpc", "cheville molly", "bande ", "cornière", "enduit joint"],
  isolateur: ["pare-vapeur", "membrane", "agrafe ", "cheville à frapper", "plot support", "mousse pistolable"],
};

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * @param {{ type?: string, category?: string, designation?: string, clientVisible?: boolean }} line
 */
export function isClientVisibleLine(line, tradeType = "general") {
  if (!line || line.type === "mo") return true;
  if (["vehicule", "machine", "equipement", "frais"].includes(line.type)) return true;
  if (line.clientVisible === true) return true;
  if (line.clientVisible === false) return false;

  const category = line.category?.trim() || "";
  if (category === "Saisie devis") return true;

  const hiddenCategories = CLIENT_HIDDEN_CATEGORIES[tradeType] || [];
  if (hiddenCategories.includes(category)) return false;

  const designation = normalizeText(line.designation);
  const keywords = CLIENT_HIDDEN_KEYWORDS[tradeType] || [];
  if (keywords.some((keyword) => designation.includes(normalizeText(keyword)))) {
    return false;
  }

  return true;
}

export function filterLinesForClient(lines = [], tradeType = "general") {
  return lines.filter((line) => isClientVisibleLine(line, tradeType));
}
