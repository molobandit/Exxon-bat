/**
 * Recherche floue bibliothèque — tolère fautes, mots partiels et accents.
 */

export function normalizeSearchText(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[×·]/g, " ")
    .replace(/[''`]/g, "")
    .replace(/[^\w\s\-./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = row[j];
      row[j] = next;
    }
  }
  return row[b.length];
}

function maxEditDistance(token) {
  if (token.length <= 3) return 1;
  if (token.length <= 6) return 2;
  return 3;
}

function tokenScore(token, haystack, hayWords, refNorm) {
  if (!token) return 0;

  const compactToken = token.replace(/[^\w]/g, "");
  const compactRef = refNorm.replace(/[^\w]/g, "");

  if (refNorm) {
    if (refNorm === token || compactRef === compactToken) return 40;
    if (refNorm.startsWith(token) || compactRef.startsWith(compactToken)) return 38;
    if ((refNorm.includes(token) || compactRef.includes(compactToken)) && token.length >= 2) {
      return 32;
    }
  }

  if (haystack.includes(token)) {
    if (hayWords.some((word) => word.startsWith(token))) return 28;
    return 24;
  }

  for (const word of hayWords) {
    if (word.length >= 3 && token.length >= 2 && word.startsWith(token)) {
      return 26;
    }
  }

  let best = 0;
  for (const word of hayWords) {
    if (word.length < 2) continue;

    const dist = levenshtein(token, word);
    const max = maxEditDistance(token);
    if (dist <= max) {
      best = Math.max(best, 20 - dist * 4);
    }

    if (word.length >= token.length && token.length >= 3) {
      const prefix = word.slice(0, token.length);
      if (levenshtein(token, prefix) <= 1) {
        best = Math.max(best, 18);
      }
    }
  }

  if (token.length >= 4 && best < 12) {
    for (let i = 0; i <= haystack.length - token.length; i += 1) {
      const slice = haystack.slice(i, i + token.length);
      if (levenshtein(token, slice) <= 1) {
        best = Math.max(best, 14);
        break;
      }
    }
  }

  return best;
}

export function scorePrestationSearch(query, searchText, meta = {}) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const haystack = normalizeSearchText(searchText);
  const refNorm = normalizeSearchText(
    [meta.ref, meta.batiprixCode, meta.batiprixLot].filter(Boolean).join(" "),
  );
  const hayWords = haystack.split(/\s+/).filter(Boolean);

  if (haystack.includes(normalizedQuery)) {
    let score = 100;
    const compactQuery = normalizedQuery.replace(/\s/g, "");
    if (refNorm.replace(/\s/g, "").startsWith(compactQuery)) score += 5;
    return score;
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;

  let total = 0;
  let matched = 0;
  const significant = tokens.filter((token) => token.length >= 2);

  for (const token of tokens) {
    if (token.length === 1) {
      const shortScore =
        refNorm.startsWith(token) || hayWords.some((word) => word.startsWith(token)) ? 8 : 0;
      if (shortScore) {
        total += shortScore;
        matched += 1;
      }
      continue;
    }

    const score = tokenScore(token, haystack, hayWords, refNorm);
    if (score > 0) {
      total += score;
      matched += 1;
    }
  }

  if (matched === 0) return 0;

  if (significant.length > 1) {
    const significantMatched = significant.filter(
      (token) => tokenScore(token, haystack, hayWords, refNorm) > 0,
    ).length;
    const ratio = significantMatched / significant.length;
    if (ratio < 0.5) return 0;
    if (ratio < 1) total *= ratio;
  } else if (significant.length === 1) {
    const score = tokenScore(significant[0], haystack, hayWords, refNorm);
    if (score <= 0) return 0;
  }

  return total / tokens.length;
}

export function rankPrestationSearch(items, query, getSearchText) {
  const trimmed = query.trim();
  if (!trimmed) return items;

  const scored = [];
  for (const item of items) {
    const score = scorePrestationSearch(trimmed, getSearchText(item), {
      ref: item.ref,
      batiprixCode: item.batiprixCode,
      batiprixLot: item.batiprixLot,
    });
    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.ref.localeCompare(b.item.ref, "fr"));
  return scored.map((entry) => entry.item);
}
