import { formatProfileMoney } from "./market.js";
import { readPaymentPayloadFromLocation } from "./payment-link.codec.js";
import { buildArtisanConfirmUrl } from "./payment-link-service.js";
import { escapeHtml } from "./utils.js";

const SUPPORT_EMAIL = "support@exxon-bat.com";

const TYPE_LABELS = {
  acompte: "Acompte",
  solde: "Solde",
  full: "Paiement total",
  custom: "Paiement",
  plan: "Plan de paiement",
  echeance: "Échéance",
};

function copyText(text) {
  return navigator.clipboard?.writeText(text);
}

function renderError(message) {
  document.getElementById("payment-root").innerHTML = `
    <div class="payment-page__error">
      <strong>Lien indisponible</strong>
      <p>${message}</p>
    </div>`;
}

async function notifyArtisanPaymentSent(payload, extra = {}) {
  const confirmUrl = buildArtisanConfirmUrl(
    payload.token,
    window.location.origin,
    extra.installmentIndex ?? payload.installmentIndex ?? null,
  );
  const body = {
    _subject: `[Exxon-bat] Paiement signalé — ${extra.reference || payload.reference}`,
    _template: "table",
    _captcha: "false",
    token: payload.token,
    client: payload.clientName || "Client",
    email_client: payload.clientEmail || "—",
    montant_ht: formatProfileMoney(extra.amount ?? payload.amount),
    reference: extra.reference || payload.reference,
    devis: payload.devisNumber || "—",
    echeance: extra.label || payload.installmentLabel || "—",
    action_artisan: confirmUrl,
    message:
      "Le client a signalé un virement. Cliquez « Valider l'encaissement » dans Exxon-bat ou ouvrez le lien action_artisan.",
  };

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${SUPPORT_EMAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("mail");
    const data = await response.json();
    if (data.success !== "true" && data.success !== true) throw new Error("mail");
    return true;
  } catch {
    return false;
  }
}

function renderBankBox(payload, { amount, reference, active = true } = {}) {
  const displayAmount = amount ?? payload.amount;
  const displayRef = reference ?? payload.reference;
  if (!active) return "";

  const stripeBlock = payload.stripeCheckoutUrl
    ? `<a href="${payload.stripeCheckoutUrl}" class="btn btn--primary btn--block" target="_blank" rel="noopener">Payer en ligne (carte / SEPA)</a>`
    : "";

  return `
    <dl class="payment-bank-box" data-bank-box>
      <dt>Bénéficiaire</dt>
      <dd>${escapeHtml(payload.companyName || "—")}</dd>
      <dt>IBAN</dt>
      <dd id="pay-iban">${escapeHtml(payload.companyIban)}</dd>
      ${payload.companyBic ? `<dt>BIC</dt><dd>${escapeHtml(payload.companyBic)}</dd>` : ""}
      <dt>Référence virement (obligatoire)</dt>
      <dd id="pay-ref">${escapeHtml(displayRef)}</dd>
      <dt>Montant</dt>
      <dd id="pay-amount-display">${formatProfileMoney(displayAmount)} HT</dd>
    </dl>
    <div class="payment-page__actions">
      ${stripeBlock}
      <button type="button" class="btn btn--ghost" id="copy-iban">Copier l'IBAN</button>
      <button type="button" class="btn btn--ghost" id="copy-ref">Copier la référence</button>
      <button type="button" class="btn btn--primary" id="confirm-virement">J'ai effectué le virement</button>
    </div>
    <p class="payment-page__note">
      Après votre virement, cliquez sur « J'ai effectué le virement » pour prévenir l'artisan.
      L'encaissement sera validé sous 24–48 h ouvrées après réception des fonds.
    </p>
    <div id="payment-feedback" hidden></div>
  `;
}

function bindBankActions(root, payload, context = {}) {
  const iban = payload.companyIban;
  const reference = context.reference ?? payload.reference;
  const amount = context.amount ?? payload.amount;
  const label = context.label ?? "";

  root.querySelector("#copy-iban")?.addEventListener("click", async () => {
    await copyText(iban);
    alert("IBAN copié.");
  });

  root.querySelector("#copy-ref")?.addEventListener("click", async () => {
    await copyText(reference);
    alert("Référence copiée.");
  });

  root.querySelector("#confirm-virement")?.addEventListener("click", async () => {
    const btn = root.querySelector("#confirm-virement");
    const feedback = root.querySelector("#payment-feedback");
    btn.disabled = true;
    btn.textContent = "Envoi…";

    const mailed = await notifyArtisanPaymentSent(payload, {
      reference,
      amount,
      label,
      installmentIndex: context.installmentIndex ?? context.index ?? null,
    });
    feedback.hidden = false;
    feedback.className = "payment-page__success";
    feedback.innerHTML = mailed
      ? `<strong>Merci !</strong> Votre artisan a été prévenu. Conservez la référence <strong>${escapeHtml(reference)}</strong> sur votre relevé bancaire.`
      : `<strong>Merci !</strong> Virement signalé. Communiquez la référence <strong>${escapeHtml(reference)}</strong> à votre artisan si besoin.`;

    btn.textContent = "Virement signalé ✓";
  });
}

