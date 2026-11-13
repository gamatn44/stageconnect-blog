# StageConnect – Service User

Microservice **User** de la plateforme StageConnect (mise en relation étudiants / entreprises pour les stages). Il gère les comptes (étudiants, entreprises, administrateurs), l'authentification, la sécurité des connexions et l'historique des actions.

Stack : Node.js, Express 4, MongoDB (Mongoose 9), JWT, bcrypt, Nodemailer.

## Architecture

```
app.js                      Point d'entrée : connexion MongoDB, middlewares globaux, routes /api, gestion des erreurs JSON
config/
  dbconnection.json         URL MongoDB (base mydbDas)
  auth.config.js            Constantes de sécurité (tentatives, durées, rôles d'inscription) + JWT
  mail.config.js            Configuration SMTP (lue dans .env)
  discord.config.js         Webhook, actions archivées, couleurs
routes/api/                 Routes → controllers (préfixe /api)
  index.js                  /auth, /users, /historiques
  auth.routes.js            Routes publiques d'authentification
  user.routes.js            CRUD User (admin)
  historique.routes.js      CRUD Historique (admin)
controllers/                Logique métier
  auth.controller.js        Inscription, vérification email, login, mot de passe oublié
  user.controller.js        CRUD, filtres, statistiques, déverrouillage
  historique.controller.js  CRUD, filtres, statistiques
models/                     Schémas Mongoose
  user.model.js             User (hash du mot de passe, tokens et codes hachés)
  historique.model.js       Historique (hook d'archivage Discord)
middlewares/
  auth.js                   authentifier (JWT) et exigerRole(...)
utils/
  reponse.js                Format de réponse { success, message, data } et gestion des erreurs
  query.js                  Filtres, recherche, tri et pagination des listes
  mail.js                   Envoi des mails (vérification, code, confirmation)
  discord.js                Envoi des embeds sur le webhook Discord
scripts/
  seed-admin.js             Création du premier administrateur
postman/                    Collection Postman / Newman
```

Flux d'une requête : `route → (authentifier → exigerRole) → controller → model → MongoDB`. Les erreurs sont converties en JSON par `utils/reponse.js` (400 validation ou paramètre invalide, 409 email déjà utilisé, 500 sinon).

Toutes les réponses ont le format `{ "success": true|false, "message": "...", "data": ... }` ; les listes ajoutent `"pagination": { total, page, limit, totalPages }`.

## Installation

Prérequis : Node.js 18+ (testé avec Node 24), MongoDB en local sur `mongodb://127.0.0.1:27017`.

```bash
npm install
cp .env.example .env        # puis remplir .env (voir ci-dessous)
npm run seed:admin          # crée le premier administrateur
npm start                   # ou npm run dev (nodemon)
```

Le serveur écoute sur `PORT` (3000 par défaut). Après toute modification de `.env`, redémarrer le serveur.

## Variables `.env`

Le fichier `.env` est ignoré par git ; `.env.example` sert de modèle.

