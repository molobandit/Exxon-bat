import { formatProfileMoney, getProfileCurrencySymbol } from "./market.js";
import { formatPrice } from "./subscription.js";
import {
  getMinPlanForPaymentCapability,
  hasPaymentCapability,
  PAYMENT_CAPABILITIES,
} from "./subscription.js";
import { escapeHtml } from "./utils.js";
import {
  addAutoReminder,
  addManualReminder,
  computePaymentStatus,
  computeRemaining,
  PAYMENT_STATUS_LABELS,
  refreshPaymentStatus,
  saveDevisPayment,
  shouldSendAutoReminder,
} from "./payment-store.js";
import {
  applyPaymentConfirmation,
  buildMailtoPaymentLink,
  createInstallmentPaymentLink,
  createPaymentLinkRequest,
  createPaymentPlanLink,
  getPendingPaymentLinks,
  sendPaymentLinkEmail,
} from "./payment-link-service.js";
import { syncPaymentValidated } from "./commercial-sync.js";
import { applyProfilePlanToDevis } from "./payment-plan.js";
import { loadProfile } from "./storage.js";

function statusPill(status) {
  const map = {
    pending: "warning",
    partial: "warning",
    paid: "success",
    overdue: "danger",
  };
  return `<span class="status-pill status-pill--${map[status] ?? "warning"}">${PAYMENT_STATUS_LABELS[status] ?? status}</span>`;
}

function renderUpgradeTeaser() {
  const minPlan = getMinPlanForPaymentCapability("tracking");
  if (!minPlan) return "";
  return `
    <div class="payments-teaser">
      <div class="payments-teaser__icon" aria-hidden="true">💳</div>
      <div>
        <strong>Suivi des encaissements</strong>
        <p>Suivez les paiements, gérez les acomptes et relancez les impayés — inclus dès l'offre <strong>${escapeHtml(minPlan.name)}</strong> (${formatPrice(minPlan.priceMonthly)}/mois).</p>
        <a href="tarifs.html?upgrade=paiements" class="btn btn--ghost btn--sm">Voir les offres →</a>
      </div>
    </div>
  `;
}

