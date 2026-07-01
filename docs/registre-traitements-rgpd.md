# Registre des activités de traitement — Exxon-bat

Document interne au sens de l'article 30 du RGPD.  
À conserver chez le responsable de traitement et à mettre à jour à chaque changement significatif (nouvel outil, nouvelle finalité, etc.).

---

## Responsable de traitement

| Champ | Valeur |
|-------|--------|
| **Dénomination** | EXXON-BAT SASU *(à compléter après immatriculation)* |
| **Forme juridique** | SASU |
| **Adresse** | *(adresse du siège social)* |
| **SIRET** | *(14 chiffres)* |
| **RCS** | *(ville du greffe)* |
| **TVA intracommunautaire** | FR… *(après attribution)* |
| **Représentant légal** | *(Président — votre nom)* |
| **Contact général** | contact@exxon-bat.com |
| **Contact données personnelles** | privacy@exxon-bat.com |
| **Site / application** | https://www.exxon-bat.com |

**Délégué à la protection des données (DPO) :** non désigné *(non obligatoire pour une TPE SaaS B2B de cette taille)*.

**Date de création du registre :** juin 2026  
**Dernière révision :** juin 2026

---

## Traitement n° 1 — Comptes utilisateurs et abonnements

| Élément | Détail |
|---------|--------|
| **Finalité** | Création et gestion des comptes, authentification, accès aux fonctionnalités selon la formule souscrite |
| **Catégories de personnes** | Artisans, dirigeants de TPE BTP, utilisateurs de l'application |
| **Données traitées** | Nom, prénom, e-mail professionnel, identifiants de connexion, formule d'abonnement, dates de connexion, préférences applicatives |
| **Données sensibles** | Aucune |
| **Base légale** | Exécution du contrat (art. 6.1.b RGPD) — CGU acceptées à l'inscription |
| **Destinataires** | Personnel habilité d'Exxon-bat (président), hébergeur du site si données serveur |
| **Transferts hors UE** | Non prévu en l'état *(voir traitement n° 5 si évolution)* |
| **Durée de conservation** | Durée de la relation contractuelle + 3 ans après fin de compte (prescription commerciale), sauf obligation légale contraire |
| **Mesures de sécurité** | HTTPS, mots de passe non stockés en clair, accès limité, hébergement chez prestataires conformes RGPD |
| **Source** | Saisie directe par l'utilisateur à l'inscription et dans son profil |

**Note technique Exxon-bat :** une partie des données de compte peut être stockée localement dans le navigateur (PWA). L'utilisateur reste maître de l'effacement via les paramètres de son appareil.

---

## Traitement n° 2 — Données métier saisies par l'utilisateur (clients, devis, chantiers)

| Élément | Détail |
|---------|--------|
| **Finalité** | Permettre à l'utilisateur de gérer son activité (devis, clients, chantiers, métré, planning) |
| **Catégories de personnes** | Clients finaux des artisans utilisateurs *(tiers)* |
| **Données traitées** | Noms, adresses, téléphones, e-mails, montants de devis, photos de chantier, notes — selon ce que l'artisan saisit |
| **Rôle d'Exxon-bat** | **Sous-traitant technique de l'outil** ou hébergeur local uniquement — l'**artisan utilisateur est responsable de traitement** vis-à-vis de ses propres clients |
| **Base légale** | Exécution du contrat entre Exxon-bat et l'artisan (art. 6.1.b) ; l'artisan doit avoir sa propre base légale vis-à-vis de ses clients |
| **Stockage** | **Principalement en local** sur l'appareil de l'utilisateur (`localStorage` navigateur). Pas d'accès distant par Exxon-bat sans action volontaire de l'utilisateur (export, support) |
| **Durée** | Tant que l'utilisateur conserve les données sur son appareil ; pas de copie serveur systématique en l'état actuel du produit |
| **Mesures de sécurité** | Stockage local navigateur, pas de revente de données, clause CGU rappelant la responsabilité de l'utilisateur |

**À documenter dans les CGU :** l'utilisateur garantit disposer des droits nécessaires pour traiter les données de ses clients.

---

## Traitement n° 3 — Facturation et paiements

| Élément | Détail |
|---------|--------|
| **Finalité** | Encaissement des abonnements, émission de factures, gestion des impayés |
| **Catégories de personnes** | Clients abonnés (artisans, TPE) |
| **Données traitées** | Identité, adresse de facturation, e-mail, historique des paiements, montants, références de transaction |
| **Base légale** | Exécution du contrat (art. 6.1.b) + obligation légale comptable (art. 6.1.c) |
| **Sous-traitant** | **Stripe Payments Europe Ltd.** — paiement sécurisé (DPA / clauses Stripe applicables) |
| **Durée de conservation** | **10 ans** pour les pièces comptables et factures |
| **Mesures de sécurité** | Pas de stockage des numéros de carte par Exxon-bat ; traitement PCI-DSS délégué à Stripe |

---

## Traitement n° 4 — Support client

