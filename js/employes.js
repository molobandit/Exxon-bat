import { initModule } from "./module-base.js";
import { addEmployee, getEmployees, getNextEmployeeCode } from "./data.js";
import { PERSONNEL_ROLES } from "./metre-constants.js";

initModule("employes", "employes");

const form = document.getElementById("employee-form");
const list = document.getElementById("employees-list");
const roleSelect = document.getElementById("emp-role");

roleSelect.innerHTML = Object.entries(PERSONNEL_ROLES)
  .map(([value, role]) => `<option value="${value}">${role.label}</option>`)
  .join("");

function render() {
  const employees = getEmployees();
  list.innerHTML = employees.length
    ? employees
        .map(
          (employee) => `
        <tr>
          <td><strong>${employee.code}</strong><br><small>PIN personnel</small></td>
          <td>${employee.firstname} ${employee.lastname}</td>
          <td>${PERSONNEL_ROLES[employee.role]?.label ?? employee.role}</td>
          <td><span class="status-pill status-pill--success">Actif</span></td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" style="color:var(--text-muted)">Aucun employé — créez un identifiant terrain.</td></tr>`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  addEmployee({
    code: getNextEmployeeCode(),
    pin: document.getElementById("emp-pin").value.trim(),
    firstname: document.getElementById("emp-firstname").value.trim(),
    lastname: document.getElementById("emp-lastname").value.trim(),
    role: roleSelect.value,
  });

  form.reset();
  render();
});

render();