| Variable | Rôle |
|---|---|
| `JWT_SECRET` | **Obligatoire.** Secret de signature des JWT (chaîne aléatoire longue). Le serveur refuse de démarrer sans. |
| `JWT_EXPIRES_IN` | Durée de vie des tokens (défaut `1h`). |
| `MAIL_HOST`, `MAIL_PORT` | Serveur SMTP (défaut Gmail : `smtp.gmail.com`, `465`). |
| `MAIL_USER` | Adresse Gmail expéditrice. **Vide = mode développement** : aucun mail envoyé, liens et codes affichés dans la console et renvoyés dans les réponses (`lienVerificationDev`, `codeDev`). |
| `MAIL_PASSWORD` | Mot de passe d'application Gmail (validation en 2 étapes requise, à créer sur https://myaccount.google.com/apppasswords) – pas le mot de passe du compte. |
| `MAIL_FROM` | Optionnel. Défaut : `StageConnect <MAIL_USER>`. |
| `APP_URL` | URL publique du service, utilisée dans le lien de vérification (`http://localhost:3000` en local). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Compte créé par `npm run seed:admin` (mot de passe d'au moins 6 caractères). |
| `DISCORD_WEBHOOK_URL` | Webhook Discord pour l'archivage des événements de sécurité. Vide = rien envoyé, un log est affiché en console. À garder secret. |

> En production, laisser `MAIL_USER` rempli : en mode développement les tokens et codes sont exposés dans les réponses.

## Routes

Préfixe : `/api`. « Admin » = JWT valide d'un compte de rôle `admin` (`Authorization: Bearer <token>`).

### Authentification (`/api/auth`, publiques)

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription (`nom`, `prenom`, `email`, `motDePasse`, `telephone`, `role` = `etudiant` ou `entreprise`). Envoie le mail de vérification. |
| GET | `/api/auth/verifier-email/:token` | Valide l'email (token à usage unique, 24 h). |
| POST | `/api/auth/renvoyer-verification` | Renvoie un mail de vérification (réponse générique). |
| POST | `/api/auth/login` | Connexion → `{ token, user }`. |
| POST | `/api/auth/mot-de-passe-oublie` | Envoie un code à 6 chiffres par mail (réponse générique). |
| POST | `/api/auth/reinitialiser-mot-de-passe` | `email`, `code`, `nouveauMotDePasse`. |

### Utilisateurs (`/api/users`, admin)

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/users` | Créer un utilisateur. |
| GET | `/api/users` | Liste paginée. Paramètres : `search`, `role`, `statut`, `sort` (`nom`, `prenom`, `email`, `createdAt`), `order` (`asc`/`desc`), `page`, `limit` (max 100). |
| GET | `/api/users/stats` | Total, répartition par rôle et statut, inscriptions par mois. |
| GET | `/api/users/:id` | Détail. |
| PUT | `/api/users/:id` | Modifier. |
| PATCH | `/api/users/:id/deverrouiller` | Lever le verrouillage d'un compte. |
| DELETE | `/api/users/:id` | Supprimer (cascade sur son historique). |

### Historiques (`/api/historiques`, admin)

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/historiques` | Créer une entrée. |
| GET | `/api/historiques` | Liste paginée. Paramètres : `search`, `action`, `user`, `dateDebut`, `dateFin` (AAAA-MM-JJ), `sort` (`date`, `action`), `order`, `page`, `limit`. |
| GET | `/api/historiques/stats` | Total, répartition par action, top 5 des utilisateurs les plus actifs. |
| GET | `/api/historiques/:id` | Détail. |
| PUT | `/api/historiques/:id` | Modifier. |
| DELETE | `/api/historiques/:id` | Supprimer. |

## Métiers implémentés

- **CRUD User et Historique** : validation Mongoose, mot de passe haché (bcrypt) et jamais renvoyé, identifiants invalides en 400, doublons d'email en 409, suppression en cascade.
- **Recherche, filtres, tri, pagination** sur les deux listes, avec recherche sécurisée (caractères spéciaux échappés) ; **statistiques** par agrégation.
- **Authentification JWT** : le middleware recharge l'utilisateur et exige un compte `actif`. Le CRUD User et Historique est réservé aux admins.
- **Verrouillage anti brute-force** : 5 échecs → compte verrouillé 15 minutes (423 avec `Retry-After`, même avec le bon mot de passe), message d'erreur générique, compteur atomique ; déverrouillage manuel par un admin ; un compte `inactif` ou `bloque` est refusé (403).
- **Inscription avec vérification d'email** : token aléatoire de 32 octets envoyé par mail (seul son hash est stocké), valable 24 h, à usage unique ; connexion refusée (403) tant que l'email n'est pas vérifié ; le rôle `admin` et le statut ne sont pas choisissables à l'inscription.
- **Mot de passe oublié** : code à 6 chiffres valable 15 minutes (hash HMAC stocké), 5 essais maximum puis invalidation, réponse identique que l'email existe ou non, mot de passe différent de l'ancien (6 caractères minimum), mail de confirmation. La réinitialisation déverrouille le compte.
- **Révocation des sessions** : tout changement de mot de passe d'un compte existant (réinitialisation ou PUT admin) met à jour `motDePasseModifieLe` ; les JWT émis avant sont refusés (401).
- **Historique automatique** : inscription, connexion, échecs, verrouillage, vérification email, réinitialisation et, pour le CRUD User fait par un admin, `CREATION`, `MODIFICATION` (liste des champs, jamais le mot de passe), `CHANGEMENT_STATUT` et `CHANGEMENT_ROLE` (ancienne → nouvelle valeur) et `SUPPRESSION` (enregistrée sur le compte de l'admin qui supprime). Un admin ne peut pas supprimer son propre compte.
- **Archivage Discord** : chaque nouvelle entrée dont l'action est dans `config/discord.config.js` (`actionsArchivees`) est envoyée en embed (titre, couleur selon la gravité, nom et email, description, date). Jamais de mot de passe, code ou token ; envoi non bloquant avec timeout de 5 s, erreurs seulement loguées.

## Tests Postman

Collection : [postman/StageConnect-UserService.postman_collection.json](postman/StageConnect-UserService.postman_collection.json) (194 requêtes avec tests). Dossiers, dans l'ordre : Setup (connexion admin), Users, Historiques, Métiers simples, Auth, Inscription, Mot de passe oublié.

Prérequis :

1. Un administrateur existe (`npm run seed:admin`).
2. Le serveur tourne avec **`MAIL_USER` et `DISCORD_WEBHOOK_URL` vides** (mode développement : les liens et codes sont renvoyés dans les réponses, rien n'est envoyé).
3. Dans Postman, renseigner les variables de la collection `adminEmail` et `adminPassword`, puis lancer le Runner sur toute la collection.

Avec Newman, sur un serveur de test lancé à part :

```bash
# Terminal 1
MAIL_USER= DISCORD_WEBHOOK_URL= PORT=3001 node app.js

# Terminal 2
npx newman run postman/StageConnect-UserService.postman_collection.json \
  --env-var baseUrl=http://localhost:3001 \
  --env-var adminEmail=admin@stageconnect.tn \
  --env-var adminPassword=<mot de passe admin>
```

(PowerShell : `$env:MAIL_USER=''; $env:DISCORD_WEBHOOK_URL=''; $env:PORT='3001'; node app.js`.)

La collection crée ses propres comptes de test et les supprime à la fin ; elle ne touche pas aux autres données.
