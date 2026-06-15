import { getUser } from "./auth.js";
import {
  addActivity,
  addDocument,
  deleteDocument,
  getActivitiesByChantier,
  getChantierById,
  getDocumentsByChantier,
  getMetresByChantier,
  updateChantier,
} from "./data.js";
import {
  computeChantierMargin,
  computeChantierProgress,
  formatMarginSummary,
  getChantierStatusLabel,
} from "./chantier-hub.js";
import { initModule } from "./module-base.js";

initModule("chantiers", "chantiers");

const params = new URLSearchParams(window.location.search);
const chantierId = params.get("id");
const user = getUser();

if (!chantierId) {
  window.location.replace("chantiers.html");
  throw new Error("redirect");
}

let chantier = getChantierById(chantierId);
if (!chantier) {
  window.location.replace("chantiers.html");
  throw new Error("redirect");
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderHeader() {
  const status = getChantierStatusLabel(chantier.status);
  const progress = computeChantierProgress(chantier.id);

  document.getElementById("chantier-title").textContent = chantier.name;
  document.getElementById("chantier-subtitle").textContent =
    `${chantier.client || "Sans client"} · ${chantier.location || "Lieu non renseigné"} · Code ${chantier.accessCode}`;
  document.getElementById("nav-tag").textContent = chantier.name;
  document.getElementById("progress-fill").style.width = `${progress}%`;
  document.getElementById("progress-label").textContent = `${progress} %`;
  document.getElementById("link-planning").href = `planning.html?chantier=${chantier.id}`;
  document.getElementById("link-metre").href = `metre.html?chantier=${chantier.id}`;

  document.getElementById("chantier-kpis").innerHTML = `
    <div class="chantier-kpi"><span>Statut</span><strong><span class="status-pill status-pill--${status.class}">${status.label}</span></strong></div>
    <div class="chantier-kpi"><span>Budget HT</span><strong id="kpi-budget">—</strong></div>
    <div class="chantier-kpi"><span>Métrés terrain</span><strong>${getMetresByChantier(chantier.id).length}</strong></div>
    <div class="chantier-kpi"><span>Code employé</span><strong style="font-size:0.9rem">${chantier.accessCode}</strong></div>
  `;
}

function renderMargin() {
  const margin = computeChantierMargin(chantier);
  const formatted = formatMarginSummary(margin);

  document.getElementById("kpi-budget").textContent = formatted.budget;

  document.getElementById("margin-panel").innerHTML = `
    <div class="compare-grid">
      <article class="compare-card"><span>Budget / devis</span><strong>${formatted.budget}</strong></article>
      <article class="compare-card"><span>Coût terrain</span><strong>${formatted.cost}</strong></article>
      <article class="compare-card compare-card--delta"><span>Marge estimée</span><strong>${formatted.margin}</strong></article>
    </div>
    <div class="verdict verdict--${margin.status}" style="margin-top:16px">
      <div class="verdict__icon">${margin.status === "success" ? "✓" : margin.status === "warning" ? "!" : "✕"}</div>
      <div>
        <p class="verdict__label">Rentabilité ${formatted.rate}</p>
        <p class="verdict__msg">${margin.margin >= 0 ? "Chantier rentable selon le métré actuel." : "Attention : dépassement du budget constaté."}</p>
      </div>
    </div>
    <a href="metre.html?chantier=${chantier.id}" class="btn btn--ghost" style="margin-top:16px">Comparer devis / métré →</a>
  `;
}

function renderActivity() {
  const feed = document.getElementById("activity-feed");
  const activities = getActivitiesByChantier(chantier.id);

  feed.innerHTML = activities.length
    ? activities
        .map(
          (item) => `
      <article class="activity-item">
        <div class="activity-item__icon">${item.icon || "📌"}</div>
        <div class="activity-item__body">
          <strong>${item.title}</strong>
          <p>${item.message}</p>
          <div class="activity-item__time">${formatDateTime(item.createdAt)} · ${item.author || "—"}</div>
        </div>
      </article>`,
        )
        .join("")
    : `<p style="color:var(--text-muted);margin:0">Aucune activité pour le moment.</p>`;
}

function renderDocuments() {
  const grid = document.getElementById("documents-grid");
  const docs = getDocumentsByChantier(chantier.id);

  grid.innerHTML = docs.length
    ? docs
        .map((doc) => {
          if (doc.type === "photo") {
            return `
          <article class="doc-card">
            <img src="${doc.dataUrl}" alt="${doc.name}" />
            <div class="doc-card__name">${doc.name}</div>
            <button type="button" class="btn btn--ghost btn--sm" data-delete-doc="${doc.id}">Supprimer</button>
          </article>`;
          }

          if (doc.type === "note") {
            return `
          <article class="doc-card" style="text-align:left">
            <div style="font-size:1.4rem;margin-bottom:8px">📝</div>
            <div class="doc-card__name">Note</div>
            <p style="font-size:0.78rem;color:var(--text-muted);margin:8px 0">${doc.content}</p>
            <button type="button" class="btn btn--ghost btn--sm" data-delete-doc="${doc.id}">Supprimer</button>
          </article>`;
          }

          return `
          <article class="doc-card">
            <div style="font-size:2rem;margin:20px 0">📄</div>
            <div class="doc-card__name">${doc.name}</div>
            <small style="color:var(--text-muted)">${doc.fileType || "Document"}</small><br>
            <button type="button" class="btn btn--ghost btn--sm" data-delete-doc="${doc.id}">Supprimer</button>
          </article>`;
        })
        .join("")
    : `<p style="grid-column:1/-1;color:var(--text-muted);margin:0">Aucun document — ajoutez photos, plans ou notes.</p>`;

  grid.querySelectorAll("[data-delete-doc]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteDocument(button.dataset.deleteDoc);
      renderDocuments();
    });
  });
}

