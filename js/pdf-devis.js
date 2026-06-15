import { filterLinesForClient } from "./client-quote-visibility.js";
import { translateUnit } from "./catalog-i18n.js";
import { getLocale } from "./i18n.js";
import { formatProfileMoney, formatProfileHourly } from "./market.js";
import { computeProfileSummary } from "./calculator.js";
import { APP_VERSION } from "./version.js";

const formatEuroDetailed = (value) => formatProfileMoney(value, true);
const formatEuro = (value) => formatProfileMoney(value);
const formatHourly = (value) => formatProfileHourly(value);
import { TRADES } from "./metre-templates.js";
import {
  getLaborSellTotal,
  getMaterialGrossMargin,
  getMaterialMarkupRatio,
  getLaborTotalFromLineItems,
  getHourlyLaborLines,
  getEffectiveHours,
  hasDetailedLineItems,
  MATERIAL_MIN_MARKUP,
  normalizeQuote,
} from "./quote-pricing.js";
import { getFullCompanyAddress } from "./storage.js";
import {
  formatClientAddressLine,
  formatClientDisplayName,
} from "./address-format.js";
const {
  buildClientPdfLineItems,
  buildSectionBlocks,
  computeClientPrintLayout,
  renderClientQuoteTable,
  renderClientSettlePanel,
} = await import(`./quote-sections.js?v=${APP_VERSION}`);

const PAYMENT_DEFAULT =
  "Acompte de 30 % à la commande — Solde à réception des travaux, par virement ou chèque.";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Styles écran mobile/tablette — n'affecte pas l'impression (@media print). */
const PREVIEW_MOBILE_STYLES = `
  @media screen and (max-width: 900px) {
    html { -webkit-text-size-adjust: 100%; }
    body { overflow-x: hidden; font-size: 10pt; }
    .page { max-width: 100%; width: 100%; }
    .body { padding: 12px 8px 20px; }
    .topbar { flex-direction: column; align-items: stretch; }
    .doc-head { flex-direction: column; align-items: stretch; gap: 8px; padding: 10px; }
    .doc-head__client-block { text-align: left; }
    .doc-head__client-row { justify-content: flex-start; }
    .doc-head__client-detail { text-align: left; }
    .doc-settle { grid-template-columns: 1fr; }
    .topbar__brand { padding: 14px 12px; gap: 12px; }
    .monogram { width: 44px; height: 44px; font-size: 1rem; }
    .topbar__name { font-size: 1.05rem; }
    .topbar__doc {
      min-width: 0;
      width: 100%;
      text-align: left;
      border-left: none;
      border-top: 1px solid rgba(255,255,255,0.12);
      padding: 14px 12px;
    }
    .topbar__doc-label { font-size: 1.35rem; }
    .meta-grid { grid-template-columns: 1fr; gap: 10px; margin-bottom: 16px; }
    .meta-card { padding: 10px 12px; }
    .parties { grid-template-columns: 1fr; }
    .quote-hero { flex-direction: column; align-items: stretch; }
    .quote-hero__amount-card { width: 100%; max-width: none; }
    .quote-section__head {
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 10px;
    }
    .quote-section__head-main { flex: 1 1 100%; min-width: 0; }
    .quote-section__head-meta,
    .quote-section__head-total {
      text-align: left;
      width: 100%;
      flex-shrink: 1;
    }
    .quote-section__table-wrap {
      overflow-x: visible;
      margin: 0;
    }
    .quote-section__table {
      min-width: 0 !important;
      width: 100%;
      font-size: 0.72rem;
      table-layout: fixed;
    }
    .quote-section__table th,
    .quote-section__table td {
      padding: 6px 4px;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .col-designation { min-width: 0 !important; }
    .recap-premium__header { flex-direction: column; align-items: flex-start; }
    .recap-premium__grid { grid-template-columns: 1fr; }
    .recap-premium__footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    .conditions-grid { grid-template-columns: 1fr !important; }
    .sign-row { flex-direction: column; }
    .footer__bar { flex-direction: column; gap: 8px; text-align: center; }
    .grid { grid-template-columns: 1fr !important; }
    .summary { grid-template-columns: 1fr 1fr !important; }
    table { min-width: 0 !important; width: 100%; }
    thead th { padding: 8px 6px; font-size: 0.62rem; }
    tbody td { padding: 8px 6px; font-size: 0.75rem; }
    .table-wrap { overflow-x: visible; }
  }
`;

const PREVIEW_BUILD = APP_VERSION;

function isMobilePreview() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function setPreviewCinemaMode(modal, enabled) {
  if (!modal) return;
  modal.classList.toggle("devis-preview-modal--cinema", enabled);
  const bar = modal.querySelector(".devis-preview-modal__mobile-bar");
  if (bar) bar.hidden = !enabled;
  document.body.classList.toggle("devis-preview-cinema-open", enabled);
}

function ensureMobileActionBar(modal) {
  let bar = modal.querySelector(".devis-preview-modal__mobile-bar");
  if (bar) return bar;

  bar = document.createElement("div");
  bar.className = "devis-preview-modal__mobile-bar";
  bar.setAttribute("aria-label", "Actions aperçu");
  bar.innerHTML = `
    <button type="button" class="devis-preview-modal__mobile-btn" data-close aria-label="Fermer">✕</button>
    <button type="button" class="devis-preview-modal__mobile-btn is-active" data-mobile-view="client">Client</button>
    <button type="button" class="devis-preview-modal__mobile-btn" data-mobile-view="internal">Interne</button>
    <button type="button" class="devis-preview-modal__mobile-btn" data-mobile-edit aria-label="Personnaliser">✏️</button>
    <button type="button" class="devis-preview-modal__mobile-btn devis-preview-modal__mobile-btn--primary" data-print aria-label="Imprimer">🖨</button>
    <span class="devis-preview-modal__version">v${PREVIEW_BUILD}</span>
  `;
  modal.querySelector(".devis-preview-modal__panel")?.appendChild(bar);
  return bar;
}

/** Styles inline — fonctionne même si le cache CSS/JS est ancien. */
function applyMobileFullscreenPreview(modal) {
  if (!isMobilePreview() || !modal) return;

  ensureMobileActionBar(modal);

  const panel = modal.querySelector(".devis-preview-modal__panel");
  const body = modal.querySelector(".devis-preview-modal__body");
  const wrap = modal.querySelector(".devis-preview-modal__frame-wrap");
  const edit = modal.querySelector(".devis-preview-modal__edit");
  const bar = modal.querySelector(".devis-preview-modal__mobile-bar");

  modal.style.cssText =
    "position:fixed;inset:0;z-index:9999;padding:0;display:flex;align-items:stretch;";
  if (panel) {
    panel.style.cssText =
      "position:relative;width:100%;height:100dvh;max-height:100dvh;border-radius:0;background:#fff;display:flex;flex-direction:column;overflow:hidden;box-shadow:none;";
  }

  for (const el of modal.querySelectorAll(
    ".devis-preview-modal__header, .devis-preview-modal__edit-toggle, .devis-preview-modal__footer, .devis-preview-modal__scroll-hint, .devis-preview-modal__backdrop",
  )) {
    el.style.setProperty("display", "none", "important");
  }

  if (edit && !edit.classList.contains("is-open")) {
    edit.style.setProperty("display", "none", "important");
  }

  if (body) {
    body.style.cssText = "flex:1;min-height:0;display:block;overflow:hidden;position:relative;";
  }
  if (wrap) {
    wrap.style.cssText =
      "position:absolute;inset:0;bottom:56px;padding:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#fff;";
  }
  if (bar) {
    bar.hidden = false;
    bar.style.cssText =
      "display:flex;position:fixed;left:0;right:0;bottom:0;z-index:10001;align-items:center;gap:6px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #e2e8f0;box-shadow:0 -4px 16px rgba(15,23,42,.08);";
  }

  document.body.classList.add("devis-preview-cinema-open");
  modal.classList.add("devis-preview-modal--cinema");
}

function showMobileEditPanel(modal, open) {
  const edit = modal.querySelector(".devis-preview-modal__edit");
  if (!edit) return;
  edit.classList.toggle("is-open", open);
  modal.classList.toggle("devis-preview-modal--edit-open", open);
  if (open) {
    edit.style.cssText =
      "display:block !important;position:fixed;left:0;right:0;bottom:56px;top:10dvh;z-index:10000;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#fff;padding:16px;border-radius:16px 16px 0 0;box-shadow:0 -12px 40px rgba(15,23,42,.2);";
  } else {
    edit.style.setProperty("display", "none", "important");
  }
}

const PREVIEW_DOC_WIDTH = 794;

function extractPreviewDocumentParts(html) {
  const styles = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = re.exec(html)) !== null) styles.push(match[1]);
  const pageMatch = html.match(/<div class="page"[\s\S]*(?=<\/body>)/);
  return {
    styles: styles.join("\n"),
    pageHtml: pageMatch ? pageMatch[0] : html,
  };
}

function fitPreviewMobileView(viewEl, wrapEl) {
  if (!viewEl || !wrapEl) return;
  const page = viewEl.querySelector(".page") ?? viewEl;
  const containerWidth = Math.max(wrapEl.clientWidth || window.innerWidth, 280);
  const scale = containerWidth / PREVIEW_DOC_WIDTH;

  page.style.boxSizing = "border-box";
  page.style.width = `${PREVIEW_DOC_WIDTH}px`;
  page.style.maxWidth = "none";
  page.style.transformOrigin = "top left";
  page.style.transform = `scale(${scale})`;

  const rawHeight = Math.max(page.scrollHeight, page.offsetHeight, 120);
  viewEl.style.width = "100%";
  viewEl.style.height = `${Math.ceil(rawHeight * scale) + 8}px`;
  viewEl.style.overflow = "hidden";
  page.style.marginBottom = `${-rawHeight * (1 - scale)}px`;
}

function scheduleMobileViewFit(viewEl, wrapEl) {
  const run = () => fitPreviewMobileView(viewEl, wrapEl);
  run();
  requestAnimationFrame(run);
  setTimeout(run, 80);
  setTimeout(run, 250);
  setTimeout(run, 600);
  setTimeout(run, 1200);
}

