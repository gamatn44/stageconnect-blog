# StageConnect - Service Candidatures

Microservice Node.js / Express / MongoDB (Mongoose). Port **3003**, base **candidatures_db**.
Deux entites : **Candidature** et **CV**.

## Lancer le projet

1. Demarrer MongoDB (local, port 27017).
2. Dans ce dossier :

```
npm install
npm run dev
```

3. Dans Postman : Import > `StageConnect-Candidatures.postman_collection.json`.
   Lancer d'abord "CV > 1. Ajouter un CV" puis "Candidatures > 1. Postuler" :
   les ids sont enregistres automatiquement dans les variables `cvId` et `candidatureId`.

## Structure

```
app.js                    serveur + connexion MongoDB
config/dbconnection.json  url de la base et port
models/                   cv.js, candidature.js (schemas Mongoose)
controller/               CvController.js, CandidatureController.js (logique)
routes/                   cvs.js, candidatures.js (endpoints)
uploads/                  fichiers PDF (uploades ou generes)
```

## Endpoints

### CV (`/cvs`)

| Methode | Route | Role |
|---|---|---|
| POST | /cvs | ajouter un CV |
| GET | /cvs | liste : pagination, tri, filtre, recherche |
| GET | /cvs/:id | afficher un CV |
| PUT | /cvs/:id | modifier |
| DELETE | /cvs/:id | supprimer (refuse si le CV est utilise par une candidature) |
| GET | /cvs/stats | statistiques |
| POST | /cvs/:id/upload | envoyer un fichier CV : PDF, Word ou image, 5 Mo max (form-data, champ `fichier`) |
| GET | /cvs/:id/generer | **metier** : generer le CV PFE en PDF |

Parametres de la liste : `page`, `limit`, `sort` (createdAt, nom, prenom, specialite),
`order` (asc, desc), `competence`, `specialite`, `etudiantId`, `q` (recherche).

### Candidatures (`/candidatures`)

| Methode | Route | Role |
|---|---|---|
| POST | /candidatures | postuler (une seule fois par offre) |
| GET | /candidatures | liste : pagination, tri, filtre, recherche |
| GET | /candidatures/:id | afficher |
| PUT | /candidatures/:id | modifier la lettre ou le CV (si EN_ATTENTE) |
| DELETE | /candidatures/:id | supprimer |
| PATCH | /candidatures/:id/statut | ACCEPTEE, REFUSEE ou ANNULEE |
| GET | /candidatures/stats | statistiques |

Parametres de la liste : `page`, `limit`, `sort` (createdAt, statut, offreTitre, entretien.date),
`order`, `statut`, `etudiantId`, `entrepriseId`, `offreId`, `dateDebut`, `dateFin`, `q`.

### Entretiens (metier)

| Methode | Route | Role |
|---|---|---|
| POST | /candidatures/:id/entretien | planifier (refuse si le creneau est deja pris) |
| PUT | /candidatures/:id/entretien | reporter |
| DELETE | /candidatures/:id/entretien | annuler |
| PATCH | /candidatures/:id/entretien/resultat | note /20, commentaire, decision |
| GET | /candidatures/entretiens/planning | agenda (`entrepriseId`, `etudiantId`, `du`, `au`) |

### Compteur (metier)

| Methode | Route | Role |
|---|---|---|
| GET | /candidatures/compteur?etudiantId=... | nombre de candidatures de l'etudiant, par statut, et combien il peut encore en envoyer |
| GET | /candidatures/compteur?offreId=... | nombre de candidatures recues par une offre |
| GET | /candidatures/compteur?entrepriseId=... | nombre de candidatures recues par une entreprise |

Regle : un etudiant ne peut pas avoir plus de 5 candidatures EN_ATTENTE en meme temps
(constante `MAX_EN_ATTENTE` dans `controller/CandidatureController.js`).
