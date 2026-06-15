import {
  ACTIVITY_TYPES,
  computeProfileSummary,
  formatHourly,
} from "./calculator.js";
import { applyCountryProfileDefaults, getCountryProfile } from "./country-config.js";
import { getUser, requireAuth } from "./auth.js";
import { initAppNav } from "./nav-app.js";
import { initDifficultySettings } from "./difficulty-settings.js";
import { TRADES } from "./metre-templates.js";
import {
  computeProfileCompleteness,
  getProfileStatusLabel,
} from "./profile-completeness.js";
import { getPlan } from "./subscription.js";
import {
  DEFAULT_PAYMENT_SCHEDULE,
  DEFAULT_PAYMENT_TERMS,
  getFullCompanyAddress,
  loadProfile,
  saveProfile,
} from "./storage.js";
import {
  getDefaultPaymentSchedule,
  scheduleToPaymentTerms,
  validatePaymentSchedule,
} from "./payment-plan.js";
import { syncSitePublisherFromProfile } from "./site-publisher.js";
import { escapeHtml } from "./utils.js";

if (!requireAuth()) {
  // Redirection connexion
} else {
  bootProfilPage();
}

function bootProfilPage() {
  initAppNav("profil");

  const params = new URLSearchParams(window.location.search);
  if (params.get("reason") === "profile") {
    document.getElementById("profile-redirect-banner").hidden = false;
  }

  const user = getUser();
  const pageTitle = document.getElementById("profil-page-title");
  if (pageTitle && user?.firstname) {
    pageTitle.textContent = `Bonjour ${user.firstname} — profil entreprise`;
  }

  document.getElementById("current-plan").textContent = getPlan().name;

  const sizeCards = document.querySelectorAll("[data-business-type]");
  const profilePanels = document.querySelectorAll("[data-profile-panel]");
  const form = document.getElementById("profile-form");
  const saveMsg = document.getElementById("profil-save-msg");

  let businessType = "micro";
  let activeTab = "overview";
  let dirty = false;

  const fields = {
    monthlyNet: document.getElementById("monthly-net"),
    monthlyFixed: document.getElementById("monthly-fixed"),
    monthlyHours: document.getElementById("monthly-hours"),
    activityType: document.getElementById("activity-type"),
    activityHint: document.getElementById("activity-hint"),
    versementLiberatoire: document.getElementById("versement-liberatoire"),
    chargeRate: document.getElementById("charge-rate"),
    payrollLoaded: document.getElementById("payroll-loaded"),
    employeeCount: document.getElementById("employee-count"),
    overheadRate: document.getElementById("overhead-rate"),
    tvaRegime: document.getElementById("tva-regime"),
    tvaRegimeSolo: document.getElementById("tva-regime-solo"),
    tvaRegimeTpe: document.getElementById("tva-regime-tpe"),
    companyName: document.getElementById("company-name"),
    companyLegalForm: document.getElementById("company-legal-form"),
    companyAddress: document.getElementById("company-address"),
    companyPostalCode: document.getElementById("company-postal-code"),
    companyCity: document.getElementById("company-city"),
    companySiret: document.getElementById("company-siret"),
    companyRcs: document.getElementById("company-rcs"),
    companyTvaIntra: document.getElementById("company-tva-intra"),
    companyApe: document.getElementById("company-ape"),
    companyCapital: document.getElementById("company-capital"),
    companyPhone: document.getElementById("company-phone"),
    companyEmail: document.getElementById("company-email"),
    companyWebsite: document.getElementById("company-website"),
    companyIban: document.getElementById("company-iban"),
    companyBic: document.getElementById("company-bic"),
    bankName: document.getElementById("bank-name"),
    stripeCheckoutUrl: document.getElementById("stripe-checkout-url"),
    defaultPaymentTerms: document.getElementById("default-payment-terms"),
    quoteValidityDays: document.getElementById("quote-validity-days"),
    defaultVatRate: document.getElementById("default-vat-rate"),
    insuranceRcPro: document.getElementById("insurance-rc-pro"),
    insuranceDecennale: document.getElementById("insurance-decennale"),
    legalFooterNote: document.getElementById("legal-footer-note"),
    syncLegalToSite: document.getElementById("sync-legal-site"),
    btnSyncLegalSite: document.getElementById("btn-sync-legal-site"),
    tradeType: document.getElementById("trade-type"),
    travelKmRate: document.getElementById("travel-km-rate"),
    travelDepannageHT: document.getElementById("travel-depannage"),
    travelDayHT: document.getElementById("travel-day-rate"),
    moHourlyRate: document.getElementById("mo-hourly-rate"),
    siretHint: document.getElementById("siret-hint"),
    paymentScheduleRows: document.getElementById("payment-schedule-rows"),
    paymentScheduleTotal: document.getElementById("payment-schedule-total"),
    paymentScheduleError: document.getElementById("payment-schedule-error"),
    paymentSchedulePreview: document.getElementById("payment-schedule-preview"),
    addPaymentScheduleRow: document.getElementById("add-payment-schedule-row"),
  };

  function readPaymentScheduleFromDom() {
    if (!fields.paymentScheduleRows) return getDefaultPaymentSchedule();
    return [...fields.paymentScheduleRows.querySelectorAll(".payment-schedule-row")].map((row, index) => ({
      label: row.querySelector('[data-field="label"]')?.value?.trim() || `Échéance ${index + 1}`,
      percent: Number(row.querySelector('[data-field="percent"]')?.value) || 0,
      daysAfter: Math.max(0, Number(row.querySelector('[data-field="daysAfter"]')?.value) || 0),
    }));
  }

  function renderPaymentScheduleRows(schedule = DEFAULT_PAYMENT_SCHEDULE) {
    if (!fields.paymentScheduleRows) return;
    fields.paymentScheduleRows.innerHTML = schedule
      .map(
        (row, index) => `
        <div class="payment-schedule-row" data-index="${index}">
          <input type="text" data-field="label" value="${escapeHtml(row.label || "")}" placeholder="Libellé échéance" aria-label="Libellé échéance ${index + 1}" />
          <input type="number" min="0" max="100" step="1" data-field="percent" value="${row.percent ?? 0}" aria-label="Pourcentage échéance ${index + 1}" />
          <input type="number" min="0" max="3650" step="1" data-field="daysAfter" value="${row.daysAfter ?? 0}" aria-label="Délai jours échéance ${index + 1}" />
          <button type="button" class="payment-schedule-row__remove" data-remove-schedule-row aria-label="Supprimer l'échéance">×</button>
        </div>`,
      )
      .join("");

    fields.paymentScheduleRows.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        dirty = true;
        updatePaymentScheduleUi();
      });
    });

    fields.paymentScheduleRows.querySelectorAll("[data-remove-schedule-row]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rows = readPaymentScheduleFromDom();
        const index = Number(btn.closest(".payment-schedule-row")?.dataset.index);
        if (rows.length <= 1) return;
        rows.splice(index, 1);
        renderPaymentScheduleRows(rows);
        dirty = true;
        updatePaymentScheduleUi();
      });
    });

    updatePaymentScheduleUi();
  }

  function updatePaymentScheduleUi() {
    const schedule = readPaymentScheduleFromDom();
    const validation = validatePaymentSchedule(schedule);

    if (fields.paymentScheduleTotal) {
      fields.paymentScheduleTotal.textContent = `Total : ${validation.total} %`;
      fields.paymentScheduleTotal.classList.toggle("is-invalid", !validation.ok);
    }

    if (fields.paymentScheduleError) {
      fields.paymentScheduleError.hidden = validation.ok;
      fields.paymentScheduleError.textContent = validation.error;
    }

    if (fields.paymentSchedulePreview) {
      fields.paymentSchedulePreview.textContent = validation.ok
        ? `Exemple pour 10 000 € HT : ${scheduleToPaymentTerms(schedule)}`
        : "";
    }

    if (validation.ok && fields.defaultPaymentTerms) {
      fields.defaultPaymentTerms.value = scheduleToPaymentTerms(schedule);
    }
  }

  fields.tradeType.innerHTML = Object.entries(TRADES)
    .map(([value, trade]) => `<option value="${value}">${trade.label}</option>`)
    .join("");

  const summaryEls = {
    minHourlyRate: document.getElementById("min-hourly-rate"),
    targetHourlyNet: document.getElementById("target-hourly-net"),
    extraLabel: document.getElementById("summary-extra-label"),
    extraValue: document.getElementById("summary-extra-value"),
  };

  function readTvaRegime() {
    if (businessType === "solo") return fields.tvaRegimeSolo?.value ?? "franchise";
    if (businessType === "tpe") return fields.tvaRegimeTpe?.value ?? "reel";
    return fields.tvaRegime?.value ?? "franchise";
  }

  function syncTvaRegimeSelects(value) {
    if (fields.tvaRegime) fields.tvaRegime.value = value;
    if (fields.tvaRegimeSolo) fields.tvaRegimeSolo.value = value;
    if (fields.tvaRegimeTpe) fields.tvaRegimeTpe.value = value;
  }

  function readProfile() {
    const cfg = getCountryProfile("FR");
    const travel = cfg.travelDefaults;
    const profile = {
      businessType,
      monthlyNet: Number(fields.monthlyNet.value) || 0,
      monthlyFixed: Number(fields.monthlyFixed.value) || 0,
      monthlyHours: Number(fields.monthlyHours.value) || 1,
      companyName: fields.companyName?.value.trim() ?? "",
      companyLegalForm: fields.companyLegalForm?.value.trim() ?? "",
      companyAddress: fields.companyAddress?.value.trim() ?? "",
      companyPostalCode: fields.companyPostalCode?.value.trim() ?? "",
      companyCity: fields.companyCity?.value.trim() ?? "",
      companySiret: fields.companySiret?.value.trim() ?? "",
      companyRcs: fields.companyRcs?.value.trim() ?? "",
      companyTvaIntra: fields.companyTvaIntra?.value.trim() ?? "",
      companyApe: fields.companyApe?.value.trim() ?? "",
      companyCapital: fields.companyCapital?.value.trim() ?? "",
      companyPhone: fields.companyPhone?.value.trim() ?? "",
      companyEmail: fields.companyEmail?.value.trim() ?? "",
      companyWebsite: fields.companyWebsite?.value.trim() ?? "",
      companyIban: fields.companyIban?.value.trim() ?? "",
      companyBic: fields.companyBic?.value.trim() ?? "",
      bankName: fields.bankName?.value.trim() ?? "",
      stripeCheckoutUrl: fields.stripeCheckoutUrl?.value.trim() ?? "",
      tvaRegime: readTvaRegime(),
      defaultVatRate: Number(fields.defaultVatRate?.value) || 20,
      defaultPaymentTerms: fields.defaultPaymentTerms?.value.trim() || DEFAULT_PAYMENT_TERMS,
      defaultPaymentSchedule: readPaymentScheduleFromDom(),
      quoteValidityDays: Number(fields.quoteValidityDays?.value) || 30,
      insuranceRcPro: fields.insuranceRcPro?.value.trim() ?? "",
      insuranceDecennale: fields.insuranceDecennale?.value.trim() ?? "",
      legalFooterNote: fields.legalFooterNote?.value.trim() ?? "",
      syncLegalToSite: Boolean(fields.syncLegalToSite?.checked),
      tradeType: fields.tradeType?.value ?? "electricien",
      country: "FR",
      travelKmRate: Number(fields.travelKmRate?.value) || travel.km,
      travelDepannageHT: Number(fields.travelDepannageHT?.value) || travel.depannage,
      travelDayHT: Number(fields.travelDayHT?.value) || travel.day,
      moHourlyRate: Number(fields.moHourlyRate?.value) || cfg.moHourlyDefault,
    };

    if (businessType === "micro") {
      profile.activityType = fields.activityType.value;
      profile.versementLiberatoire = fields.versementLiberatoire.checked;
    }

    if (businessType === "solo") {
      profile.chargeRate = (Number(fields.chargeRate.value) || 45) / 100;
    }

    if (businessType === "tpe") {
      profile.payrollLoaded = Number(fields.payrollLoaded.value) || 0;
      profile.employeeCount = Number(fields.employeeCount.value) || 0;
      profile.overheadRate = Number(fields.overheadRate.value) || 15;
    }

    return profile;
  }

  function fillForm(profile) {
    businessType = profile.businessType;
    fields.monthlyNet.value = profile.monthlyNet;
    fields.monthlyFixed.value = profile.monthlyFixed;
    fields.monthlyHours.value = profile.monthlyHours;
    fields.activityType.value = profile.activityType;
    fields.versementLiberatoire.checked = profile.versementLiberatoire;
    fields.chargeRate.value = profile.chargeRate * 100;
    fields.payrollLoaded.value = profile.payrollLoaded;
    fields.employeeCount.value = profile.employeeCount;
    fields.overheadRate.value = profile.overheadRate;
    syncTvaRegimeSelects(profile.tvaRegime ?? "franchise");

    fields.companyName.value = profile.companyName ?? "";
    fields.companyLegalForm.value = profile.companyLegalForm ?? "";
    fields.companyAddress.value = profile.companyAddress ?? "";
    fields.companyPostalCode.value = profile.companyPostalCode ?? "";
    fields.companyCity.value = profile.companyCity ?? "";
    fields.companySiret.value = profile.companySiret ?? "";
    fields.companyRcs.value = profile.companyRcs ?? "";
    fields.companyTvaIntra.value = profile.companyTvaIntra ?? "";
    fields.companyApe.value = profile.companyApe ?? "";
    fields.companyCapital.value = profile.companyCapital ?? "";
    fields.companyPhone.value = profile.companyPhone ?? "";
    fields.companyEmail.value = profile.companyEmail ?? user?.email ?? "";
    fields.companyWebsite.value = profile.companyWebsite ?? "";
    fields.companyIban.value = profile.companyIban ?? "";
    fields.companyBic.value = profile.companyBic ?? "";
    fields.bankName.value = profile.bankName ?? "";
    fields.stripeCheckoutUrl.value = profile.stripeCheckoutUrl ?? "";
    fields.defaultPaymentTerms.value = profile.defaultPaymentTerms ?? DEFAULT_PAYMENT_TERMS;
    renderPaymentScheduleRows(getDefaultPaymentSchedule(profile));
    fields.quoteValidityDays.value = profile.quoteValidityDays ?? 30;
    fields.insuranceRcPro.value = profile.insuranceRcPro ?? "";
    fields.insuranceDecennale.value = profile.insuranceDecennale ?? "";
    fields.legalFooterNote.value = profile.legalFooterNote ?? "";
    if (fields.syncLegalToSite) {
      fields.syncLegalToSite.checked = Boolean(profile.syncLegalToSite);
    }
    fields.tradeType.value = profile.tradeType ?? "electricien";
    const cfg = getCountryProfile("FR");
    const travel = cfg.travelDefaults;
    fields.travelKmRate.value = profile.travelKmRate ?? travel.km;
    fields.travelDepannageHT.value = profile.travelDepannageHT ?? travel.depannage;
    fields.travelDayHT.value = profile.travelDayHT ?? travel.day;
    if (fields.moHourlyRate) fields.moHourlyRate.value = profile.moHourlyRate ?? cfg.moHourlyDefault;

    setBusinessType(businessType);
    syncCountryUi();
    if (fields.defaultVatRate) {
      fields.defaultVatRate.value = String(profile.defaultVatRate ?? cfg.defaultVatRate);
    }
  }

  function syncCountryUi() {
    const cfg = getCountryProfile("FR");
    if (fields.defaultVatRate) {
      fields.defaultVatRate.innerHTML = cfg.vatRates
        .map((r) => `<option value="${r.value}">${r.label}</option>`)
        .join("");
    }
  }

  function setBusinessType(type) {
    businessType = type;

    for (const card of sizeCards) {
      card.classList.toggle("size-card--active", card.dataset.businessType === type);
    }

    for (const panel of profilePanels) {
      panel.hidden = panel.dataset.profilePanel !== type;
    }

    suggestLegalForm(type);
    refreshUi();
  }

  function suggestLegalForm(type) {
    if (fields.companyLegalForm.value) return;
    const map = {
      micro: "Micro-entreprise",
      solo: "EI",
      tpe: "SARL",
    };
    if (map[type]) fields.companyLegalForm.value = map[type];
  }

  function updateActivityHint() {
    const activity = ACTIVITY_TYPES[fields.activityType.value];
    if (activity) fields.activityHint.textContent = activity.hint;
  }

  function updateSiretHint(profile) {
    const digits = String(profile.companySiret ?? "").replace(/\s/g, "");
    if (digits.length === 14) {
      fields.siretHint.textContent = `SIREN ${digits.slice(0, 9)} — prêt pour export FEC`;
      fields.siretHint.style.color = "var(--success, #059669)";
    } else if (digits.length > 0) {
      fields.siretHint.textContent = `${digits.length}/14 chiffres — format attendu : 14 chiffres`;
      fields.siretHint.style.color = "var(--danger, #b91c1c)";
    } else {
      fields.siretHint.textContent = "Utilisé pour l'export FEC et le pied de page PDF";
      fields.siretHint.style.color = "";
    }
  }

  function renderCompleteness(profile) {
    const { score, sections, doneCount, total } = computeProfileCompleteness(profile);
    const status = getProfileStatusLabel(score);

    document.getElementById("profil-score-value").textContent = `${score} %`;
    document.getElementById("profil-score-label").textContent = status.label;
    document.getElementById("profil-score-detail").textContent = `${doneCount} / ${total} sections`;
    const ring = document.getElementById("profil-score-ring");
    ring.dataset.score = String(score);
    ring.dataset.tone = status.tone;
    ring.style.setProperty("--score", String(score));

    const checklist = document.getElementById("profil-checklist");
    checklist.innerHTML = sections
      .map(
        (section) => `
      <li class="profil-checklist__item${section.done ? " is-done" : ""}">
        <button type="button" class="profil-checklist__btn" data-goto-tab="${section.tab}">
          <span class="profil-checklist__icon">${section.done ? "✓" : "○"}</span>
          <span>
            <strong>${escapeHtml(section.label)}</strong>
            <small>${section.done ? "Complet" : "À compléter"}</small>
          </span>
        </button>
      </li>`,
      )
      .join("");

    checklist.querySelectorAll("[data-goto-tab]").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.gotoTab));
    });
  }

  function renderKpiGrid(profile) {
    const summary = computeProfileSummary(profile);
    const sym = getCountryProfile("FR").symbol;
    document.getElementById("profil-kpi-grid").innerHTML = `
      <div class="profil-kpi"><span>Tarif horaire min.</span><strong>${formatHourly(summary.minHourlyRate, "FR")}</strong></div>
      <div class="profil-kpi"><span>Objectif net / h</span><strong>${formatHourly(summary.targetHourlyNet, "FR")}</strong></div>
      <div class="profil-kpi"><span>${escapeHtml(summary.extraLabel)}</span><strong>${escapeHtml(summary.extraValue)}</strong></div>
      <div class="profil-kpi"><span>Charges fixes</span><strong>${profile.monthlyFixed} ${sym} / mois</strong></div>
    `;
  }

  function renderDocPreview(profile) {
    const address = getFullCompanyAddress(profile);
    const trade = TRADES[profile.tradeType]?.label || "Artisan du bâtiment";
    const legalLine = [profile.companyLegalForm, profile.companyCapital && `au capital de ${profile.companyCapital}`]
      .filter(Boolean)
      .join(" — ");

    document.getElementById("profil-doc-preview").innerHTML = `
      <div class="profil-doc-preview__brand">${escapeHtml(profile.companyName || "Votre entreprise")}</div>
      ${legalLine ? `<div class="profil-doc-preview__line">${escapeHtml(legalLine)}</div>` : ""}
      ${address ? `<div class="profil-doc-preview__line">${escapeHtml(address)}</div>` : ""}
      ${profile.companySiret ? `<div class="profil-doc-preview__line">SIRET ${escapeHtml(profile.companySiret)}</div>` : ""}
      ${profile.companyRcs ? `<div class="profil-doc-preview__line">${escapeHtml(profile.companyRcs)}</div>` : ""}
      ${profile.companyTvaIntra ? `<div class="profil-doc-preview__line">TVA ${escapeHtml(profile.companyTvaIntra)}</div>` : ""}
      <div class="profil-doc-preview__line">${escapeHtml(trade)}</div>
      ${profile.companyPhone ? `<div class="profil-doc-preview__line">Tél. ${escapeHtml(profile.companyPhone)}</div>` : ""}
      ${profile.companyEmail ? `<div class="profil-doc-preview__line">${escapeHtml(profile.companyEmail)}</div>` : ""}
      ${profile.companyWebsite ? `<div class="profil-doc-preview__line">${escapeHtml(profile.companyWebsite)}</div>` : ""}
    `;
  }

  function updatePreview() {
    updateActivityHint();
    const profile = readProfile();
    const summary = computeProfileSummary(profile);

    summaryEls.minHourlyRate.textContent = formatHourly(summary.minHourlyRate, "FR");
    summaryEls.targetHourlyNet.textContent = formatHourly(summary.targetHourlyNet, "FR");
    summaryEls.extraLabel.textContent = summary.extraLabel;
    summaryEls.extraValue.textContent = summary.extraValue;

    updateSiretHint(profile);
    renderCompleteness(profile);
    renderKpiGrid(profile);
    renderDocPreview(profile);
  }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".profil-tabs__btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tab === tab);
    });
    document.querySelectorAll(".profil-panel").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tab;
    });
  }

  function markDirty() {
    dirty = true;
    saveMsg.textContent = "Modifications non enregistrées";
    saveMsg.classList.remove("is-saved");
  }

  function refreshUi() {
    updatePreview();
  }

  for (const card of sizeCards) {
    card.addEventListener("click", () => {
      setBusinessType(card.dataset.businessType);
      markDirty();
    });
  }

  for (const field of Object.values(fields)) {
    if (!field) continue;
    field.addEventListener("input", () => {
      markDirty();
      refreshUi();
    });
    field.addEventListener("change", () => {
      markDirty();
      refreshUi();
    });
  }

  [fields.tvaRegime, fields.tvaRegimeSolo, fields.tvaRegimeTpe].forEach((select) => {
    select?.addEventListener("change", () => {
      syncTvaRegimeSelects(select.value);
      markDirty();
      refreshUi();
    });
  });

  document.getElementById("profil-tabs")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-tab]");
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  const loadedProfile = applyCountryProfileDefaults(loadProfile());

  const difficultySettings = initDifficultySettings({
    tradeSelect: document.getElementById("difficulty-trade-select"),
    tableRoot: document.getElementById("difficulty-coeff-table-wrap"),
    resetTradeBtn: document.getElementById("difficulty-reset-trade"),
    resetAllBtn: document.getElementById("difficulty-reset-all"),
    defaultTrade: loadedProfile.tradeType ?? "electricien",
  });

  fields.tradeType?.addEventListener("change", () => {
    const difficultyTrade = document.getElementById("difficulty-trade-select");
    if (difficultySettings && difficultyTrade) {
      difficultyTrade.value = fields.tradeType.value;
      difficultySettings.refresh();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const scheduleValidation = validatePaymentSchedule(readPaymentScheduleFromDom());
    if (!scheduleValidation.ok) {
      saveMsg.textContent = scheduleValidation.error;
      saveMsg.classList.remove("is-saved");
      fields.paymentScheduleError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    difficultySettings?.persist();
    const profile = readProfile();
    saveProfile(profile);
    if (profile.syncLegalToSite) {
      syncSitePublisherFromProfile(profile);
    }
    dirty = false;
    saveMsg.textContent = profile.syncLegalToSite
      ? "Profil enregistré — pages légales du site mises à jour"
      : "Profil enregistré avec succès";
    saveMsg.classList.add("is-saved");

    const next = params.get("next");
    if (next) {
      window.location.href = next;
    }
  });

  fields.btnSyncLegalSite?.addEventListener("click", () => {
    syncSitePublisherFromProfile(readProfile());
    saveMsg.textContent = "Coordonnées appliquées aux pages légales (mentions, CGU, confidentialité)";
    saveMsg.classList.add("is-saved");
  });

  fields.addPaymentScheduleRow?.addEventListener("click", () => {
    const rows = readPaymentScheduleFromDom();
    const used = rows.reduce((sum, row) => sum + row.percent, 0);
    rows.push({
      label: `Échéance ${rows.length + 1}`,
      percent: Math.max(0, 100 - used),
      daysAfter: 30,
    });
    renderPaymentScheduleRows(rows);
    dirty = true;
  });

  fillForm(loadProfile());
  if (!fields.defaultPaymentTerms.value) {
    fields.defaultPaymentTerms.value = DEFAULT_PAYMENT_TERMS;
  }
  refreshUi();
  saveMsg.textContent = "Profil chargé — modifiez puis enregistrez";
}