function fitPreviewIframe(iframe) {
  const wrap = iframe.closest(".devis-preview-modal__frame-wrap");
  const mobileView = wrap?.querySelector(".devis-preview-mobile-view");
  if (mobileView && !mobileView.hidden) {
    scheduleMobileViewFit(mobileView, wrap);
    return;
  }

  const scaler = iframe.parentElement?.classList.contains("devis-preview-modal__frame-scaler")
    ? iframe.parentElement
    : null;

  const resetStyles = () => {
    iframe.style.transform = "";
    iframe.style.transformOrigin = "";
    iframe.style.width = "";
    iframe.style.height = "";
    iframe.style.marginBottom = "";
    if (scaler) {
      scaler.style.transform = "";
      scaler.style.width = "";
      scaler.style.height = "";
      scaler.style.marginBottom = "";
    }
    if (wrap) wrap.classList.remove("is-scaled");
  };

  const apply = () => {
    resetStyles();
    const doc = iframe.contentDocument;
    if (!doc?.body) return;

    const page = doc.querySelector(".page") ?? doc.body;
    page.style.transform = "";
    page.style.marginBottom = "";

    if (!isMobilePreview()) {
      iframe.style.width = "100%";
      iframe.style.height = `${Math.max(page.scrollHeight + 24, 480)}px`;
      return;
    }

    const containerWidth = Math.max((wrap?.clientWidth ?? iframe.clientWidth), 280);
    const scale = containerWidth / PREVIEW_DOC_WIDTH;
    const contentHeight = Math.max(page.scrollHeight, page.offsetHeight, 120);

    page.style.width = `${PREVIEW_DOC_WIDTH}px`;
    page.style.boxSizing = "border-box";
    iframe.style.width = `${PREVIEW_DOC_WIDTH}px`;
    iframe.style.height = `${contentHeight}px`;
    iframe.style.border = "none";

    if (scaler) {
      scaler.style.width = `${PREVIEW_DOC_WIDTH}px`;
      scaler.style.height = `${contentHeight}px`;
      scaler.style.transform = `scale(${scale})`;
      scaler.style.transformOrigin = "top left";
      scaler.style.marginBottom = `${-contentHeight * (1 - scale)}px`;
      wrap?.classList.add("is-scaled");
    }
  };

  const scheduleApply = () => {
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 80);
    setTimeout(apply, 250);
    setTimeout(apply, 600);
  };

  iframe.onload = scheduleApply;
  scheduleApply();

  if (!iframe.dataset.fitBound) {
    iframe.dataset.fitBound = "1";
    window.addEventListener("resize", scheduleApply);
    window.visualViewport?.addEventListener("resize", scheduleApply);
  }
}

