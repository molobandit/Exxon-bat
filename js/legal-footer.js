import { LEGAL_PAGES } from "./legal-content.js";
import { formatPublisherIdentity, getLegalPublisher } from "./site-publisher.js";

export function renderLegalFooterBar(container) {
  if (!container) return;

  const pub = getLegalPublisher();
  const year = new Date().getFullYear();
  const identity = formatPublisherIdentity(pub);

  const links = [
    { href: "mentions-legales.html", label: "Mentions légales" },
    { href: "confidentialite.html", label: "Politique de confidentialité" },
    { href: "conditions-generales.html", label: "Conditions générales" },
    { href: "donnees-personnelles.html", label: "Gestion des données personnelles" },
  ];

  container.innerHTML = `
    <nav class="legal-footer-bar" aria-label="Informations légales">
      <div class="legal-footer-bar__links">
        ${links.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
      </div>
      <p class="legal-footer-bar__copy">
        © ${year} ${identity} — ${pub.appName}. Calculs indicatifs, consultez votre comptable.
      </p>
    </nav>`;
}

export function initLegalFooters() {
  document.querySelectorAll("[data-legal-footer]").forEach((el) => {
    renderLegalFooterBar(el);
  });
}

if (document.querySelector("[data-legal-footer]")) {
  initLegalFooters();
}

export { LEGAL_PAGES };
