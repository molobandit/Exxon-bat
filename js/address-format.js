/** Adresse structurée : rue + code postal + ville (toujours avec CP si renseigné). */
export function formatFullAddress({ address = "", postalCode = "", city = "" } = {}) {
  const street = String(address).trim();
  const cpCity = [String(postalCode).trim(), String(city).trim()].filter(Boolean).join(" ");
  if (street && cpCity) return `${street}, ${cpCity}`;
  return street || cpCity;
}

/** Nom complet client : prénom + nom. */
export function formatClientDisplayName({ firstName = "", firstname = "", name = "" } = {}) {
  const first = String(firstName || firstname).trim();
  const last = String(name).trim();
  if (first && last) return `${first} ${last}`;
  return last || first || "—";
}

/** Ligne adresse PDF — garantit le code postal dans la chaîne affichée. */
export function formatClientAddressLine(client = {}) {
  const postalCode = client.postalCode?.trim() || "";
  const city = client.city?.trim() || "";
  const street = client.address?.trim() || "";
  const full = formatFullAddress({ address: street, postalCode, city });
  if (postalCode && full && !full.includes(postalCode)) {
    return formatFullAddress({ address: full, postalCode, city });
  }
  return full;
}