| Élément | Détail |
|---------|--------|
| **Finalité** | Répondre aux demandes, résoudre les incidents, améliorer le service |
| **Catégories de personnes** | Utilisateurs et prospects contactant le support |
| **Données traitées** | E-mail, nom, contenu des messages, captures d'écran éventuelles, données techniques transmises volontairement |
| **Base légale** | Intérêt légitime (art. 6.1.f) — assistance client |
| **Durée de conservation** | **3 ans** après le dernier échange |
| **Destinataires** | Président / support Exxon-bat, outil de messagerie professionnelle |

---

## Traitement n° 5 — Site web, logs et cookies techniques

| Élément | Détail |
|---------|--------|
| **Finalité** | Affichage du site, sécurité, fonctionnement PWA, statistiques techniques internes |
| **Catégories de personnes** | Visiteurs du site, utilisateurs connectés |
| **Données traitées** | Adresse IP, logs serveur, cookies strictement nécessaires (session, préférences, installation PWA) |
| **Base légale** | Intérêt légitime (art. 6.1.f) pour le fonctionnement ; consentement si cookies non essentiels ajoutés ultérieurement |
| **Sous-traitant** | **Cloudflare, Inc.** — CDN, sécurité, hébergement statique *(vérifier la zone de traitement dans le dashboard Cloudflare)* |
| **Durée** | Logs : 12 mois maximum recommandé ; cookies session : durée de la session |
| **Cookies publicitaires** | **Aucun** en l'état — pas de bandeau cookies obligatoire tant qu'aucun traceur marketing n'est ajouté |

---

## Traitement n° 6 — Prospection commerciale *(si activée)*

| Élément | Détail |
|---------|--------|
| **Finalité** | Envoi d'informations commerciales, newsletters, relances essai gratuit |
| **Données traitées** | E-mail, prénom, historique d'ouverture si outil marketing |
| **Base légale** | Consentement (art. 6.1.a) ou intérêt légitime pour clients existants (produits similaires) selon le cas |
| **Durée** | Jusqu'au désabonnement + 3 ans max |
| **Statut** | *À cocher : ☐ Actif — ☑ Non actif pour l'instant* |

---

## Liste des sous-traitants

| Prestataire | Service | Localisation | DPA / garanties |
|-------------|---------|--------------|-----------------|
| Stripe Payments Europe Ltd. | Paiement en ligne | UE (Irlande) | DPA Stripe — [stripe.com/fr/privacy](https://stripe.com/fr/privacy) |
| Cloudflare, Inc. | CDN, hébergement, sécurité | UE possible *(paramétrer)* | DPA Cloudflare — [cloudflare.com/trust-hub](https://www.cloudflare.com/trust-hub/gdpr/) |
| *(Banque pro — Qonto, Shine…)* | Compte professionnel | France / UE | CGU prestataire |
| *(Hébergeur e-mail — si distinct)* | Boîtes contact@, privacy@ | À renseigner | À vérifier |

**Engagement :** aucune revente de données personnelles à des tiers à des fins publicitaires.

---

## Droits des personnes concernées

Les personnes peuvent exercer leurs droits (accès, rectification, effacement, limitation, opposition, portabilité) en écrivant à :

**privacy@exxon-bat.com**

Délai de réponse : **1 mois** (prolongeable de 2 mois si complexe).

Réclamation possible auprès de la **CNIL** : [www.cnil.fr](https://www.cnil.fr)

### Procédure interne type (effacement compte)

1. Vérifier l'identité du demandeur (e-mail du compte).
2. Supprimer les données côté serveur (compte, facturation hors conservation légale 10 ans).
3. Rappeler que les données métier locales sont sur l'appareil de l'utilisateur.
4. Confirmer par e-mail sous 30 jours.
5. Noter la demande dans ce registre (date, type de droit, réponse).

---

## Analyse d'impact (AIPD / DPIA)

**Non réalisée** — non obligatoire en l'état : pas de données sensibles à grande échelle, pas de profilage automatisé à effet juridique, pas de surveillance systématique.

**À réévaluer si :** synchronisation cloud centralisée des données métier, traitement de données de santé/sécurité chantier à grande échelle, ou ciblage publicitaire massif.

---

## Historique des révisions

| Date | Version | Modification | Auteur |
|------|---------|--------------|--------|
| juin 2026 | 1.0 | Création initiale | *(votre nom)* |
| | | | |

---

## Cases à cocher avant mise en production

- [ ] SIRET et adresse du siège renseignés dans `js/site-publisher.defaults.js`
- [ ] Pages `confidentialite.html` et `donnees-personnelles.html` publiées avec les bonnes infos
- [ ] Adresse `privacy@exxon-bat.com` active et surveillée
- [ ] CGU acceptées à l'inscription *(déjà en place sur `inscription.html`)*
- [ ] Compte Stripe configuré (mode production)
- [ ] Zone Cloudflare configurée en UE si possible
- [ ] Ce registre imprimé ou sauvegardé hors ligne (Google Drive, coffre-fort)
