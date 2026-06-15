import { LEGAL_PAGES, renderLegalCrossLinks } from "./legal-content.js";
import { formatPublisherIdentity, getLegalPublisher } from "./site-publisher.js";
import { renderLegalFooterBar } from "./legal-footer.js";

export function initLegalPage(pageKey) {
  const config = LEGAL_PAGES[pageKey];
  if (!config) return;

  const pub = getLegalPublisher();
  const identity = formatPublisherIdentity(pub);

  document.title = `${config.title} — ${pub.appName}`;

  const heroBadge = document.querySelector("[data-legal-badge]");
  const heroTitle = document.querySelector("[data-legal-title]");
  const heroIntro = document.querySelector("[data-legal-intro]");
  const nav = document.querySelector("[data-legal-nav]");
  const content = document.querySelector("[data-legal-content]");
  const crossLinks = document.querySelector("[data-legal-crosslinks]");
  const publisherLine = document.querySelector("[data-legal-publisher]");

  if (heroBadge) heroBadge.textContent = config.badge;
  if (heroTitle) heroTitle.textContent = config.title;
  if (heroIntro) heroIntro.textContent = config.intro;
  if (publisherLine) publisherLine.textContent = identity;

  if (nav) {
    nav.innerHTML = config.nav
      .map((item) => `<a href="#${item.id}">${item.label}</a>`)
      .join("");
  }

  if (content) {
    content.innerHTML = config.render();
  }

  if (crossLinks) {
    crossLinks.innerHTML = renderLegalCrossLinks(pageKey);
  }

  document.querySelectorAll("[data-legal-footer]").forEach((el) => {
    renderLegalFooterBar(el);
  });
}
