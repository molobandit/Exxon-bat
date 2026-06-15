/** Encodage lien de paiement client (sans serveur — payload signé dans l'URL). */

function simpleChecksum(payload) {
  const str = JSON.stringify(payload);
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function encodePaymentLinkPayload(payload) {
  const body = { v: 1, ...payload };
  const checksum = simpleChecksum(body);
  const packed = { ...body, checksum };
  return btoa(unescape(encodeURIComponent(JSON.stringify(packed))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodePaymentLinkPayload(encoded) {
  if (!encoded) return null;
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(padded)));
    const packed = JSON.parse(json);
    if (!packed || packed.v !== 1) return null;
    const { checksum, ...body } = packed;
    if (simpleChecksum(body) !== checksum) return null;
    if (packed.expiresAt && new Date(packed.expiresAt).getTime() < Date.now()) {
      return { ...body, expired: true };
    }
    return body;
  } catch {
    return null;
  }
}

export function buildPaymentPageUrl(payload, origin = window.location.origin) {
  const encoded = encodePaymentLinkPayload(payload);
  return `${origin}/paiement.html#${encoded}`;
}

export function readPaymentPayloadFromLocation() {
  const hash = window.location.hash.replace(/^#/, "");
  return decodePaymentLinkPayload(hash);
}
