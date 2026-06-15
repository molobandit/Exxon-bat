import {
  getActiveChantierCode,
  getEmployeeSession,
  requireEmployeeAuth,
  setActiveChantierCode,
} from "./employee-auth.js";
import { addActivity, addMetre, getChantierByAccessCode, updateMetre } from "./data.js";
import { computeMetreTotals } from "./metre-calculator.js";
import {
  getMode,
  normalizeInstallationMode,
  renderCanalisationSelectHtml,
  renderInstallationModeSelectHtml,
} from "./installation-difficulty.js";
import { PERSONNEL_ROLES } from "./metre-constants.js";
import {
  resolveMetreTemplate,
  WEEK_DAYS,
} from "./metre-templates.js";
import { loadProfile } from "./storage.js";
import { initSignaturePad } from "./signature-pad.js";
import { initEmployeNav } from "./employe-nav.js";

if (!requireEmployeeAuth()) return;
initEmployeNav("metre");

const session = getEmployeeSession();
const profile = loadProfile();
const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

let activeChantier = null;
let template = null;

const chantierInput = document.getElementById("chantier-id");
const personnelList = document.getElementById("personnel-list");
const materialsList = document.getElementById("materials-list");
const technicalSections = document.getElementById("technical-sections");
const signature = initSignaturePad(document.getElementById("signature-canvas"));

const totalsEls = {
  material: document.getElementById("total-material"),
  personnel: document.getElementById("total-personnel"),
  logistics: document.getElementById("total-logistics"),
  total: document.getElementById("total-metre"),
};

function personnelRoles() {
  return PERSONNEL_ROLES;
}

function roleOptions(selected = "salarie") {
  return Object.entries(personnelRoles())
    .map(
      ([value, role]) =>
        `<option value="${value}"${value === selected ? " selected" : ""}>${role.label}</option>`,
    )
    .join("");
}

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: template.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function bindTotalsInputs(root = document) {
  root.querySelectorAll("input, select, textarea").forEach((input) => {
    input.addEventListener("input", updateTotals);
    input.addEventListener("change", updateTotals);
  });
}

function renderPersonnelHead() {
  document.getElementById("personnel-head").innerHTML = `
    <tr>
      <th>Collaborateur</th>
      <th>Fonction</th>
      ${WEEK_DAYS.map((day) => `<th>${day.label}</th>`).join("")}
      <th>Total h</th>
      <th></th>
    </tr>`;
}

function addPersonnelRow(data = {}) {
  const row = document.createElement("tr");
  row.className = "personnel-row";
  row.innerHTML = `
    <td><input type="text" class="person-name table-input" value="${data.name ?? `${session.firstname} ${session.lastname ?? ""}`.trim()}" /></td>
    <td><select class="person-role table-input">${roleOptions(data.role ?? session.role ?? "salarie")}</select></td>
    ${WEEK_DAYS.map(
      (day) =>
        `<td><input type="number" class="person-day table-input" data-day="${day.key}" min="0" step="0.5" value="${data.weeklyHours?.[day.key] ?? 0}" /></td>`,
    ).join("")}
    <td><strong class="person-total">0</strong></td>
    <td><button type="button" class="btn btn--ghost btn--sm row-remove">✕</button></td>
  `;

  row.querySelector(".row-remove").addEventListener("click", () => {
    row.remove();
    updateTotals();
  });

  row.querySelectorAll(".person-day").forEach((input) => {
    input.addEventListener("input", () => {
      updatePersonnelRowTotal(row);
      updateTotals();
    });
  });

  bindTotalsInputs(row);
  personnelList.appendChild(row);
  updatePersonnelRowTotal(row);
}

function updatePersonnelRowTotal(row) {
  const total = [...row.querySelectorAll(".person-day")].reduce(
    (sum, input) => sum + (Number(input.value) || 0),
    0,
  );
  row.querySelector(".person-total").textContent = total.toFixed(1);
}

