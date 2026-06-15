const DRAFT_KEY = "exone-devis-facture-draft-v1";

export function loadQuoteDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

export function saveQuoteDraft(draft) {
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      ...draft,
      savedAt: new Date().toISOString(),
    }),
  );
}

export function clearQuoteDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
