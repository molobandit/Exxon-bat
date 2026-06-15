# Exxon-bat — Exone Solution

Application web progressive (PWA) pour artisans et TPE du BTP : devis, rentabilité, chantiers, paiements et comptabilité.

## Démarrage local

```bash
npm install          # optionnel — génération d'icônes
npm start            # http://localhost:8765
```

Mode démo local : comptes test actifs sur `localhost`.  
En production, ajoutez `?demo=1` uniquement pour tests internes (désactivé par défaut).

## Application mobile & tablette

- **PWA installable** : bouton « Installer » après connexion (Android/Chrome) ou Partager → Sur l'écran d'accueil (iOS)
- **Point d'entrée** : `/app.html` redirige vers le tableau de bord si connecté
- **Hors ligne** : pages déjà visitées + page `/offline.html` en secours
- **Tablette** : layout responsive (`css/mobile-app.css`), safe areas iPhone

Générer les icônes PNG (stores & iOS) :

```bash
npm run icons          # depuis icon.svg (nécessite npm install)
npm run icons:fallback # icônes unicolores sans dépendance
```

## Mise en production

### Option 1 — Docker (recommandé)

```bash
npm run predeploy
npm run docker:build
npm run docker:up
# → http://localhost:8080
```

Nginx inclut en-têtes de sécurité (CSP, X-Frame-Options, etc.).

### Option 2 — Netlify / hébergeur statique

1. Publier le dossier racine du projet
2. Fichiers fournis : `netlify.toml`, `_headers`
3. **HTTPS obligatoire** (Let's Encrypt via l'hébergeur)

### Option 3 — Serveur nginx existant

Copier les fichiers vers `/var/www/exxon-bat` et utiliser `deploy/nginx.conf`.

## Sécurité

| Mesure | Statut |
|--------|--------|
| HTTPS + en-têtes sécurité | nginx / Netlify |
| Comptes démo désactivés en prod | `js/app-config.js` |
| Page accès rapide bloquée en prod | `js/acces-demo.js` |
| CSP restrictive | deploy/nginx.conf, _headers |
| Service worker + cache versionné | `sw.js` v102 |

**Prochaine étape recommandée** : authentification serveur (JWT / OAuth) et synchronisation cloud — l'auth actuelle reste côté client (adaptée au prototype / offline-first).

## Structure

```
├── index.html          # Vitrine
├── app.html            # Entrée PWA (redirect intelligent)
├── dashboard.html      # Application employeur
├── employe/            # Espace terrain
├── js/                 # Modules ES
├── css/
├── sw.js               # Service worker
├── manifest.json       # PWA
├── Dockerfile
└── deploy/nginx.conf
```

## Vérifications avant déploiement

```bash
npm run predeploy
```

Synchroniser la version : modifier `js/version.js` et `CACHE` dans `sw.js` (même numéro).

## Support

- Confidentialité : `confidentialite.html`
- Support : `support.html`