function renderInstallments(devis, payment, total) {
  if (!hasPaymentCapability("installments")) return "";
  const rows = payment.installments?.length
    ? payment.installments
    : [{ label: "Échéance 1", dueDate: payment.dueDate || "", amount: total, paid: false }];
  const profile = loadProfile();
  const hasIban = Boolean(profile.companyIban?.trim());
  const validated = Boolean(devis.commercialValidatedAt);

  return `
    <div class="payments-field">
      <span class="payments-field__label">Paiement en plusieurs fois</span>
      ${
        validated
          ? `<p class="payments-plan-hint">Devis validé — plan d'échéances prêt à envoyer au client.</p>`
          : `<p class="payments-plan-hint payments-plan-hint--warn">Validez le devis pour générer automatiquement le plan de paiement.</p>`
      }
      <div class="payments-installments" data-installments>
        ${rows
          .map(
            (row, index) => `
          <div class="payments-installment${row.paid ? " payments-installment--paid" : ""}" data-index="${index}">
            <div class="payments-installment__main">
              <input type="text" data-field="label" value="${escapeHtml(row.label || `Échéance ${index + 1}`)}" aria-label="Libellé échéance" placeholder="Libellé" />
              <input type="date" data-field="dueDate" value="${escapeHtml(row.dueDate || "")}" aria-label="Date échéance" />
              <input type="number" min="0" step="10" data-field="amount" value="${row.amount ?? 0}" aria-label="Montant" />
              <label class="payments-installment__paid">
                <input type="checkbox" data-field="paid" ${row.paid ? "checked" : ""} />
                Payé
              </label>
            </div>
            <button type="button" class="btn btn--ghost btn--sm" data-installment-link="${index}" ${hasIban && !row.paid ? "" : "disabled"}>Lien client</button>
          </div>`,
          )
          .join("")}
      </div>
      <div class="payments-installments__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-add-installment>+ Échéance</button>
        <button type="button" class="btn btn--ghost btn--sm" data-apply-profile-plan>Réappliquer le modèle profil</button>
        <button type="button" class="btn btn--primary btn--sm" data-pay-plan ${hasIban && validated && rows.some((r) => !r.paid) ? "" : "disabled"}>Envoyer le plan complet</button>
      </div>
    </div>
  `;
}

function renderPaymentLinks(devis, payment, remaining) {
  const pending = getPendingPaymentLinks(devis.id).filter((l) => l.status === "pending");
  const profile = loadProfile();
  const currencySym = getProfileCurrencySymbol();
  const hasIban = Boolean(profile.companyIban?.trim());
  const depositDefault =
    payment.depositAmount > 0
      ? payment.depositAmount
      : Math.round(devis.price * 0.3 * 100) / 100;

  return `
    <div class="payments-links">
      <div class="payments-links__head">
        <strong>Lien de paiement client</strong>
        <span>Virement sécurisé · acompte, échéances ou solde</span>
      </div>
      ${
        hasIban
          ? ""
          : `<p class="payments-links__warn">Renseignez votre <a href="profil.html">IBAN dans Mon profil</a> pour activer les liens.</p>`
      }
      <div class="payments-links__quick">
        <button type="button" class="btn btn--ghost btn--sm" data-pay-link="acompte" ${hasIban ? "" : "disabled"}>Lien acompte (${formatProfileMoney(depositDefault)})</button>
        <button type="button" class="btn btn--ghost btn--sm" data-pay-link="solde" ${hasIban ? "" : "disabled"}>Lien solde (${formatProfileMoney(remaining)})</button>
        <button type="button" class="btn btn--ghost btn--sm" data-pay-link="full" ${hasIban ? "" : "disabled"}>Lien total</button>
      </div>
      <label class="field payments-links__custom">
        <span>Montant personnalisé (${currencySym} HT)</span>
        <div class="field__wrap payments-links__custom-row">
          <input type="number" id="pay-link-amount" min="1" step="10" value="${remaining > 0 ? remaining : devis.price}" />
          <button type="button" class="btn btn--primary btn--sm" data-pay-link="custom" ${hasIban ? "" : "disabled"}>Créer le lien</button>
        </div>
      </label>
      <label class="field">
        <span>E-mail client (pour envoi)</span>
        <div class="field__wrap">
          <input type="email" id="pay-link-email" value="${escapeHtml(devis.clientEmail || "")}" placeholder="client@exemple.fr" />
        </div>
      </label>
      <div class="payments-links__actions">
        <button type="button" class="btn btn--ghost btn--sm" id="pay-link-copy" disabled>Copier le lien</button>
        <button type="button" class="btn btn--ghost btn--sm" id="pay-link-email-btn" disabled>Envoyer par e-mail</button>
        <button type="button" class="btn btn--primary btn--sm" id="pay-link-validate" disabled>Valider encaissement reçu</button>
      </div>
      <p class="payments-links__last" id="pay-link-status"></p>
      ${
        pending.length
          ? `<ul class="payments-links__pending">${pending
              .slice(0, 3)
              .map(
                (l) =>
                  `<li>${escapeHtml(l.type)} · ${formatProfileMoney(l.amount)} · <code>${escapeHtml(l.reference)}</code></li>`,
              )
              .join("")}</ul>`
          : ""
      }
    </div>
  `;
}

function bindPaymentLinks(devis, root) {
  let lastLink = null;

  function showLink(link) {
    lastLink = link;
    const status = root.querySelector("#pay-link-status");
    if (status) {
      status.innerHTML = `Lien créé — <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">Ouvrir la page client</a>`;
    }
    root.querySelector("#pay-link-copy")?.removeAttribute("disabled");
    root.querySelector("#pay-link-email-btn")?.removeAttribute("disabled");
    root.querySelector("#pay-link-validate")?.removeAttribute("disabled");
  }

  root.addEventListener("paymentlinkcreated", (event) => {
    if (event.detail?.link) showLink(event.detail.link);
  });

  function createLink(type) {
    const payment = computePaymentStatus(devis.id, devis.price);
    const remaining = computeRemaining(devis.price, payment);
    let amount = 0;
    if (type === "acompte") {
      amount =
        payment.depositAmount > 0
          ? payment.depositAmount
          : Math.round(devis.price * 0.3 * 100) / 100;
    } else if (type === "solde") {
      amount = remaining;
    } else if (type === "full") {
      amount = devis.price;
    } else {
      amount = Number(root.querySelector("#pay-link-amount")?.value) || 0;
      type = "custom";
    }

    try {
      const link = createPaymentLinkRequest({
        devis,
        amount,
        type,
        clientEmail: root.querySelector("#pay-link-email")?.value?.trim() || devis.clientEmail,
      });
      showLink(link);
      return link;
    } catch (error) {
      alert(error.message || "Impossible de créer le lien.");
      return null;
    }
  }

  root.querySelectorAll("[data-pay-link]").forEach((btn) => {
    btn.addEventListener("click", () => createLink(btn.dataset.payLink));
  });

  root.querySelector("#pay-link-copy")?.addEventListener("click", async () => {
    if (!lastLink) return;
    await navigator.clipboard.writeText(lastLink.url);
    alert("Lien copié — envoyez-le à votre client (SMS, e-mail, WhatsApp).");
  });

  root.querySelector("#pay-link-email-btn")?.addEventListener("click", async () => {
    const link = lastLink || createLink("custom");
    if (!link) return;
    const email = root.querySelector("#pay-link-email")?.value?.trim();
    if (!email) {
      alert("Indiquez l'e-mail du client.");
      return;
    }
    try {
      await sendPaymentLinkEmail({ ...link, clientEmail: email });
      alert("Lien envoyé par e-mail au client.");
    } catch {
      window.location.href = buildMailtoPaymentLink({ ...link, clientEmail: email });
    }
  });

  root.querySelector("#pay-link-validate")?.addEventListener("click", () => {
    if (!lastLink) return;
    const result = applyPaymentConfirmation(lastLink.token);
    if (!result.ok) {
      alert(result.reason || "Impossible de valider.");
      return;
    }
    alert(`Encaissement de ${formatProfileMoney(result.amount)} enregistré.`);
    syncPaymentValidated(devis.id, devis.price);
    root.dispatchEvent(new CustomEvent("paymentschange"));
    selectDevis(devis);
  });
}

