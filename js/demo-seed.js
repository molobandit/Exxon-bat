import { DEMO_ACCOUNT } from "./auth.js";
import {
  addActivity,
  addChantier,
  addEmployee,
  addMetre,
  addTask,
  ensureChantierAccessCodes,
  getChantiers,
  getDevisHistory,
  getEmployees,
  getMetresByChantier,
  getTasksByChantier,
  updateChantier,
  upsertPrintedDevisRecord,
} from "./data.js";
import { DEMO_EMPLOYEE } from "./employee-auth.js";
import { computeMetreTotals } from "./metre-calculator.js";
import { DEFAULT_PROFILE, saveProfile } from "./storage.js";
import { applyCountryProfileDefaults } from "./country-config.js";
import { syncSitePublisherFromProfile } from "./site-publisher.js";

export const DEMO_CHANTIER_NAME = "Chantier démo — Rénovation SDB";
/** Code chantier provisoire — métré terrain (local / démo). */
export const DEMO_CHANTIER_ACCESS_CODE = "CH-2026-DEMO";
export const DEMO_DEVIS_NUMBER = "DEV-2026-DEMO";

export function ensureDemoEmployee() {
  if (!getEmployees().some((e) => e.code === DEMO_EMPLOYEE.code)) {
    addEmployee({
      code: DEMO_EMPLOYEE.code,
      pin: DEMO_EMPLOYEE.pin,
      firstname: DEMO_EMPLOYEE.firstname,
      lastname: DEMO_EMPLOYEE.lastname,
      role: DEMO_EMPLOYEE.defaultRole,
    });
  }
}

export function ensureDemoChantier() {
  ensureChantierAccessCodes();
  let chantier = getChantiers().find((c) => c.name === DEMO_CHANTIER_NAME);

  const demoLocation = "12 rue des Artisans, Lyon";
  const demoBudget = 4500;

  if (!chantier) {
    addChantier({
      name: DEMO_CHANTIER_NAME,
      client: "M. et Mme Martin",
      location: demoLocation,
      budget: demoBudget,
      tradeType: "plombier",
      country: "FR",
    });
    chantier = getChantiers().find((c) => c.name === DEMO_CHANTIER_NAME);
  }

  if (chantier) {
    const patch = {};
    if (chantier.accessCode !== DEMO_CHANTIER_ACCESS_CODE) patch.accessCode = DEMO_CHANTIER_ACCESS_CODE;
    if (chantier.country !== "FR") patch.country = "FR";
    if (!chantier.location) patch.location = demoLocation;
    if (!chantier.budget) patch.budget = demoBudget;
    if (!chantier.tradeType) patch.tradeType = "plombier";
    if (Object.keys(patch).length) updateChantier(chantier.id, patch);
  }

  ensureChantierAccessCodes();
  return getChantiers().find((c) => c.name === DEMO_CHANTIER_NAME) ?? chantier;
}

export function ensureDemoTasks(chantier) {
  if (!chantier || getTasksByChantier(chantier.id).length) return;

  const today = new Date();
  const tasks = [
    { name: "Démolition existant", days: 0, duration: 2 },
    { name: "Plomberie", days: 2, duration: 3 },
    { name: "Pose carrelage", days: 5, duration: 4 },
  ];

  for (const item of tasks) {
    const start = new Date(today);
    start.setDate(start.getDate() + item.days);
    const end = new Date(start);
    end.setDate(end.getDate() + item.duration);

    addTask({
      chantierId: chantier.id,
      name: item.name,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      assignee: "Jean Terrain",
      progress: item.name === "Démolition existant" ? 100 : item.name === "Plomberie" ? 40 : 0,
      status: item.name === "Démolition existant" ? "done" : "in_progress",
    });
  }

  addActivity({
    chantierId: chantier.id,
    type: "status",
    icon: "📅",
    title: "Planning initial créé",
    message: "3 tâches planifiées sur le diagramme de Gantt",
    author: "Exxon-bat",
  });
}

