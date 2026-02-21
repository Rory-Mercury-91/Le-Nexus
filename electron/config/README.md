# Configuration et Secrets

Ce dossier contient les fichiers de configuration de l'application.

## Fichiers

### `constants.js`
Contient toutes les constantes de l'application (ports, URLs, etc.).
Ce fichier est versionné dans Git.

### `secrets.js` ⚠️
**Fichier NON versionné** contenant les clés API et secrets.
- Ce fichier est dans `.gitignore` et ne doit **jamais** être commité dans Git
- Il est créé automatiquement lors du build GitHub Actions depuis les secrets GitHub
- Pour le développement local, créer ce fichier manuellement ou utiliser les variables d'environnement

### `secrets.js.example`
Template pour créer votre fichier `secrets.js` local.
Ce fichier est versionné et ne contient pas de vraies clés.

## Configuration pour le Développement Local

### Option 1 : Fichier secrets.js (Recommandé)
```bash
# Copier le template
cp electron/config/secrets.js.example electron/config/secrets.js

# Éditer et ajouter vos clés API
# ⚠️ Ne jamais commiter ce fichier !
```

### Option 2 : Variables d'environnement
```bash
export GOOGLE_SHEETS_API_KEY="votre_clé"
export MAL_CLIENT_ID="votre_client_id"
```

## Secrets Requis

### Google Sheets API Key
- **Utilisation** : Synchronisation des traductions depuis Google Sheets
- **Comment obtenir** : [Google Cloud Console](https://console.cloud.google.com/)
- **Variable d'environnement** : `GOOGLE_SHEETS_API_KEY`

### MyAnimeList Client ID
- **Utilisation** : Authentification OAuth avec MyAnimeList
- **Comment obtenir** : [MyAnimeList API](https://myanimelist.net/apiconfig)
- **Variable d'environnement** : `MAL_CLIENT_ID`

## Sécurité

⚠️ **IMPORTANT** : Ne jamais commiter de clés API dans Git !

- Toujours utiliser `secrets.js` (non versionné) ou des variables d'environnement
- Le fichier `secrets.js` est automatiquement ignoré par Git (`.gitignore`)
- Pour la production, les secrets sont injectés via GitHub Actions
- Régénérer vos clés si elles ont été exposées accidentellement

## Build Production

Lors du build via GitHub Actions, le fichier `secrets.js` est généré automatiquement depuis les GitHub Secrets :
- `GOOGLE_SHEETS_API_KEY` → secrets GitHub
- `MAL_CLIENT_ID` → secrets GitHub

Aucune clé n'est hardcodée dans le code source.