function formatDateShort(date = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function validityDateShort(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateShort(date);
}

function phoneTelHref(phone = "") {
  const raw = String(phone).replace(/[^\d+]/g, "");
  return raw || "";
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function validityDate(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function companyInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "EX";
}

function buildCompanyBlock(profile, user) {
  const name =
    profile.companyName?.trim() ||
    user?.firstname ||
    "Votre entreprise";

  const address = getFullCompanyAddress(profile);
  const legalParts = [profile.companyLegalForm?.trim(), profile.companyCapital?.trim() && `Capital ${profile.companyCapital.trim()}`]
    .filter(Boolean);

  return {
    name,
    initials: companyInitials(name),
    address,
    siret: profile.companySiret?.trim() || "",
    rcs: profile.companyRcs?.trim() || "",
    tvaIntra: profile.companyTvaIntra?.trim() || "",
    ape: profile.companyApe?.trim() || "",
    legalForm: profile.companyLegalForm?.trim() || "",
    legalLine: legalParts.join(" — "),
    website: profile.companyWebsite?.trim() || "",
    phone: profile.companyPhone?.trim() || "",
    email: profile.companyEmail?.trim() || user?.email || "",
    trade: TRADES[profile.tradeType]?.label || "Artisan du bâtiment",
    country: profile.country || "FR",
    tvaRegime: profile.tvaRegime || "franchise",
    insuranceRcPro: profile.insuranceRcPro?.trim() || "",
    insuranceDecennale: profile.insuranceDecennale?.trim() || "",
    legalFooterNote: profile.legalFooterNote?.trim() || "",
  };
}

function buildLaborPhases(quote) {
  const jobName = quote.jobName || "Prestation artisanale";
  return [
    {
      label: "Préparation et protection du chantier",
      ratio: 0.12,
      detail:
        "Mise en sécurité des locaux, protection des zones adjacentes, préparation des supports et contrôle des conditions d'intervention.",
    },
    {
      label: `Exécution — ${jobName}`,
      ratio: 0.68,
      detail:
        "Réalisation des travaux conformément aux règles de l'art, aux normes en vigueur et au cahier des charges convenu.",
    },
    {
      label: "Finitions, contrôle et nettoyage",
      ratio: 0.12,
      detail:
        "Finitions soignées, contrôle qualité, essais de bon fonctionnement et remise en état des lieux.",
    },
    {
      label: "Gestion de chantier et coordination",
      ratio: 0.08,
      detail:
        "Pilotage de l'intervention, interface client, suivi d'avancement et coordination des intervenants.",
    },
  ];
}

function resolveTradeType(quote, profile) {
  const fromLine = quote?.lineItems?.find((line) => line.tradeType)?.tradeType;
  return fromLine || profile?.tradeType || quote?.tradeType || "general";
}

function buildClientLineItems(quote, profile) {
  const q = normalizeQuote(quote);
  const tradeType = resolveTradeType(q, profile);

  if (hasDetailedLineItems(q)) {
    const clientLines = filterLinesForClient(q.lineItems, tradeType);
    let items = buildClientPdfLineItems(clientLines);

    if (!items.some((item) => item.sectionGroup === "mo") && q.hours > 0 && getHourlyLaborLines(q.lineItems).length === 0) {
      const rate = computeProfileSummary(profile).minHourlyRate || 45;
      items.unshift({
        index: 0,
        sectionGroup: "mo",
        section: "mo",
        ref: "MO-HEURES",
        designation: q.jobName?.trim()
          ? `Main d'œuvre — ${q.jobName.trim()}`
          : "Main d'œuvre — heures",
        description: `Prestation professionnelle — ${q.hours} h.`,
        unit: "h",
        qty: q.hours,
        unitPrice: rate,
        total: Math.round(q.hours * rate * 100) / 100,
      });
      items.forEach((item, idx) => {
        item.index = idx + 1;
      });
    }

    return items;
  }

  const laborTotal = getLaborSellTotal(q);
  const hours = q.hours || 0;
  const jobName = q.jobName?.trim() || "Prestation artisanale";
  const items = [];

  if (laborTotal > 0) {
    const unitPrice =
      hours > 0 ? Math.round((laborTotal / hours) * 100) / 100 : laborTotal;
    items.push({
      index: 1,
      sectionGroup: "mo",
      section: "mo",
      ref: "MO-01",
      designation: jobName,
      description:
        hours > 0
          ? `Main d'œuvre — ${hours} h (taux horaire professionnel).`
          : "Main d'œuvre et prestation.",
      unit: hours > 0 ? "h" : "forfait",
      qty: hours > 0 ? hours : 1,
      unitPrice,
      total: laborTotal,
    });
  }

  if (q.materialSellPrice > 0) {
    items.push({
      index: items.length + 1,
      sectionGroup: "materials",
      section: laborTotal > 0 ? null : "materials",
      ref: "FO-01",
      designation: "Fournitures et matériaux",
      description:
        "Matériaux et consommables nécessaires à la réalisation des travaux.",
      unit: "forfait",
      qty: 1,
      unitPrice: q.materialSellPrice,
      total: q.materialSellPrice,
    });
  }

  return items;
}

function renderQuoteSectionsDocument(items) {
  return renderClientQuoteTable(items, {
    escapeHtml,
    translateUnit,
    formatEuroDetailed,
    locale: getLocale(),
  });
}

function legalMentions(company, validityDays, additionalNote, documentType = "devis") {
  const tvaLine =
    company.tvaRegime === "reel" && company.tvaIntra
      ? `TVA intracommunautaire : ${company.tvaIntra} — TVA applicable selon taux en vigueur.`
      : company.tvaRegime === "reel"
        ? "TVA applicable selon les taux en vigueur."
        : "TVA non applicable, article 293 B du CGI (franchise en base) — sauf mention contraire.";

  const insuranceLines = [];
  if (company.insuranceRcPro) insuranceLines.push(`Assurance RC professionnelle : ${company.insuranceRcPro}.`);
  else insuranceLines.push("Assurance responsabilité civile professionnelle souscrite.");
  if (company.insuranceDecennale) insuranceLines.push(`Assurance décennale : ${company.insuranceDecennale}.`);

  const lines =
    documentType === "facture"
      ? [
          "Facture payable selon les modalités de règlement indiquées ci-dessous.",
          tvaLine,
          "En cas de retard de paiement, des pénalités pourront être appliquées conformément à la réglementation en vigueur.",
          ...insuranceLines,
        ]
      : [
          `Devis valable ${validityDays} jours à compter de la date d'émission.`,
          tvaLine,
          "Les travaux supplémentaires non prévus feront l'objet d'un avenant chiffré et accepté avant exécution.",
          ...insuranceLines,
          "Garantie de parfait achèvement selon articles 1792 et suivants du Code civil.",
          "En cas d'acceptation : retourner ce devis signé avec la mention manuscrite « Bon pour accord » et le cachet de l'entreprise.",
        ];

  if (company.legalFooterNote) lines.push(company.legalFooterNote);
  if (additionalNote) lines.push(additionalNote);
  return lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

function parseDepositFromTerms(paymentTerms, totalHT) {
  const match = String(paymentTerms || "").match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) return null;
  const pct = parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(pct) || pct <= 0) return null;
  const amount = Math.round(((totalHT * pct) / 100) * 100) / 100;
  return { pct, amount };
}

const DEVIS_FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');";

/** Styles communs devis client + employeur (en-tête, tableau, typo). */
const DEVIS_SHARED_CSS = `
    :root {
      --navy: #0b1220;
      --navy-soft: #1e293b;
      --accent: #6665dd;
      --accent-soft: #f0f3fd;
      --border: #e2e8f0;
      --muted: #64748b;
      --bg: #f8fafc;
      --serif: "Instrument Serif", Georgia, serif;
      --sans: "DM Sans", system-ui, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--sans); color: var(--navy-soft); font-size: 10pt; line-height: 1.4; background: #fff; }
    .page { max-width: 210mm; margin: 0 auto; padding: 0; }
    .doc-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 8px 14px; border-bottom: 1px solid var(--border); }
    .doc-head__left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 0 1 auto; max-width: 42%; }
    .monogram { width: 34px; height: 34px; border-radius: 8px; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; letter-spacing: 0.04em; flex-shrink: 0; }
    .doc-head__seller { min-width: 0; }
    .doc-head__name { font-size: 0.92rem; font-weight: 800; color: var(--navy); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .doc-head__phone { display: inline-block; margin-top: 1px; font-size: 0.68rem; font-weight: 700; color: var(--accent); text-decoration: none; line-height: 1.3; }
    a.doc-head__phone:hover { text-decoration: underline; }
    .doc-head__seller-line { font-size: 0.62rem; color: var(--muted); line-height: 1.3; margin-top: 1px; max-width: 220px; }
    .doc-head__right { flex: 1 1 auto; min-width: 0; text-align: right; }
    .doc-head__meta { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 3px 5px; margin: 0; font-size: 0.66rem; line-height: 1.35; color: var(--navy-soft); }
    .doc-head__title { font-family: var(--serif); font-size: 0.82rem; font-weight: 400; color: var(--accent); letter-spacing: 0.03em; line-height: 1.35; display: inline-flex; align-items: center; }
    .doc-head__num { font-weight: 800; color: var(--navy); }
    .doc-head__dot { color: #cbd5e1; font-weight: 700; user-select: none; }
    .doc-head__tag { font-size: 0.58rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
    .doc-head__client { font-size: 0.72rem; font-weight: 800; color: var(--navy); }
    .doc-head__client-block { margin-top: 4px; text-align: right; }
    .doc-head__client-row { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 3px 6px; line-height: 1.3; }
    .doc-head__client-detail { margin: 1px 0 0; font-size: 0.62rem; color: var(--muted); line-height: 1.35; text-align: right; }
    .body { padding: 8px 14px 12px; }
    .object-line { font-size: 0.72rem; color: var(--navy-soft); line-height: 1.4; margin-bottom: 8px; }
    .object-line strong { color: var(--accent); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em; margin-right: 4px; }
    .quote-table-wrap { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 0; }
    .quote-table { width: 100%; border-collapse: collapse; font-size: 0.72rem; table-layout: fixed; }
    .quote-table thead th { background: var(--accent); color: #fff; padding: 4px 6px; font-size: 0.56rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-align: left; }
    .quote-table thead th.num { text-align: right; }
    .quote-table tbody td { padding: 3px 6px; border-bottom: 1px solid var(--border); vertical-align: top; line-height: 1.28; }
    .quote-table tbody tr:last-child td { border-bottom: none; }
    .quote-table .num { text-align: right; white-space: nowrap; }
    .quote-table__group td { background: #f1f5f9; font-size: 0.64rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--navy); padding: 4px 8px; border-bottom: 1px solid var(--border); }
`;

const INTERNAL_DEVIS_EXTRA_CSS = `
    .internal-banner { background: #7f1d1d; color: #fff; text-align: center; padding: 4px 10px; font-weight: 800; font-size: 0.58rem; letter-spacing: 0.12em; text-transform: uppercase; }
    .internal-table .col-ref { width: 8%; font-size: 0.62rem; color: var(--muted); }
    .internal-table .col-designation { width: 28%; word-break: break-word; }
    .internal-table .col-qty { width: 9%; }
    .internal-table .col-buy { width: 13%; }
    .internal-table .col-sell { width: 13%; }
    .internal-table .col-total { width: 14%; }
    .internal-table .col-coeff { width: 9%; }
    .internal-table small { display: block; font-size: 0.58rem; color: var(--muted); margin-top: 1px; }
    .purchase { color: #b45309; font-weight: 700; }
    .sell { color: #0d7a4a; font-weight: 700; }
    .ok { color: #0d7a4a; font-weight: 800; }
    .warn { color: #b91c1c; font-weight: 800; }
    tr.internal-only td { background: #fafbfc; }
    .internal-panel { display: grid; grid-template-columns: 1fr minmax(200px, 36%); gap: 10px; margin: 8px 0; align-items: start; break-inside: avoid; }
    .internal-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
    .internal-kpi { border: 1px solid var(--border); border-radius: 6px; padding: 4px 7px; background: var(--bg); }
    .internal-kpi span { display: block; font-size: 0.54rem; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1px; }
    .internal-kpi strong { font-size: 0.74rem; color: var(--navy); font-weight: 800; }
    .internal-side { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .internal-result { padding: 7px 9px; font-size: 0.66rem; line-height: 1.35; border-bottom: 1px solid var(--border); }
    .internal-result--success { background: #e6f6ee; color: #0d7a4a; }
    .internal-result--warning { background: #fef3c7; color: #b45309; }
    .internal-result--danger { background: #fee2e2; color: #b91c1c; }
    .internal-result strong { display: block; font-size: 0.72rem; margin-bottom: 2px; }
    .internal-result p { margin: 0 0 4px; opacity: 0.9; }
    .internal-result__metrics { display: flex; flex-direction: column; gap: 2px; font-size: 0.62rem; }
    .internal-net { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 7px 10px; background: var(--accent); color: #fff; }
    .internal-net span { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    .internal-net strong { font-family: var(--serif); font-size: 1.1rem; font-weight: 400; }
    .internal-note { margin-top: 6px; padding-top: 5px; border-top: 1px solid var(--border); font-size: 0.58rem; color: var(--muted); line-height: 1.35; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 9pt; }
      .page { max-width: none; }
      .doc-head { padding: 5px 10px !important; }
      .body { padding: 5mm 7mm 4mm !important; }
      .quote-table { font-size: 7pt; }
      .quote-table thead th { padding: 2px 4px; font-size: 5.8pt; }
      .quote-table tbody td { padding: 2px 4px; }
      .internal-kpi { padding: 3px 5px; }
      .internal-kpi strong { font-size: 7pt; }
      @page { margin: 6mm 7mm; size: A4 portrait; }
    }
    ${PREVIEW_MOBILE_STYLES}
`;

function renderDocHeadHtml({
  company,
  artisanTel,
  docLabel,
  devisNumber,
  issuedShort,
  validShort,
  workDays,
  clientDisplayName,
  clientAddressLine,
  clientEmail = "",
  metaExtra = "",
}) {
  return `
    <header class="doc-head">
      <div class="doc-head__left">
        <div class="monogram">${escapeHtml(company.initials)}</div>
        <div class="doc-head__seller">
          <div class="doc-head__name">${escapeHtml(company.name)}</div>
          ${
            company.phone
              ? artisanTel
                ? `<a class="doc-head__phone" href="tel:${artisanTel}">☎ ${escapeHtml(company.phone)}</a>`
                : `<span class="doc-head__phone">☎ ${escapeHtml(company.phone)}</span>`
              : ""
          }
          ${company.address ? `<div class="doc-head__seller-line">${escapeHtml(company.address)}</div>` : ""}
        </div>
      </div>
      <div class="doc-head__right">
        <p class="doc-head__meta">
          <span class="doc-head__title">${docLabel}</span>
          <span class="doc-head__dot" aria-hidden="true">·</span>
          <span>${issuedShort}</span>
          <span class="doc-head__dot" aria-hidden="true">·</span>
          <span>Val. ${validShort}</span>
          <span class="doc-head__dot" aria-hidden="true">·</span>
          <span>${workDays}&nbsp;j.</span>
          ${metaExtra}
        </p>
        <div class="doc-head__client-block">
          <div class="doc-head__client-row">
            <span class="doc-head__tag">Client</span>
            <strong class="doc-head__client">${escapeHtml(clientDisplayName)}</strong>
            <span class="doc-head__dot" aria-hidden="true">·</span>
            <span class="doc-head__num">n° ${escapeHtml(devisNumber)}</span>
          </div>
          ${clientAddressLine ? `<p class="doc-head__client-detail">${escapeHtml(clientAddressLine)}</p>` : ""}
          ${clientEmail ? `<p class="doc-head__client-detail">${escapeHtml(clientEmail)}</p>` : ""}
        </div>
      </div>
    </header>`;
}

/**
 * Document strictement destiné au client.
 * Ne reçoit JAMAIS de données de rentabilité (marge, prix min., analyse…).
 */
export function buildClientDevisDocument({
  profile,
  user,
  quote,
  client,
  devisNumber,
  validityDays = 30,
  additionalNote = "",
  projectDescription = "",
  paymentTerms = PAYMENT_DEFAULT,
  executionDelay = "",
  documentType = "devis",
  sourceDevisNumber = "",
}) {
  const q = normalizeQuote(quote);
  const company = buildCompanyBlock(profile, user);
  const issuedAt = formatDate();
  const validUntil = validityDate(validityDays);
  const issuedShort = formatDateShort();
  const validShort = validityDateShort(validityDays);
  const artisanTel = phoneTelHref(company.phone);
  const isFacture = documentType === "facture";
  const docLabel = isFacture ? "FACTURE" : "DEVIS";
  const tradeType = resolveTradeType(q, profile);
  const lineItems = buildClientLineItems(q, profile);
  const sectionBlocks = buildSectionBlocks(lineItems);
  const lineCount = lineItems.length;
  const depositInfo = parseDepositFromTerms(paymentTerms, q.price);
  const objectText =
    projectDescription.trim() ||
    (isFacture
      ? `${q.jobName || "Prestation"} — facturation conforme au devis accepté${sourceDevisNumber ? ` n° ${sourceDevisNumber}` : ""}.`
      : `Intervention professionnelle pour ${q.jobName || "la prestation décrite ci-dessous"}, réalisée selon les règles de l'art et les normes applicables au corps de métier : ${company.trade}.`);
  const { density: printDensity, allowSecondPage } = computeClientPrintLayout({
    lineCount,
    blockCount: sectionBlocks.length,
    objectText,
    paymentTerms,
    additionalNote,
    hasDeposit: Boolean(depositInfo),
  });
  const tableHtml = renderQuoteSectionsDocument(lineItems);
  const workDays = Math.max(1, Math.ceil(q.hours / 8));
  const delayText =
    executionDelay.trim() ||
    (isFacture
      ? `Prestation réalisée — durée estimée ${q.hours} heure(s).`
      : `Délai indicatif : ${workDays} jour(s) ouvré(s) après acceptation du devis.`);
  const clientDisplayName = formatClientDisplayName(client);
  const clientAddressLine = formatClientAddressLine(client);
  const settleHtml = renderClientSettlePanel({
    totalHT: q.price,
    paymentTerms,
    delayText,
    depositInfo,
    formatEuroDetailed,
    escapeHtml,
    isFacture,
    tvaRegime: company.tvaRegime,
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${docLabel} ${escapeHtml(devisNumber)} — ${escapeHtml(company.name)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');

    :root {
      --navy: #0b1220;
      --navy-soft: #1e293b;
      --accent: #6665dd;
      --accent-soft: #f0f3fd;
      --border: #e2e8f0;
      --muted: #64748b;
      --bg: #f8fafc;
      --serif: "Instrument Serif", Georgia, serif;
      --sans: "DM Sans", system-ui, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--sans);
      color: var(--navy-soft);
      font-size: 10pt;
      line-height: 1.4;
      background: #fff;
    }

    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }

    .body {
      padding: 8px 14px 12px;
    }

    .page-main {
      min-height: 0;
    }

    .page-bottom {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* ── En-tête compact (1 ligne) ── */
    .doc-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      padding: 8px 14px;
      border-bottom: 1px solid var(--border);
    }

    .doc-head__left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 0 1 auto;
      max-width: 42%;
    }

    .monogram {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.82rem;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    .doc-head__seller {
      min-width: 0;
    }

    .doc-head__name {
      font-size: 0.92rem;
      font-weight: 800;
      color: var(--navy);
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .doc-head__phone {
      display: inline-block;
      margin-top: 1px;
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--accent);
      text-decoration: none;
      line-height: 1.3;
    }

    a.doc-head__phone:hover {
      text-decoration: underline;
    }

    .doc-head__right {
      flex: 1 1 auto;
      min-width: 0;
      text-align: right;
    }

    .doc-head__meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
      gap: 3px 5px;
      margin: 0;
      font-size: 0.66rem;
      line-height: 1.35;
      color: var(--navy-soft);
    }

    .doc-head__title {
      font-family: var(--serif);
      font-size: 0.82rem;
      font-weight: 400;
      color: var(--accent);
      letter-spacing: 0.03em;
      line-height: 1.35;
      display: inline-flex;
      align-items: center;
    }

    .doc-head__num {
      font-weight: 800;
      color: var(--navy);
    }

    .doc-head__dot {
      color: #cbd5e1;
      font-weight: 700;
      user-select: none;
    }

    .doc-head__tag {
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .doc-head__client {
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--navy);
    }

    .doc-head__sub {
      margin: 2px 0 0;
      font-size: 0.62rem;
      color: var(--muted);
      line-height: 1.3;
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .doc-head__client-block {
      margin-top: 4px;
      text-align: right;
    }

    .doc-head__client-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
      gap: 3px 6px;
      line-height: 1.3;
    }

    .doc-head__client-detail {
      margin: 1px 0 0;
      font-size: 0.62rem;
      color: var(--muted);
      line-height: 1.35;
      text-align: right;
    }

    .doc-head__seller-line {
      font-size: 0.62rem;
      color: var(--muted);
      line-height: 1.3;
      margin-top: 1px;
      max-width: 220px;
    }

    /* ── Corps ── */
    .object-line {
      font-size: 0.72rem;
      color: var(--navy-soft);
      line-height: 1.4;
      margin-bottom: 8px;
    }

    .object-line strong {
      color: var(--accent);
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-right: 4px;
    }

    .quote-table-wrap {
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 0;
    }

    .quote-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.74rem;
      table-layout: fixed;
    }

    .quote-table thead th {
      background: var(--accent);
      color: #fff;
      padding: 5px 8px;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      text-align: left;
    }

    .quote-table thead th.num { text-align: right; }

    .quote-table tbody td {
      padding: 4px 8px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      line-height: 1.3;
    }

    .quote-table tbody tr:last-child td { border-bottom: none; }

    .quote-table .col-designation {
      width: 42%;
      color: var(--navy-soft);
      word-break: break-word;
    }

    .quote-table .col-qty { width: 7%; white-space: nowrap; }
    .quote-table .col-unit { width: 9%; white-space: nowrap; font-size: 0.68rem; color: var(--muted); }
    .quote-table .col-price { width: 14%; }
    .quote-table .col-tva { width: 8%; color: var(--muted); font-size: 0.68rem; }
    .quote-table .col-total { width: 14%; }

    .quote-table .num { text-align: right; white-space: nowrap; }

    .quote-table .col-total strong {
      color: var(--navy);
      font-weight: 800;
    }

    .quote-table__group td {
      background: #f1f5f9;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--navy);
      padding: 6px 10px;
      border-bottom: 1px solid var(--border);
    }

    .quote-table__subtotal td {
      background: #fafbfc;
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--navy-soft);
      border-top: 1px dashed var(--border);
    }

    .quote-table__empty {
      padding: 16px;
      color: var(--muted);
      font-size: 0.85rem;
    }

    /* ── Bas Costructor : acompte + totaux ── */
    .doc-settle {
      display: grid;
      grid-template-columns: 1fr minmax(200px, 38%);
      gap: 12px;
      margin: 8px 0;
      align-items: start;
      break-inside: avoid;
    }

    .settle-deposit {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      background: var(--bg);
    }

    .settle-deposit__label {
      font-size: 0.6rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 4px;
    }

    .settle-deposit__value {
      font-size: 0.88rem;
      font-weight: 800;
      color: var(--navy);
    }

    .settle-deposit__value span {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--muted);
    }

    .settle-pay__label {
      font-size: 0.6rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 4px;
    }

    .settle-pay p {
      font-size: 0.68rem;
      color: var(--navy-soft);
      line-height: 1.4;
      margin-bottom: 3px;
    }

    .settle-pay__delay {
      color: var(--muted) !important;
      font-size: 0.65rem !important;
    }

    .doc-settle__right {
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }

    .settle-rows {
      padding: 6px 10px;
      background: #fafbfc;
      border-bottom: 1px solid var(--border);
    }

    .settle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 3px 0;
      font-size: 0.72rem;
    }

    .settle-row span { color: var(--navy-soft); font-weight: 600; flex: 1 1 auto; min-width: 0; }
    .settle-row strong {
      color: var(--navy);
      font-weight: 800;
      flex: 0 0 auto;
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .settle-net {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: var(--accent);
      color: #fff;
    }

    .settle-net span {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .settle-net strong {
      font-family: var(--serif);
      font-size: 1.25rem;
      font-weight: 400;
      white-space: nowrap;
    }

    .settle-vat-note {
      font-size: 0.58rem;
      color: var(--muted);
      padding: 4px 10px 6px;
      line-height: 1.3;
    }

    /* ── Signatures ── */
    .quote-footer {
      margin-bottom: 8px;
      break-inside: avoid;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 0;
    }

    .sign-box {
      border: 1px dashed var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      min-height: 0;
    }

    .sign-box__label {
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      margin-bottom: 3px;
    }

    .sign-box__hint {
      font-size: 0.62rem;
      color: var(--muted);
      line-height: 1.3;
    }

    .sign-box__area {
      margin-top: 22px;
      border-top: 1px solid var(--border);
      padding-top: 4px;
      font-size: 0.6rem;
      color: var(--muted);
      min-height: 28px;
    }

    .footer {
      border-top: 1px solid var(--navy);
      padding-top: 6px;
      margin-top: 6px;
    }

    .footer__legal {
      list-style: none;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 14px;
      margin-bottom: 6px;
    }

    .footer__legal li {
      font-size: 0.58rem;
      color: var(--muted);
      padding-left: 10px;
      position: relative;
      line-height: 1.3;
    }

    /* ── Densité A4 : sparse / compact / dense ── */
    .page--sparse .body { padding: 14px 16px 16px; }
    .page--sparse .object-line { margin-bottom: 10px; font-size: 0.76rem; line-height: 1.45; }
    .page--sparse .quote-table { font-size: 0.76rem; }
    .page--sparse .quote-table thead th { padding: 5px 8px; font-size: 0.58rem; }
    .page--sparse .quote-table tbody td { padding: 6px 8px; }
    .page--sparse .doc-settle { margin-top: 14px; margin-bottom: 10px; }
    .page--sparse .sign-box__area { margin-top: 30px; min-height: 34px; }
    .page--sparse .footer { margin-top: 10px; }

    .page--compact .body { padding: 10px 14px 12px; }
    .page--compact .object-line { margin-bottom: 7px; }
    .page--compact .quote-table tbody td { padding: 4px 7px; }
    .page--compact .doc-settle { margin: 8px 0; }
    .page--compact .sign-box__area { margin-top: 22px; min-height: 26px; }

    .page--dense .doc-head { padding: 5px 10px; gap: 10px; }
    .page--dense .doc-head__title { font-size: 0.85rem; }
    .page--dense .doc-head__meta { font-size: 0.6rem; }
    .page--dense .monogram { width: 28px; height: 28px; font-size: 0.72rem; }
    .page--dense .doc-head__name { font-size: 0.82rem; }
    .page--dense .body { padding: 6px 10px 8px; font-size: 9pt; }
    .page--dense .object-line { font-size: 0.66rem; margin-bottom: 5px; line-height: 1.35; }
    .page--dense .quote-table { font-size: 0.66rem; }
    .page--dense .quote-table thead th { padding: 3px 6px; font-size: 0.55rem; }
    .page--dense .quote-table tbody td { padding: 2px 6px; }
    .page--dense .doc-settle { gap: 8px; margin: 5px 0; }
    .page--dense .settle-net { padding: 6px 10px; }
    .page--dense .settle-net strong { font-size: 1.05rem; }
    .page--dense .sign-box__area { margin-top: 14px; min-height: 20px; }
    .page--dense .footer__legal { font-size: 0.54rem; grid-template-columns: 1fr; }

    .page--allow-break .page-main,
    .page--allow-break .quote-table-wrap { break-inside: auto; page-break-inside: auto; }
    .page--allow-break .quote-table thead { display: table-header-group; }
    .page--allow-break .quote-table tr { break-inside: avoid; page-break-inside: avoid; }
    .page--allow-break .page-bottom { break-inside: avoid; page-break-inside: avoid; }

    .quote-hero {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 14px;
      margin-bottom: 26px;
    }

    .quote-hero__amount-card {
      background: linear-gradient(135deg, var(--navy) 0%, #1a2744 100%);
      color: #fff;
      border-radius: 14px;
      padding: 22px 24px;
      position: relative;
      overflow: hidden;
    }

    .quote-hero__amount-card::after {
      content: "";
      position: absolute;
      top: -40px;
      right: -40px;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: rgba(102, 101, 221, 0.18);
    }

    .quote-hero__eyebrow {
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      opacity: 0.72;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }

    .quote-hero__amount-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      position: relative;
      z-index: 1;
    }

    .quote-hero__amount {
      font-family: var(--serif);
      font-size: 2.35rem;
      font-weight: 400;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .quote-hero__ht {
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      opacity: 0.65;
    }

    .quote-hero__tagline {
      margin-top: 10px;
      font-size: 0.78rem;
      opacity: 0.78;
      line-height: 1.45;
      position: relative;
      z-index: 1;
    }

    .quote-hero__metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .quote-hero__metric {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 14px;
      text-align: center;
    }

    .quote-hero__metric-value {
      display: block;
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--navy);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .quote-hero__metric-label {
      display: block;
      margin-top: 4px;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
    }

    /* ── Lots devis (style pro) ── */
    .quote-intro {
      margin-bottom: 18px;
      padding: 0 2px;
    }

    .quote-intro__label {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin-bottom: 4px;
    }

    .quote-intro__text {
      font-size: 0.88rem;
      color: var(--navy-soft);
      line-height: 1.5;
    }

    .quote-sections {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .quote-section {
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
      break-inside: avoid;
      box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
    }

    .quote-section__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: var(--section-accent-soft, #f8fafc);
      border-bottom: 1px solid var(--border);
      border-left: 5px solid var(--section-accent);
    }

    .quote-section__head-main {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .quote-section__head-meta {
      text-align: right;
      flex-shrink: 0;
    }

    .quote-section__count {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--section-accent);
      background: #fff;
      border: 1px solid color-mix(in srgb, var(--section-accent) 25%, #fff);
      border-radius: 999px;
      padding: 3px 10px;
      margin-bottom: 6px;
    }

    .quote-section__num {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--section-accent);
      color: #fff;
      font-size: 0.88rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.04em;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--section-accent) 35%, transparent);
    }

    .quote-section__title {
      font-size: 1rem;
      font-weight: 800;
      color: var(--navy);
      letter-spacing: -0.02em;
      margin: 0 0 2px;
    }

    .quote-section__subtitle {
      font-size: 0.76rem;
      color: var(--muted);
      margin: 0;
      line-height: 1.35;
    }

    .quote-section__head-total {
      text-align: right;
      flex-shrink: 0;
    }

    .quote-section__head-total-label {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 2px;
    }

    .quote-section__head-total strong {
      font-size: 1.02rem;
      font-weight: 800;
      color: var(--navy);
    }

    .quote-section__table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .quote-section__table {
      width: 100%;
      border-collapse: collapse;
    }

    .quote-section__table thead th {
      background: #f8fafc;
      color: var(--muted);
      padding: 8px 16px;
      font-size: 0.64rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1px solid var(--border);
    }

    .quote-section__table tbody td {
      padding: 11px 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.84rem;
      vertical-align: top;
    }

    .quote-section__table tbody tr:last-child td {
      border-bottom: none;
    }

    .quote-section__table .designation strong {
      display: block;
      color: var(--navy-soft);
      font-weight: 600;
      line-height: 1.4;
    }

    .quote-section__table .num {
      text-align: right;
      white-space: nowrap;
      color: var(--navy-soft);
    }

    .quote-section__table .qty {
      font-weight: 700;
      color: var(--navy);
    }

    .quote-section__table .unit {
      display: block;
      font-size: 0.72rem;
      color: var(--muted);
      font-weight: 500;
    }

    .quote-section__table .line-total {
      font-weight: 800;
      color: var(--navy);
    }

    .quote-section__table tbody tr.is-alt td {
      background: #fafbfd;
    }

    .quote-section__table .line-desc {
      display: block;
      margin-top: 3px;
      font-size: 0.74rem;
      color: var(--muted);
      line-height: 1.4;
      font-weight: 400;
    }

    .quote-section__foot td {
      background: color-mix(in srgb, var(--section-accent) 8%, #fff);
      border-top: 2px solid color-mix(in srgb, var(--section-accent) 30%, #fff);
      padding: 10px 16px;
      font-size: 0.82rem;
    }

    .quote-section__foot-label {
      display: block;
      font-size: 0.64rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .quote-section__foot-name {
      display: block;
      font-weight: 700;
      color: var(--navy);
      margin-top: 2px;
    }

    .quote-section__foot .num {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--section-accent);
    }

    /* ── Récap premium ── */
    .recap-premium {
      margin-bottom: 28px;
      border: 2px solid var(--navy);
      border-radius: 16px;
      overflow: hidden;
      background: #fff;
      break-inside: avoid;
    }

    .recap-premium__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding: 20px 24px;
      background: linear-gradient(135deg, var(--navy) 0%, #1a2744 100%);
      color: #fff;
    }

    .recap-premium__eyebrow {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      opacity: 0.7;
      margin-bottom: 4px;
    }

    .recap-premium__title {
      font-family: var(--serif);
      font-size: 1.55rem;
      font-weight: 400;
      letter-spacing: -0.01em;
      margin: 0;
    }

    .recap-premium__total-badge {
      text-align: right;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 12px;
      padding: 12px 18px;
      min-width: 160px;
    }

    .recap-premium__total-badge span {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.72;
      margin-bottom: 4px;
    }

    .recap-premium__total-badge strong {
      font-family: var(--serif);
      font-size: 1.65rem;
      font-weight: 400;
      color: #fff;
      letter-spacing: -0.02em;
    }

    .recap-premium__composition {
      padding: 18px 24px 8px;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }

    .composition__bar {
      display: flex;
      height: 10px;
      border-radius: 999px;
      overflow: hidden;
      background: #e2e8f0;
      margin-bottom: 12px;
    }

    .composition__seg {
      min-width: 4px;
      transition: flex 0.2s;
    }

    .composition__legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
    }

    .composition__item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.76rem;
      color: var(--navy-soft);
      font-weight: 600;
    }

    .composition__item i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .composition__item em {
      font-style: normal;
      font-size: 0.68rem;
      font-weight: 800;
      color: var(--muted);
    }

    .recap-premium__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      padding: 18px 24px;
    }

    .recap-premium__card {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 16px;
      background: #fff;
      border-top: 3px solid var(--card-accent);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 96px;
    }

    .recap-premium__card-top {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
    }

    .recap-premium__card-num {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: color-mix(in srgb, var(--card-accent) 12%, #fff);
      color: var(--card-accent);
      font-size: 0.72rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .recap-premium__card-title {
      font-size: 0.82rem;
      font-weight: 800;
      color: var(--navy);
      margin: 0 0 2px;
      line-height: 1.25;
    }

    .recap-premium__card-sub {
      font-size: 0.68rem;
      color: var(--muted);
      margin: 0;
    }

    .recap-premium__card-amount {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--navy);
      letter-spacing: -0.01em;
    }

    .recap-premium__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      background: var(--accent-soft);
      border-top: 1px solid #dfe6fb;
    }

    .recap-premium__footer-note {
      font-size: 0.72rem;
      color: var(--muted);
      line-height: 1.45;
      max-width: 340px;
    }

    .recap-premium__footer-total {
      text-align: right;
      flex-shrink: 0;
    }

    .recap-premium__footer-total span {
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--navy);
      margin-bottom: 4px;
    }

    .recap-premium__footer-total strong {
      font-family: var(--serif);
      font-size: 1.85rem;
      font-weight: 400;
      color: var(--accent);
      letter-spacing: -0.02em;
    }

    .recap-premium--simple .recap-premium__footer {
      border-top: none;
    }

    .recap-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 0.86rem;
    }

    .recap-row__label {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--navy-soft);
      font-weight: 600;
    }

    .recap-row__num {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #f1f5f9;
      color: var(--muted);
      font-size: 0.68rem;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .recap-row strong {
      color: var(--navy);
      font-weight: 700;
    }

    /* ── Ancien tableau (interne) ── */
    .table-wrap {
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead th {
      background: var(--navy-soft);
      color: #fff;
      padding: 11px 14px;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-align: left;
    }

    thead th.col-qty,
    thead th.col-price,
    thead th.col-total { text-align: right; }

    tbody td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      font-size: 0.84rem;
    }

    tbody tr:last-child td { border-bottom: none; }

    .section-row td {
      background: #eef2ff;
      color: #312e81;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 10px 12px;
      border-top: 2px solid #c7d2fe;
    }

    .section-subtotal-row td {
      background: #f8fafc;
      color: #334155;
      font-size: 0.78rem;
      font-weight: 700;
      text-align: right;
      border-top: 1px solid var(--border);
    }

    .section-subtotal-row .col-total {
      color: #0d7a4a;
      font-weight: 800;
    }

    .col-ref {
      width: 52px;
      font-size: 0.75rem;
      color: var(--muted);
      font-weight: 600;
    }

    .col-designation { min-width: 200px; }

    .col-designation strong {
      display: block;
      color: var(--navy);
      font-size: 0.86rem;
      margin-bottom: 4px;
    }

    .line-desc {
      display: block;
      font-size: 0.76rem;
      color: var(--muted);
      line-height: 1.45;
    }

    .col-unit {
      width: 56px;
      color: var(--muted);
      font-size: 0.78rem;
    }

    .col-qty,
    .col-price,
    .col-total {
      width: 90px;
      text-align: right;
      white-space: nowrap;
    }

    .col-total {
      font-weight: 700;
      color: var(--navy);
    }

    /* ── Totaux (doc interne legacy) ── */
    .totals-box {
      border: 2px solid var(--navy-soft);
      border-radius: 10px;
      overflow: hidden;
    }

    .totals-box__head {
      background: var(--navy-soft);
      color: #fff;
      padding: 10px 16px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 0.86rem;
    }

    .totals-row span { color: var(--muted); }
    .totals-row strong { color: var(--navy); }

    .totals-row--grand {
      background: var(--accent-soft);
      border-bottom: none;
      padding: 14px 16px;
    }

    .totals-row--grand span {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--navy);
    }

    .totals-row--grand strong {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--accent);
    }

    .totals-note {
      padding: 10px 16px;
      font-size: 0.72rem;
      color: var(--muted);
      background: var(--bg);
      line-height: 1.45;
    }

    .footer__legal li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: var(--accent);
    }

    .footer__bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.62rem;
      color: var(--muted);
      padding-top: 4px;
      border-top: 1px solid var(--border);
    }

    .footer__bar strong { color: var(--navy-soft); }

    ${PREVIEW_MOBILE_STYLES}

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 9pt; }
      .page {
        width: 100%;
        max-width: none;
        min-height: 283mm;
        display: flex;
        flex-direction: column;
        page-break-after: avoid;
      }
      .page:not(.page--allow-break) { page-break-inside: avoid; }
      .doc-head { flex-shrink: 0; padding: 5px 10px !important; gap: 8px !important; align-items: flex-start !important; }
      .monogram { width: 28px !important; height: 28px !important; font-size: 0.72rem !important; }
      .doc-head__meta { font-size: 6.5pt; gap: 2px 4px; }
      .doc-head__title { font-size: 9pt; }
      .body {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        padding: 5mm 7mm 4mm !important;
        min-height: 0;
      }
      .page-main { flex: 0 1 auto; }
      .page-bottom {
        flex: 0 0 auto;
        margin-top: auto;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .object-line { font-size: 7.5pt; margin-bottom: 4px; }
      .quote-table-wrap { margin-bottom: 0; }
      .quote-table { font-size: 7.5pt; }
      .quote-table thead th { padding: 3px 5px; font-size: 6pt; }
      .quote-table tbody td { padding: 2px 5px; }
      .page--sparse .body { padding: 7mm 8mm 6mm !important; }
      .page--sparse .quote-table tbody td { padding: 4px 6px; }
      .page--sparse .sign-box__area { margin-top: 24px; min-height: 28px; }
      .page--compact .quote-table tbody td { padding: 3px 5px; }
      .page--dense .quote-table { font-size: 7pt; }
      .page--dense .quote-table tbody td { padding: 1.5px 4px; }
      .page--dense .object-line { font-size: 7pt; }
      .doc-settle { gap: 5px; margin: 4px 0; }
      .settle-row { font-size: 7pt; }
      .settle-net { padding: 5px 10px; }
      .settle-net strong { font-size: 1rem; }
      .signature-grid { gap: 5px; }
      .sign-box { padding: 5px 8px; }
      .sign-box__area { margin-top: 18px; min-height: 24px; }
      .footer { margin-top: 3px; padding-top: 3px; }
      .footer__legal { font-size: 5.8pt; line-height: 1.25; gap: 1px 10px; }
      .footer__legal li { margin-bottom: 0; padding-left: 8px; }
      .footer__bar { font-size: 5.8pt; padding-top: 3px; }
      @page { margin: 6mm 7mm; size: A4 portrait; }
    }
  </style>