function addMaterialRow(data = {}) {
  const row = document.createElement("tr");
  row.className = "material-row";
  const amount = (Number(data.quantity) || 0) * (Number(data.unitPrice) || 0);
  const trade = template?.trade || "general";

  row.innerHTML = `
    <td><input type="text" class="material-name table-input" value="${data.name ?? ""}" placeholder="${template.materialPlaceholder}" /></td>
    <td><input type="text" class="material-ref table-input" value="${data.ref ?? ""}" /></td>
    <td class="material-counter-cell"${template.showCounterNumber ? "" : ' hidden'}><input type="text" class="material-counter table-input" value="${data.counterNumber ?? ""}" /></td>
    <td class="material-difficulty-cell">${renderInstallationModeSelectHtml(trade, data.installationMode, { cssClass: "table-input material-difficulty" })}</td>
    <td><input type="number" class="material-qty table-input" min="0" step="0.1" value="${data.quantity ?? 1}" /></td>
    <td><input type="number" class="material-price table-input" min="0" step="0.5" value="${data.unitPrice ?? 0}" /></td>
    <td><strong class="material-amount">${formatMoney(amount)}</strong></td>
    <td><button type="button" class="btn btn--ghost btn--sm row-remove">✕</button></td>
  `;

  row.querySelector(".row-remove").addEventListener("click", () => {
    row.remove();
    updateTotals();
  });

  row.querySelectorAll(".material-qty, .material-price").forEach((input) => {
    input.addEventListener("input", () => {
      updateMaterialRowAmount(row);
      updateTotals();
    });
  });

  bindTotalsInputs(row);
  materialsList.appendChild(row);
}

function updateMaterialRowAmount(row) {
  const qty = Number(row.querySelector(".material-qty").value) || 0;
  const price = Number(row.querySelector(".material-price").value) || 0;
  row.querySelector(".material-amount").textContent = formatMoney(qty * price);
}

function renderTechnicalSections() {
  technicalSections.innerHTML = template.technicalSections
    .map((section) => {
      if (section.type === "table") {
        return `
        <section class="metre-section technical-section" data-section-id="${section.id}">
          <div class="metre-section__head">
            <div>
              <h3>${section.title}</h3>
              <p class="card__desc">${section.subtitle ?? ""}</p>
            </div>
            <button type="button" class="btn btn--ghost btn--sm" data-add-tech-row="${section.id}">+ Mesure</button>
          </div>
          <div class="bulletin-table-wrap">
            <table class="bulletin-table">
              <thead>
                <tr>${section.columns.map((col) => `<th>${col.label}</th>`).join("")}<th></th></tr>
              </thead>
              <tbody data-tech-body="${section.id}"></tbody>
            </table>
          </div>
        </section>`;
      }

      if (section.type === "checklist") {
        return `
        <section class="metre-section technical-section" data-section-id="${section.id}">
          <h3>${section.title}</h3>
          ${section.subtitle ? `<p class="card__desc">${section.subtitle}</p>` : ""}
          <div class="bulletin-checks">
            ${section.items
              .map(
                (item) => `
              <label class="field field--check">
                <input type="checkbox" data-tech-check="${section.id}" data-tech-key="${item.key}" />
                <span>${item.label}</span>
              </label>`,
              )
              .join("")}
          </div>
        </section>`;
      }

      return `
      <section class="metre-section technical-section" data-section-id="${section.id}">
        <h3>${section.title}</h3>
        <div class="form__grid">
          ${section.fields
            .map(
              (field) => `
            <label class="field">
              <span>${field.label}</span>
              <div class="field__wrap">
                <input type="${field.type}" data-tech-field="${section.id}" data-tech-key="${field.key}" min="0" step="0.1" value="0" />
                ${field.suffix ? `<span class="field__suffix">${field.suffix}</span>` : ""}
              </div>
            </label>`,
            )
            .join("")}
        </div>
      </section>`;
    })
    .join("");

  technicalSections.querySelectorAll("[data-add-tech-row]").forEach((button) => {
    button.addEventListener("click", () => {
      addTechnicalTableRow(button.dataset.addTechRow);
    });
  });

  template.technicalSections
    .filter((section) => section.type === "table")
    .forEach((section) => addTechnicalTableRow(section.id));
}

function addTechnicalTableRow(sectionId, data = {}) {
  const section = template.technicalSections.find((item) => item.id === sectionId);
  const body = technicalSections.querySelector(`[data-tech-body="${sectionId}"]`);
  if (!section || !body) return;

  const row = document.createElement("tr");
  row.innerHTML = `
    ${section.columns
      .map((col) => {
        if (col.key === "canalisation") {
          return `<td>${renderCanalisationSelectHtml(data[col.key] ?? "")}</td>`;
        }
        return `<td><input type="text" class="table-input" data-tech-col="${col.key}" value="${data[col.key] ?? ""}" /></td>`;
      })
      .join("")}
    <td><button type="button" class="btn btn--ghost btn--sm row-remove">✕</button></td>
  `;
  row.querySelector(".row-remove").addEventListener("click", () => row.remove());
  body.appendChild(row);
}

