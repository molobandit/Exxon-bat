import {
  formatPublisherAddress,
  formatPublisherIdentity,
  getLegalPublisher,
  getLegalUpdatedLabel,
  getPublisherContactEmail,
} from "./site-publisher.js";
import { escapeHtml } from "./utils.js";

function p(text) {
  return `<p>${text}</p>`;
}

function ul(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function publisherBlock() {
  const pub = getLegalPublisher();
  const identity = escapeHtml(formatPublisherIdentity(pub));
  const address = escapeHtml(formatPublisherAddress(pub));
  const lines = [
    `<strong>${identity}</strong>`,
    address,
    pub.companySiret ? `SIRET : ${escapeHtml(pub.companySiret)}` : "",
    pub.companyRcs ? `${escapeHtml(pub.companyRcs)}` : "",
    pub.companyTvaIntra ? `TVA intracommunautaire : ${escapeHtml(pub.companyTvaIntra)}` : "",
    pub.companyApe ? `Code APE : ${escapeHtml(pub.companyApe)}` : "",
    pub.companyCapital ? `Capital social : ${escapeHtml(pub.companyCapital)}` : "",
    pub.companyPhone ? `Tél. : <a href="tel:${escapeHtml(pub.companyPhone.replace(/\s/g, ""))}">${escapeHtml(pub.companyPhone)}</a>` : "",
    `E-mail : <a href="mailto:${escapeHtml(getPublisherContactEmail(pub, "support"))}">${escapeHtml(getPublisherContactEmail(pub, "support"))}</a>`,
    pub.companyWebsite
      ? `Site : <a href="${escapeHtml(pub.companyWebsite)}" rel="noopener">${escapeHtml(pub.companyWebsite)}</a>`
      : "",
  ].filter(Boolean);

  return `<div class="legal-publisher-box">${lines.join("<br />")}</div>`;
}

export function renderMentionsLegales() {
  const pub = getLegalPublisher();
  const app = escapeHtml(pub.appName);
  const desc = escapeHtml(pub.appDescription);

  return `
    <article class="legal-block" id="editeur">
      <h2>1. Éditeur du site et du logiciel</h2>
      ${publisherBlock()}
      <p>Le présent site internet et l'application web <strong>${app}</strong> (${desc}) sont édités par la société identifiée ci-dessus.</p>
    </article>

    <article class="legal-block" id="publication">
      <h2>2. Directeur de la publication</h2>
      <p>Le directeur de la publication est le représentant légal de <strong>${escapeHtml(pub.companyName)}</strong>, joignable à l'adresse e-mail indiquée ci-dessus.</p>
    </article>

    <article class="legal-block" id="hebergement">
      <h2>3. Hébergement</h2>
      <p>Le site et l'application sont hébergés par :</p>
      <p><strong>${escapeHtml(pub.hostingProvider)}</strong><br />${escapeHtml(pub.hostingAddress)}</p>
      <p>L'application fonctionne principalement dans votre navigateur (PWA) : vos données métier sont stockées localement sur votre appareil, sauf transmission volontaire via le support ou les services de paiement.</p>
    </article>

    <article class="legal-block" id="propriete">
      <h2>4. Propriété intellectuelle</h2>
      <p>L'ensemble des éléments composant le site et le logiciel ${app} (textes, graphismes, logo, structure, code source, bases documentaires) est protégé par le droit de la propriété intellectuelle.</p>
      <p>Toute reproduction, représentation ou exploitation non autorisée est interdite. L'utilisation du logiciel est subordonnée à l'acceptation des <a href="conditions-generales.html">conditions générales d'utilisation</a>.</p>
    </article>

    <article class="legal-block" id="responsabilite">
      <h2>5. Responsabilité</h2>
      ${ul([
        `${app} fournit des outils d'aide à l'estimation, au chiffrage et au suivi d'activité. Les montants, marges et simulations restent <strong>indicatifs</strong> : vous restez responsable de vos devis, factures et obligations comptables.`,
        "Nous mettons en œuvre des moyens raisonnables pour assurer la disponibilité du service, sans garantie d'absence d'interruption (maintenance, réseau, navigateur).",
        "Les liens externes éventuels n'engagent pas la responsabilité de l'éditeur quant à leur contenu.",
      ])}
    </article>

    <article class="legal-block" id="donnees">
      <h2>6. Données personnelles</h2>
      <p>Le traitement des données est décrit dans notre <a href="confidentialite.html">politique de confidentialité</a> et notre page <a href="donnees-personnelles.html">gestion des données personnelles</a>.</p>
    </article>

    <article class="legal-block" id="contact">
      <h2>7. Contact</h2>
      <p>Pour toute question relative au site ou au logiciel : <a href="mailto:${escapeHtml(getPublisherContactEmail(pub, "support"))}">${escapeHtml(getPublisherContactEmail(pub, "support"))}</a></p>
      <p class="legal-updated">Dernière mise à jour : ${escapeHtml(getLegalUpdatedLabel())} · ${escapeHtml(pub.companyName)}</p>
    </article>`;
}

export function renderPolitiqueConfidentialite() {
  const pub = getLegalPublisher();
  const app = escapeHtml(pub.appName);
  const privacy = escapeHtml(getPublisherContactEmail(pub, "privacy"));

  return `
    <article class="legal-block" id="principe">
      <h2>Notre engagement</h2>
      <p><strong>${escapeHtml(pub.companyName)}</strong> édite ${app}, un logiciel pensé pour les artisans du BTP. Nous ne vendons pas vos données et ne consultons pas vos devis, clients ou marges à distance sans votre action volontaire.</p>
      <div class="legal-highlight">
        <strong>En résumé :</strong> vos données métier (clients, devis, bibliothèque) sont stockées sur <strong>votre appareil</strong> dans le navigateur. Elles ne transitent pas par nos serveurs pour le fonctionnement courant de l'application.
      </div>
    </article>

    <article class="legal-block" id="donnees">
      <h2>Quelles données sont concernées ?</h2>
      <table class="legal-table">
        <thead><tr><th>Type</th><th>Exemples</th><th>Stockage</th></tr></thead>
        <tbody>
          <tr><td><strong>Données métier</strong></td><td>Clients, devis, factures, marges, bibliothèque, chantiers</td><td>Appareil (navigateur)</td></tr>
          <tr><td><strong>Compte utilisateur</strong></td><td>E-mail, prénom, formule souscrite</td><td>Appareil (navigateur)</td></tr>
          <tr><td><strong>Profil entreprise</strong></td><td>Raison sociale, SIRET, coordonnées bancaires</td><td>Appareil (navigateur)</td></tr>
          <tr><td><strong>Support</strong></td><td>Messages de ticket, e-mail de contact</td><td>Transmis si vous nous écrivez</td></tr>
          <tr><td><strong>Diagnostic technique</strong></td><td>Version app, navigateur, compteurs anonymes</td><td>Uniquement si vous l'autorisez</td></tr>
          <tr><td><strong>Paiement</strong></td><td>Données de transaction</td><td>Prestataire de paiement certifié</td></tr>
        </tbody>
      </table>
    </article>

    <article class="legal-block" id="finalites">
      <h2>Finalités du traitement</h2>
      ${ul([
        "Fournir et améliorer le logiciel " + app,
        "Gérer votre compte, abonnement et accès aux fonctionnalités",
        "Assurer le support client et répondre à vos demandes",
        "Respecter nos obligations légales et comptables en tant qu'éditeur",
        "Sécuriser le service et prévenir les usages frauduleux",
      ])}
    </article>

    <article class="legal-block" id="stockage">
      <h2>Où sont stockées vos données ?</h2>
      ${ul([
        "<strong>Données métier :</strong> stockage local sécurisé du navigateur (<code>localStorage</code>) sur l'appareil utilisé.",
        "<strong>Mode hors ligne :</strong> vos données restent disponibles sans connexion Internet.",
        "<strong>Multi-appareils :</strong> chaque appareil possède sa propre copie locale — pensez à exporter vos PDF importants.",
        "<strong>Synchronisation cloud :</strong> si proposée un jour, elle sera opt-in, chiffrée et clairement décrite avant activation.",
      ])}
    </article>

    <article class="legal-block" id="acces">
      <h2>Qui peut accéder à vos informations ?</h2>
      ${ul([
        "<strong>Vous</strong> — en permanence, depuis votre compte.",
        `<strong>${escapeHtml(pub.companyName)}</strong> — aucun accès à vos données métier sans action volontaire de votre part.`,
        "<strong>Tiers</strong> — pas de revente à des annonceurs ; prestataires limités au strict nécessaire (hébergement site, paiement, support).",
      ])}
    </article>

    <article class="legal-block" id="support">
      <h2>Support sans accès caché</h2>
      <p>Notre équipe peut vous aider sans voir vos clients ni vos devis grâce à un rapport de diagnostic anonyme (version app, navigateur, compteurs) — jamais de noms, adresses ou montants sans votre accord.</p>
      <div class="legal-cta">
        <a href="inscription.html?next=support.html" class="btn btn--primary">Contacter le support</a>
        <a href="support.html#diagnostic" class="btn btn--ghost">Rapport diagnostic</a>
      </div>
    </article>

    <article class="legal-block" id="securite">
      <h2>Mesures de sécurité</h2>
      ${ul([
        "HTTPS — chiffrement des échanges avec le site",
        "Données locales — informations métier sur votre appareil",
        "Connexion par e-mail — accès réservé à votre compte",
        "Paiement sécurisé — prestataire certifié PCI-DSS",
        "PWA — mises à jour et cache contrôlés",
      ])}
    </article>

    <article class="legal-block" id="droits">
      <h2>Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits d'accès, rectification, effacement, limitation, opposition et portabilité. Détails complets sur la page <a href="donnees-personnelles.html">gestion des données personnelles</a>.</p>
    </article>

    <article class="legal-block" id="contact">
      <h2>Contact confidentialité</h2>
      <p>E-mail : <a href="mailto:${privacy}">${privacy}</a> · Support : <a href="mailto:${escapeHtml(getPublisherContactEmail(pub, "support"))}">${escapeHtml(getPublisherContactEmail(pub, "support"))}</a></p>
      <p class="legal-updated">Dernière mise à jour : ${escapeHtml(getLegalUpdatedLabel())} · ${escapeHtml(pub.companyName)}</p>
    </article>`;
}

export function renderConditionsGenerales() {
  const pub = getLegalPublisher();
  const app = escapeHtml(pub.appName);

  return `
    <article class="legal-block" id="objet">
      <h2>1. Objet</h2>
      <p>Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation du site internet et du logiciel en ligne <strong>${app}</strong>, édité par :</p>
      ${publisherBlock()}
      <p>En créant un compte ou en utilisant le service, vous acceptez sans réserve les présentes CGU et la <a href="confidentialite.html">politique de confidentialité</a>.</p>
    </article>

    <article class="legal-block" id="service">
      <h2>2. Description du service</h2>
      <p>${app} est un logiciel métier destiné aux artisans et entreprises du BTP. Il permet notamment :</p>
      ${ul([
        "Établir des devis et factures avec bibliothèque de prestations",
        "Analyser la rentabilité et les marges",
        "Gérer clients, chantiers, planning et métré terrain",
        "Exporter des documents PDF et des données comptables",
      ])}
      <p>Les fonctionnalités peuvent évoluer ; les formules et tarifs sont décrits sur la page <a href="tarifs.html">Tarifs</a>.</p>
    </article>

    <article class="legal-block" id="compte">
      <h2>3. Compte utilisateur</h2>
      ${ul([
        "Vous devez fournir des informations exactes lors de l'inscription.",
        "Vous êtes responsable de la confidentialité de vos identifiants.",
        "Un compte est strictement personnel ou réservé à votre entreprise ; le partage non autorisé est interdit.",
        "Nous pouvons suspendre un compte en cas de non-paiement, fraude ou violation des CGU.",
      ])}
    </article>

    <article class="legal-block" id="essai">
      <h2>4. Essai gratuit et abonnement</h2>
      <p>Un essai gratuit peut être proposé pour une durée limitée. À l'issue, l'accès aux fonctionnalités payantes nécessite la souscription d'une offre. Les prix s'entendent HT sauf mention contraire ; la TVA applicable est celle en vigueur.</p>
      <p>L'abonnement est reconduit tacitement selon la périodicité choisie, sauf résiliation dans les conditions prévues au moment de la souscription.</p>
    </article>

    <article class="legal-block" id="donnees-utilisateur">
      <h2>5. Données saisies par l'utilisateur</h2>
      <p>Vous restez propriétaire des données que vous saisissez (clients, devis, etc.). Vous garantissez disposer des droits nécessaires et respecter la réglementation applicable (RGPD, obligations comptables, mentions sur devis).</p>
      <p>${escapeHtml(pub.companyName)} n'est pas responsable du contenu de vos documents commerciaux ni de leur conformité réglementaire — consultez votre expert-comptable si besoin.</p>
    </article>

    <article class="legal-block" id="disponibilite">
      <h2>6. Disponibilité et maintenance</h2>
      <p>Nous nous efforçons d'assurer un service disponible 24 h/24, 7 j/7, sous réserve des opérations de maintenance et des contraintes liées au fonctionnement local (navigateur, appareil, connexion).</p>
    </article>

    <article class="legal-block" id="responsabilite">
      <h2>7. Limitation de responsabilité</h2>
      ${ul([
        "Les calculs, simulations et suggestions de prix sont indicatifs.",
        "Aucune garantie de résultat commercial n'est accordée.",
        "Notre responsabilité est limitée au montant des sommes versées sur les douze derniers mois, sauf faute lourde ou disposition légale impérative.",
      ])}
    </article>

    <article class="legal-block" id="propriete">
      <h2>8. Propriété intellectuelle</h2>
      <p>Le logiciel, la marque ${app}, la documentation et les contenus éditoriaux restent la propriété de ${escapeHtml(pub.companyName)}. Aucune cession de droits de propriété intellectuelle n'est consentie au-delà du droit d'utilisation dans le cadre de l'abonnement.</p>
    </article>

    <article class="legal-block" id="resiliation">
      <h2>9. Résiliation</h2>
      <p>Vous pouvez résilier votre abonnement selon les modalités indiquées lors de la souscription. En cas de résiliation, exportez vos données importantes (PDF, exports) avant la fin d'accès. Les données locales sur votre appareil peuvent être effacées via les paramètres du navigateur.</p>
    </article>

    <article class="legal-block" id="droit">
      <h2>10. Droit applicable et litiges</h2>
      <p>Les présentes CGU sont soumises au droit français. En cas de litige, une solution amiable sera recherchée prioritairement.</p>
      ${
        pub.mediatorName
          ? `<p>Médiateur de la consommation : <strong>${escapeHtml(pub.mediatorName)}</strong>${pub.mediatorUrl ? ` — <a href="${escapeHtml(pub.mediatorUrl)}" rel="noopener">${escapeHtml(pub.mediatorUrl)}</a>` : ""}</p>`
          : "<p>Conformément aux articles L.612-1 et suivants du Code de la consommation, vous pouvez recourir gratuitement à un médiateur de la consommation dont les coordonnées seront communiquées sur demande.</p>"
      }
      <p class="legal-updated">Dernière mise à jour : ${escapeHtml(getLegalUpdatedLabel())} · ${escapeHtml(pub.companyName)}</p>
    </article>`;
}

export function renderDonneesPersonnelles() {
  const pub = getLegalPublisher();
  const app = escapeHtml(pub.appName);
  const privacy = escapeHtml(getPublisherContactEmail(pub, "privacy"));

  return `
    <article class="legal-block" id="responsable">
      <h2>1. Responsable de traitement</h2>
      <p>Le responsable du traitement des données personnelles collectées dans le cadre du site et du logiciel ${app} est :</p>
      ${publisherBlock()}
    </article>

    <article class="legal-block" id="categories">
      <h2>2. Catégories de données traitées</h2>
      <table class="legal-table">
        <thead><tr><th>Catégorie</th><th>Données</th><th>Base légale</th></tr></thead>
        <tbody>
          <tr><td>Identification</td><td>Nom, prénom, e-mail, téléphone professionnel</td><td>Exécution du contrat / intérêt légitime</td></tr>
          <tr><td>Compte & abonnement</td><td>Identifiants, formule, historique de souscription</td><td>Exécution du contrat</td></tr>
          <tr><td>Données métier</td><td>Clients, devis, chantiers (stockage local)</td><td>Exécution du contrat — sous votre contrôle</td></tr>
          <tr><td>Support</td><td>Contenu des tickets, échanges e-mail</td><td>Intérêt légitime / consentement (diagnostic)</td></tr>
          <tr><td>Navigation site</td><td>Logs techniques, cookies strictement nécessaires</td><td>Intérêt légitime</td></tr>
          <tr><td>Paiement</td><td>Données de facturation (via prestataire)</td><td>Exécution du contrat / obligation légale</td></tr>
        </tbody>
      </table>
    </article>

    <article class="legal-block" id="duree">
      <h2>3. Durée de conservation</h2>
      ${ul([
        "<strong>Compte actif :</strong> durée de la relation contractuelle.",
        "<strong>Données métier locales :</strong> tant que vous conservez les données dans votre navigateur.",
        "<strong>Support :</strong> 3 ans après le dernier contact, sauf obligation légale contraire.",
        "<strong>Facturation :</strong> 10 ans (obligations comptables).",
        "<strong>Prospects :</strong> 3 ans à compter du dernier contact ou jusqu'au retrait du consentement.",
      ])}
    </article>

    <article class="legal-block" id="destinataires">
      <h2>4. Destinataires et sous-traitants</h2>
      <p>Vos données peuvent être communiquées aux prestataires suivants, dans la limite de leurs missions :</p>
      ${ul([
        "Hébergeur du site web",
        "Prestataire de paiement en ligne",
        "Outil de support client (si vous nous contactez)",
      ])}
      <p>Aucune revente de données à des tiers à des fins commerciales.</p>
    </article>

    <article class="legal-block" id="transferts">
      <h2>5. Transferts hors Union européenne</h2>
      <p>En principe, les données sont traitées au sein de l'Union européenne. Si un transfert hors UE devait avoir lieu, il serait encadré par des garanties appropriées (clauses contractuelles types, décision d'adéquation).</p>
    </article>

    <article class="legal-block" id="droits">
      <h2>6. Vos droits RGPD</h2>
      <p>Vous disposez des droits suivants, exercés en justifiant de votre identité :</p>
      ${ul([
        "<strong>Droit d'accès</strong> — obtenir une copie de vos données",
        "<strong>Droit de rectification</strong> — corriger des données inexactes",
        "<strong>Droit à l'effacement</strong> — dans les limites légales",
        "<strong>Droit à la limitation</strong> — geler temporairement un traitement",
        "<strong>Droit d'opposition</strong> — notamment au marketing direct",
        "<strong>Droit à la portabilité</strong> — récupérer vos données dans un format structuré",
        "<strong>Retrait du consentement</strong> — pour les traitements fondés sur le consentement",
      ])}
      <p>Pour exercer vos droits : <a href="mailto:${privacy}">${privacy}</a></p>
      <p>Vous pouvez introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr" rel="noopener">www.cnil.fr</a>).</p>
    </article>

    <article class="legal-block" id="cookies">
      <h2>7. Cookies et traceurs</h2>
      <p>Le site utilise des cookies strictement nécessaires au fonctionnement (session, préférences, PWA). Aucun cookie publicitaire tiers n'est déposé sans votre consentement.</p>
    </article>

    <article class="legal-block" id="securite-rgpd">
      <h2>8. Sécurité</h2>
      <p>${escapeHtml(pub.companyName)} met en œuvre des mesures techniques et organisationnelles adaptées : HTTPS, limitation des accès, sensibilisation, choix de sous-traitants conformes au RGPD.</p>
    </article>

    <article class="legal-block" id="dpo">
      <h2>9. Délégué à la protection des données (DPO)</h2>
      ${
        pub.dpoName
          ? `<p>DPO désigné : <strong>${escapeHtml(pub.dpoName)}</strong> — <a href="mailto:${privacy}">${privacy}</a></p>`
          : `<p>Pour toute question relative à la protection des données : <a href="mailto:${privacy}">${privacy}</a></p>`
      }
      <p class="legal-updated">Dernière mise à jour : ${escapeHtml(getLegalUpdatedLabel())} · ${escapeHtml(pub.companyName)}</p>
    </article>`;
}

export const LEGAL_PAGES = {
  mentions: {
    slug: "mentions-legales",
    file: "mentions-legales.html",
    title: "Mentions légales",
    badge: "Informations réglementaires",
    intro:
      "Identité de l'éditeur, hébergement, propriété intellectuelle et responsabilité — conformément à la loi pour la confiance dans l'économie numérique (LCEN).",
    nav: [
      { id: "editeur", label: "Éditeur" },
      { id: "publication", label: "Directeur de publication" },
      { id: "hebergement", label: "Hébergement" },
      { id: "propriete", label: "Propriété intellectuelle" },
      { id: "responsabilite", label: "Responsabilité" },
      { id: "donnees", label: "Données personnelles" },
      { id: "contact", label: "Contact" },
    ],
    render: renderMentionsLegales,
  },
  confidentialite: {
    slug: "politique-confidentialite",
    file: "confidentialite.html",
    title: "Politique de confidentialité",
    badge: "Transparence & confiance",
    intro:
      "Comment nous traitons vos informations lorsque vous utilisez le site et le logiciel Exxon-bat — en langage clair.",
    nav: [
      { id: "principe", label: "Notre engagement" },
      { id: "donnees", label: "Quelles données ?" },
      { id: "finalites", label: "Finalités" },
      { id: "stockage", label: "Stockage" },
      { id: "acces", label: "Accès" },
      { id: "support", label: "Support" },
      { id: "securite", label: "Sécurité" },
      { id: "droits", label: "Vos droits" },
      { id: "contact", label: "Contact" },
    ],
    render: renderPolitiqueConfidentialite,
  },
  cgu: {
    slug: "conditions-generales",
    file: "conditions-generales.html",
    title: "Conditions générales d'utilisation",
    badge: "Contrat d'utilisation",
    intro:
      "Règles d'accès au logiciel Exxon-bat : compte, abonnement, responsabilités et droits réciproques.",
    nav: [
      { id: "objet", label: "Objet" },
      { id: "service", label: "Service" },
      { id: "compte", label: "Compte" },
      { id: "essai", label: "Essai & abonnement" },
      { id: "donnees-utilisateur", label: "Vos données" },
      { id: "disponibilite", label: "Disponibilité" },
      { id: "responsabilite", label: "Responsabilité" },
      { id: "propriete", label: "Propriété intellectuelle" },
      { id: "resiliation", label: "Résiliation" },
      { id: "droit", label: "Droit applicable" },
    ],
    render: renderConditionsGenerales,
  },
  rgpd: {
    slug: "donnees-personnelles",
    file: "donnees-personnelles.html",
    title: "Gestion des données personnelles",
    badge: "RGPD",
    intro:
      "Registre simplifié : responsable de traitement, bases légales, durées de conservation et exercice de vos droits.",
    nav: [
      { id: "responsable", label: "Responsable" },
      { id: "categories", label: "Catégories" },
      { id: "duree", label: "Conservation" },
      { id: "destinataires", label: "Destinataires" },
      { id: "transferts", label: "Transferts" },
      { id: "droits", label: "Vos droits" },
      { id: "cookies", label: "Cookies" },
      { id: "securite-rgpd", label: "Sécurité" },
      { id: "dpo", label: "DPO" },
    ],
    render: renderDonneesPersonnelles,
  },
};

export function renderLegalCrossLinks(currentKey) {
  return Object.entries(LEGAL_PAGES)
    .filter(([key]) => key !== currentKey)
    .map(([, page]) => `<a href="${page.file}">${page.title}</a>`)
    .join(" · ");
}