</head>
<body>
  <div class="page page--${printDensity}${allowSecondPage ? " page--allow-break" : ""}">
    <header class="doc-head">
      <div class="doc-head__left">
        <div class="monogram">${escapeHtml(company.initials)}</div>
        <div class="doc-head__seller">
          <div class="doc-head__name">${escapeHtml(company.name)}</div>
          ${
            company.phone
              ? artisanTel
                ? `<a class="doc-head__phone" href="tel:${artisanTel}">☎ ${escapeHtml(company.phone)}</a>`
                : `<span class="doc-head__phone">☎ ${escapeHtml(company.phone)}</span>`
              : ""
          }
          ${company.address ? `<div class="doc-head__seller-line">${escapeHtml(company.address)}</div>` : ""}
        </div>
      </div>
      <div class="doc-head__right">
        <p class="doc-head__meta">
          <span class="doc-head__title">${docLabel}</span>
          <span class="doc-head__dot" aria-hidden="true">·</span>
          <span>${issuedShort}</span>
          <span class="doc-head__dot" aria-hidden="true">·</span>
          <span>${isFacture ? "Éch." : "Val."} ${validShort}</span>
          <span class="doc-head__dot" aria-hidden="true">·</span>
          <span>${workDays}&nbsp;j.</span>
          ${sourceDevisNumber && isFacture ? `<span class="doc-head__dot" aria-hidden="true">·</span><span>Réf. ${escapeHtml(sourceDevisNumber)}</span>` : ""}
        </p>
        <div class="doc-head__client-block">
          <div class="doc-head__client-row">
            <span class="doc-head__tag">Client</span>
            <strong class="doc-head__client">${escapeHtml(clientDisplayName)}</strong>
            <span class="doc-head__dot" aria-hidden="true">·</span>
            <span class="doc-head__num">n° ${escapeHtml(devisNumber)}</span>
          </div>
          ${clientAddressLine ? `<p class="doc-head__client-detail">${escapeHtml(clientAddressLine)}</p>` : ""}
          ${client.email ? `<p class="doc-head__client-detail">${escapeHtml(client.email)}</p>` : ""}
        </div>
      </div>
    </header>

    <div class="body">
      <p class="object-line"><strong>Objet</strong>${escapeHtml(objectText)}</p>

      <div class="page-main">
        ${tableHtml}
      </div>

      <div class="page-bottom">
        ${settleHtml}

        <div class="quote-footer">
          <div class="signature-grid">
            <div class="sign-box">
              <div class="sign-box__label">L'entreprise</div>
              <div class="sign-box__hint">${escapeHtml(company.name)}</div>
              <div class="sign-box__area">Date et signature</div>
            </div>
            <div class="sign-box">
              <div class="sign-box__label">Client — Bon pour accord</div>
              <div class="sign-box__hint">« Bon pour accord » + « Lu et approuvé »</div>
              <div class="sign-box__area">Date et signature</div>
            </div>
          </div>
        </div>

        <footer class="footer">
          <ul class="footer__legal">
            ${legalMentions(company, validityDays, additionalNote, documentType)}
          </ul>
          <div class="footer__bar">
            <span><strong>${escapeHtml(company.name)}</strong>${company.siret ? ` — SIRET ${escapeHtml(company.siret)}` : ""}</span>
            <span>Devis ${escapeHtml(devisNumber)} — ${issuedAt}</span>
          </div>
        </footer>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Devis interne employeur : achats fournisseur, marges, analyse — jamais imprimé pour le client.
 * Même charte visuelle que le devis client (couleurs, en-tête, tableau).
 */