export function ensureDemoProfile() {
  const base = {
    ...DEFAULT_PROFILE,
    companyName: "Artisan Démo SARL",
    companyLegalForm: "SARL",
    companyEmail: DEMO_ACCOUNT.email,
    companyPhone: "06 12 34 56 78",
    companyAddress: "12 rue des Artisans",
    companyPostalCode: "69000",
    companyCity: "Lyon",
    companySiret: "123 456 789 00012",
    companyRcs: "RCS Lyon B 123 456 789",
    companyTvaIntra: "FR12 345678901",
    companyApe: "4321A",
    companyCapital: "10 000 €",
    companyIban: "FR76 3000 6000 0112 3456 7890 189",
    companyBic: "AGRIFRPP",
    bankName: "Crédit Agricole",
    insuranceRcPro: "MMA Pro BTP — police démo 123456",
    insuranceDecennale: "AXA Décennale — n° DEMO-2026 — France métropolitaine",
    tvaRegime: "reel",
    businessType: "micro",
    country: "FR",
  };

  const profile = applyCountryProfileDefaults(base);
  saveProfile(profile);
  syncSitePublisherFromProfile(profile);
}

export function ensureDemoTerrainSetup() {
  ensureDemoEmployee();
  return ensureDemoChantier();
}

/** Jeu de données complet : chantier + devis + métré signé pour la simulation employeur. */
export function ensureDemoMetreSimulation() {
  ensureDemoProfile();
  ensureDemoEmployee();
  const chantier = ensureDemoChantier();
  ensureDemoTasks(chantier);

  const employee = getEmployees().find((e) => e.code === DEMO_EMPLOYEE.code);

  let devis = getDevisHistory().find((d) => d.devisNumber === DEMO_DEVIS_NUMBER);
  if (!devis) {
    devis = upsertPrintedDevisRecord({
      jobName: "Rénovation SDB — plomberie & robinetterie",
      clientName: chantier.client ?? "M. et Mme Martin",
      price: 4500,
      hours: 24,
      materialPurchaseCost: 680,
      materialSellPrice: 1180,
      devisNumber: DEMO_DEVIS_NUMBER,
      docNumber: DEMO_DEVIS_NUMBER,
      status: "success",
    });
  }

  if (chantier.devisId !== devis.id) {
    updateChantier(chantier.id, {
      devisId: devis.id,
      finalPrice: chantier.finalPrice ?? 4500,
    });
  }

  const metres = getMetresByChantier(chantier.id);
  if (!metres.length && employee) {
    const draft = {
      chantierId: chantier.id,
      chantierAccessCode: DEMO_CHANTIER_ACCESS_CODE,
      tradeType: "plombier",
      country: "FR",
      bulletinTitle: "Bulletin de métré",
      employeeId: employee.id,
      employeeName: `${employee.firstname} ${employee.lastname ?? ""}`.trim(),
      clientName: chantier.client ?? "M. et Mme Martin",
      orderedBy: "M. Martin",
      workDescription: "Remplacement réseau PER, mitigeur douche, évacuations — SDB complète",
      date: new Date().toISOString().slice(0, 10),
      location: chantier.location ?? "12 rue des Artisans, Lyon",
      materials: [
        { name: "Tube PER 16 mm", ref: "PER-16", quantity: 14, unit: "m", unitPrice: 4.2 },
        { name: "Mitigeur thermostatique", ref: "MIT-TH", quantity: 1, unit: "u", unitPrice: 189 },
        { name: "Collecteur PER + vannes", ref: "COL-5", quantity: 1, unit: "u", unitPrice: 95 },
      ],
      personnel: [
        { name: "Jean Terrain", role: "chef_chantier", hours: 16, hourlyRate: 48 },
        { name: "Lucas Ouvrier", role: "salarie", hours: 10, hourlyRate: 38 },
      ],
      logistics: { km: 52, vehicle: "Kangoo", frais: 65, machineCost: 0 },
      workStatus: { finished: true, billingType: "regie", rsPm: false },
      workConditions: { installationMode: "standard" },
      technicalData: {},
      notes: "Travaux supplémentaires : déplacement colonne évacuation (+2 h MO).",
      status: "signed",
      clientSignature: "data:image/png;base64,demo",
      signedAt: new Date().toISOString(),
    };
    const totals = computeMetreTotals(draft, "FR");
    addMetre({ ...draft, ...totals });

    addActivity({
      chantierId: chantier.id,
      type: "metre",
      icon: "📐",
      title: "Métré signé sur chantier",
      message: `${draft.clientName} — bulletin transmis par ${draft.employeeName}`,
      author: employee.firstname,
    });
  }

  return {
    chantier: getChantiers().find((c) => c.id === chantier.id) ?? chantier,
    employee,
    devis: getDevisHistory().find((d) => d.id === devis.id) ?? devis,
    metreCount: getMetresByChantier(chantier.id).length,
  };
}
