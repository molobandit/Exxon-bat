import { initAiAssistant } from "./ai-assistant.js";
import { initBrand } from "./brand.js";
import { initI18n } from "./i18n.js";
import { patchLandingNav } from "./landing-nav.js";
import { renderLandingFaq } from "./landing-faq-i18n.js";

initBrand();
initI18n();
patchLandingNav();
initAiAssistant();
renderLandingFaq();