export function buildInternalDevisDocument({
  profile,
  user,
  quote,
  client,
  devisNumber,
  result,
  validityDays = 30,
}) {
  const q = normalizeQuote(quote);
  const company = buildCompanyBlock(profile, user);
  const tradeType = resolveTradeType(q, profile);
  const laborSell = getLaborSellTotal(q);
  const hourlyClient = q.hours > 0 ? laborSell / q.hours : 0;
  const markup = getMaterialMarkupRatio(q);
  const materialMargin = getMaterialGrossMargin(q);
  const markupOk = markup === null || markup >= MATERIAL_MIN_MARKUP;
  const phases = buildLaborPhases(q);
  const issuedShort = formatDateShort();
  const validShort = validityDateShort(validityDays);
  const artisanTel = phoneTelHref(company.phone);
  const clientDisplayName = formatClientDisplayName(client);
  const clientAddressLine = formatClientAddressLine(client);
  const workDays = Math.max(1, Math.ceil(q.hours / 8));
  const objectText = `${q.jobName || "Prestation"} — analyse rentabilité · coeff. matériel min. ×${MATERIAL_MIN_MARKUP}`;

  const groupRow = (label) =>
    `<tr class="quote-table__group"><td colspan="7">${escapeHtml(label)}</td></tr>`;

  const detailedLineRows = hasDetailedLineItems(q)
    ? q.lineItems
        .map((line) => {
          const qty = Number(line.qty) || 0;
          const unitSell = Number(line.unitPriceHT) || 0;
          const unitPurchase = Number(line.purchaseCostHT) || 0;
          const totalSell = Math.round(qty * unitSell * 100) / 100;
          const isMo = line.type === "mo";
          const coeff =
            !isMo && unitPurchase > 0 ? unitSell / unitPurchase : null;
          const hidden = !isMo && !filterLinesForClient([line], tradeType).length;
          const rowClass = hidden ? ' class="internal-only"' : "";

          return `<tr${rowClass}>
        <td class="col-ref">${escapeHtml(line.ref || "—")}</td>
        <td class="col-designation">
          <strong>${escapeHtml(line.designation || "Prestation")}</strong>
          ${line.category ? `<small>${escapeHtml(line.category)}${hidden ? " · masqué client" : ""}</small>` : ""}
        </td>
        <td class="num col-qty">${qty} ${escapeHtml(translateUnit(line.unit || "u", getLocale(), qty))}</td>
        <td class="num col-buy purchase">${isMo ? "—" : formatEuroDetailed(unitPurchase)}</td>
        <td class="num col-sell sell">${formatEuroDetailed(unitSell)}</td>
        <td class="num col-total sell"><strong>${formatEuroDetailed(totalSell)}</strong></td>
        <td class="num col-coeff ${coeff && coeff >= MATERIAL_MIN_MARKUP ? "ok" : coeff ? "warn" : ""}">${coeff ? `×${coeff.toFixed(2)}` : "—"}</td>
      </tr>`;
        })
        .join("")
    : "";

  const phaseRows = phases
    .map((phase, i) => {
      const h = Math.round(q.hours * phase.ratio * 10) / 10;
      const total = Math.round(laborSell * phase.ratio * 100) / 100;
      const pu = h > 0 ? total / h : total;
      return `<tr>
        <td class="col-ref">MO-${String(i + 1).padStart(2, "0")}</td>
        <td class="col-designation"><strong>${escapeHtml(phase.label)}</strong></td>
        <td class="num col-qty">${h} h</td>
        <td class="num col-buy">—</td>
        <td class="num col-sell">${formatEuroDetailed(pu)}</td>
        <td class="num col-total sell"><strong>${formatEuroDetailed(total)}</strong></td>
        <td class="num col-coeff">—</td>
      </tr>`;
    })
    .join("");

  const materialRow =
    q.materialPurchaseCost > 0
      ? `<tr>
        <td class="col-ref">FO-01</td>
        <td class="col-designation"><strong>Matériaux & fournitures</strong></td>
        <td class="num col-qty">1</td>
        <td class="num col-buy purchase">${formatEuroDetailed(q.materialPurchaseCost)}</td>
        <td class="num col-sell">—</td>
        <td class="num col-total sell"><strong>${formatEuroDetailed(q.materialSellPrice)}</strong></td>
        <td class="num col-coeff ${markupOk ? "ok" : "warn"}">×${markup?.toFixed(2) ?? "—"}</td>
      </tr>`
      : "";

  const tableBody = detailedLineRows
    ? groupRow("Détail des lignes (toutes références)") + detailedLineRows
    : groupRow("Main d'œuvre") +
      phaseRows +
      (q.materialPurchaseCost > 0 ? groupRow("Matériaux") + materialRow : "");

  const resultHtml = result
    ? `<div class="internal-result internal-result--${result.status}">
        <strong>${escapeHtml(result.label)}</strong>
        <p>${escapeHtml(result.message)}</p>
        <div class="internal-result__metrics">
          <span>Prix min. conseillé : <strong>${formatEuro(result.minPrice)}</strong></span>
          <span>Taux horaire net : <strong>${formatHourly(result.realHourly)}</strong></span>
        </div>
      </div>
      <div class="internal-net">
        <span>Marge nette estimée</span>
        <strong>${formatEuroDetailed(result.netEstimated)}</strong>
      </div>`
    : `<div class="internal-net">
        <span>Total HT client</span>
        <strong>${formatEuroDetailed(q.price)}</strong>
      </div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Devis interne ${escapeHtml(devisNumber)} — ${escapeHtml(company.name)}</title>
  <style>
    ${DEVIS_FONT_IMPORT}
    ${DEVIS_SHARED_CSS}
    ${INTERNAL_DEVIS_EXTRA_CSS}
  </style>
</head>
<body>
  <div class="page">
    <div class="internal-banner">Document interne — ne pas transmettre au client</div>
    ${renderDocHeadHtml({
      company,
      artisanTel,
      docLabel: "DEVIS INTERNE",
      devisNumber,
      issuedShort,
      validShort,
      workDays,
      clientDisplayName,
      clientAddressLine,
      clientEmail: client.email || "",
      metaExtra: `<span class="doc-head__dot" aria-hidden="true">·</span><span>MO ${formatEuroDetailed(laborSell)}</span>`,
    })}

    <div class="body">
      <p class="object-line"><strong>Objet</strong>${escapeHtml(objectText)}</p>

      <div class="quote-table-wrap">
        <table class="quote-table internal-table">
          <thead>
            <tr>
              <th class="col-ref">Réf.</th>
              <th class="col-designation">Désignation</th>
              <th class="num col-qty">Qté</th>
              <th class="num col-buy">Achat HT</th>
              <th class="num col-sell">P.U. client</th>
              <th class="num col-total">Total client</th>
              <th class="num col-coeff">Coeff.</th>
            </tr>
          </thead>
          <tbody>${tableBody}</tbody>
        </table>
      </div>

      <section class="internal-panel" aria-label="Synthèse rentabilité">
        <div class="internal-kpis">
          <div class="internal-kpi"><span>Total client HT</span><strong>${formatEuroDetailed(q.price)}</strong></div>
          <div class="internal-kpi"><span>MO client HT</span><strong>${formatEuroDetailed(laborSell)}</strong></div>
          <div class="internal-kpi"><span>Tarif horaire</span><strong>${formatHourly(hourlyClient)}</strong></div>
          <div class="internal-kpi"><span>Achat matériel</span><strong>${formatEuroDetailed(q.materialPurchaseCost)}</strong></div>
          <div class="internal-kpi"><span>Vente matériel</span><strong>${formatEuroDetailed(q.materialSellPrice)}</strong></div>
          <div class="internal-kpi"><span>Marge matériel</span><strong>${formatEuroDetailed(materialMargin)}</strong></div>
        </div>
        <div class="internal-side">${resultHtml}</div>
      </section>

      <p class="internal-note">Document réservé à l'employeur : achats fournisseur, coefficients et marge nette. Le devis client n'affiche que les prix de vente.</p>
    </div>
  </div>
</body>
</html>`;
}

