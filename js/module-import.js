import { APP_VERSION } from "./version.js";

/** Import dynamique avec cache bust — à utiliser pour les modules optionnels ou lourds. */
export function importVersioned(modulePath) {
  const url = modulePath.includes("?")
    ? `${modulePath}&v=${APP_VERSION}`
    : `${modulePath}?v=${APP_VERSION}`;
  return import(url);
}
