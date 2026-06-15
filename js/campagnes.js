import { addCampagne, getCampagnes } from "./data.js";
import { initModule } from "./module-base.js";

initModule("campagnes", "campagnes");

const form = document.getElementById("campagne-form");
const list = document.getElementById("campagnes-list");

document.getElementById("campagne-date").valueAsDate = new Date();

function render() {
  const campagnes = getCampagnes();
  list.innerHTML = campagnes.length
    ? campagnes
        .map((c) => {
          const pct = c.goal ? Math.min(100, Math.round((c.calls / c.goal) * 100)) : 0;
          return `
        <tr>
          <td><strong>${c.name}</strong><br><small>${c.startDate || ""}</small></td>
          <td>${c.goal} appels</td>
          <td>${c.calls}</td>
          <td><span class="status-pill status-pill--${pct >= 50 ? "success" : "warning"}">${pct} %</span></td>
        </tr>`;
        })
        .join("")
    : `<tr><td colspan="4" style="color:var(--text-muted)">Aucune campagne — lancez votre première prospection.</td></tr>`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  addCampagne({
    name: document.getElementById("campagne-name").value.trim(),
    goal: Number(document.getElementById("campagne-goal").value) || 0,
    startDate: document.getElementById("campagne-date").value,
  });
  form.reset();
  document.getElementById("campagne-date").valueAsDate = new Date();
  render();
});

render();
