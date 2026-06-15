import { getApprovedExoneReviews, getReviewsStats } from "./data.js";
import { SEED_TESTIMONIALS } from "./testimonials-seed.js";
import { TRADES } from "./metre-templates.js";
import { escapeHtml } from "./utils.js";

function stars(n) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function renderCard(item, verified = false) {
  const badge = verified
    ? `<span class="testimonial__verified">Avis vérifié</span>`
    : "";
  return `
    <article class="testimonial">
      ${badge}
      <div class="testimonial__stars">${stars(item.stars)}</div>
      <p class="testimonial__result">${escapeHtml(item.tag)}</p>
      <blockquote>« ${escapeHtml(item.quote)} »</blockquote>
      <div class="testimonial__author">
        <img class="testimonial__avatar" src="${escapeHtml(item.avatar)}" alt="" loading="lazy" />
        <div>
          <strong>${escapeHtml(item.author)}</strong>
          <span>${escapeHtml(item.role)}</span>
        </div>
      </div>
    </article>`;
}

function reviewToCard(review) {
  const trade = TRADES[review.trade]?.label || review.trade || "Artisan BTP";
  const location = [trade, review.city].filter(Boolean).join(" · ");
  return {
    stars: review.rating,
    tag: location,
    quote: review.text,
    author: review.authorName,
    role: location,
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80",
  };
}

export function renderHomeTestimonials() {
  const container = document.getElementById("testimonials-grid");
  const ratingEl = document.getElementById("testimonials-rating");
  if (!container) return;

  const approved = getApprovedExoneReviews().map(reviewToCard);
  const cards = [...SEED_TESTIMONIALS, ...approved];

  container.innerHTML = cards
    .map((item, index) =>
      renderCard(item, index >= SEED_TESTIMONIALS.length),
    )
    .join("");

  if (ratingEl) {
    const stats = getReviewsStats();
    const displayRating =
      stats.approvedCount > 0 ? stats.averageRating : 4.9;
    ratingEl.innerHTML = `Découvrez pourquoi : <strong>${displayRating}/5</strong> — ${cards.length} témoignages${stats.approvedCount ? ` dont ${stats.approvedCount} avis clients vérifiés` : ""}`;
  }
}

renderHomeTestimonials();