function readPersonnel() {
  return [...personnelList.querySelectorAll(".personnel-row")].map((row) => {
    const role = row.querySelector(".person-role").value;
    const weeklyHours = {};
    row.querySelectorAll(".person-day").forEach((input) => {
      weeklyHours[input.dataset.day] = Number(input.value) || 0;
    });
    const hours = Object.values(weeklyHours).reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      role,
      name: row.querySelector(".person-name").value.trim(),
      weeklyHours,
      hours,
      hourlyRate: personnelRoles()[role]?.hourlyRate ?? 0,
    };
  });
}

function readMaterials() {
  return [...materialsList.querySelectorAll(".material-row")].map((row) => ({
    name: row.querySelector(".material-name").value.trim(),
    ref: row.querySelector(".material-ref")?.value.trim() ?? "",
    counterNumber: row.querySelector(".material-counter")?.value.trim() ?? "",
    installationMode: normalizeInstallationMode(
      row.querySelector(".material-difficulty")?.value,
    ),
    quantity: Number(row.querySelector(".material-qty").value) || 0,
    unitPrice: Number(row.querySelector(".material-price").value) || 0,
    unit: "u",
  }));
}

function readTechnicalData() {
  const data = {};

  for (const section of template.technicalSections) {
    if (section.type === "table") {
      data[section.id] = [
        ...technicalSections.querySelectorAll(`[data-tech-body="${section.id}"] tr`),
      ].map((row) => {
        const entry = {};
        row.querySelectorAll("[data-tech-col]").forEach((input) => {
          entry[input.dataset.techCol] = input.value.trim();
        });
        return entry;
      });
    }

    if (section.type === "checklist") {
      data[section.id] = {};
      technicalSections
        .querySelectorAll(`[data-tech-check="${section.id}"]`)
        .forEach((input) => {
          data[section.id][input.dataset.techKey] = input.checked;
        });
    }

    if (section.type === "fields") {
      data[section.id] = {};
      technicalSections
        .querySelectorAll(`[data-tech-field="${section.id}"]`)
        .forEach((input) => {
          data[section.id][input.dataset.techKey] = Number(input.value) || 0;
        });
    }
  }

  return data;
}

function readMetre(status) {
  const logistics = {
    vehicle: document.getElementById("log-vehicle").value.trim(),
    km: Number(document.getElementById("log-km").value) || 0,
    machine: document.getElementById("log-machine").value.trim(),
    machineCost: Number(document.getElementById("log-machine-cost").value) || 0,
    specialEquipment: document.getElementById("log-equipment").value.trim(),
    frais: Number(document.getElementById("log-frais").value) || 0,
  };

  const metre = {
    chantierId: chantierInput.value,
    chantierAccessCode: activeChantier.accessCode,
    tradeType: template.trade,
    country: template.country,
    bulletinTitle: template.bulletinTitle,
    employeeId: session.id,
    employeeName: `${session.firstname} ${session.lastname ?? ""}`.trim(),
    clientName: document.getElementById("client-name").value.trim(),
    orderedBy: document.getElementById("ordered-by").value.trim(),
    workDescription: document.getElementById("work-description").value.trim(),
    date: document.getElementById("metre-date").value,
    location: document.getElementById("location").value.trim(),
    materials: readMaterials().filter((item) => item.name),
    personnel: readPersonnel().filter((item) => item.name),
    logistics,
    workStatus: {
      finished: document.querySelector('input[name="work-finished"]:checked')?.value === "oui",
      billingType: document.querySelector('input[name="billing-type"]:checked')?.value ?? "regie",
      rsPm: document.getElementById("rs-pm")?.checked ?? false,
    },
    workConditions: {
      installationMode: normalizeInstallationMode(
        document.getElementById("work-installation-mode")?.value,
      ),
    },
    technicalData: readTechnicalData(),
    notes: document.getElementById("notes").value.trim(),
    status,
    clientSignature: status === "signed" ? signature.toDataURL() : "",
    signedAt: status === "signed" ? new Date().toISOString() : null,
  };

  const totals = computeMetreTotals({
    ...metre,
    travelCost: 0,
  });

  return {
    ...metre,
    travelCost: totals.logisticsCost,
    ...totals,
  };
}

