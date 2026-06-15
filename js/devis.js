import {
  ACTIVITY_TYPES,
  BUSINESS_TYPES,
  analyzeQuote,
  computeProfileSummary,
  formatPercent,
} from "./calculator.js";
import { formatProfileMoney, formatProfileHourly } from "./market.js";
import { getCountryProfile } from "./country-config.js";
import { getUser, requireConnexion } from "./auth.js";
import {
  commitNextDocumentNumber,
  ensureLibraryReady,
  getClients,
  getDevisById,
  getPrintedDevisHistory,
  peekNextDocumentNumber,
  upsertPrintedDevisRecord,
} from "./data.js";
import { loadQuoteDraft, saveQuoteDraft } from "./devis-draft-store.js";
import { debounce, escapeHtml } from "./utils.js";
import { initAppNav } from "./nav-app.js";
import { APP_VERSION } from "./version.js";
import { initDevisLines } from "./devis-lines.js";
import {
  getEffectiveHours,
  getLaborTotalFromLineItems,
  getMaterialMarkupRatio,
  getSuggestedMaterialSellPrice,
  hasDetailedLineItems,
  isExportReady,
  isMaterialMarkupOk,
  isQuoteReady,
  MATERIAL_MIN_MARKUP,
  normalizeQuote,
  rollupQuoteFromLineItems,
} from "./quote-pricing.js";
import { initDevisPayments } from "./devis-payments.js";
import { hasModule, hasPaymentCapability, canManagePrestationsLibrary, getPlan } from "./subscription.js";
import { computePaymentStatus, getDevisPayment } from "./payment-store.js";
import { applyPaymentConfirmation } from "./payment-link-service.js";
import { notifyValidatedDevisPayment, onDevisValidated } from "./payment-plan.js";
import { isProfileComplete, loadProfile } from "./storage.js";
import { COMMERCIAL_STAGES, getOpportunityByDevisId } from "./commercial-store.js";
import {
  markDevisCommerciallyValidated,
  reconcileCommercialPipeline,
  syncOpportunityFromDevis,
  syncPaymentValidated,
} from "./commercial-sync.js";
import { markDevisCommercialValidated } from "./data.js";

let devisPreviewModule = null;

async function loadDevisPreviewModule() {
  if (!devisPreviewModule) {
    const { importVersioned } = await import(`./module-import.js?v=${APP_VERSION}`);
    devisPreviewModule = await importVersioned("./pdf-devis.js");
  }
  return devisPreviewModule;
}

if (!requireConnexion()) {
  // Redirection en cours — ne pas exécuter le reste du module.
} else {
  bootDevisPage();
}

function initDevisSectionNav() {
  const links = document.querySelectorAll(".devis-page-nav__link");
  if (!links.length) return;

  const sectionIds = ["devis-lines-section", "rentabilite", "quote-client-section"];
  const defaultSection = "devis-lines-section";
  let activeSection = defaultSection;

  function syncSubnavOffset() {
    const nav = document.querySelector(".nav");
    const trial = document.getElementById("trial-banner");
    let offset = nav?.offsetHeight ?? 57;
    if (trial && trial.offsetParent !== null) {
      offset += trial.offsetHeight;
    }
    document.documentElement.style.setProperty("--devis-nav-offset", `${offset}px`);
    const subnav = document.getElementById("devis-subnav");
    if (subnav) {
      document.documentElement.style.setProperty("--devis-subnav-height", `${subnav.offsetHeight}px`);
    }
  }

  function setActiveSection(sectionId) {
    activeSection = sectionIds.includes(sectionId) ? sectionId : defaultSection;
    links.forEach((link) => {
      const href = link.getAttribute("href") ?? "";
      const id = href.startsWith("#") ? href.slice(1) : "";
      link.classList.toggle("is-active", id === activeSection);
    });
  }

  function scrollToSection(sectionId, { smooth = true } = {}) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    const subnav = document.getElementById("devis-subnav");
    const subnavHeight = subnav?.offsetHeight ?? 0;
    const navOffset = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--devis-nav-offset") || "57",
      10,
    );
    const top =
      target.getBoundingClientRect().top + window.scrollY - navOffset - subnavHeight - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  }

  function syncFromHash() {
    const hash = window.location.hash.slice(1);
    if (sectionIds.includes(hash)) {
      setActiveSection(hash);
      return;
    }
    setActiveSection(defaultSection);
  }

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href") ?? "";
      const id = href.startsWith("#") ? href.slice(1) : "";
      if (!id) return;
      event.preventDefault();
      setActiveSection(id);
      history.replaceState(null, "", `#${id}`);
      scrollToSection(id);
    });
  });

  document.getElementById("devis-subnav-back")?.addEventListener("click", () => {
    if (activeSection !== defaultSection) {
      setActiveSection(defaultSection);
      history.replaceState(null, "", `#${defaultSection}`);
      scrollToSection(defaultSection);
      return;
    }
    if (window.history.length > 1 && document.referrer) {
      window.history.back();
      return;
    }
    window.location.href = "dashboard.html";
  });

  window.addEventListener("hashchange", () => {
    syncFromHash();
    const hash = window.location.hash.slice(1);
    if (sectionIds.includes(hash)) {
      scrollToSection(hash, { smooth: false });
    }
  });

  window.addEventListener("resize", syncSubnavOffset);
  window.addEventListener("orientationchange", () => setTimeout(syncSubnavOffset, 120));

  syncSubnavOffset();
  syncFromHash();
}

