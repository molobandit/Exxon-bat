import { addReview, getArtisanPublicProfile } from "./data.js";
import { TRADES } from "./metre-templates.js";

const params = new URLSearchParams(window.location.search);
const artisanEmail = params.get("artisan")?.trim().toLowerCase() || null;

const titleEl = document.getElementById("avis-title");
const subtitleEl = document.getElementById("avis-subtitle");
const form = document.getElementById("avis-form");
const feedbackEl = document.getElementById("avis-feedback");
const ratingWrap = document.getElementById("avis-rating");
const ratingInput = document.getElementById("avis-rating-value");

let selectedRating = 5;

function setupContext() {
  if (!artisanEmail) {
    titleEl.textContent = "Votre avis sur Exxon-bat";
    subtitleEl.textContent =
      "Vous utilisez Exxon-bat ? Dites-nous ce que vous en pensez. L'avis pourra apparaître sur la page d'accueil après validation.";
    return;
  }

  const profile = getArtisanPublicProfile(artisanEmail);
  const company =
    profile?.companyName ||
    "votre artisan";
  const trade = TRADES[profile?.tradeType]?.label;

  titleEl.textContent = `Avis sur ${company}`;
  subtitleEl.textContent = trade
    ? `${trade} — votre retour après intervention sera transmis à l'entreprise pour validation.`
    : "Votre retour après intervention sera transmis à l'entreprise pour validation.";
}

function paintStars(value) {
  ratingWrap.querySelectorAll("[data-star]").forEach((btn) => {
    const star = Number(btn.dataset.star);
    btn.classList.toggle("avis-rating__star--on", star <= value);
    btn.setAttribute("aria-pressed", String(star <= value));
  });
}

ratingWrap?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-star]");
  if (!btn) return;
  selectedRating = Number(btn.dataset.star);
  ratingInput.value = String(selectedRating);
  paintStars(selectedRating);
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  feedbackEl.textContent = "";

  const entry = addReview({
    type: artisanEmail ? "artisan" : "exone",
    artisanEmail,
    authorName: document.getElementById("avis-name").value,
    trade: document.getElementById("avis-trade").value,
    city: document.getElementById("avis-city").value,
    rating: selectedRating,
    text: document.getElementById("avis-text").value,
  });

  if (!entry) {
    feedbackEl.textContent = "Merci de remplir tous les champs.";
    feedbackEl.style.color = "var(--danger)";
    return;
  }

  form.reset();
  selectedRating = 5;
  ratingInput.value = "5";
  paintStars(5);

  feedbackEl.textContent = artisanEmail
    ? "Merci ! Votre avis a été transmis à l'entreprise. Il sera visible une fois validé."
    : "Merci ! Votre avis a été enregistré et sera publié après modération sur la page d'accueil.";
  feedbackEl.style.color = "var(--success)";
});

setupContext();
paintStars(5);
