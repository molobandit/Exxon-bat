import { getUser, requireAuth } from "./auth.js";
import {
  getReviews,
  getReviewsByArtisan,
  saveArtisanPublicProfile,
  updateReview,
} from "./data.js";
import { initAppNav } from "./nav-app.js";
import { TRADES } from "./metre-templates.js";
import { loadProfile } from "./storage.js";
import { escapeHtml } from "./utils.js";

if (!requireAuth()) return;

initAppNav("avis");

const user = getUser();
const profile = loadProfile();

saveArtisanPublicProfile(user.email, {
  companyName: profile.companyName,
  tradeType: profile.tradeType,
  city: profile.companyAddress?.split(",").pop()?.trim() || "",
});

const shareLink = `${window.location.origin}/avis.html?artisan=${encodeURIComponent(user.email)}`;
const shareInput = document.getElementById("share-link");
const copyBtn = document.getElementById("copy-link");
const copyFeedback = document.getElementById("copy-feedback");
const artisanList = document.getElementById("artisan-reviews");
const exoneList = document.getElementById("exone-reviews");
const artisanCount = document.getElementById("artisan-count");

shareInput.value = shareLink;

copyBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareLink);
    copyFeedback.textContent = "Lien copié — envoyez-le à votre client après le chantier.";
    copyFeedback.style.color = "var(--success)";
  } catch {
    shareInput.select();
    copyFeedback.textContent = "Sélectionnez le lien et copiez-le (Ctrl+C).";
    copyFeedback.style.color = "var(--text-muted)";
  }
});

function stars(n) {
  return "★".repeat(n);
}

function statusLabel(status) {
  if (status === "approved") return "Validé";
  if (status === "rejected") return "Refusé";
  return "En attente";
}

function renderReviewCard(review, options = {}) {
  const trade = TRADES[review.trade]?.label || review.trade;
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(review.createdAt));

  const actions =
    review.status === "pending"
      ? `<div class="avis-list__actions">
          <button type="button" class="btn btn--primary btn--sm" data-approve="${review.id}">Valider</button>
          <button type="button" class="btn btn--ghost btn--sm" data-reject="${review.id}">Refuser</button>
        </div>`
      : "";

  const publishHome =
    options.allowHomePublish && review.status === "approved"
      ? `<p class="avis-list__meta">✓ Publié sur la page d'accueil</p>`
      : options.allowHomePublish && review.status === "pending"
        ? `<p class="avis-list__meta">Validez pour afficher sur exone.fr</p>`
        : "";

  return `
    <article class="avis-list__item avis-list__item--${review.status}">
      <div class="avis-list__head">
        <strong>${escapeHtml(review.authorName)}</strong>
        <span>${stars(review.rating)}</span>
      </div>
      <p class="avis-list__tag">${escapeHtml(trade)} · ${escapeHtml(review.city)}</p>
      <p class="avis-list__text">« ${escapeHtml(review.text)} »</p>
      <p class="avis-list__meta">${date} — ${statusLabel(review.status)}</p>
      ${publishHome}
      ${actions}
    </article>`;
}

function renderLists() {
  const artisanReviews = getReviewsByArtisan(user.email);
  const exoneReviews = getReviews().filter((r) => r.type === "exone");

  artisanCount.textContent = `(${artisanReviews.length})`;

  artisanList.innerHTML = artisanReviews.length
    ? artisanReviews.map((r) => renderReviewCard(r)).join("")
    : `<p class="avis-list__empty">Aucun avis pour le moment. Envoyez le lien à vos clients après un chantier terminé.</p>`;

  exoneList.innerHTML = exoneReviews.length
    ? exoneReviews.map((r) => renderReviewCard(r, { allowHomePublish: true })).join("")
    : `<p class="avis-list__empty">Aucun avis Exxon-bat en attente. <a href="avis.html">Laisser un avis</a></p>`;
}

function handleAction(event) {
  const approve = event.target.closest("[data-approve]");
  const reject = event.target.closest("[data-reject]");
  if (!approve && !reject) return;

  const id = approve?.dataset.approve || reject?.dataset.reject;
  updateReview(id, {
    status: approve ? "approved" : "rejected",
    approvedAt: approve ? new Date().toISOString() : null,
  });
  renderLists();
}

artisanList?.addEventListener("click", handleAction);
exoneList?.addEventListener("click", handleAction);

renderLists();