function renderPlanPage(root, payload) {
  const installments = payload.installments ?? [];
  const total = Number(payload.devisTotal) || installments.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const paidTotal = installments.filter((r) => r.paid).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const nextDue = installments.find((r) => !r.paid);

  root.innerHTML = `
    <span class="payment-page__badge">🔒 Paiement sécurisé</span>
    <h1 style="margin:0 0 6px;font-size:1.35rem">Plan de paiement — ${escapeHtml(payload.companyName || "Artisan")}</h1>
    <p class="payment-page__meta">${escapeHtml(payload.jobName || "Prestation")} · ${escapeHtml(payload.clientName || "Client")}</p>
    <p class="payment-page__meta">Devis <strong>${escapeHtml(payload.devisNumber || "—")}</strong> · Total ${formatProfileMoney(total)} HT</p>

    <div class="payment-plan-summary">
      <div><span>Encaissé</span><strong>${formatProfileMoney(paidTotal)}</strong></div>
      <div><span>Reste</span><strong>${formatProfileMoney(Math.max(0, total - paidTotal))}</strong></div>
    </div>

    <section class="payment-plan-list" aria-label="Échéances">
      ${installments
        .map((row, index) => {
          const dueLabel = row.dueDate
            ? new Date(row.dueDate).toLocaleDateString("fr-FR")
            : "—";
          const statusClass = row.paid ? "payment-plan-row--paid" : "payment-plan-row--due";
          const statusLabel = row.paid ? "Réglé" : "À payer";
          return `
            <article class="payment-plan-row ${statusClass}" data-installment="${index}">
              <div class="payment-plan-row__main">
                <strong>${escapeHtml(row.label || `Échéance ${index + 1}`)}</strong>
                <span>${formatProfileMoney(row.amount)} HT · ${dueLabel}</span>
              </div>
              <div class="payment-plan-row__side">
                <span class="payment-plan-row__status">${statusLabel}</span>
                ${
                  row.paid
                    ? ""
                    : `<button type="button" class="btn btn--ghost btn--sm" data-select-installment="${index}">Régler</button>`
                }
              </div>
            </article>`;
        })
        .join("")}
    </section>

    <div id="payment-active-installment">
      ${
        nextDue
          ? `<p class="payment-page__meta payment-page__meta--active">Échéance sélectionnée : <strong>${escapeHtml(nextDue.label || "Prochaine échéance")}</strong></p>`
          : `<p class="payment-page__success">Toutes les échéances sont réglées. Merci !</p>`
      }
      ${nextDue ? renderBankBox(payload, { amount: nextDue.amount, reference: nextDue.reference }) : ""}
    </div>
  `;

  const nextDueIndex = nextDue ? installments.findIndex((row) => row === nextDue) : -1;

  let active = nextDue
    ? {
        amount: nextDue.amount,
        reference: nextDue.reference,
        label: nextDue.label,
        index: nextDueIndex >= 0 ? nextDueIndex : nextDue.index,
        installmentIndex: nextDueIndex >= 0 ? nextDueIndex : nextDue.index,
      }
    : null;

  function selectInstallment(index) {
    const row = installments[index];
    if (!row || row.paid) return;
    active = {
      amount: row.amount,
      reference: row.reference,
      label: row.label,
      index: row.index ?? index,
      installmentIndex: row.index ?? index,
    };

    const host = root.querySelector("#payment-active-installment");
    if (!host) return;
    host.innerHTML = `
      <p class="payment-page__meta payment-page__meta--active">Échéance sélectionnée : <strong>${escapeHtml(row.label || `Échéance ${index + 1}`)}</strong></p>
      ${renderBankBox(payload, { amount: row.amount, reference: row.reference })}
    `;
    bindBankActions(host, payload, active);

    root.querySelectorAll(".payment-plan-row").forEach((el) => {
      el.classList.toggle("payment-plan-row--selected", Number(el.dataset.installment) === index);
    });
  }

  root.querySelectorAll("[data-select-installment]").forEach((btn) => {
    btn.addEventListener("click", () => selectInstallment(Number(btn.dataset.selectInstallment)));
  });

  if (active) {
    bindBankActions(root.querySelector("#payment-active-installment"), payload, active);
    const idx = installments.findIndex((r) => r.index === active.index || r === nextDue);
    if (idx >= 0) root.querySelector(`.payment-plan-row[data-installment="${idx}"]`)?.classList.add("payment-plan-row--selected");
  }
}

function renderSinglePayment(root, payload) {
  const typeLabel =
    payload.type === "echeance"
      ? payload.installmentLabel || TYPE_LABELS.echeance
      : TYPE_LABELS[payload.type] || "Paiement";

  root.innerHTML = `
    <span class="payment-page__badge">🔒 Paiement sécurisé</span>
    <h1 style="margin:0 0 6px;font-size:1.35rem">${escapeHtml(typeLabel)} — ${escapeHtml(payload.companyName || "Artisan")}</h1>
    <p class="payment-page__meta">${escapeHtml(payload.jobName || "Prestation")} · ${escapeHtml(payload.clientName || "Client")}</p>
    <p class="payment-page__amount">${formatProfileMoney(payload.amount)} <small style="font-size:0.45em;font-weight:600;color:#64748b">HT</small></p>
    <p class="payment-page__meta">Référence devis : <strong>${escapeHtml(payload.devisNumber || "—")}</strong></p>
    ${renderBankBox(payload)}
  `;

  bindBankActions(root, payload, {
    amount: payload.amount,
    reference: payload.reference,
    label: payload.installmentLabel,
    installmentIndex: payload.installmentIndex ?? null,
  });
}

function boot() {
  const root = document.getElementById("payment-root");
  const payload = readPaymentPayloadFromLocation();

  if (!payload) {
    renderError("Ce lien est invalide ou incomplet. Demandez un nouveau lien à votre artisan.");
    return;
  }

  if (payload.expired) {
    renderError("Ce lien a expiré. Contactez votre artisan pour en recevoir un nouveau.");
    return;
  }

  if (payload.type === "plan" && payload.installments?.length) {
    renderPlanPage(root, payload);
    return;
  }

  renderSinglePayment(root, payload);
}

boot();
