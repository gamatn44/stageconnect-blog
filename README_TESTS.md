# Guide d'installation et de Test (Port 3004)

## 1. Installation & Démarrage
1. Remplacer les fichiers dans ton dossier `project4Das-T1-main`.
2. Exécuter :
   ```bash
   npm install
   npm start
   ```
3. Tu peux aussi importer `StageConnect_Postman_Collection.json` directement dans Postman !

## 2. Scénarios POST puis GET pour vérifier l'affichage

### A. Métier Recommandation Automatique (>= 70%)
1. **POST** `http://localhost:3004/api/matchings`
```json
{
  "etudiant": {
    "id": "etu_chaima",
    "typeStage": "PFE",
    "competences": ["Node.js", "MongoDB", "Express"],
    "isBoosted": true
  },
  "offre": {
    "id": "off_pfe_2026",
    "typeStageObligatoire": "PFE",
    "competencesRequises": ["Node.js", "MongoDB", "Express", "Docker"],
    "isUrgent": false
  }
}
```
2. **GET** `http://localhost:3004/api/recommendations?source=ALGORITHME_MATCHING` -> Affiche la recommandation créée automatiquement (`score: 95%`).

### B. Métier Scraping LinkedIn + Anti-Doublon
1. **POST** `http://localhost:3004/api/recommendations/scrape-linkedin`
```json
{
  "etudiantId": "etu_chaima",
  "domainKeyword": "Stage Node.js",
  "location": "Tunisie"
}
```
2. **GET** `http://localhost:3004/api/recommendations?source=LINKEDIN_SCRAPING` -> Affiche les 5 offres scrapées.
3. Relancer le même **POST** -> Retourne `"count": 0` (Anti-Doublon validé).

### C. Métier Parrainage Étudiant
1. **POST** `http://localhost:3004/api/recommendations/parrainage`
```json
{
  "parrainId": "etu_chaima",
  "etudiantCibleId": "etu_sarra",
  "offreId": "off_pfe_esprit",
  "commentaire": "Offre PFE top pour toi !",
  "isUrgente": true
}
```
2. **GET** `http://localhost:3004/api/recommendations?source=PARRAINAGE_ETUDIANT` -> Affiche le parrainage enregistré.

### D. CRUD Standard (Ajouter -> Afficher -> Modifier -> Supprimer)
1. **POST** `http://localhost:3004/api/recommendations`
```json
{
  "etudiantCibleId": "etu_chaima",
  "offreId": "off_web_2026",
  "commentaire": "Recommandation manuelle",
  "isUrgente": false
}
```
2. **GET** `http://localhost:3004/api/recommendations` -> Récupérer l'`_id`.
3. **PUT** `http://localhost:3004/api/recommendations/<ID>` -> `{"statut": "VUE"}`.
4. **DELETE** `http://localhost:3004/api/recommendations/<ID>` -> Suppression confirmée.
