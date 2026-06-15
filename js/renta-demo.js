const demos = {
  artisan: {
    label: "Artisan seul",
    title: "Exemple — Peintre en bâtiment",
    price: "2 800 €",
    time: "5 jours",
    cost: "420 €",
    costLabel: "Peinture + préparation",
    verdict: "Limite — prix trop bas",
    verdictClass: "var(--warning)",
    icon: "⚠",
    margin: "186 €",
    minPrice: "3 350 €",
    note: "Sans Exxon-bat, vous auriez signé en pensant gagner 800 €.",
  },
  auto: {
    label: "Auto-entrepreneur",
    title: "Exemple — Plombier indépendant",
    price: "1 450 €",
    time: "2 jours",
    cost: "280 €",
    costLabel: "Matériel et fournitures",
    verdict: "Rentable",
    verdictClass: "var(--success)",
    icon: "✓",
    margin: "412 €",
    minPrice: "1 180 €",
    note: "Votre taux horaire net réel : 38,50 €/h après charges.",
  },
  tpe: {
    label: "TPE avec salariés",
    title: "Exemple — Rénovation SDB (équipe)",
    price: "6 200 €",
    time: "8 jours",
    cost: "1 840 €",
    costLabel: "Matériel + 2 salariés",
    verdict: "Déficitaire",
    verdictClass: "var(--danger)",
    icon: "✕",
    margin: "−320 €",
    minPrice: "7 100 €",
    note: "Le coût salarial absorbe la marge — augmentez le prix de 900 €.",
  },
};

function renderDemo(key) {
  const demo = demos[key];
  if (!demo) return;

  const input = document.querySelector(".renta-demo__input");
  const output = document.querySelector(".renta-demo__output");
  if (!input || !output) return;

  input.innerHTML = `
    <p style="margin:0 0 16px;font-weight:600;color:var(--navy)">${demo.title}</p>
    <p style="margin:0 0 8px;font-size:0.9rem;color:var(--text-muted)">Prix proposé au client : <strong style="color:var(--text)">${demo.price}</strong></p>
    <p style="margin:0 0 8px;font-size:0.9rem;color:var(--text-muted)">Temps estimé : <strong style="color:var(--text)">${demo.time}</strong></p>
    <p style="margin:0;font-size:0.9rem;color:var(--text-muted)">${demo.costLabel} : <strong style="color:var(--text)">${demo.cost}</strong></p>
  `;

  output.innerHTML = `
    <div class="renta-demo__verdict">
      <span style="font-size:1.3rem">${demo.icon}</span>
      <div>
        <strong style="color:${demo.verdictClass}">${demo.verdict}</strong>
        <p style="margin:4px 0 0;font-size:0.82rem;color:var(--text-muted)">Marge nette : ${demo.margin} · Prix min. conseillé : <strong>${demo.minPrice}</strong></p>
      </div>
    </div>
    <p style="margin:0;font-size:0.85rem;color:var(--text-muted)">${demo.note}</p>
  `;
}

document.querySelectorAll(".renta-demo__bar [data-demo]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".renta-demo__bar [data-demo]").forEach((el) => {
      el.classList.toggle("is-active", el === tab);
    });
    renderDemo(tab.dataset.demo);
  });
});
