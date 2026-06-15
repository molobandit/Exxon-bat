import { requireAuth } from "./auth.js";
import { initAppNav } from "./nav-app.js";
import { requireModule } from "./subscription.js";

export function initModule(page, moduleId) {
  if (!requireAuth()) return;
  if (!requireModule(moduleId)) return;
  initAppNav(page);
}
