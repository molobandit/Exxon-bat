import { getUser } from "./auth.js";
import { hasModule } from "./subscription.js";

/** L'espace employé n'est proposé qu'aux employeurs abonnés Business (équipe terrain). */
export function canShowEmployeePortal() {
  return Boolean(getUser()) && hasModule("employes");
}
