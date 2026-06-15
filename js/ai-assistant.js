import { escapeHtml } from "./utils.js";
import { findBestArticles, QUICK_PROMPTS } from "./assistant-knowledge.js";

let initialized = false;

function supportHref() {
  return window.location.pathname.includes("/employe/") ? "../support.html" : "support.html";
}

function resolveHref(href) {
  if (!href || href.startsWith("http") || href.startsWith("#")) return href;
  if (window.location.pathname.includes("/employe/") && !href.startsWith("../")) {
    return `../${href}`;
  }
  return href;
}

function ensureStyles() {
  if (document.getElementById("ai-assistant-css")) return;
  const link = document.createElement("link");
  link.id = "ai-assistant-css";
  link.rel = "stylesheet";
  link.href = resolveHref(`css/ai-assistant.css?v=${window.__APP_VERSION ?? "177"}`);
  document.head.appendChild(link);
}

function formatAnswer(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function buildBotMessage(articles, fallback = false) {
  if (fallback || articles.length === 0) {
    return {
      html: `
        <p>Je n'ai pas trouvé de réponse précise dans ma base. Notre <strong>service client</strong> peut vous aider personnellement.</p>
        <div class="ai-msg__links">
          <a href="${resolveHref("support.html")}">Contacter un conseiller</a>
          <a href="${resolveHref("tarifs.html")}">Voir les offres</a>
        </div>
      `,
    };
  }

  const primary = articles[0];
  const extra = articles.slice(1);

  let html = `<p><strong>${escapeHtml(primary.title)}</strong></p>`;
  html += `<p>${formatAnswer(primary.answer)}</p>`;

  if (primary.links?.length) {
    html += `<div class="ai-msg__links">`;
    for (const link of primary.links) {
      html += `<a href="${resolveHref(link.href)}">${escapeHtml(link.label)}</a>`;
    }
    if (primary.escalate) {
      html += `<a href="${resolveHref("support.html")}">Créer un ticket</a>`;
    }
    html += `</div>`;
  }

  if (extra.length) {
    html += `<p style="margin-top:10px;font-size:0.8rem;color:#64748b">Voir aussi : ${extra.map((a) => escapeHtml(a.title)).join(" · ")}</p>`;
  }

  if (!primary.escalate) {
    html += `<div class="ai-msg__links"><a href="${resolveHref("support.html")}">Besoin d'un conseiller ?</a></div>`;
  }

  return { html };
}

function appendMessage(container, role, html) {
  const el = document.createElement("div");
  el.className = `ai-msg ai-msg--${role}`;
  el.innerHTML = html;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

export function initAiAssistant() {
  if (initialized || document.getElementById("ai-assistant-root")) return;
  initialized = true;
  ensureStyles();

  const root = document.createElement("div");
  root.id = "ai-assistant-root";
  root.className = "ai-assistant-fab";
  root.innerHTML = `
    <div class="ai-assistant-panel" id="ai-assistant-panel" hidden>
      <div class="ai-assistant-panel__head">
        <div>
          <h2>Aide Exxon-bat</h2>
          <p>Questions, configuration, problèmes</p>
        </div>
        <button type="button" class="ai-assistant-panel__close" id="ai-assistant-close" aria-label="Fermer">×</button>
      </div>
      <div class="ai-assistant-panel__support-cta">
        <div>
          <strong>Service client — notre priorité</strong>
          <span>Réponse sous 24 h · Lun–Ven 8h–18h</span>
        </div>
        <a href="${supportHref()}">Contacter</a>
      </div>
      <div class="ai-assistant-panel__messages" id="ai-assistant-messages"></div>
      <div class="ai-assistant-panel__chips" id="ai-assistant-chips"></div>
      <form class="ai-assistant-panel__form" id="ai-assistant-form">
        <input type="text" id="ai-assistant-input" placeholder="Posez votre question…" autocomplete="off" />
        <button type="submit">Envoyer</button>
      </form>
    </div>
    <button type="button" class="ai-assistant-fab__btn" id="ai-assistant-toggle" aria-expanded="false" aria-controls="ai-assistant-panel">
      <span class="ai-assistant-fab__btn-icon">✦</span>
      <span class="ai-assistant-fab__label">Aide IA</span>
    </button>
  `;

  document.body.appendChild(root);

  const panel = document.getElementById("ai-assistant-panel");
  const toggle = document.getElementById("ai-assistant-toggle");
  const closeBtn = document.getElementById("ai-assistant-close");
  const messages = document.getElementById("ai-assistant-messages");
  const chips = document.getElementById("ai-assistant-chips");
  const form = document.getElementById("ai-assistant-form");
  const input = document.getElementById("ai-assistant-input");

  const welcome = `
    <p>Bonjour ! Je suis l'<strong>assistant Exxon-bat</strong>. Je peux vous guider pour configurer le logiciel, la bibliothèque, les devis ou vous orienter vers notre service client.</p>
    <p style="font-size:0.8rem;color:#64748b;margin-top:8px">Astuce : cliquez une suggestion ci-dessous ou décrivez votre problème.</p>
  `;
  appendMessage(messages, "bot", welcome);

  for (const prompt of QUICK_PROMPTS) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "ai-assistant-panel__chip";
    chip.textContent = prompt;
    chip.addEventListener("click", () => handleQuery(prompt));
    chips.appendChild(chip);
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
  }

  function handleQuery(query) {
    const trimmed = query.trim();
    if (!trimmed) return;

    appendMessage(messages, "user", escapeHtml(trimmed));

    const articles = findBestArticles(trimmed);
    const { html } = buildBotMessage(articles, articles.length === 0);
    appendMessage(messages, "bot", html);
  }

  toggle.addEventListener("click", () => setOpen(panel.hidden));
  closeBtn.addEventListener("click", () => setOpen(false));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value;
    input.value = "";
    handleQuery(value);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) setOpen(false);
  });
}
