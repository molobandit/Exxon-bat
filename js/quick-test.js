import { saveUser } from "./auth.js";
import { isDemoEnabled } from "./app-config.js";
import { createTrialUser, withSubscription } from "./trial.js";
import { setPlan } from "./subscription.js";
import {
  ensureDemoChantier,
  ensureDemoProfile,
  ensureDemoTasks,
} from "./demo-seed.js";

export function startQuickTest(redirect = "dashboard.html") {
  if (!isDemoEnabled()) {
    window.location.href = "connexion.html";
    return;
  }

  ensureDemoProfile();

  saveUser(
    withSubscription(
      createTrialUser({
        email: "test@exone-solution.local",
        firstname: "Test",
        isDemo: true,
      }),
    ),
  );

  setPlan("business");

  const chantier = ensureDemoChantier();
  ensureDemoTasks(chantier);

  window.location.href = redirect;
}
