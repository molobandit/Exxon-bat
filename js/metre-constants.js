export const PERSONNEL_ROLES = {
  salarie: { label: "Salarié", hourlyRate: 28 },
  apprenti: { label: "Apprenti", hourlyRate: 12 },
  chef_chantier: { label: "Chef de chantier", hourlyRate: 38 },
  controle_mise_service: {
    label: "Contrôle avant mise en service",
    hourlyRate: 45,
  },
};

export const METRE_STATUS = {
  draft: { label: "Brouillon", class: "warning" },
  signed: { label: "Signé client", class: "success" },
  validated: { label: "Validé employeur", class: "success" },
  revision: { label: "À réviser", class: "danger" },
};

export const MATERIAL_UNITS = ["u", "m", "m²", "m³", "kg", "L", "h", "forfait"];