function renderDetail(devis, root) {
  const payment = refreshPaymentStatus(devis.id, devis.price);
  const remaining = computeRemaining(devis.price, payment);
  const currencySym = getProfileCurrencySymbol();
  const canTrack = hasPaymentCapability("tracking");
  const canDeposits = hasPaymentCapability("deposits");
  const canTerms = hasPaymentCapability("customTerms");
  const canManual = hasPaymentCapability("manualReminders");
  const canAuto = hasPaymentCapability("autoReminders");
  const canInstallments = hasPaymentCapability("installments");

  root.innerHTML = `
    <div class="payments-detail">
      <div class="payments-detail__head">
        <div>
          <strong>${escapeHtml(devis.jobName || "Prestation")}</strong>
          <span>${escapeHtml(devis.clientName || "—")} · ${formatProfileMoney(devis.price)} HT</span>
        </div>
        ${statusPill(payment.status)}
      </div>

      <div class="payments-kpis">
        <article><span>Encaissé</span><strong>${formatProfileMoney(payment.totalPaid)}</strong></article>
        <article><span>Reste à payer</span><strong>${formatProfileMoney(remaining)}</strong></article>
        <article><span>Échéance</span><strong>${payment.dueDate ? escapeHtml(payment.dueDate) : "—"}</strong></article>
      </div>

      ${renderPaymentLinks(devis, payment, remaining)}

      ${
        canTrack
          ? `
      <div class="payments-form${canInstallments ? " payments-form--installments" : ""}">
        ${
          canInstallments
            ? ""
            : `<label class="field">
          <span>Montant encaissé (${currencySym} HT)</span>
          <div class="field__wrap"><input type="number" id="pay-amount" min="0" step="10" value="${payment.totalPaid || 0}" /></div>
        </label>`
        }
        <label class="field">
          <span>Date d'échéance</span>
          <div class="field__wrap"><input type="date" id="pay-due" value="${escapeHtml(payment.dueDate || "")}" /></div>
        </label>
      </div>`
          : ""
      }

      ${
        canDeposits
          ? `
      <div class="payments-form payments-form--split">
        <label class="field">
          <span>Acompte prévu (${currencySym} HT)</span>
          <div class="field__wrap"><input type="number" id="pay-deposit" min="0" step="10" value="${payment.depositAmount || 0}" /></div>
        </label>
        <label class="field payments-check">
          <input type="checkbox" id="pay-deposit-paid" ${payment.depositPaid ? "checked" : ""} />
          <span>Acompte reçu</span>
        </label>
      </div>`
          : ""
      }

      ${
        canTerms
          ? `
      <label class="field">
        <span>Conditions de paiement (PDF client)</span>
        <div class="field__wrap"><textarea id="pay-terms" rows="3">${escapeHtml(payment.paymentTerms || "")}</textarea></div>
      </label>`
          : ""
      }

      ${canInstallments ? renderInstallments(devis, payment, devis.price) : ""}

      <div class="payments-actions">
        ${canManual ? `<button type="button" class="btn btn--ghost btn--sm" data-manual-reminder>Relancer le client</button>` : ""}
        ${
          canAuto
            ? `<label class="payments-auto">
            <input type="checkbox" id="pay-auto" ${payment.autoReminders ? "checked" : ""} />
            <span>Relance automatique (J+7 après échéance)</span>
          </label>`
            : ""
        }
        <button type="button" class="btn btn--primary btn--sm" data-save-payment>Enregistrer</button>
      </div>

      ${
        payment.reminders?.length
          ? `<ul class="payments-reminders">
          ${payment.reminders
            .slice()
            .reverse()
            .slice(0, 5)
            .map(
              (r) =>
                `<li><strong>${r.type === "auto" ? "Auto" : "Manuelle"}</strong> — ${new Date(r.date).toLocaleDateString("fr-FR")}${r.note ? ` · ${escapeHtml(r.note)}` : ""}</li>`,
            )
            .join("")}
        </ul>`
          : ""
      }
    </div>
  `;

  root.querySelector("[data-save-payment]")?.addEventListener("click", () => {
    const installments = canInstallments
      ? [...root.querySelectorAll("[data-installments] .payments-installment")].map((row) => ({
          label: row.querySelector('[data-field="label"]')?.value?.trim() ?? "",
          dueDate: row.querySelector('[data-field="dueDate"]')?.value ?? "",
          amount: Number(row.querySelector('[data-field="amount"]')?.value) || 0,
          paid: row.querySelector('[data-field="paid"]')?.checked ?? false,
        }))
      : payment.installments;

    const paidFromInstallments = installments.reduce(
      (sum, row) => sum + (row.paid ? row.amount : 0),
      0,
    );

    saveDevisPayment(devis.id, {
      totalPaid: canInstallments
        ? paidFromInstallments
        : Number(root.querySelector("#pay-amount")?.value) || 0,
      dueDate: root.querySelector("#pay-due")?.value ?? payment.dueDate,
      depositAmount: Number(root.querySelector("#pay-deposit")?.value) || 0,
      depositPaid: root.querySelector("#pay-deposit-paid")?.checked ?? false,
      paymentTerms: root.querySelector("#pay-terms")?.value?.trim() ?? payment.paymentTerms,
      installments,
      autoReminders: root.querySelector("#pay-auto")?.checked ?? false,
    });

    refreshPaymentStatus(devis.id, devis.price);
    syncPaymentValidated(devis.id, devis.price);
    selectDevis(devis);
    root.dispatchEvent(new CustomEvent("paymentschange"));
  });

  root.querySelector("[data-manual-reminder]")?.addEventListener("click", () => {
    addManualReminder(devis.id, `Relance pour ${devis.jobName || "prestation"}`);
    selectDevis(devis);
    root.dispatchEvent(new CustomEvent("paymentschange"));
  });

  root.querySelector("[data-add-installment]")?.addEventListener("click", () => {
    const list = [...(payment.installments ?? [])];
    list.push({ label: `Échéance ${list.length + 1}`, dueDate: "", amount: 0, paid: false });
    saveDevisPayment(devis.id, { installments: list });
    selectDevis(devis);
  });

  root.querySelector("[data-apply-profile-plan]")?.addEventListener("click", () => {
    const paymentNow = computePaymentStatus(devis.id, devis.price);
    const hasPaid =
      Number(paymentNow.totalPaid) > 0 || paymentNow.installments?.some((row) => row.paid);
    if (hasPaid && !confirm("Des encaissements existent. Réappliquer le modèle du profil quand même ?")) {
      return;
    }
    const result = applyProfilePlanToDevis(devis, { force: hasPaid });
    if (!result.ok) {
      alert(result.reason || "Impossible de réappliquer le modèle.");
      return;
    }
    selectDevis(devis);
    root.dispatchEvent(new CustomEvent("paymentschange"));
  });

  root.querySelector("[data-pay-plan]")?.addEventListener("click", () => {
    try {
      const link = createPaymentPlanLink(devis, {
        clientEmail: root.querySelector("#pay-link-email")?.value?.trim() || devis.clientEmail,
      });
      root.dispatchEvent(new CustomEvent("paymentlinkcreated", { detail: { link } }));
    } catch (error) {
      alert(error.message || "Impossible de créer le plan.");
    }
  });

  root.querySelectorAll("[data-installment-link]").forEach((btn) => {
    btn.addEventListener("click", () => {
      try {
        const link = createInstallmentPaymentLink(devis, Number(btn.dataset.installmentLink), {
          clientEmail: root.querySelector("#pay-link-email")?.value?.trim() || devis.clientEmail,
        });
        root.dispatchEvent(new CustomEvent("paymentlinkcreated", { detail: { link } }));
      } catch (error) {
        alert(error.message || "Impossible de créer le lien.");
      }
    });
  });

  if (canAuto && shouldSendAutoReminder(devis.id, devis.price)) {
    addAutoReminder(devis.id);
    selectDevis(devis);
  }

  bindPaymentLinks(devis, root);
}

