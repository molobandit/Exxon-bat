#!/usr/bin/env node
/**
 * Synchronise APP_VERSION partout — source de vérité : js/version.js
 * Exécuté avant chaque déploiement pour éviter les caches désynchronisés.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function write(path, content) {
  writeFileSync(join(root, path), content, "utf8");
}

function escRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const versionJs = read("js/version.js");
const version = versionJs.match(/APP_VERSION = "(\d+)"/)?.[1];
if (!version) {
  console.error("❌ APP_VERSION introuvable dans js/version.js");
  process.exit(1);
}

const updates = [];

function replaceInFile(path, replacements) {
  let content = read(path);
  let changed = false;
  for (const [pattern, replacement] of replacements) {
    const next = content.replace(pattern, replacement);
    if (next !== content) {
      content = next;
      changed = true;
    }
  }
  if (changed) {
    write(path, content);
    updates.push(path);
  }
}

replaceInFile("js/storage-repair.js", [
  [/const APP_VERSION = "\d+";/, `const APP_VERSION = "${version}";`],
]);

replaceInFile("sw.js", [[/const CACHE = "exone-v\d+";/, `const CACHE = "exone-v${version}";`]]);

replaceInFile("js/app-version-guard.js", [
  [/var FALLBACK_VERSION = "\d+";/, `var FALLBACK_VERSION = "${version}";`],
]);

const importMapInlineTag = (ver) => {
  const map = collectJsImportMap(ver);
  const json = JSON.stringify(map).replace(/</g, "\\u003c");
  return `<script type="importmap">\n${json}\n    </script>`;
};

function collectJsImportMap(version) {
  const imports = {
    "/js/version.js": `/js/version.js?v=${version}`,
    "./js/version.js": `/js/version.js?v=${version}`,
  };
  const scopes = {};

  function walk(fsDir, urlBase) {
    const scopeEntries = {};
    const absDir = join(root, fsDir);
    for (const entry of readdirSync(absDir)) {
      const rel = `${fsDir}/${entry}`;
      const abs = join(root, rel);
      if (statSync(abs).isDirectory()) {
        walk(rel, `${urlBase}/${entry}`);
        continue;
      }
      if (!entry.endsWith(".js") || entry === "import-map-bootstrap.js") continue;
      const url = `${urlBase}/${entry}`;
      scopeEntries[`./${entry}`] = `./${entry}?v=${version}`;
      imports[url] = `${url}?v=${version}`;
      imports[`./js/${rel.replace(/^js\//, "")}`] = `${url}?v=${version}`;
    }
    if (Object.keys(scopeEntries).length) {
      scopes[`${urlBase}/`] = scopeEntries;
    }
  }

  walk("js", "/js");

  return { imports, scopes };
}

function writeImportMapBootstrap(version) {
  const map = collectJsImportMap(version);
  const content = `/** AUTO-GENERÉ — scripts/sync-app-version.mjs — ne pas éditer à la main. */
(function () {
  var map = ${JSON.stringify(map, null, 2)};

  if (document.querySelector('script[type="importmap"]')) return;

  var el = document.createElement("script");
  el.type = "importmap";
  el.textContent = JSON.stringify(map);
  document.head.appendChild(el);
})();
`;
  write("js/import-map-bootstrap.js", content);
  updates.push("js/import-map-bootstrap.js");
}

writeImportMapBootstrap(version);

const guardTag = (prefix) =>
  `<script src="${prefix}js/app-version-guard.js?v=${version}"></script>`;

function syncHtml(relativePath) {
  let content = read(relativePath);
  const prefix = relativePath.startsWith("employe/") ? "../" : "";
  const guardScript = guardTag(prefix);
  const mapScript = importMapInlineTag(version);
  let changed = false;

  const versioned = content.replace(/\?v=\d+/g, `?v=${version}`);
  if (versioned !== content) {
    content = versioned;
    changed = true;
  }

  const withModuleVersions = content.replace(
    /(<script type="module" src="(?:\.\.\/)?js\/[^"?]+\.js)(?!\?v=)(">)/g,
    `$1?v=${version}$2`,
  );
  if (withModuleVersions !== content) {
    content = withModuleVersions;
    changed = true;
  }

  const inlineImports = content.replace(
    /from "(\.\/?(?:\.\.\/)?js\/[^"?]+\.js)(\?v=\d+)?"/g,
    `from "$1?v=${version}"`,
  );
  if (inlineImports !== content) {
    content = inlineImports;
    changed = true;
  }

  const dynamicImports = content.replace(
    /import\("(\.\/?(?:\.\.\/)?js\/[^"?]+\.js)(\?v=\d+)?"\)/g,
    `import("$1?v=${version}")`,
  );
  if (dynamicImports !== content) {
    content = dynamicImports;
    changed = true;
  }

  if (!content.includes("app-version-guard.js")) {
    if (content.includes("<meta charset")) {
      content = content.replace(
        /(<meta charset="UTF-8"\s*\/?>)/i,
        `$1\n    ${guardScript}\n    ${mapScript}`,
      );
      changed = true;
    } else if (content.includes("<head>")) {
      content = content.replace("<head>", `<head>\n    ${guardScript}\n    ${mapScript}`);
      changed = true;
    }
  } else if (!content.includes('type="importmap"')) {
    const guardPattern = new RegExp(
      `(<script src="${escRegex(prefix)}js/app-version-guard\\.js\\?v=\\d+"><\\/script>)`,
    );
    const next = content.replace(guardPattern, `$1\n    ${mapScript}`);
    if (next !== content) {
      content = next;
      changed = true;
    }
  }

  if (content.includes("import-map-bootstrap.js")) {
    const bootstrapPattern = new RegExp(
      `\\s*<script src="${escRegex(prefix)}js/import-map-bootstrap\\.js\\?v=\\d+"><\\/script>`,
    );
    const withoutBootstrap = content.replace(bootstrapPattern, "");
    if (withoutBootstrap !== content) {
      content = withoutBootstrap;
      changed = true;
    }
  }

  if (content.includes("mobile-env.js") && !content.includes("nav-menu-bootstrap.js")) {
    const mobilePattern = new RegExp(
      `(<script src="${escRegex(prefix)}js/mobile-env\\.js\\?v=\\d+"><\\/script>)`,
    );
    const withNav = content.replace(
      mobilePattern,
      `<script src="${prefix}js/nav-menu-bootstrap.js?v=${version}"></script>\n    $1`,
    );
    if (withNav !== content) {
      content = withNav;
      changed = true;
    }
  }

  if (changed) {
    write(relativePath, content);
    updates.push(relativePath);
  }
}

function walkHtml(dir, base = "") {
  for (const entry of readdirSync(join(root, dir))) {
    const rel = base ? `${base}/${entry}` : entry;
    const abs = join(root, dir, entry);
    if (statSync(abs).isDirectory()) {
      walkHtml(join(dir, entry), rel);
    } else if (entry.endsWith(".html")) {
      syncHtml(rel);
    }
  }
}

walkHtml(".");

console.log(`✓ Version v${version} synchronisée (${updates.length} fichier(s) mis à jour)`);
if (updates.length) {
  for (const file of updates.slice(0, 15)) console.log("  ·", file);
  if (updates.length > 15) console.log(`  · … et ${updates.length - 15} autres`);
}
