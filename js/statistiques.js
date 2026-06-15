import { formatProfileMoney } from "./market.js";
import { getSalesStats } from "./data.js";
import { initModule } from "./module-base.js";

initModule("statistiques", "statistiques");

const stats = getSalesStats();

document.getElementById("stat-ca").textContent = formatProfileMoney(stats.totalCA);
document.getElementById("stat-marge").textContent = formatProfileMoney(stats.totalMarge);
document.getElementById("stat-devis").textContent = stats.devisCount;
document.getElementById("stat-renta").textContent = `${stats.tauxRentabilite} %`;

const list = document.getElementById("devis-history");

list.innerHTML = stats.devis.length
  ? stats.devis
      .map((d) => {
        const date = new Date(d.date).toLocaleDateString("fr-FR");
        const pill =
          d.status === "success"
            ? "success"
            : d.status === "warning"
              ? "warning"
              : "danger";
        const label =
          d.status === "success"
            ? "Rentable"
            : d.status === "warning"
              ? "Limite"
              : "Déficitaire";
        return `
      <tr>
        <td>${d.jobName || "—"}</td>
        <td>${formatProfileMoney(d.price)}</td>
        <td>${formatProfileMoney(d.margin)}</td>
        <td><span class="status-pill status-pill--${pill}">${label}</span></td>
        <td>${date}</td>
      </tr>`;
      })
      .reverse()
      .join("")
  : `<tr><td colspan="5" style="color:var(--text-muted)">Aucun devis imprimé — <a href="devis.html">imprimez un devis</a> pour alimenter les statistiques.</td></tr>`;
