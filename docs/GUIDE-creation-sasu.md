# Créer la SASU EXXON-BAT sur votre PC

Ce dossier contient tout pour préparer vos statuts comme le ferait un expert-comptable, **à remplir chez vous**.

## Fichiers

| Fichier | Rôle |
|---------|------|
| **`fiche-renseignements-sasu.md`** | Formulaire à remplir en premier (état civil, société, banque…) |
| **`statuts-sasu-exxon-bat.md`** | Statuts complets (~8 pages à l'impression) — remplacer chaque `[À REMPLIR …]` |
| **`registre-traitements-rgpd.md`** | Registre RGPD *(après immatriculation)* |
| **`checklist-guichet-unique.md`** | Pièces à joindre sur formalites.entreprises.gouv.fr |

## Ordre de travail

```
1. Ouvrir fiche-renseignements-sasu.md → remplir et enregistrer
2. Ouvrir statuts-sasu-exxon-bat.md → rechercher [À REMPLIR → remplacer
3. Imprimer les statuts → signer à la main
4. Ouvrir compte pro → déposer le capital → attestation de dépôt
5. Annonce légale (journal de l'Ain)
6. Suivre checklist-guichet-unique.md
```

## Comment éditer sur votre PC

### Option A — Cursor / VS Code *(recommandé)*
```bash
git pull
# Ouvrir le dossier Exxon-bat
# Éditer docs/fiche-renseignements-sasu.md puis docs/statuts-sasu-exxon-bat.md
```

### Option B — Word / LibreOffice
1. Ouvrir `statuts-sasu-exxon-bat.md` avec Word ou copier le contenu
2. Remplacer les champs `[À REMPLIR …]`
3. Exporter en PDF pour signature

### Recherche rapide des champs vides
Dans l'éditeur : **Ctrl+F** → chercher `À REMPLIR`

## Après immatriculation

Compléter aussi `../js/site-publisher.defaults.js` (SIRET, RCS, TVA).

## Besoin d'aide ?

Revenez dans Cursor avec la fiche remplie : on pourra générer la version finale sans aucun champ vide.