function toClientPayload(payload) {
  const {
    profile,
    user,
    quote,
    client,
    devisNumber,
    validityDays,
    additionalNote,
    projectDescription,
    paymentTerms,
    executionDelay,
    documentType,
    sourceDevisNumber,
  } = payload;

  return {
    profile,
    user,
    quote,
    client,
    devisNumber,
    validityDays,
    additionalNote,
    projectDescription,
    paymentTerms,
    executionDelay,
    documentType: documentType ?? "devis",
    sourceDevisNumber: sourceDevisNumber ?? "",
  };
}

function renderPreviewFrame(iframe, payload, view = "client") {
  const html =
    view === "internal"
      ? buildInternalDevisDocument({
          ...toClientPayload(payload),
          result: payload.result,
        })
      : buildClientDevisDocument(toClientPayload(payload));

  const wrap = iframe.closest(".devis-preview-modal__frame-wrap");
  const scaler = iframe.closest(".devis-preview-modal__frame-scaler");

  if (isMobilePreview() && wrap) {
    let mobileView = wrap.querySelector(".devis-preview-mobile-view");
    if (!mobileView) {
      mobileView = document.createElement("div");
      mobileView.className = "devis-preview-mobile-view";
      wrap.insertBefore(mobileView, scaler ?? iframe);
    }
    if (scaler) scaler.hidden = true;

    const { styles, pageHtml } = extractPreviewDocumentParts(html);
    mobileView.innerHTML = `<style>${styles}</style>${pageHtml}`;
    mobileView.hidden = false;
    scheduleMobileViewFit(mobileView, wrap);
    return;
  }

  wrap?.querySelector(".devis-preview-mobile-view")?.remove();
  if (scaler) scaler.hidden = false;

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();
  fitPreviewIframe(iframe);
}