function updateTotals() {
  const totals = computeMetreTotals(readMetre("draft"));
  totalsEls.material.textContent = formatMoney(totals.materialCost);
  totalsEls.personnel.textContent = formatMoney(totals.personnelCost);
  totalsEls.logistics.textContent = formatMoney(totals.logisticsCost);
  totalsEls.total.textContent = formatMoney(totals.totalCost);
  document.getElementById("sign-location").textContent =
    document.getElementById("location").value || "—";
  document.getElementById("sign-date").textContent =
    document.getElementById("metre-date").value || "—";
}

function updateWorkConditionHint() {
  const select = document.getElementById("work-installation-mode");
  const hint = document.getElementById("work-installation-hint");
  if (!select || !hint) return;
  const mode = getMode(select.value, template?.trade || "general");
  hint.textContent =
    mode.id === "standard"
      ? ""
      : `${mode.label} — coefficient MO ×${mode.moCoeff.toFixed(2)}${mode.hint ? ` · ${mode.hint}` : ""}`;
}

function populateWorkConditions(modeId = "standard") {
  const existing = document.getElementById("work-installation-mode");
  if (!existing || !template) return;
  const parent = existing.parentElement;
  parent.innerHTML = renderInstallationModeSelectHtml(template.trade, modeId, {
    cssClass: "table-input",
  });
  const select = parent.querySelector("select");
  if (select) {
    select.id = "work-installation-mode";
    select.addEventListener("change", () => {
      updateWorkConditionHint();
      updateTotals();
    });
  }
  updateWorkConditionHint();
}

function applyTemplate() {
  document.getElementById("bulletin-title").textContent = template.bulletinTitle;
  document.getElementById("bulletin-trade").textContent = template.tradeLabel;
  document.getElementById("bulletin-country").textContent =
    `${template.countryLabel} · ${template.currency}`;
  document.getElementById("material-ref-head").textContent = template.materialRefLabel;
  document.getElementById("material-counter-head").hidden = !template.showCounterNumber;
  document.getElementById("check-rs-pm").hidden = !template.showRsPm;

  document.querySelectorAll(".currency-suffix").forEach((el) => {
    el.textContent = template.currencySymbol;
  });

  renderPersonnelHead();
  renderTechnicalSections();
  populateWorkConditions();
}

function initChantierAccess() {
  const accessCode = (params.get("code") || getActiveChantierCode() || "").trim();
  if (!accessCode) {
    alert("Code chantier requis.");
    window.location.href = "index.html";
    return false;
  }

  activeChantier = getChantierByAccessCode(accessCode);
  if (!activeChantier || activeChantier.status === "termine") {
    alert("Chantier inaccessible.");
    window.location.href = "index.html";
    return false;
  }

  template = resolveMetreTemplate(activeChantier, profile);
  setActiveChantierCode(activeChantier.accessCode);
  chantierInput.value = activeChantier.id;

  document.getElementById("banner-chantier-name").textContent = activeChantier.name;
  document.getElementById("banner-chantier-code").textContent =
    `Code ${activeChantier.accessCode}`;
  document.getElementById("client-name").value = activeChantier.client ?? "";
  document.getElementById("location").value = activeChantier.location ?? "";

  applyTemplate();
  return true;
}

document.getElementById("add-material").addEventListener("click", () => {
  addMaterialRow();
  updateTotals();
});

document.getElementById("add-personnel").addEventListener("click", () => {
  addPersonnelRow();
  updateTotals();
});

document.getElementById("clear-signature").addEventListener("click", () => {
  signature.clear();
});

document.getElementById("save-draft").addEventListener("click", () => {
  addMetre(readMetre("draft"));
  alert("Brouillon enregistré.");
  window.location.href = "historique.html";
});

document.getElementById("metre-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const metre = readMetre("signed");

  if (!metre.clientName) {
    alert("Indiquez le client.");
    return;
  }

  if (signature.isEmpty()) {
    alert("Signature client obligatoire.");
    return;
  }

  if (editId) updateMetre(editId, metre);
  else addMetre(metre);

  addActivity({
    chantierId: activeChantier.id,
    type: "metre",
    icon: "📐",
    title: "Métré signé sur chantier",
    message: `${metre.clientName} — ${formatMoney(metre.totalCost)}`,
    author: session.firstname,
  });

  alert("Bulletin signé et transmis.");
  window.location.href = "historique.html";
});

["location", "metre-date"].forEach((id) => {
  document.getElementById(id).addEventListener("input", updateTotals);
  document.getElementById(id).addEventListener("change", updateTotals);
});

if (!initChantierAccess()) throw new Error("chantier");

document.getElementById("metre-date").value = new Date().toISOString().slice(0, 10);
addMaterialRow();
addPersonnelRow();
updateTotals();
