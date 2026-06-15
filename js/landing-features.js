/** Sections landing — pain points & modules (style Batappli + Costructor) */

export const PAIN_STORIES = [
  {
    id: "excel",
    tag: "Devis pro",
    title: "Adieu Excel. Des devis clairs, sans erreur.",
    teaser:
      "Fini les formules cassées et les mises en page qui débordent du A4. Chiffrez vite, imprimez propre, envoyez au client.",
    hook: "3 h gagnées par semaine en moyenne",
    revealLabel: "Voir comment chiffrer sans Excel",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=520&fit=crop&q=80",
    imageAlt: "Artisan BTP souriante au travail",
    bullets: ["Bibliothèque BTP & Batiprix", "PDF au nom de votre entreprise", "Historique & mode hors ligne"],
    detailTitle: "Le devis pro en 3 minutes, pas 3 heures",
    detail:
      "Choisissez le client, les ouvrages, les tarifs. Exxon-bat calcule les totaux, la TVA et la mise en page. Vous gagnez des heures chaque semaine et vous présentez un document digne d'une grande entreprise, même seul sur le chantier.",
    detailBullets: [
      "Modèles de devis réutilisables par type de chantier",
      "Images prestations & descriptifs détaillés sur le PDF",
      "Verdict rentabilité avant chaque envoi (offre Pro)",
    ],
    cta: { label: "Créer mon premier devis", href: "connexion.html?next=devis.html" },
  },
  {
    id: "impayes",
    tag: "Encaissements",
    title: "Ne laissez plus 1 € vous échapper",
    teaser:
      "Suivez acomptes et soldes, relancez les impayés, encaissez plus vite. Sans tableur ni post-it.",
    hook: "Encaissez jusqu'à 12 jours plus tôt",
    revealLabel: "Découvrir le lien de paiement client",
    image: "https://images.unsplash.com/photo-1749532125405-70950966b0e5?w=800&h=520&fit=crop&q=80",
    imageAlt: "Plombier souriant sur chantier de rénovation",
    bullets: ["Liens de paiement client", "Suivi encaissé / reste à payer", "Relances manuelles & auto (Pro)"],
    detailTitle: "Le client paie. Vous validez. Le pipeline se met à jour.",
    detail:
      "Dès qu'un devis est validé, envoyez un lien sécurisé : le client voit le montant, copie l'IBAN, paie l'acompte ou le solde. Vous validez l'encaissement en un clic et le pipeline commercial se met à jour automatiquement.",
    detailBullets: [
      "Référence virement structurée EXO-…",
      "Multi-échéances & acomptes",
      "Statut « Payé » visible sur le commercial",
    ],
    cta: { label: "Voir les paiements", href: "connexion.html?next=devis.html" },
  },
  {
    id: "temps",
    tag: "Gain de temps",
    title: "Ne passez plus vos soirées sur l'administratif",
    teaser:
      "Devis, relances, planning et compta au même endroit. Retrouvez du temps pour vos chantiers et votre vie perso.",
    hook: "1 seule app pour tout piloter",
    revealLabel: "Voir comment tout se synchronise",
    image: "https://images.unsplash.com/photo-1742112125635-6f8201c6ee3f?w=800&h=520&fit=crop&q=80",
    imageAlt: "Deux artisans se félicitent sur un chantier",
    bullets: ["Pipeline auto dès le devis imprimé", "Rappels RDV la veille", "PWA mobile sur le terrain"],
    detailTitle: "Chaque action déclenche la suivante. Zéro ressaisie.",
    detail:
      "Exxon-bat relie devis, encaissements, RDV commercial et planning chantier. Chaque action met à jour la suivante : vous ne ressaisissez rien, vous ne cherchez plus où en est un dossier.",
    detailBullets: [
      "Agenda unifié : RDV + interventions + indispos",
      "File « À faire » : relances & devis sans réponse",
      "Application installable sur téléphone & tablette",
    ],
    cta: { label: "Essayer gratuitement", href: "inscription.html" },
  },
  {
    id: "legal",
    tag: "Conformité",
    title: "Chiffrez en toute légalité, sans stress",
    teaser:
      "Mentions obligatoires, TVA, numérotation, préparation facture électronique 2026 : tout est à jour.",
    hook: "Prêt pour la facturation électronique 2026",
    revealLabel: "Voir ce qui est déjà conforme",
    image: "https://images.unsplash.com/photo-1518135714426-c18f5ffb6f4d?w=800&h=520&fit=crop&q=80",
    imageAlt: "Artisans se serrent la main après un chantier",
    bullets: ["PDF conformes artisan & TPE", "Export compta & FEC (Business)", "Données hébergées en sécurité"],
    detailTitle: "Vous chiffrez. Nous structurons. Votre comptable valide.",
    detail:
      "Vous vous concentrez sur vos prix et votre marge. Exxon-bat structure vos documents pour respecter les obligations du BTP. Votre expert-comptable reçoit des exports propres, sans ressaisie.",
    detailBullets: [
      "Attestations TVA & multi-taux",
      "Imputation comptable par chantier",
      "Politique RGPD & support dédié",
    ],
    cta: { label: "Voir la comptabilité", href: "inscription.html?next=comptabilite.html" },
  },
];