function printHtmlDocument(html, title = "Impression devis") {
  const delay = isMobilePreview() ? 650 : 180;

  try {
    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.document.title = title;

      const runPrint = () => {
        try {
          w.focus();
          w.print();
        } catch (_) {
          /* noop */
        }
      };

      if (w.document.readyState === "complete") {
        setTimeout(runPrint, delay);
      } else {
        w.onload = () => setTimeout(runPrint, delay);
        setTimeout(runPrint, delay + 400);
      }
      return true;
    }
  } catch (_) {
    /* fallback iframe */
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    iframe.remove();
    return false;
  }

  const doc = frameWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      frameWindow.focus();
      frameWindow.print();
    } catch (_) {
      /* noop */
    }
    setTimeout(() => iframe.remove(), 2000);
  };

  if (doc.readyState === "complete") {
    setTimeout(triggerPrint, delay);
  } else {
    frameWindow.onload = () => setTimeout(triggerPrint, delay);
    setTimeout(triggerPrint, delay + 500);
  }

  return true;
}

export function printDevisDocument(payload) {
  const html = buildClientDevisDocument(toClientPayload(payload));
  const label =
    payload.documentType === "facture" ? "Facture client" : "Devis client";
  return printHtmlDocument(html, label);
}

let previewModal = null;

function ensurePreviewModal() {
  if (previewModal?.dataset?.build !== PREVIEW_BUILD) {
    previewModal?.remove();
    previewModal = null;
  }
  if (previewModal) return previewModal;

  const root = document.createElement("div");
  root.id = "devis-preview-modal";
  root.className = "devis-preview-modal";
  root.hidden = true;
  root.innerHTML = `
    <div class="devis-preview-modal__backdrop" data-close></div>
    <div class="devis-preview-modal__panel" role="dialog" aria-labelledby="devis-preview-title" aria-modal="true">
      <header class="devis-preview-modal__header">
        <div>
          <h2 id="devis-preview-title">Aperçu du devis</h2>
          <p class="devis-preview-modal__subtitle" style="margin:4px 0 0;font-size:0.82rem;color:var(--text-muted)"></p>
          <div class="devis-preview-tabs" role="tablist">
            <button type="button" class="devis-preview-tabs__btn is-active" data-view="client" role="tab">Vue client (impression)</button>
            <button type="button" class="devis-preview-tabs__btn" data-view="internal" role="tab">Vue interne employeur</button>
          </div>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" data-close aria-label="Fermer">✕</button>
      </header>
      <button type="button" class="devis-preview-modal__edit-toggle" id="preview-edit-toggle" aria-expanded="false">
        Personnaliser le devis ▾
      </button>
      <div class="devis-preview-modal__body">
        <aside class="devis-preview-modal__edit">
          <h3>Personnaliser le devis</h3>
          <label class="field">
            <span>Prénom client</span>
            <div class="field__wrap"><input type="text" data-field="clientFirstName" /></div>
          </label>
          <label class="field">
            <span>Nom client</span>
            <div class="field__wrap"><input type="text" data-field="clientName" /></div>
          </label>
          <label class="field">
            <span>E-mail client</span>
            <div class="field__wrap"><input type="email" data-field="clientEmail" /></div>
          </label>
          <label class="field">
            <span>Adresse</span>
            <div class="field__wrap"><input type="text" data-field="clientAddress" /></div>
          </label>
          <label class="field">
            <span>Code postal</span>
            <div class="field__wrap"><input type="text" data-field="clientPostalCode" maxlength="10" /></div>
          </label>
          <label class="field">
            <span>Ville</span>
            <div class="field__wrap"><input type="text" data-field="clientCity" /></div>
          </label>
          <label class="field">
            <span>Intitulé de la prestation</span>
            <div class="field__wrap"><input type="text" data-field="jobName" /></div>
          </label>
          <label class="field">
            <span>Description détaillée (objet)</span>
            <div class="field__wrap"><textarea data-field="projectDescription" rows="3" placeholder="Décrivez le périmètre des travaux…"></textarea></div>
          </label>
          <label class="field">
            <span>Prix HT</span>
            <div class="field__wrap">
              <input type="number" data-field="price" min="0" step="10" />
              <span class="field__suffix">€</span>
            </div>
          </label>
          <label class="field">
            <span>Temps estimé</span>
            <div class="field__wrap">
              <input type="number" data-field="hours" min="1" step="1" />
              <span class="field__suffix">h</span>
            </div>
          </label>
          <label class="field">
            <span>Achat matériel fournisseur HT</span>
            <div class="field__wrap">
              <input type="number" data-field="materialPurchaseCost" min="0" step="10" />
              <span class="field__suffix">€</span>
            </div>
            <small>Interne — jamais visible sur le devis client</small>
          </label>
          <label class="field">
            <span>Prix matériel client HT</span>
            <div class="field__wrap">
              <input type="number" data-field="materialSellPrice" min="0" step="10" />
              <span class="field__suffix">€</span>
            </div>
            <small>Minimum ×2 l'achat fournisseur</small>
          </label>
          <label class="field">
            <span>Modalités de paiement</span>
            <div class="field__wrap"><textarea data-field="paymentTerms" rows="2"></textarea></div>
          </label>
          <label class="field">
            <span>Délai d'exécution</span>
            <div class="field__wrap"><input type="text" data-field="executionDelay" placeholder="Ex. 5 jours ouvrés après acceptation" /></div>
          </label>
          <label class="field">
            <span>Validité (jours)</span>
            <div class="field__wrap"><input type="number" data-field="validityDays" min="1" max="365" step="1" /></div>
          </label>
          <label class="field">
            <span>Conditions particulières</span>
            <div class="field__wrap"><textarea data-field="additionalNote" rows="2" placeholder="Garanties, exclusions, accès chantier…"></textarea></div>
          </label>
          <small id="preview-edit-hint">Vue client : essentiel uniquement (prises, luminaires, tableau…), sans petit matériel. Vue interne : toutes les lignes, achats et marges.</small>
        </aside>
        <div class="devis-preview-modal__frame-wrap">
          <div class="devis-preview-modal__frame-scaler">
            <iframe class="devis-preview-modal__frame" title="Aperçu du devis"></iframe>
          </div>
          <p class="devis-preview-modal__scroll-hint" aria-hidden="true">↕ Faites défiler pour voir tout le devis</p>
        </div>
      </div>
      <footer class="devis-preview-modal__footer">
        <button type="button" class="btn btn--ghost" data-edit-lines>📚 Modifier les lignes</button>
        <button type="button" class="btn btn--ghost" data-close>Retour au formulaire</button>
        <button type="button" class="btn btn--primary" data-print>Imprimer le devis client →</button>
      </footer>
      <div class="devis-preview-modal__mobile-bar" hidden aria-label="Actions aperçu">
        <button type="button" class="devis-preview-modal__mobile-btn" data-close aria-label="Fermer">✕</button>
        <button type="button" class="devis-preview-modal__mobile-btn is-active" data-mobile-view="client">Client</button>
        <button type="button" class="devis-preview-modal__mobile-btn" data-mobile-view="internal">Interne</button>
        <button type="button" class="devis-preview-modal__mobile-btn" data-mobile-edit aria-label="Personnaliser">✏️</button>
        <button type="button" class="devis-preview-modal__mobile-btn devis-preview-modal__mobile-btn--primary" data-print aria-label="Imprimer">🖨</button>
      </div>
    </div>
  `;

  document.body.appendChild(root);
  root.dataset.build = PREVIEW_BUILD;
  previewModal = root;
  return root;
}