document.getElementById("note-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = document.getElementById("note-text").value.trim();
  if (!text) return;

  addDocument({
    chantierId: chantier.id,
    type: "note",
    name: "Note",
    content: text,
  });

  addActivity({
    chantierId: chantier.id,
    type: "note",
    icon: "📝",
    title: "Note ajoutée",
    message: text,
    author: user?.firstname ?? "Employeur",
  });

  document.getElementById("note-text").value = "";
  renderActivity();
  renderDocuments();
});

document.getElementById("photo-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 800000) {
    alert("Photo trop lourde (max 800 Ko).");
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  addDocument({
    chantierId: chantier.id,
    type: "photo",
    name: file.name,
    dataUrl,
    fileType: file.type,
  });

  addActivity({
    chantierId: chantier.id,
    type: "photo",
    icon: "📷",
    title: "Photo ajoutée",
    message: file.name,
    author: user?.firstname ?? "Employeur",
  });

  event.target.value = "";
  renderActivity();
  renderDocuments();
});

document.getElementById("doc-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  let dataUrl = "";
  if (file.size <= 500000) {
    dataUrl = await readFileAsDataUrl(file);
  }

  addDocument({
    chantierId: chantier.id,
    type: "document",
    name: file.name,
    dataUrl,
    fileType: file.type,
  });

  addActivity({
    chantierId: chantier.id,
    type: "document",
    icon: "📄",
    title: "Document ajouté",
    message: file.name,
    author: user?.firstname ?? "Employeur",
  });

  event.target.value = "";
  renderActivity();
  renderDocuments();
});

if (!getActivitiesByChantier(chantier.id).length) {
  addActivity({
    chantierId: chantier.id,
    type: "status",
    icon: "🏗️",
    title: "Chantier ouvert",
    message: `Suivi en temps réel activé pour ${chantier.name}`,
    author: "Exxon-bat",
  });
}

updateChantier(chantier.id, { progress: computeChantierProgress(chantier.id) });
chantier = getChantierById(chantierId);

renderHeader();
renderMargin();
renderActivity();
renderDocuments();
