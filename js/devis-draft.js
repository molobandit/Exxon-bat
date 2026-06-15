const PENDING_KEY = "exone-devis-pending-lines";

export function queuePrestationsForDevis(prestations) {
  if (!prestations?.length) return;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(prestations));
}

export function pullPrestationsForDevis() {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return [];
  sessionStorage.removeItem(PENDING_KEY);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
