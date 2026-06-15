export const BRAND_NAME = "Exxon-bat";

export function brandAssetPath(file = "icons/logo-mark.svg") {
  if (window.location.pathname.includes("/employe/")) return `../${file}`;
  return file;
}

export function initBrand() {
  const logoSrc = `${brandAssetPath()}?v=40`;

  document.querySelectorAll("[data-brand-logo]").forEach((el) => {
    if (el.querySelector("img")) return;
    el.innerHTML = `<img src="${logoSrc}" alt="${BRAND_NAME}" width="42" height="42" />`;
  });

  document.querySelectorAll(".brand__name").forEach((el) => {
    if (!el.dataset.i18n) el.textContent = BRAND_NAME;
  });

  document.querySelectorAll('meta[name="application-name"]').forEach((el) => {
    el.content = BRAND_NAME;
  });
}
