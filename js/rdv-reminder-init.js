import { getUser } from "./auth.js";
import { processDueReminders } from "./rdv-reminder-service.js";

/** Vérifie les rappels RDV (veille) à chaque ouverture de l'app connectée. */
export function initRdvReminders() {
  if (!getUser()) return;
  processDueReminders().catch(() => {});
}