let selectDevis = () => {};
let activeDevisId = null;

function dedupeDevisForPayments(devisList) {
  const seen = new Set();
  const unique = [];

  for (const devis of devisList) {
    const key = [
      devis.devisNumber ?? "",
      devis.jobName ?? "",
      devis.clientName ?? "",
      devis.price ?? 0,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(devis);
    if (unique.length >= 25) break;
  }

  return unique;
}

export function initDevisPayments({ panel, listRoot, detailRoot, getDevisList }) {
  if (!panel || !listRoot || !detailRoot) return;

  if (!hasPaymentCapability("tracking")) {
    panel.hidden = false;
    panel.innerHTML = renderUpgradeTeaser();
    return;
  }

  panel.hidden = false;

  function renderList() {
    const devisList = dedupeDevisForPayments(getDevisList());
    if (!devisList.length) {
      listRoot.innerHTML =
        '<p class="payments-empty">Aucun devis enregistré. Créez un devis pour activer le suivi des encaissements.</p>';
      detailRoot.innerHTML = "";
      return;
    }

    listRoot.innerHTML = devisList
      .map((devis) => {
        const payment = computePaymentStatus(devis.id, devis.price);
        return `
        <button type="button" class="payments-list__item" data-devis-id="${escapeHtml(devis.id)}">
          <span>
            <strong>${escapeHtml(devis.jobName || "—")}</strong>
            <small>${escapeHtml(devis.clientName || "—")} · ${formatProfileMoney(devis.price)}</small>
          </span>
          ${statusPill(payment.status)}
        </button>`;
      })
      .join("");

    listRoot.querySelectorAll("[data-devis-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const devis = devisList.find((d) => d.id === btn.dataset.devisId);
        if (devis) selectDevis(devis);
      });
    });
  }

  selectDevis = (devis) => {
    activeDevisId = devis.id;
    listRoot.querySelectorAll(".payments-list__item").forEach((el) => {
      el.classList.toggle("payments-list__item--active", el.dataset.devisId === devis.id);
    });
    renderDetail(devis, detailRoot);
  };

  function refresh() {
    const devisList = dedupeDevisForPayments(getDevisList());
    renderList();
    const target =
      devisList.find((d) => d.id === activeDevisId) ?? devisList[0] ?? null;
    if (target) selectDevis(target);
    else detailRoot.innerHTML = "";
  }

  refresh();

  return {
    refresh,
    selectByDevisId(devisId) {
      const devisList = dedupeDevisForPayments(getDevisList());
      const devis = devisList.find((item) => item.id === devisId);
      if (devis) selectDevis(devis);
    },
    capabilityLabels: Object.values(PAYMENT_CAPABILITIES),
  };
}