function initDevisMobileToolbar() {
  if (!window.matchMedia("(max-width: 900px)").matches) return;
  if (document.getElementById("devis-mobile-toolbar")) return;

  const bar = document.createElement("div");
  bar.id = "devis-mobile-toolbar";
  bar.className = "devis-mobile-toolbar";
  const v = window.__APP_VERSION ? `?v=${window.__APP_VERSION}` : "";
  bar.innerHTML = `
    <button type="button" class="btn btn--primary btn--sm" id="devis-mobile-pick">+ Bibliothèque</button>
    <a href="bibliotheque.html${v}" class="btn btn--ghost btn--sm">Catalogue</a>
  `;
  document.body.appendChild(bar);
  document.body.classList.add("has-devis-mobile-toolbar");

  bar.querySelector("#devis-mobile-pick")?.addEventListener("click", () => {
    document.getElementById("devis-lines-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => document.getElementById("devis-lines-picker-btn")?.click(), 300);
  });
}

function bootDevisPage() {
  const hasRentabilite = hasModule("rentabilite");
  const navPage =
    hasRentabilite && window.location.hash === "#rentabilite" ? "rentabilite" : "devis";
  initAppNav(navPage);
  initDevisSectionNav();

const user = getUser();
const profile = loadProfile();

if (!isProfileComplete(profile)) {
  window.location.replace("profil.html?next=devis.html&reason=profile");
  return;
}

const quotePanels = document.querySelectorAll("[data-quote-panel]");

const quoteFields = {
  jobName: document.getElementById("job-name"),
  price: document.getElementById("quote-price"),
  hours: document.getElementById("quote-hours"),
  materialPurchase: document.getElementById("material-purchase"),
  materialSell: document.getElementById("material-sell"),
  employeeHours: document.getElementById("employee-hours"),
};

const materialMarkupHint = document.getElementById("material-markup-hint");
let sellPriceTouched = false;

const clientFields = {
  select: document.getElementById("client-select"),
  firstName: document.getElementById("client-firstname"),
  name: document.getElementById("client-name"),
  email: document.getElementById("client-email"),
  address: document.getElementById("client-address"),
  postalCode: document.getElementById("client-postal-code"),
  city: document.getElementById("client-city"),
};

const stripEls = {
  plan: document.getElementById("strip-plan"),
  type: document.getElementById("strip-type"),
  net: document.getElementById("strip-net"),
  hourly: document.getElementById("strip-hourly"),
};

const resultEls = {
  empty: document.getElementById("result-empty"),
  content: document.getElementById("result-content"),
  disclaimer: document.getElementById("result-disclaimer"),
  verdict: document.getElementById("verdict"),
  icon: document.getElementById("verdict-icon"),
  label: document.getElementById("verdict-label"),
  msg: document.getElementById("verdict-msg"),
  netEstimated: document.getElementById("net-estimated"),
  minPrice: document.getElementById("min-price"),
  realHourly: document.getElementById("real-hourly"),
  marginRate: document.getElementById("margin-rate"),
  targetNet: document.getElementById("target-net"),
  directCost: document.getElementById("direct-cost"),
  breakdownList: document.getElementById("breakdown-list"),
};

const previewBarHint = document.getElementById("devis-preview-bar-hint");
const previewBarTitle = document.getElementById("devis-preview-bar-title");

function getExportBtns() {
  return document.querySelectorAll(".js-export-pdf");
}

function getPrintBtns() {
  return document.querySelectorAll(".js-print-devis");
}

function setExportDisabled(disabled) {
  getExportBtns().forEach((btn) => {
    btn.disabled = disabled;
  });
  getPrintBtns().forEach((btn) => {
    btn.disabled = disabled;
  });
}

function setExportLabel(text) {
  getExportBtns().forEach((btn) => {
    if (btn.id === "export-pdf") {
      btn.textContent = "Aperçu →";
    } else {
      btn.textContent = text;
    }
  });
  if (previewBarTitle) {
    previewBarTitle.textContent = text.replace(/\s*→\s*$/, "");
  }
}

function setPreviewBarHint(text) {
  if (previewBarHint) previewBarHint.textContent = text;
}
const historyList = document.getElementById("devis-history");
const docTypeSwitch = document.getElementById("doc-type-switch");
const docSyncHint = document.getElementById("doc-sync-hint");
const quoteFormTitle = document.getElementById("quote-form-title");
const quoteFormDesc = document.getElementById("quote-form-desc");
const devisPageTitle = document.getElementById("devis-page-title");
const devisPageSubtitle = document.getElementById("devis-page-subtitle");
const devisLinesSection = document.getElementById("devis-lines-section");
const devisLinesRoot = document.getElementById("devis-lines-root");

const statusIcons = { success: "✓", warning: "!", danger: "✕" };
const statusLabels = {
  success: "Rentable",
  warning: "Marge faible",
  danger: "Déficitaire",
};

let lastResult = null;
let devisLinesManager = null;
let syncingFromLines = false;
let pendingDocNumber = null;
let paymentsManager = null;
let lastDevisRecordId = null;
let currentDocumentType = "devis";
let sourceDevisId = "";
let sourceDevisNumber = "";

if (devisLinesSection && devisLinesRoot) {
  devisLinesSection.hidden = false;
  try {
    const libraryBoot = ensureLibraryReady({ preferredTrade: profile.tradeType ?? "electricien" });
    if (!libraryBoot.ready) {
      ensureLibraryReady({ preferredTrade: profile.tradeType ?? "electricien", eager: true, skipBackground: true });
    }
    devisLinesManager = initDevisLines({
      root: devisLinesRoot,
      defaultTrade: profile.tradeType ?? "electricien",
      canManageLibrary: canManagePrestationsLibrary(),
      getDefaultHourlyRate: () => computeProfileSummary(profile).minHourlyRate,
      getProfile: loadProfile,
      onTotalsChange: (rolled) => {
        if (syncingFromLines) return;
        syncingFromLines = true;
        quoteFields.price.value = rolled.price;
        if (rolled.hours > 0) {
          quoteFields.hours.value = rolled.hours;
        }
        quoteFields.materialPurchase.value = rolled.materialPurchaseCost;
        quoteFields.materialSell.value = rolled.materialSellPrice;
        sellPriceTouched = true;
        syncingFromLines = false;
        updateQuoteSimpleSection();
        renderResult();
      },
    });
  } catch (error) {
    console.error("Bibliothèque devis indisponible", error);
    devisLinesRoot.innerHTML = `
      <div class="devis-lines-fallback card" style="padding:16px;border:1px solid var(--border);border-radius:12px">
        <p><strong>Bibliothèque en cours de chargement…</strong></p>
        <p style="margin:8px 0 0;color:var(--text-muted);font-size:0.9rem;line-height:1.5">
          Le catalogue se charge en mémoire (pas sur le téléphone). Ouvrez la page de réparation puis réessayez.
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="button" class="btn btn--primary btn--sm" id="devis-lines-retry">Réessayer</button>
          <a href="m.html" class="btn btn--ghost btn--sm">Réparer →</a>
          <a href="bibliotheque.html" class="btn btn--ghost btn--sm">Bibliothèque</a>
        </div>
      </div>`;
    devisLinesRoot.querySelector("#devis-lines-retry")?.addEventListener("click", () => {
      try {
        ensureLibraryReady({ preferredTrade: profile.tradeType ?? "electricien", eager: true, skipBackground: true });
        devisLinesManager = initDevisLines({
          root: devisLinesRoot,
          defaultTrade: profile.tradeType ?? "electricien",
          canManageLibrary: canManagePrestationsLibrary(),
          getDefaultHourlyRate: () => computeProfileSummary(profile).minHourlyRate,
          getProfile: loadProfile,
          onTotalsChange: (rolled) => {
            if (syncingFromLines) return;
            syncingFromLines = true;
            quoteFields.price.value = rolled.price;
            if (rolled.hours > 0) quoteFields.hours.value = rolled.hours;
            quoteFields.materialPurchase.value = rolled.materialPurchaseCost;
            quoteFields.materialSell.value = rolled.materialSellPrice;
            sellPriceTouched = true;
            syncingFromLines = false;
            updateQuoteSimpleSection();
            renderResult();
          },
        });
      } catch (retryError) {
        console.error("Bibliothèque devis — nouvel échec", retryError);
      }
    });
  }
}

function renderProfileStrip() {
  const type = BUSINESS_TYPES[profile.businessType];
  const summary = computeProfileSummary(profile);
  const plan = getPlan();

  if (stripEls.plan) {
    stripEls.plan.textContent = `Offre : ${plan.name}`;
    stripEls.plan.title = hasRentabilite
      ? "Rentabilité incluse dans votre offre"
      : "Rentabilité réservée à l'offre Pro (79,90 €/mois)";
  }

  stripEls.type.textContent = `Profil : ${type?.label ?? "—"}`;
  stripEls.net.textContent = `Objectif : ${formatProfileMoney(profile.monthlyNet)}/mois`;
  stripEls.hourly.textContent = hasRentabilite
    ? `Tarif min. : ${formatProfileHourly(summary.minHourlyRate)}`
    : `Export PDF & bibliothèque actifs`;
}

function updateDisclaimer() {
  if (profile.businessType === "tpe") {
    resultEls.disclaimer.textContent =
      "Coûts directs, frais généraux et masse salariale inclus.";
    return;
  }

  if (profile.businessType === "solo") {
    resultEls.disclaimer.textContent =
      "Charges sociales et fiscales estimées pour entrepreneur seul.";
    return;
  }

  const activity = ACTIVITY_TYPES[profile.activityType];
  resultEls.disclaimer.textContent = activity
    ? `${activity.label} — URSSAF ${formatPercent(activity.urssafRate * 100)}`
    : "Calcul indicatif.";
}

function readClient() {
  return {
    firstName: clientFields.firstName?.value.trim() ?? "",
    name: clientFields.name?.value.trim() ?? "",
    email: clientFields.email?.value.trim() ?? "",
    address: clientFields.address?.value.trim() ?? "",
    postalCode: clientFields.postalCode?.value.trim() ?? "",
    city: clientFields.city?.value.trim() ?? "",
    phone: "",
  };
}

function applyClient(client = {}) {
  if (clientFields.firstName) clientFields.firstName.value = client.firstName ?? client.firstname ?? "";
  clientFields.name.value = client.name ?? "";
  clientFields.email.value = client.email ?? "";
  clientFields.address.value = client.address ?? "";
  if (clientFields.postalCode) clientFields.postalCode.value = client.postalCode ?? "";
  if (clientFields.city) clientFields.city.value = client.city ?? "";
}

function buildDraftSnapshot() {
  return {
    documentType: currentDocumentType,
    sourceDevisId,
    sourceDevisNumber,
    sellPriceTouched,
    client: readClient(),
    quote: {
      jobName: quoteFields.jobName?.value ?? "",
      price: Number(quoteFields.price?.value) || 0,
      hours: Number(quoteFields.hours?.value) || 0,
      materialPurchaseCost: Number(quoteFields.materialPurchase?.value) || 0,
      materialSellPrice: Number(quoteFields.materialSell?.value) || 0,
      employeeHours: Number(quoteFields.employeeHours?.value) || 0,
    },
    lineItems: devisLinesManager?.getLineItems() ?? [],
  };
}

function persistDraft() {
  saveQuoteDraft(buildDraftSnapshot());
}

function restoreDraft() {
  const draft = loadQuoteDraft();
  if (!draft) return;

  currentDocumentType = draft.documentType === "facture" ? "facture" : "devis";
  sourceDevisId = draft.sourceDevisId ?? "";
  sourceDevisNumber = draft.sourceDevisNumber ?? "";
  sellPriceTouched = Boolean(draft.sellPriceTouched);

  applyClient(draft.client);
  if (draft.quote) {
    quoteFields.jobName.value = draft.quote.jobName ?? "";
    quoteFields.price.value = draft.quote.price ?? 0;
    quoteFields.hours.value = draft.quote.hours ?? 16;
    quoteFields.materialPurchase.value = draft.quote.materialPurchaseCost ?? 0;
    quoteFields.materialSell.value = draft.quote.materialSellPrice ?? 0;
    if (quoteFields.employeeHours) {
      quoteFields.employeeHours.value = draft.quote.employeeHours ?? 0;
    }
  }

  devisLinesManager?.setLineItems(draft.lineItems ?? []);
  updateDocumentTypeUi();
}

function updateDocumentTypeUi() {
  const isFacture = currentDocumentType === "facture";

  docTypeSwitch?.querySelectorAll("[data-doc-type]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.docType === currentDocumentType);
  });

  if (devisPageTitle) {
    devisPageTitle.textContent = isFacture
      ? "Créer votre facture"
      : "Votre devis est-il rentable ?";
  }
  if (devisPageSubtitle) {
    devisPageSubtitle.textContent = isFacture
      ? "Même client et mêmes lignes que le devis — exportez la facture PDF."
      : "Composez avec la bibliothèque — le verdict rentabilité s'affiche à droite.";
  }

  if (quoteFormTitle) {
    quoteFormTitle.textContent = isFacture ? "Détails de la facture" : "Détails du devis";
  }
  if (quoteFormDesc) {
    quoteFormDesc.textContent = isFacture
      ? "Reprenez les mêmes informations que le devis — modifiez seulement si nécessaire."
      : "Nom, prix, temps et coûts de la prestation.";
  }
  setExportLabel(isFacture ? "Aperçu de la facture →" : "Aperçu du devis →");
  if (docSyncHint) {
    docSyncHint.textContent = isFacture
      ? sourceDevisNumber
        ? `Facture liée au devis ${sourceDevisNumber} — client, lignes et montants repris automatiquement.`
        : "Client, lignes et montants repris du devis — pas besoin de tout ressaisir."
      : "Client, lignes et montants sont partagés entre devis et facture — pas besoin de tout ressaisir.";
  }
}

function setDocumentType(type, { persist = true } = {}) {
  currentDocumentType = type === "facture" ? "facture" : "devis";
  if (currentDocumentType === "devis") {
    sourceDevisId = "";
    sourceDevisNumber = "";
  }
  updateDocumentTypeUi();
  if (persist) persistDraft();
}

function loadRecordIntoForm(item, { asFacture = false } = {}) {
  quoteFields.jobName.value = item.jobName ?? "";
  quoteFields.price.value = item.price ?? 0;
  quoteFields.hours.value = item.hours ?? 0;
  quoteFields.materialPurchase.value =
    item.materialPurchaseCost ?? item.materialCost ?? 0;
  quoteFields.materialSell.value =
    item.materialSellPrice ??
    getSuggestedMaterialSellPrice(item.materialPurchaseCost ?? item.materialCost);
  sellPriceTouched = true;
  devisLinesManager?.setLineItems(item.lineItems ?? []);
  applyClient({
    firstName: item.clientFirstName,
    name: item.clientName,
    email: item.clientEmail,
    address: item.clientAddress,
    postalCode: item.clientPostalCode,
    city: item.clientCity,
  });

  if (asFacture) {
    currentDocumentType = "facture";
    sourceDevisId = item.id;
    sourceDevisNumber = item.devisNumber || item.docNumber || "";
  } else {
    currentDocumentType = item.documentType === "facture" ? "facture" : "devis";
    sourceDevisId = item.sourceDevisId ?? "";
    sourceDevisNumber = item.sourceDevisNumber ?? "";
  }

  lastDevisRecordId = item.id;
  updateDocumentTypeUi();
  persistDraft();
  renderResult();
}

function updateQuoteSimpleSection() {
  const hasLines = devisLinesManager?.getLineItems()?.length > 0;
  const simpleSection = document.getElementById("quote-simple-section");
  const simpleDesc = document.getElementById("quote-simple-desc");
  const hoursField = quoteFields.hours?.closest(".field");
  const hoursHint = document.getElementById("quote-hours-hint");

  if (simpleSection) {
    simpleSection.classList.toggle("quote-simple--with-lines", hasLines);
  }

  if (simpleDesc) {
    simpleDesc.textContent = hasLines
      ? "Complément si besoin — les totaux principaux viennent des lignes bibliothèque ci-dessus."
      : "Optionnel — utilisez surtout « Depuis la bibliothèque » ci-dessus pour composer votre devis.";
  }

  if (hoursField && hoursHint) {
    hoursHint.textContent = hasLines
      ? "Heures facturées au client — une ligne MO horaire est ajoutée ou mise à jour automatiquement."
      : "Durée totale de la prestation (main d'œuvre facturée sur le PDF).";
  }
}

function readQuote() {
  const base = {
    jobName: quoteFields.jobName.value.trim(),
    price: Number(quoteFields.price.value) || 0,
    hours: Number(quoteFields.hours.value) || 0,
    materialPurchaseCost: Number(quoteFields.materialPurchase?.value) || 0,
    materialSellPrice: Number(quoteFields.materialSell?.value) || 0,
  };

  if (devisLinesManager) {
    const lineItems = devisLinesManager.getLineItems();
    if (lineItems.length) {
      const quote = rollupQuoteFromLineItems(lineItems, base);
      quote.hours = getEffectiveHours(quote, base.hours);

      // Lignes vides à 0 € : ne pas écraser la saisie rapide si elle est remplie.
      if (quote.price <= 0 && base.price > 0) {
        const simpleQuote = normalizeQuote({ ...base, lineItems: [] });
        if (profile.businessType === "tpe") {
          simpleQuote.employeeHours = Math.min(
            Number(quoteFields.employeeHours.value) || 0,
            simpleQuote.hours,
          );
        }
        return simpleQuote;
      }

      if (profile.businessType === "tpe") {
        quote.employeeHours = Math.min(
          Number(quoteFields.employeeHours.value) || 0,
          quote.hours,
        );
      }
      return quote;
    }
  }

  const quote = normalizeQuote(base);

  if (profile.businessType === "tpe") {
    quote.employeeHours = Math.min(
      Number(quoteFields.employeeHours.value) || 0,
      quote.hours,
    );
  }

  return quote;
}

function updateMaterialMarkupHint(quote) {
  if (!materialMarkupHint) return;

  const purchase = quote.materialPurchaseCost;
  if (purchase <= 0) {
    materialMarkupHint.textContent = "";
    return;
  }

  const ratio = getMaterialMarkupRatio(quote);
  const minSell = getSuggestedMaterialSellPrice(purchase);

  materialMarkupHint.textContent = isMaterialMarkupOk(quote)
    ? `Coefficient matériel : ×${ratio?.toFixed(2)} — objectif minimum ×${MATERIAL_MIN_MARKUP} atteint.`
    : `Attention : prix client ${formatProfileMoney(quote.materialSellPrice)} — minimum ×${MATERIAL_MIN_MARKUP} soit ${formatProfileMoney(minSell)}.`;
  materialMarkupHint.style.color = isMaterialMarkupOk(quote)
    ? "var(--text-muted)"
    : "var(--danger, #b91c1c)";
}

function savePrintedDevisRecord(quote, result, options = {}) {
  const client = options.client || readClient();
  if (!client.name?.trim()) return null;

  const entry = upsertPrintedDevisRecord({
    jobName: quote.jobName,
    price: quote.price,
    hours: quote.hours,
    materialPurchaseCost: quote.materialPurchaseCost,
    materialSellPrice: quote.materialSellPrice,
    lineItems: quote.lineItems ?? [],
    materialCost: quote.materialPurchaseCost,
    margin: result.netEstimated,
    status: result.status,
    clientFirstName: client.firstName,
    clientName: client.name,
    clientEmail: client.email,
    clientAddress: client.address,
    clientPostalCode: client.postalCode,
    clientCity: client.city,
    devisNumber: options.devisNumber ?? null,
    docNumber: options.devisNumber ?? null,
    documentType: options.documentType ?? currentDocumentType,
    sourceDevisId: options.sourceDevisId ?? sourceDevisId,
    sourceDevisNumber: options.sourceDevisNumber ?? sourceDevisNumber,
    minPrice: result.minPrice,
    realHourly: result.realHourly,
    country: profile.country ?? "FR",
    vatRate:
      Number(profile.defaultVatRate) ||
      getCountryProfile(profile.country ?? "FR").defaultVatRate,
  });
  lastDevisRecordId = entry.id;
  if (options.documentType !== "facture") {
    syncOpportunityFromDevis(entry);
  }
  renderHistory();
  return entry;
}

function paymentTermsForPreview(devisId) {
  if (!hasPaymentCapability("customTerms") || !devisId) return undefined;
  return getDevisPayment(devisId).paymentTerms;
}

function renderBreakdownItem(line) {
  const sep = line.lastIndexOf(" : ");
  if (sep === -1) return `<li>${escapeHtml(line)}</li>`;
  const label = line.slice(0, sep);
  const value = line.slice(sep + 3);
  return `<li class="breakdown-row"><span class="breakdown-row__label">${escapeHtml(label)}</span><span class="breakdown-row__value">${escapeHtml(value)}</span></li>`;
}

function setMetricWithUnit(el, formatted, unitPattern) {
  if (!el) return;
  const match = formatted.match(unitPattern);
  if (!match) {
    el.textContent = formatted;
    return;
  }
  const value = formatted.slice(0, match.index).trim();
  const unit = match[1].replace(/\s/g, "\u00a0");
  el.innerHTML = `<span class="metric__value"><span class="metric__num">${escapeHtml(value)}</span><span class="metric__unit">${escapeHtml(unit)}</span></span>`;
}

function renderResult() {
  const quote = readQuote();
  const fallbackHours = Number(quoteFields.hours.value) || 0;
  const exportReady = isExportReady(quote, fallbackHours);
  const rentabiliteReady =
    isQuoteReady(quote, fallbackHours) && (!hasRentabilite || profile.monthlyHours > 0);

  if (!exportReady) {
    resultEls.empty.hidden = false;
    resultEls.content.hidden = true;
    setExportDisabled(true);
    lastResult = null;
    const emptyMsg = resultEls.empty?.querySelector("p");
    let hintText =
      "Indiquez un prix HT et le temps estimé — le verdict rentabilité s'affiche en haut.";
    if (emptyMsg) {
      if ((Number(quote.price) || 0) <= 0) {
        hintText = hasDetailedLineItems(quote)
          ? "Ajoutez des lignes depuis la bibliothèque ou saisissez un prix HT."
          : "Indiquez un prix HT supérieur à zéro.";
        emptyMsg.textContent = `${hintText} Le bandeau rentabilité se met à jour en direct.`;
      } else if (
        hasDetailedLineItems(quote) &&
        !getLaborTotalFromLineItems(quote.lineItems) &&
        !isExportReady(quote, fallbackHours)
      ) {
        hintText =
          "Ajoutez une ligne main d'œuvre ou renseignez le temps estimé.";
        emptyMsg.textContent = `${hintText} Le verdict apparaît dans le bandeau en haut.`;
      } else {
        hintText = hasRentabilite
          ? "Indiquez le temps estimé (heures) pour voir le verdict rentabilité."
          : "Indiquez le temps estimé (heures) pour générer le PDF.";
        emptyMsg.textContent = `${hintText} Regardez le bandeau « Rentabilité » au-dessus du formulaire.`;
      }
    }
    setPreviewBarHint(hintText);
    return;
  }

  const result = analyzeQuote(profile, quote);
  lastResult = result;
  updateMaterialMarkupHint(quote);

  setExportDisabled(false);
  setPreviewBarHint("Aperçu et impression disponibles — barre fixe en bas de l'écran");

  if (!hasRentabilite) {
    resultEls.empty.hidden = true;
    resultEls.content.hidden = false;
    return;
  }

  if (!rentabiliteReady) {
    resultEls.empty.hidden = false;
    resultEls.content.hidden = true;
    const emptyMsg = resultEls.empty?.querySelector("p");
    if (emptyMsg) {
      emptyMsg.textContent =
        profile.monthlyHours > 0
          ? "Ajoutez le temps estimé ou une ligne main d'œuvre — le verdict s'affiche ici en direct."
          : "Complétez les heures mensuelles dans Mon profil pour activer le calculateur de rentabilité.";
    }
    return;
  }

  resultEls.empty.hidden = true;
  resultEls.content.hidden = false;

  resultEls.verdict.className = `verdict verdict--${result.status}`;
  resultEls.icon.textContent = statusIcons[result.status];
  resultEls.label.textContent = result.label;
  resultEls.msg.textContent = quote.jobName
    ? `${quote.jobName} — ${result.message}`
    : result.message;

  resultEls.netEstimated.textContent = formatProfileMoney(result.netEstimated);
  resultEls.minPrice.textContent = formatProfileMoney(result.minPrice);
  setMetricWithUnit(resultEls.realHourly, formatProfileHourly(result.realHourly), /(\s*€\/h)$/);
  setMetricWithUnit(resultEls.marginRate, formatPercent(result.marginRate), /(\s*%)$/);
  resultEls.targetNet.textContent = formatProfileMoney(result.targetNet);
  resultEls.directCost.textContent = formatProfileMoney(result.directCost);

  resultEls.breakdownList.innerHTML = result.breakdown.map((line) => renderBreakdownItem(line)).join("");
}

function formatHistoryDate(iso) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function paymentStatusLabel(item) {
  if (!hasPaymentCapability("tracking")) return "—";
  const payment = computePaymentStatus(item.id, item.price);
  const labels = {
    pending: "En attente",
    partial: "Partiel",
    paid: "Payé",
    overdue: "Impayé",
  };
  const tone = payment.status === "paid" ? "success" : payment.status === "overdue" ? "danger" : "warning";
  return `<span class="status-pill status-pill--${tone}">${labels[payment.status] ?? "—"}</span>`;
}

function commercialStatusLabel(item) {
  if (!hasModule("clients") || item.documentType === "facture") return "—";
  const opp = getOpportunityByDevisId(item.id);
  if (!opp) return `<span class="status-pill status-pill--neutral">—</span>`;
  const meta = COMMERCIAL_STAGES[opp.stage] ?? COMMERCIAL_STAGES.prospect;
  const tone = meta.tone === "neutral" ? "neutral" : meta.tone;
  return `<span class="status-pill status-pill--${tone}" title="${escapeHtml(meta.hint)}">${meta.icon} ${meta.short}</span>`;
}

function renderHistory() {
  if (!historyList) return;

  reconcileCommercialPipeline();
  const history = getPrintedDevisHistory();
  const paymentHeader = hasPaymentCapability("tracking");
  const commercialHeader = hasModule("clients");
  const colCount = 7 + (paymentHeader ? 1 : 0) + (commercialHeader ? 1 : 0);

  historyList.innerHTML = history.length
    ? history
        .map(
          (item) => {
            const isFacture = item.documentType === "facture";
            const docNumber = item.devisNumber || item.docNumber || "";
            const canFacture = !isFacture;
            const printedAt = item.printedAt || item.date;
            return `
        <tr>
          <td><span class="status-pill status-pill--${isFacture ? "warning" : "success"}">${isFacture ? "Facture" : "Devis"}</span></td>
          <td>${formatHistoryDate(printedAt)}</td>
          <td><strong>${escapeHtml(item.jobName || "—")}</strong>${docNumber ? `<br><small>${escapeHtml(docNumber)}</small>` : ""}</td>
          <td>${escapeHtml(item.clientName || "—")}</td>
          <td>${formatProfileMoney(item.price)}</td>
          <td>${hasRentabilite ? `<span class="status-pill status-pill--${item.status}">${statusLabels[item.status] ?? "—"}</span>` : "—"}</td>
          ${commercialHeader ? `<td>${commercialStatusLabel(item)}</td>` : ""}
          ${paymentHeader ? `<td>${paymentStatusLabel(item)}</td>` : ""}
          <td class="library-actions">
            <button type="button" class="btn btn--ghost btn--sm" data-reexport="${item.id}">Aperçu</button>
            ${canFacture ? `<button type="button" class="btn btn--ghost btn--sm" data-facturer="${item.id}">Facturer</button>` : ""}
            ${commercialHeader && !isFacture && item.id ? `<button type="button" class="btn btn--ghost btn--sm" data-commercial-valid="${item.id}" title="Marquer devis validé">✓ Validé</button>` : ""}
            ${commercialHeader && !isFacture ? `<a href="clients.html" class="btn btn--ghost btn--sm" title="Voir le dossier commercial">CRM</a>` : ""}
          </td>
        </tr>`;
          },
        )
        .join("")
    : `<tr><td colspan="${colCount}" style="color:var(--text-muted)">Aucun devis imprimé — générez un PDF et cliquez sur <strong>Imprimer</strong> pour l'enregistrer ici.</td></tr>`;

  paymentsManager?.refresh();
}

function recordPrintedDevis(payload) {
  if (payload.devisNumber && payload.devisNumber === pendingDocNumber) {
    commitNextDocumentNumber(currentDocumentType);
    pendingDocNumber = null;
  }
  const result = analyzeQuote(profile, payload.quote);
  savePrintedDevisRecord(payload.quote, result, {
    devisNumber: payload.devisNumber,
    documentType: currentDocumentType,
    sourceDevisId,
    sourceDevisNumber,
    client: payload.client,
  });
  persistDraft();
  renderHistory();
}

function buildDevisPrintPayload(docNumber) {
  const quote = readQuote();
  return {
    profile,
    user,
    quote,
    client: readClient(),
    result: lastResult ?? analyzeQuote(profile, quote),
    devisNumber: docNumber,
    documentType: currentDocumentType,
    sourceDevisNumber,
    paymentTerms: paymentTermsForPreview(lastDevisRecordId),
  };
}

async function printDevisFromPage() {
  const quote = readQuote();
  const fallbackHours = Number(quoteFields.hours.value) || 0;

  if (!isExportReady(quote, fallbackHours)) {
    alert(
      currentDocumentType === "facture"
        ? "Indiquez un prix HT et un temps estimé supérieurs à zéro pour imprimer la facture."
        : "Indiquez un prix HT et un temps estimé supérieurs à zéro pour imprimer le devis.",
    );
    quoteFields.price.focus();
    return;
  }

  if (!pendingDocNumber) {
    pendingDocNumber = peekNextDocumentNumber(currentDocumentType);
  }

  const payload = buildDevisPrintPayload(pendingDocNumber);

  let printDevisDocument;
  try {
    ({ printDevisDocument } = await loadDevisPreviewModule());
  } catch (error) {
    console.error("Impression PDF indisponible", error);
    alert(
      "L'impression n'a pas pu se charger. Rechargez la page (Ctrl+F5) ou ouvrez maj.html pour forcer la mise à jour.",
    );
    return;
  }

  printDevisDocument(payload);
  recordPrintedDevis(payload);
}

async function openDevisPreview(docNumber, devisId = lastDevisRecordId) {
  const quote = readQuote();
  const client = readClient();
  const fallbackHours = Number(quoteFields.hours.value) || 0;

  if (!isExportReady(quote, fallbackHours)) {
    alert(
      hasRentabilite
        ? "Indiquez un prix HT et un temps estimé supérieurs à zéro pour analyser le devis."
        : currentDocumentType === "facture"
          ? "Indiquez un prix HT et un temps estimé supérieurs à zéro pour générer la facture."
          : "Indiquez un prix HT et un temps estimé supérieurs à zéro pour générer le devis.",
    );
    quoteFields.price.focus();
    return;
  }

  const result = lastResult ?? analyzeQuote(profile, quote);

  let showDevisPreview;
  try {
    ({ showDevisPreview } = await loadDevisPreviewModule());
  } catch (error) {
    console.error("Aperçu PDF indisponible", error);
    alert(
      "L'aperçu PDF n'a pas pu se charger. Rechargez la page (Ctrl+F5) ou ouvrez maj.html pour forcer la mise à jour.",
    );
    return;
  }

  showDevisPreview({
    profile,
    user,
    quote,
    result,
    client,
    devisNumber: docNumber,
    documentType: currentDocumentType,
    sourceDevisNumber,
    paymentTerms: paymentTermsForPreview(devisId),
    getResult: (updatedQuote) => analyzeQuote(profile, updatedQuote),
    onSync: (updatedQuote, updatedClient) => {
      quoteFields.jobName.value = updatedQuote.jobName;
      quoteFields.price.value = updatedQuote.price;
      quoteFields.hours.value = updatedQuote.hours;
      quoteFields.materialPurchase.value = updatedQuote.materialPurchaseCost;
      quoteFields.materialSell.value = updatedQuote.materialSellPrice;
      sellPriceTouched = true;
      clientFields.firstName.value = updatedClient.firstName ?? "";
      clientFields.name.value = updatedClient.name;
      clientFields.email.value = updatedClient.email;
      clientFields.address.value = updatedClient.address;
      clientFields.postalCode.value = updatedClient.postalCode ?? "";
      clientFields.city.value = updatedClient.city ?? "";
      persistDraft();
      renderResult();
    },
    onPrinted: (payload) => {
      recordPrintedDevis(payload);
    },
  });
}

function exportPdf() {
  pendingDocNumber = peekNextDocumentNumber(currentDocumentType);
  openDevisPreview(pendingDocNumber);
}

function reexportFromHistory(id) {
  const item = getDevisById(id);
  if (!item) return;

  loadRecordIntoForm(item);

  const quote = readQuote();
  if (!isExportReady(quote, Number(quoteFields.hours.value) || 0)) return;

  const docNumber = item.devisNumber || item.docNumber;
  if (docNumber) {
    pendingDocNumber = null;
    openDevisPreview(docNumber, item.id);
  } else {
    pendingDocNumber = peekNextDocumentNumber(currentDocumentType);
    openDevisPreview(pendingDocNumber, item.id);
  }
}

function convertToFactureFromHistory(id) {
  const item = getDevisById(id);
  if (!item) return;
  loadRecordIntoForm(item, { asFacture: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function populateClients() {
  const clients = getClients();

  for (const client of clients) {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = client.name;
    clientFields.select.appendChild(option);
  }
}

function fillClientFromSelect() {
  const id = clientFields.select.value;
  if (!id) return;

  const client = getClients().find((entry) => entry.id === id);
  if (!client) return;

  clientFields.firstName.value = client.firstName ?? "";
  clientFields.name.value = client.name ?? "";
  clientFields.email.value = client.email ?? "";
  clientFields.address.value = client.address ?? "";
  clientFields.postalCode.value = client.postalCode ?? "";
  clientFields.city.value = client.city ?? "";
}

function syncMaterialSellFromPurchase() {
  const purchase = Number(quoteFields.materialPurchase?.value) || 0;
  if (!quoteFields.materialSell || sellPriceTouched) return;

  quoteFields.materialSell.value = getSuggestedMaterialSellPrice(purchase);
}

function updateNow() {
  if (profile.businessType === "tpe") {
    const total = Number(quoteFields.hours.value) || 0;
    const employee = Number(quoteFields.employeeHours.value) || 0;
    if (employee > total) {
      quoteFields.employeeHours.value = total;
    }
  }
  if (devisLinesManager && !syncingFromLines) {
    devisLinesManager.syncHoursBilling(Number(quoteFields.hours.value) || 0);
  }
  persistDraft();
  renderResult();
}

const update = debounce(updateNow, 180);

quoteFields.materialPurchase?.addEventListener("input", () => {
  syncMaterialSellFromPurchase();
  update();
});

quoteFields.materialSell?.addEventListener("input", () => {
  sellPriceTouched = true;
  update();
});

for (const panel of quotePanels) {
  panel.hidden = panel.dataset.quotePanel !== profile.businessType;
}

for (const field of Object.values(quoteFields)) {
  if (!field) continue;
  field.addEventListener("input", update);
  field.addEventListener("change", update);
}

function stepQuoteHours(direction) {
  if (!quoteFields.hours) return;
  const step = 1;
  const min = 1;
  const next = Math.max(min, Math.round((Number(quoteFields.hours.value) || min) + direction * step));
  quoteFields.hours.value = next;
  updateNow();
}

function bindQuoteHoursStepper(btn, direction) {
  if (!btn) return;
  let lastAt = 0;
  const run = (event) => {
    event.preventDefault();
    const now = Date.now();
    if (now - lastAt < 350) return;
    lastAt = now;
    stepQuoteHours(direction);
  };
  btn.addEventListener("click", run);
}

bindQuoteHoursStepper(document.getElementById("quote-hours-down"), -1);
bindQuoteHoursStepper(document.getElementById("quote-hours-up"), 1);

for (const field of Object.values(clientFields)) {
  if (!field || field === clientFields.select) continue;
  field.addEventListener("input", update);
  field.addEventListener("change", update);
}

clientFields.select?.addEventListener("change", () => {
  fillClientFromSelect();
  update();
});

getExportBtns().forEach((btn) => btn.addEventListener("click", exportPdf));
getPrintBtns().forEach((btn) => btn.addEventListener("click", printDevisFromPage));

docTypeSwitch?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-doc-type]");
  if (!button) return;
  setDocumentType(button.dataset.docType);
});

historyList?.addEventListener("click", async (event) => {
  const validBtn = event.target.closest("[data-commercial-valid]");
  if (validBtn) {
    const devisId = validBtn.dataset.commercialValid;
    markDevisCommercialValidated(devisId);
    markDevisCommerciallyValidated(devisId);
    const devis = getDevisById(devisId);
    if (devis) {
      onDevisValidated(devis);
      await notifyValidatedDevisPayment(devis);
    }
    renderHistory();
    paymentsManager?.refresh();
    paymentsManager?.selectByDevisId(devisId);
    document.getElementById("payments-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const facturerBtn = event.target.closest("[data-facturer]");
  if (facturerBtn) {
    convertToFactureFromHistory(facturerBtn.dataset.facturer);
    return;
  }

  const button = event.target.closest("[data-reexport]");
  if (!button) return;
  reexportFromHistory(button.dataset.reexport);
});

function handleLoadDevisFromUrl() {
  const loadId = new URLSearchParams(window.location.search).get("load");
  if (!loadId) return;
  const item = getDevisById(loadId);
  if (!item) return;
  loadRecordIntoForm(item);
  document.querySelector(".devis-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupDevisOnlyMode() {
  if (hasRentabilite) return;

  const pageHead = document.querySelector(".app-page__head");
  if (pageHead) {
    const title = pageHead.querySelector("h1");
    const subtitle = pageHead.querySelector("p");
    if (title) title.textContent = "Créez vos devis et factures";
    if (subtitle) subtitle.textContent = "Saisissez les détails de la prestation — exportez un PDF professionnel.";
  }

  const simpleDesc = document.getElementById("quote-simple-desc");
  if (simpleDesc) {
    simpleDesc.textContent =
      "Optionnel — utilisez surtout « Depuis la bibliothèque » ci-dessus pour composer votre devis.";
  }

  const panel = document.getElementById("rentabilite");
  if (!panel) return;

  const title = panel.querySelector(".card__title");
  const desc = panel.querySelector(".card__desc");
  if (title) title.textContent = "Export PDF";
  if (desc) desc.textContent = "Générez et envoyez votre devis au format professionnel.";

  const emptyMsg = resultEls.empty?.querySelector("p");
  if (emptyMsg) {
    emptyMsg.textContent =
      "Remplissez le formulaire ci-dessous — le bouton Aperçu du devis reste visible en haut et en bas.";
  }

  const upgrade = document.createElement("div");
  upgrade.className = "rentabilite-upgrade";
  upgrade.innerHTML = `
    <p><strong>Calculateur de rentabilité</strong> — disponible avec l'offre Pro (79,90 €/mois) et supérieures.</p>
    <a href="tarifs.html?upgrade=rentabilite" class="btn btn--ghost btn--sm">Voir les offres →</a>
  `;
  resultEls.content.prepend(upgrade);

  resultEls.verdict.hidden = true;
  resultEls.content.querySelector(".metrics")?.setAttribute("hidden", "");
  resultEls.content.querySelector(".breakdown")?.setAttribute("hidden", "");
}

const paymentCol = document.getElementById("devis-payment-col");
if (paymentCol) paymentCol.hidden = !hasPaymentCapability("tracking");

const commercialCol = document.getElementById("devis-commercial-col");
if (commercialCol) commercialCol.hidden = !hasModule("clients");

paymentsManager = initDevisPayments({
  panel: document.getElementById("payments-panel"),
  listRoot: document.getElementById("payments-list"),
  detailRoot: document.getElementById("payments-detail"),
  getDevisList: getPrintedDevisHistory,
});

document.getElementById("payments-detail")?.addEventListener("paymentschange", renderHistory);

populateClients();
setupDevisOnlyMode();
renderProfileStrip();
updateDisclaimer();
restoreDraft();
updateDocumentTypeUi();
updateQuoteSimpleSection();
renderHistory();
updateNow();
handlePaymentConfirmFromUrl();
handleLoadDevisFromUrl();

window.addEventListener("devis-library-imported", () => {
  document.getElementById("devis-lines-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelector('.devis-page-nav__link[href="#devis-lines-section"]')?.classList.add("is-active");
  document.querySelectorAll('.devis-page-nav__link:not([href="#devis-lines-section"])').forEach((link) => {
    link.classList.remove("is-active");
  });
});

initDevisMobileToolbar();
}

window.addEventListener("exone-payment-confirmed", (event) => {
  const { devisId } = event.detail ?? {};
  const item = devisId ? getDevisById(devisId) : null;
  if (item) syncPaymentValidated(devisId, item.price);
  renderHistory();
  paymentsManager?.refresh();
});

function handlePaymentConfirmFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("payConfirm");
  if (!token) return;

  const ech = params.get("ech");
  const result = applyPaymentConfirmation(token, {
    installmentIndex: ech != null ? Number(ech) : null,
  });
  if (result.ok) {
    const item = getDevisById(result.devisId);
    if (item) syncPaymentValidated(result.devisId, item.price);
    alert(
      `Paiement confirmé : ${formatProfileMoney(result.amount)} encaissé pour « ${result.jobName || "devis"} » (${result.clientName || "client"}).`,
    );
    paymentsManager?.refresh();
    renderHistory();
  } else {
    alert(result.reason || "Lien de confirmation invalide.");
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("payConfirm");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}
