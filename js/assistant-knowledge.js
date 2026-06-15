/** Base de connaissances locale pour l'aide IA (sans API externe). */

export const QUICK_PROMPTS = [
  "Comment configurer mon profil ?",
  "Importer ma bibliothèque Excel",
  "Photos automatiques bibliothèque",
  "Créer un devis rentable",
  "Contacter le service client",
];

export const KNOWLEDGE_ARTICLES = [
  {
    id: "profil",
    title: "Configurer mon profil entreprise",
    keywords: ["profil", "configurer", "configuration", "parametres", "entreprise", "urssaf", "charges", "remuneration", "abonnement"],
    answer:
      "Allez dans **Mon profil** (menu ou tableau de bord). Renseignez votre activité, rémunération souhaitée, charges fixes et type URSSAF. Ces données alimentent le calculateur de rentabilité sur chaque devis (offre Pro). Mettez à jour votre offre (Devis, Pro, Business) dans la même page.",
    links: [{ label: "Ouvrir Mon profil", href: "profil.html" }],
  },
  {
    id: "devis",
    title: "Créer et analyser un devis",
    keywords: ["devis", "facture", "pdf", "rentabilite", "marge", "prix", "ligne", "client", "envoyer"],
    answer:
      "Ouvrez **Devis & factures**, ajoutez vos lignes (manuellement ou depuis la bibliothèque). Le panneau de rentabilité calcule votre marge nette en temps réel. Exportez en PDF professionnel. Vérifiez la visibilité client (détail / forfait) avant envoi.",
    links: [{ label: "Créer un devis", href: "devis.html" }],
  },
  {
    id: "bibliotheque",
    title: "Bibliothèque BTP et import Excel",
    keywords: ["bibliotheque", "prestation", "import", "excel", "csv", "catalogue", "reference", "metier", "electricien", "plombier"],
    answer:
      "La **Bibliothèque BTP** contient 200+ références par métier et un onglet **Ouvrages Batiprix** (120+ ouvrages type Batiprix : gros œuvre, second œuvre, lots 01 à 12). Importez un CSV Batiprix (`batiprixCode;ref;designation;unit;unitPriceHT;batiprixLot`) ou utilisez le modèle CSV depuis l'onglet Batiprix. Ajoutez les lignes au devis en un clic.",
    links: [{ label: "Bibliothèque", href: "bibliotheque.html" }],
  },
  {
    id: "photos",
    title: "Photos produits (auto et Leroy Merlin)",
    keywords: ["photo", "image", "wikimedia", "leroy", "merlin", "pictogramme", "vignette", "import auto"],
    answer:
      "Sans photo personnalisée, un pictogramme métier s'affiche. **Photos auto (métier)** ou **Photos auto (tout)** récupèrent des images génériques Wikimedia par type de produit. Pour une photo précise, cliquez **LM** sur une ligne, copiez l'URL image depuis Leroy Merlin et collez-la. Les photos déjà importées ne sont pas écrasées.",
    links: [{ label: "Gérer les photos", href: "bibliotheque.html" }],
  },
  {
    id: "offline",
    title: "Mode hors ligne (PWA)",
    keywords: ["hors ligne", "offline", "chantier", "connexion", "internet", "pwa", "mobile", "telephone"],
    answer:
      "Exxon-bat fonctionne en **PWA** : installez l'application depuis votre navigateur (Ajouter à l'écran d'accueil). Vos pages et données récentes restent accessibles sans réseau sur chantier. Reconnectez-vous pour synchroniser les dernières modifications.",
    links: [{ label: "Tableau de bord", href: "dashboard.html" }],
  },
  {
    id: "plans",
    title: "Choisir ou changer d'offre",
    keywords: ["tarif", "offre", "devis", "pro", "business", "abonnement", "prix", "resilier", "changer", "essai", "gratuit", "trial", "19,90", "19.90", "79,90"],
    answer:
      "**Essai gratuit 30 jours** : entrez votre e-mail pour tester l'offre Pro sans carte bancaire. Ensuite : **Devis & factures (19,90 €/mois)**, **Pro (79,90 €/mois)** ou **Business (99,90 €/mois)**. Sans engagement.",
    links: [
      { label: "Comparer les offres", href: "tarifs.html" },
      { label: "Mon abonnement", href: "profil.html" },
    ],
  },
  {
    id: "connexion",
    title: "Problème de connexion",
    keywords: ["connexion", "connecter", "mot de passe", "email", "compte", "login", "acces", "session"],
    answer:
      "Vérifiez l'e-mail et le mot de passe sur **Se connecter**. Créez un compte via **Inscription** si besoin. En démo, utilisez la page **Accès démonstration**. Si le problème persiste, contactez le service client avec votre e-mail de compte.",
    links: [
      { label: "Se connecter", href: "connexion.html" },
      { label: "Service client", href: "support.html" },
    ],
  },
  {
    id: "paiements",
    title: "Suivi des paiements et impayés",
    keywords: ["paiement", "impaye", "impayé", "acompte", "echeance", "échéance", "relance", "encaissement", "facture"],
    answer:
      "L'offre **Devis (19,90 €)** couvre devis et factures PDF avec modalités standard. L'offre **Pro (79,90 €)** ajoute rentabilité, suivi des paiements, acomptes, relances manuelles et automatiques, multi-échéances. **Business** inclut tout Pro + chantiers et équipe.",
    links: [
      { label: "Ouvrir Devis & factures", href: "devis.html" },
      { label: "Comparer les offres", href: "tarifs.html" },
    ],
  },
  {
    id: "rentabilite",
    title: "Calculateur de rentabilité",
    keywords: ["rentabilite", "marge", "urssaf", "impot", "cotisation", "gain", "perte", "minimum"],
    answer:
      "Configurez d'abord votre profil (charges, rémunération). Sur chaque devis, Exxon-bat déduit URSSAF, impôts, salaires et frais pour afficher la **marge nette** et le **prix minimum** à facturer. Les calculs sont indicatifs — validez avec votre comptable.",
    links: [{ label: "Analyser un devis", href: "devis.html" }],
  },
  {
    id: "facturation-2026",
    title: "Facturation électronique 2026",
    keywords: ["facturation", "electronique", "2026", "2027", "tva", "conforme", "legal"],
    answer:
      "Les artisans sont concernés par la facturation électronique : réception dès sept. 2026, émission dès sept. 2027. Exxon-bat vous aide à préparer devis et factures professionnels en amont. Votre comptable reste référent pour la conformité fiscale.",
    links: [{ label: "En savoir plus", href: "index.html#faq" }],
  },
  {
    id: "support",
    title: "Contacter le service client",
    keywords: ["support", "aide", "contact", "conseiller", "humain", "ticket", "probleme", "bug", "question"],
    answer:
      "Notre **service client** est notre priorité. Ouvrez la page Support pour créer un ticket (envoi direct à support@exxon-bat.com), joindre un rapport diagnostic anonyme, ou nous joindre par téléphone (Lun–Ven 8h–18h). Réponse sous 24 h ouvrées.",
    links: [{ label: "Service client", href: "support.html" }],
    escalate: true,
  },
  {
    id: "privacy",
    title: "Confidentialité et sécurité des données",
    keywords: [
      "confidentialite",
      "confidentialité",
      "donnees",
      "données",
      "rgpd",
      "securite",
      "sécurité",
      "client",
      "acces",
      "accès",
      "prive",
      "privé",
      "local",
    ],
    answer:
      "Vos **clients, devis et marges** restent sur **votre appareil**. Exxon-bat n'y accède pas à distance. En cas de bug, vous pouvez envoyer un rapport technique **anonyme** (sans noms ni montants) depuis la page Support.",
    links: [
      { label: "Politique de confidentialité", href: "confidentialite.html" },
      { label: "Rapport diagnostic", href: "support.html#diagnostic" },
    ],
  },
  {
    id: "devis-difficulty",
    title: "Pose apparente vs encastrée (coefficient)",
    keywords: [
      "apparent",
      "encastre",
      "encastré",
      "difficulte",
      "difficulté",
      "coefficient",
      "ci",
      "gainage",
      "pose",
      "regie",
      "régie",
    ],
    answer:
      "Sur chaque **ligne de devis**, choisissez le mode de pose (apparent, encastré réservations, encastré gainage…). Le **coefficient** majore automatiquement la main d'œuvre — le détail apparaît sur le **PDF client** pour justifier le prix.",
    links: [
      { label: "Configurer les coefficients", href: "profil.html#difficulty-coefficients" },
      { label: "Composer un devis", href: "devis.html" },
    ],
  },
];

export function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s]/g, " ");
}

export function tokenize(text) {
  return normalizeText(text)
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

const CONTACT_PHRASES = ["service client", "contacter", "conseiller", "ticket", "aide humaine", "parler a"];

export function findBestArticles(query, limit = 3) {
  const normalizedQuery = normalizeText(query);
  const qTokens = tokenize(query);
  const wantsHuman = CONTACT_PHRASES.some((p) => normalizedQuery.includes(normalizeText(p)));

  const scored = KNOWLEDGE_ARTICLES.map((article) => {
    let score = 0;
    const titleNorm = normalizeText(article.title);

    if (normalizedQuery.includes(titleNorm) || titleNorm.includes(normalizedQuery)) score += 8;

    for (const kw of article.keywords) {
      const nkw = normalizeText(kw);
      if (normalizedQuery.includes(nkw)) score += 4;
      for (const token of qTokens) {
        if (nkw.includes(token) || token.includes(nkw)) score += 1;
      }
    }

    if (wantsHuman && article.id === "support") score += 12;

    return { article, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];
  return scored.slice(0, limit).map((item) => item.article);
}