export const FEATURE_MODULES = [
  {
    id: "devis",
    tag: "Devis & factures",
    title: "Créez vos devis en quelques clics",
    teaser: "Bibliothèque métier, Batiprix, coefficients de pose. Transformez en facture sans ressaisir.",
    hook: "PDF pro au nom de votre entreprise",
    revealLabel: "Voir le parcours devis complet",
    image: "https://images.unsplash.com/photo-1671681739893-e8d027788284?w=800&h=540&fit=crop&q=80",
    imageAlt: "Artisan peintre souriant sur chantier",
    bullets: [
      "Devis & factures PDF personnalisés",
      "Batiprix & bibliothèque BTP intégrés",
      "Mode hors ligne sur chantier (PWA)",
    ],
    detailTitle: "Du chantier au PDF client, sans retour au bureau",
    detail:
      "Depuis votre PC, tablette ou mobile : éditez, personnalisez, imprimez. Chaque ligne peut intégrer difficulté de pose (apparent, encastré, gainage) avec coefficient main-d'œuvre visible sur le PDF client.",
    detailBullets: [
      "Historique complet des versions imprimées",
      "Acomptes, situations & avoirs",
      "Prêt pour la facturation électronique 2026",
    ],
    cta: { label: "Voir un devis en démo", href: "connexion.html?next=devis.html" },
    reverse: false,
  },
  {
    id: "renta",
    tag: "Rentabilité · Pro",
    title: "Pilotez votre marge avant d'envoyer le devis",
    teaser: "URSSAF, impôts, matériel, MO et charges fixes : voyez le bénéfice net dans votre poche.",
    hook: "+40 % de marge en moyenne après recalcul",
    revealLabel: "Voir le calculateur en action",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=540&fit=crop&q=80",
    imageAlt: "Artisan consultant ses chiffres sur tablette",
    bullets: [
      "Verdict vert / orange / rouge",
      "Prix minimum conseillé automatique",
      "Bénéfice net estimé avant signature",
    ],
    detailTitle: "Le chiffre affiché, c'est ce qui reste vraiment dans votre poche",
    detail:
      "Exxon-bat est pensé pour que le bénéfice reste dans votre entreprise. Configurez votre profil une fois (statut, URSSAF, charges) : chaque devis affiche ce qui reste vraiment après cotisations, impôts et fournitures.",
    detailBullets: [
      "Auto-entrepreneur, artisan, TPE avec salariés",
      "Alerte matériel sous-facturé",
      "Comparaison devis vs réel sur chantier (Business)",
    ],
    cta: { label: "Calculer ma rentabilité", href: "connexion.html?next=devis.html%23rentabilite" },
    reverse: true,
  },
  {
    id: "crm",
    tag: "Commercial · Pro",
    title: "Gérez vos prospects sans Excel",
    teaser: "Pipeline visuel synchronisé aux devis. De « Prospect » à « Payé » en un coup d'œil.",
    hook: "0 tableau oublié, 0 relance manquée",
    revealLabel: "Explorer le pipeline commercial",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=540&fit=crop&q=80",
    imageAlt: "Artisan et cliente souriants en discussion",
    bullets: [
      "Pipeline Prospect → Validé → Chantier → Payé",
      "Agenda RDV : visite, signature, relance",
      "Vue « À faire » du jour",
    ],
    detailTitle: "Dès qu'un devis est imprimé, il entre dans le pipeline",
    detail:
      "Validez, planifiez un RDV, créez le chantier : le statut se propage partout. Fini les tableaux oubliés et les relances manquées.",
    detailBullets: [
      "Campagnes d'appels & statistiques (Business)",
      "Bouton « Devis validé » depuis l'historique",
      "Synchronisation temps réel avec les paiements",
    ],
    cta: { label: "Découvrir le CRM", href: "inscription.html?next=clients.html" },
    reverse: false,
  },
  {
    id: "planning",
    tag: "Planning · Business",
    title: "Planifiez chantiers & interventions",
    teaser: "Agenda unifié, Gantt, disponibilités et rappels automatiques la veille de chaque RDV.",
    hook: "Votre semaine lisible en 10 secondes",
    revealLabel: "Voir l'agenda unifié",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=540&fit=crop&q=80",
    imageAlt: "Électricien souriant sur chantier",
    bullets: [
      "Score de charge semaine & créneaux libres",
      "Gantt par chantier & tâches terrain",
      "Rappel e-mail / notification J-1",
    ],
    detailTitle: "RDV, interventions, indispos : tout au même endroit",
    detail:
      "Visualisez votre semaine : RDV commercial, interventions, indisponibilités. La file « À planifier » liste les devis validés sans date. Vous assignez en un clic.",
    detailBullets: [
      "Espace employé & métré terrain",
      "Comparaison devis / travaux réels",
      "Multi-utilisateurs (jusqu'à 5 en Business)",
    ],
    cta: { label: "Voir le planning", href: "inscription.html?next=planning.html" },
    reverse: true,
  },
  {
    id: "compta",
    tag: "Comptabilité · Business",
    title: "Exportez votre compta en un clic",
    teaser: "Imputation par chantier, journal enrichi, export FEC. Votre comptable vous remerciera.",
    hook: "Export FEC prêt en 1 clic",
    revealLabel: "Voir ce que reçoit votre comptable",
    image: "https://images.unsplash.com/photo-1529722155810-17303d209942?w=800&h=540&fit=crop&q=80",
    imageAlt: "Peintre en rénovation sur chantier suivi",
    bullets: [
      "Vue par chantier & par client",
      "Export CSV complet + FEC",
      "Synthèse mensuelle & annuelle",
    ],
    detailTitle: "Clôturez sereinement, sans ressaisie dans un tableur",
    detail:
      "Chaque encaissement et dépense peut être rattaché à un chantier. Exportez journal, synthèse, détail lignes et fichier FEC pour clôturer sereinement.",
    detailBullets: [
      "Compatible expert-comptable",
      "Suivi TVA & attestations",
      "Rapprochement devis / factures / paiements",
    ],
    cta: { label: "Explorer la compta", href: "inscription.html?next=comptabilite.html" },
    reverse: false,
  },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRevealButton(item, panelId, prefix) {
  return `
    <button
      type="button"
      class="${prefix}__toggle feat-reveal"
      aria-expanded="false"
      aria-controls="${escapeHtml(panelId)}"
    >
      <span class="feat-reveal__inner">
        <span class="feat-reveal__hook">${escapeHtml(item.hook)}</span>
        <span class="feat-reveal__action">
          <span class="feat-reveal__label">${escapeHtml(item.revealLabel)}</span>
          <span class="feat-reveal__arrow" aria-hidden="true">→</span>
        </span>
      </span>
      <span class="feat-reveal__collapse">Masquer</span>
    </button>
  `;
}

function renderDetailPanel(item, panelId, prefix) {
  return `
    <div class="${prefix}__detail feat-detail" id="${escapeHtml(panelId)}" hidden>
      <p class="feat-detail__title">${escapeHtml(item.detailTitle)}</p>
      <p class="feat-detail__text">${escapeHtml(item.detail)}</p>
      <ul class="feat-detail__list">
        ${item.detailBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
      </ul>
      <a href="${escapeHtml(item.cta.href)}" class="btn btn--primary feat-detail__cta">${escapeHtml(item.cta.label)}</a>
    </div>
  `;
}

function renderPainCard(item) {
  const panelId = `pain-detail-${item.id}`;
  return `
    <article class="pain-story" data-pain-id="${escapeHtml(item.id)}">
      <div class="pain-story__media">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt)}" loading="lazy" width="800" height="520" />
        <span class="pain-story__hook-badge">${escapeHtml(item.hook)}</span>
      </div>
      <div class="pain-story__body">
        <span class="pain-story__tag">${escapeHtml(item.tag)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="pain-story__teaser">${escapeHtml(item.teaser)}</p>
        <ul class="pain-story__bullets">
          ${item.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
        </ul>
        ${renderRevealButton(item, panelId, "pain-story")}
        ${renderDetailPanel(item, panelId, "pain-story")}
      </div>
    </article>
  `;
}

function renderFeatureBlock(item) {
  const reverseClass = item.reverse ? " feat-block--reverse" : "";
  const panelId = `feat-detail-${item.id}`;
  return `
    <article class="feat-block${reverseClass}" data-feat-id="${escapeHtml(item.id)}">
      <div class="feat-block__media">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt)}" loading="lazy" width="800" height="540" />
        <span class="feat-block__hook-badge">${escapeHtml(item.hook)}</span>
      </div>
      <div class="feat-block__body">
        <span class="feat-block__tag">${escapeHtml(item.tag)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="feat-block__teaser">${escapeHtml(item.teaser)}</p>
        <ul class="feat-block__bullets">
          ${item.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
        </ul>
        ${renderRevealButton(item, panelId, "feat-block")}
        ${renderDetailPanel(item, panelId, "feat-block")}
      </div>
    </article>
  `;
}

function bindToggles(root) {
  root.querySelectorAll(".feat-reveal").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      panel.hidden = open;
      btn.closest(".pain-story, .feat-block")?.classList.toggle("is-expanded", !open);
    });
  });
}

export function initLandingFeatures() {
  const painsRoot = document.getElementById("pain-stories-root");
  if (painsRoot) {
    painsRoot.innerHTML = PAIN_STORIES.map(renderPainCard).join("");
    bindToggles(painsRoot);
  }

  const featsRoot = document.getElementById("features-showcase-root");
  if (featsRoot) {
    featsRoot.innerHTML = FEATURE_MODULES.map(renderFeatureBlock).join("");
    bindToggles(featsRoot);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLandingFeatures);
} else {
  initLandingFeatures();
}
