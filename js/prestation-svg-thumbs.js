/** Pictogrammes SVG produit — correspondent au matériel (offline). */

function svgUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

const wrap = (body, bg = "#f1f5f9") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img">
    <rect width="120" height="120" rx="14" fill="${bg}"/>
    ${body}
  </svg>`;

export const SVG_THUMBS = {
  prise: svgUri(wrap(`
    <rect x="22" y="32" width="76" height="60" rx="10" fill="#fff" stroke="#64748b" stroke-width="2.5"/>
    <circle cx="46" cy="58" r="8" fill="#0f172a"/><circle cx="74" cy="58" r="8" fill="#0f172a"/>
    <rect x="54" y="72" width="12" height="10" rx="2" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5"/>
    <rect x="56" y="16" width="8" height="20" rx="3" fill="#64748b"/>
  `)),
  interrupteur: svgUri(wrap(`
    <rect x="24" y="30" width="72" height="60" rx="10" fill="#fff" stroke="#64748b" stroke-width="2.5"/>
    <rect x="38" y="42" width="44" height="36" rx="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
    <rect x="52" y="48" width="14" height="24" rx="4" fill="#fff" stroke="#64748b" stroke-width="2"/>
  `)),
  disjoncteur: svgUri(wrap(`
    <rect x="30" y="22" width="22" height="76" rx="4" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
    <rect x="54" y="22" width="22" height="76" rx="4" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
    <rect x="78" y="22" width="12" height="76" rx="3" fill="#cbd5e1"/>
    <rect x="33" y="34" width="16" height="10" rx="2" fill="#0f172a"/>
    <rect x="57" y="34" width="16" height="10" rx="2" fill="#0f172a"/>
  `)),
  tableau: svgUri(wrap(`
    <rect x="18" y="24" width="84" height="72" rx="6" fill="#fff" stroke="#334155" stroke-width="2.5"/>
    <rect x="24" y="32" width="72" height="8" fill="#e2e8f0"/>
    <rect x="26" y="46" width="14" height="40" rx="2" fill="#f1f5f9" stroke="#64748b"/>
    <rect x="44" y="46" width="14" height="40" rx="2" fill="#f1f5f9" stroke="#64748b"/>
    <rect x="62" y="46" width="14" height="40" rx="2" fill="#f1f5f9" stroke="#64748b"/>
    <rect x="80" y="46" width="14" height="40" rx="2" fill="#f1f5f9" stroke="#64748b"/>
  `, "#e2e8f0")),
  eclairage: svgUri(wrap(`
    <circle cx="60" cy="48" r="22" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>
    <path d="M48 70 L72 70 L68 88 L52 88 Z" fill="#94a3b8"/>
    <rect x="54" y="88" width="12" height="6" rx="2" fill="#64748b"/>
  `, "#fffbeb")),
  cable: svgUri(wrap(`
    <path d="M20 60 C35 30, 55 90, 70 60 S95 30, 100 60" fill="none" stroke="#b45309" stroke-width="8" stroke-linecap="round"/>
    <path d="M20 60 C35 30, 55 90, 70 60 S95 30, 100 60" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
  `)),
  robinet: svgUri(wrap(`
    <rect x="52" y="70" width="16" height="18" rx="3" fill="#94a3b8"/>
    <path d="M40 70 L80 70 L76 52 Q60 38 44 52 Z" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
    <rect x="56" y="44" width="8" height="14" rx="2" fill="#e2e8f0" stroke="#64748b"/>
    <ellipse cx="60" cy="86" rx="18" ry="4" fill="#60a5fa" opacity=".35"/>
  `, "#eff6ff")),
  sanitaire: svgUri(wrap(`
    <ellipse cx="60" cy="78" rx="26" ry="14" fill="#fff" stroke="#64748b" stroke-width="2.5"/>
    <rect x="44" y="34" width="32" height="28" rx="8" fill="#fff" stroke="#64748b" stroke-width="2.5"/>
    <rect x="50" y="24" width="20" height="12" rx="4" fill="#e2e8f0" stroke="#94a3b8"/>
  `, "#f0f9ff")),
  chauffeEau: svgUri(wrap(`
    <rect x="32" y="28" width="56" height="64" rx="28" fill="#fff" stroke="#64748b" stroke-width="2.5"/>
    <rect x="48" y="20" width="24" height="12" rx="4" fill="#94a3b8"/>
    <circle cx="60" cy="58" r="10" fill="#ef4444"/>
    <text x="60" y="62" text-anchor="middle" font-size="10" fill="#fff" font-family="sans-serif">°C</text>
  `)),
  tube: svgUri(wrap(`
    <rect x="18" y="46" width="84" height="28" rx="14" fill="#d97706" stroke="#92400e" stroke-width="2"/>
    <circle cx="18" cy="60" r="14" fill="#f59e0b" stroke="#92400e" stroke-width="2"/>
    <circle cx="102" cy="60" r="14" fill="#f59e0b" stroke="#92400e" stroke-width="2"/>
  `, "#fff7ed")),
  clim: svgUri(wrap(`
    <rect x="20" y="36" width="80" height="48" rx="8" fill="#fff" stroke="#64748b" stroke-width="2.5"/>
    <circle cx="42" cy="78" r="10" fill="#334155"/><circle cx="78" cy="78" r="10" fill="#334155"/>
    <rect x="28" y="44" width="64" height="24" rx="4" fill="#e0f2fe" stroke="#38bdf8"/>
  `)),
  radiateur: svgUri(wrap(`
    <rect x="26" y="30" width="68" height="60" rx="6" fill="#fff" stroke="#64748b" stroke-width="2"/>
    <line x1="36" y1="38" x2="36" y2="82" stroke="#94a3b8" stroke-width="4"/>
    <line x1="48" y1="38" x2="48" y2="82" stroke="#94a3b8" stroke-width="4"/>
    <line x1="60" y1="38" x2="60" y2="82" stroke="#94a3b8" stroke-width="4"/>
    <line x1="72" y1="38" x2="72" y2="82" stroke="#94a3b8" stroke-width="4"/>
    <line x1="84" y1="38" x2="84" y2="82" stroke="#94a3b8" stroke-width="4"/>
  `)),
  peinture: svgUri(wrap(`
    <rect x="34" y="48" width="52" height="44" rx="4" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
    <rect x="48" y="28" width="24" height="24" rx="4" fill="#60a5fa" stroke="#1d4ed8" stroke-width="2"/>
    <rect x="40" y="36" width="40" height="8" fill="#1d4ed8"/>
  `, "#eff6ff")),
  revetement: svgUri(wrap(`
    <rect x="22" y="28" width="76" height="64" rx="6" fill="#fff" stroke="#94a3b8" stroke-width="2"/>
    <path d="M22 48 H98 M22 68 H98 M42 28 V92 M62 28 V92 M82 28 V92" stroke="#cbd5e1" stroke-width="2"/>
  `)),
  carrelage: svgUri(wrap(`
    <rect x="20" y="30" width="36" height="36" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
    <rect x="56" y="30" width="36" height="36" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
    <rect x="20" y="66" width="36" height="36" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
    <rect x="56" y="66" width="36" height="36" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
  `)),
  parquet: svgUri(wrap(`
    <rect x="18" y="40" width="84" height="44" fill="#b45309"/>
    <line x1="18" y1="52" x2="102" y2="52" stroke="#92400e" stroke-width="2"/>
    <line x1="18" y1="64" x2="102" y2="64" stroke="#92400e" stroke-width="2"/>
    <line x1="18" y1="76" x2="102" y2="76" stroke="#92400e" stroke-width="2"/>
    <line x1="50" y1="40" x2="50" y2="84" stroke="#92400e" stroke-width="2"/>
    <line x1="82" y1="40" x2="82" y2="84" stroke="#92400e" stroke-width="2"/>
  `, "#fff7ed")),
  porte: svgUri(wrap(`
    <rect x="30" y="22" width="60" height="76" rx="4" fill="#fef3c7" stroke="#92400e" stroke-width="2.5"/>
    <circle cx="78" cy="60" r="5" fill="#b45309"/>
    <rect x="34" y="26" width="24" height="20" rx="2" fill="#fff" opacity=".5"/>
  `, "#fffbeb")),
  fenetre: svgUri(wrap(`
    <rect x="22" y="28" width="76" height="64" rx="4" fill="#fff" stroke="#64748b" stroke-width="2.5"/>
    <rect x="28" y="34" width="64" height="52" fill="#bae6fd"/>
    <line x1="60" y1="34" x2="60" y2="86" stroke="#64748b" stroke-width="2"/>
    <line x1="28" y1="60" x2="92" y2="60" stroke="#64748b" stroke-width="2"/>
  `, "#f0f9ff")),
  placard: svgUri(wrap(`
    <rect x="24" y="24" width="72" height="72" rx="4" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>
    <line x1="60" y1="24" x2="60" y2="96" stroke="#92400e" stroke-width="2"/>
    <rect x="30" y="32" width="24" height="8" rx="2" fill="#b45309"/>
    <rect x="66" y="32" width="24" height="8" rx="2" fill="#b45309"/>
  `, "#fffbeb")),
  plaquiste: svgUri(wrap(`
    <rect x="20" y="32" width="80" height="56" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
    <line x1="20" y1="48" x2="100" y2="48" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="6 4"/>
    <line x1="20" y1="64" x2="100" y2="64" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="6 4"/>
    <line x1="20" y1="80" x2="100" y2="80" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="6 4"/>
  `)),
  fauxPlafond: svgUri(wrap(`
    <rect x="18" y="44" width="32" height="32" fill="#f1f5f9" stroke="#64748b"/>
    <rect x="50" y="44" width="32" height="32" fill="#fff" stroke="#64748b"/>
    <rect x="82" y="44" width="20" height="32" fill="#f1f5f9" stroke="#64748b"/>
    <line x1="14" y1="40" x2="106" y2="40" stroke="#334155" stroke-width="3"/>
  `)),
  isolant: svgUri(wrap(`
    <rect x="24" y="32" width="72" height="56" rx="6" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
    <path d="M30 40 H90 M30 52 H90 M30 64 H90 M30 76 H90" stroke="#eab308" stroke-width="3"/>
  `, "#fefce8")),
  mo: svgUri(wrap(`
    <circle cx="60" cy="42" r="16" fill="#fde68a" stroke="#b45309" stroke-width="2"/>
    <rect x="44" y="60" width="32" height="28" rx="8" fill="#3b82f6"/>
    <rect x="36" y="72" width="12" height="22" rx="4" fill="#1e3a8a"/>
    <rect x="72" y="72" width="12" height="22" rx="4" fill="#1e3a8a"/>
  `, "#eff6ff")),
  default: svgUri(wrap(`
    <rect x="32" y="36" width="56" height="48" rx="8" fill="#fff" stroke="#94a3b8" stroke-width="2"/>
    <path d="M44 56 H76 M44 68 H76" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
  `)),
};