function readPreviewFields(modal) {
  const get = (name) => modal.querySelector(`[data-field="${name}"]`);

  return {
    client: {
      firstName: get("clientFirstName").value.trim(),
      name: get("clientName").value.trim(),
      email: get("clientEmail").value.trim(),
      address: get("clientAddress").value.trim(),
      postalCode: get("clientPostalCode").value.trim(),
      city: get("clientCity").value.trim(),
      phone: "",
    },
    quote: normalizeQuote({
      jobName: get("jobName").value.trim(),
      price: Number(get("price").value) || 0,
      hours: Number(get("hours").value) || 0,
      materialPurchaseCost: Number(get("materialPurchaseCost").value) || 0,
      materialSellPrice: Number(get("materialSellPrice").value) || 0,
    }),
    validityDays: Number(get("validityDays").value) || 30,
    additionalNote: get("additionalNote").value.trim(),
    projectDescription: get("projectDescription").value.trim(),
    paymentTerms: get("paymentTerms").value.trim() || PAYMENT_DEFAULT,
    executionDelay: get("executionDelay").value.trim(),
  };
}

function fillPreviewFields(modal, payload) {
  const set = (name, value) => {
    const el = modal.querySelector(`[data-field="${name}"]`);
    if (el) el.value = value ?? "";
  };

  set("clientFirstName", payload.client?.firstName);
  set("clientName", payload.client?.name);
  set("clientEmail", payload.client?.email);
  set("clientAddress", payload.client?.address);
  set("clientPostalCode", payload.client?.postalCode);
  set("clientCity", payload.client?.city);
  set("jobName", payload.quote?.jobName);
  set("price", payload.quote?.price);
  set("hours", payload.quote?.hours);
  const q = normalizeQuote(payload.quote ?? {});
  set("materialPurchaseCost", q.materialPurchaseCost);
  set("materialSellPrice", q.materialSellPrice);
  set("validityDays", payload.validityDays ?? 30);
  set("additionalNote", payload.additionalNote ?? "");
  set("projectDescription", payload.projectDescription ?? "");
  set("paymentTerms", payload.paymentTerms ?? PAYMENT_DEFAULT);
  set("executionDelay", payload.executionDelay ?? "");
}

export function showDevisPreview({
  profile,
  user,
  quote,
  client,
  result,
  devisNumber,
  validityDays = 30,
  additionalNote = "",
  projectDescription = "",
  paymentTerms = PAYMENT_DEFAULT,
  executionDelay = "",
  documentType = "devis",
  sourceDevisNumber = "",
  getResult,
  onSync,
  onPrinted,
}) {
  const modal = ensurePreviewModal();
  const iframe = modal.querySelector(".devis-preview-modal__frame");
  const subtitle = modal.querySelector(".devis-preview-modal__subtitle");

  let activeView = "client";

  let currentPayload = {
    profile,
    user,
    quote: normalizeQuote(quote),
    client: { ...client },
    result,
    devisNumber,
    validityDays,
    additionalNote,
    projectDescription,
    paymentTerms,
    executionDelay,
    documentType,
    sourceDevisNumber,
  };

  const docLabel = documentType === "facture" ? "Facture" : "Devis";

  const setActiveView = (view) => {
    activeView = view;
    for (const tab of modal.querySelectorAll("[data-view]")) {
      tab.classList.toggle("is-active", tab.dataset.view === view);
    }
    for (const tab of modal.querySelectorAll("[data-mobile-view]")) {
      tab.classList.toggle("is-active", tab.dataset.mobileView === view);
    }
    for (const printBtn of modal.querySelectorAll("[data-print]")) {
      const isIconBtn = printBtn.classList.contains("devis-preview-modal__mobile-btn");
      if (isIconBtn) {
        printBtn.title =
          view === "internal"
            ? "Imprimer la version client (sans données internes)"
            : `Imprimer la ${docLabel.toLowerCase()} client`;
      } else {
        printBtn.textContent = `Imprimer la ${docLabel.toLowerCase()} client →`;
        printBtn.title =
          view === "internal"
            ? "L'impression envoie toujours la version client (sans achats fournisseur)"
            : "";
      }
    }
    modal._previewRefresh?.();
    requestAnimationFrame(() => fitPreviewIframe(modal.querySelector(".devis-preview-modal__frame")));
  };

  const refreshPreview = () => {
    const edited = readPreviewFields(modal);
    const nextResult = getResult(edited.quote);

    if (!edited.client.name) {
      subtitle.textContent = `Indiquez un nom de client pour finaliser le ${docLabel.toLowerCase()}.`;
    } else if (!edited.quote.jobName) {
      subtitle.textContent = `Indiquez une prestation pour finaliser le ${docLabel.toLowerCase()}.`;
    } else if (
      !hasDetailedLineItems(edited.quote) &&
      edited.quote.price <= 0 &&
      edited.quote.hours <= 0
    ) {
      subtitle.textContent = "Prix et temps doivent être supérieurs à zéro.";
    } else if (
      !hasDetailedLineItems(edited.quote) &&
      edited.quote.hours <= 0
    ) {
      subtitle.textContent = "Indiquez le temps estimé (heures) pour finaliser la prestation.";
    } else if (edited.quote.price <= 0) {
      subtitle.textContent = "Indiquez un prix HT supérieur à zéro.";
    } else if (activeView === "internal") {
      subtitle.textContent = `Vue interne N° ${devisNumber} — achats fournisseur et marges (confidentiel).`;
    } else {
      subtitle.textContent = `${docLabel} client N° ${devisNumber} — prêt à imprimer (sans données internes).`;
    }

    currentPayload = {
      ...currentPayload,
      quote: edited.quote,
      client: edited.client,
      result: nextResult,
      validityDays: edited.validityDays,
      additionalNote: edited.additionalNote,
      projectDescription: edited.projectDescription,
      paymentTerms: edited.paymentTerms,
      executionDelay: edited.executionDelay,
    };

    renderPreviewFrame(iframe, currentPayload, activeView);
    fitPreviewIframe(iframe);
    applyMobileFullscreenPreview(modal);
    onSync?.(edited.quote, edited.client, {
      validityDays: edited.validityDays,
      additionalNote: edited.additionalNote,
      projectDescription: edited.projectDescription,
      paymentTerms: edited.paymentTerms,
      executionDelay: edited.executionDelay,
    });
  };

  fillPreviewFields(modal, currentPayload);
  subtitle.textContent = `${docLabel} client N° ${devisNumber} — prêt à imprimer (sans données internes).`;

  const editPanelEl = modal.querySelector(".devis-preview-modal__edit");
  const editToggle = modal.querySelector("#preview-edit-toggle");
  const mobile = isMobilePreview();
  modal.classList.toggle("devis-preview-modal--mobile", mobile);
  setPreviewCinemaMode(modal, mobile);

  editPanelEl?.classList.remove("is-open");
  editToggle?.setAttribute("aria-expanded", "false");

  renderPreviewFrame(iframe, currentPayload, activeView);
  fitPreviewIframe(iframe);
  applyMobileFullscreenPreview(modal);

  for (const tab of modal.querySelectorAll("[data-view]")) {
    tab.onclick = () => setActiveView(tab.dataset.view);
  }
  modal.hidden = false;
  document.body.style.overflow = "hidden";

  const close = () => {
    modal.hidden = true;
    document.body.style.overflow = "";
    setPreviewCinemaMode(modal, false);
    editPanelEl?.classList.remove("is-open");
  };

  modal._previewRefresh = refreshPreview;
  modal._previewClose = close;
  modal._previewPrint = () => {
    const edited = readPreviewFields(modal);

    if (!edited.quote.jobName) {
      alert("Indiquez le nom de la prestation.");
      return;
    }

    if (!edited.client.name) {
      alert("Indiquez le nom du client.");
      return;
    }

    if (edited.quote.price <= 0 || edited.quote.hours <= 0) {
      alert("Le prix et le temps estimé doivent être supérieurs à zéro.");
      return;
    }

    refreshPreview();
    printDevisDocument(currentPayload);
    onPrinted?.(currentPayload);
  };

  const editPanel = modal.querySelector(".devis-preview-modal__edit");
  if (!editPanel.dataset.bound) {
    editPanel.dataset.bound = "1";
    editPanel.addEventListener("input", (event) => {
      if (!event.target.matches("[data-field]")) return;
      modal._previewRefresh?.();
    });
  }

  for (const button of modal.querySelectorAll("[data-close]")) {
    button.onclick = () => modal._previewClose?.();
  }

  if (!modal.dataset.printBound) {
    modal.dataset.printBound = "1";
    modal.addEventListener("click", (event) => {
      if (!event.target.closest("[data-print]")) return;
      modal._previewPrint?.();
    });
  }

  for (const btn of modal.querySelectorAll("[data-mobile-view]")) {
    btn.addEventListener("click", () => setActiveView(btn.dataset.mobileView));
  }

  modal.querySelector("[data-mobile-edit]")?.addEventListener("click", () => {
    const editPanel = modal.querySelector(".devis-preview-modal__edit");
    if (!editPanel) return;
    const open = !editPanel.classList.contains("is-open");
    showMobileEditPanel(modal, open);
  });

  modal.querySelector("[data-edit-lines]")?.addEventListener("click", () => {
    modal._previewClose?.();
    requestAnimationFrame(() => {
      document.getElementById("devis-lines-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("devis-lines-picker-btn")?.click();
    });
  });

  const editToggleBtn = modal.querySelector("#preview-edit-toggle");
  const editPanelAside = modal.querySelector(".devis-preview-modal__edit");
  if (editToggleBtn && editPanelAside && !editToggleBtn.dataset.bound) {
    editToggleBtn.dataset.bound = "1";
    editToggleBtn.addEventListener("click", () => {
      const open = !editPanelAside.classList.contains("is-open");
      if (isMobilePreview()) {
        showMobileEditPanel(modal, open);
      } else {
        editPanelAside.classList.toggle("is-open", open);
        modal.classList.toggle("devis-preview-modal--edit-open", open);
      }
      editToggleBtn.setAttribute("aria-expanded", String(open));
      editToggleBtn.textContent = open
        ? "Masquer la personnalisation ▴"
        : "Personnaliser le devis ▾";
      requestAnimationFrame(() => fitPreviewIframe(iframe));
      setTimeout(() => fitPreviewIframe(iframe), 280);
    });
  }

  return { close, refresh: refreshPreview };
}

/** @deprecated Utiliser showDevisPreview */
export function buildDevisDocument(payload) {
  return buildClientDevisDocument(toClientPayload(payload));
}

/** Alias conservé pour compatibilité cache / anciennes versions */
export function openPrintableDevis(payload) {
  return showDevisPreview({
    ...payload,
    getResult: payload.getResult ?? (() => ({})),
  });
}
