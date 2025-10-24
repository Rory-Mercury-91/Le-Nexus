# 🔧 Guide de dépannage

Ce guide répertorie les problèmes courants et leurs solutions.

---

## 🐛 Problèmes courants

### 1. Erreur `dragEvent is not defined`

**Symptôme :**
```
ReferenceError: dragEvent is not defined
```

**Cause :**  
Cache Electron contenant une ancienne version du code compilé.

**Solution :**
```bash
npm run clear-cache
npm start
```

**OU manuellement (Windows) :**
```powershell
Remove-Item -Path "$env:APPDATA\ma-mangatheque" -Recurse -Force
```

**OU manuellement (macOS) :**
```bash
rm -rf ~/Library/Application\ Support/ma-mangatheque
```

**OU manuellement (Linux) :**
```bash
rm -rf ~/.config/ma-mangatheque
```

---

### 2. Erreur "0" mystérieux affiché

**Symptôme :**  
Un "0" s'affiche de manière inattendue dans l'interface.

**Cause :**  
Erreur JavaScript en arrière-plan (souvent liée au cache).

**Solution :**
1. Ouvrir la console développeur : `Ctrl+Shift+I` (Windows/Linux) ou `Cmd+Option+I` (macOS)
2. Regarder les erreurs dans l'onglet Console
3. Si erreur de cache → `npm run clear-cache`
4. Relancer l'application

---

### 3. Base de données corrompue

**Symptôme :**  
Erreurs SQL, données manquantes ou incohérentes.

**Solution :**
```bash
# Supprimer l'ancienne base (SAUVEGARDEZ D'ABORD !)
# Chemin : C:\Users\[VotreNom]\Proton Drive\[...]\manga.db

# Relancer l'application (nouvelle base créée automatiquement)
npm start
```

---

### 4. Import XML très lent

**Symptôme :**  
Import prend plus de 30 minutes pour 300+ animes.

**Cause :**  
Ancienne version sans parallélisation.

**Solution :**
```bash
# Mettre à jour vers la dernière version
git pull origin main
npm install
npm start

# Performance attendue : ~20-26 animes/min (au lieu de 11-12)
```

---

### 5. Covers d'anime ne s'affichent pas

**Symptôme :**  
Images manquantes, icône TV à la place.

**Causes possibles :**
- **Pas de connexion Internet** : AniList API nécessite Internet
- **Rate limit API** : Trop de requêtes trop vite
- **Anime récent** : Cover pas encore disponible sur AniList

**Solution :**
1. Vérifier la connexion Internet
2. Attendre 1-2 minutes entre les imports massifs
3. Éditer l'anime manuellement pour ajouter une cover locale

---

### 6. Traductions manquantes

**Symptôme :**  
Genres/thèmes en anglais au lieu du français.

**Cause :**  
Ancienne version sans dictionnaire de traductions.

**Solution :**
```bash
# Mettre à jour
git pull origin main
npm start

# Fichier de traductions : src/utils/translations.ts
# Pour ajouter une traduction manquante, éditer ce fichier
```

---

### 7. Warnings de sécurité Electron

**Symptôme :**
```
Electron Security Warning (Insecure Content-Security-Policy)
```

**Cause :**  
Warning normal en mode développement.

**Solution :**  
✅ **Ignorer en développement** - Disparaît dans la version packagée (`npm run build:win`)

---

### 8. Deprecated warnings Node.js

**Symptôme :**
```
[DEP0060] DeprecationWarning
The CJS build of Vite's Node API is deprecated
```

**Solution :**  
Ces warnings sont filtrés automatiquement par `scripts/start-vite-quiet.js`.  
Si vous les voyez encore, vérifiez que vous utilisez bien `npm start` (pas `vite` directement).

---

### 9. Données enrichies manquantes après édition

**Symptôme :**  
Modifier un anime → perte de themes, demographics, etc.

**Cause :**  
Handler `update-anime` obsolète.

**Solution :**
```bash
# Mettre à jour
git pull origin main
npm start

# Les 28 champs enrichis sont maintenant supportés
```

---

### 10. Application ne démarre pas

**Symptôme :**  
Écran blanc ou crash au démarrage.

**Solutions à essayer dans l'ordre :**

1. **Vider le cache**
```bash
npm run clear-cache
npm start
```

2. **Réinstaller les dépendances**
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

3. **Vérifier la base de données**
```bash
# Renommer l'ancienne base pour test
# Relancer l'application (nouvelle base créée)
npm start
```

4. **Vérifier les logs**
```bash
# Les logs Electron s'affichent dans le terminal
# Chercher les erreurs marquées [1] ou ERROR
```

---

## 🛠️ Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm start` | Démarrer l'application |
| `npm run clear-cache` | Vider le cache Electron |
| `npm run build` | Compiler pour production |
| `npm run build:win` | Créer l'installateur Windows |

---

## 📝 Debug avancé

### Activer les DevTools au démarrage

Éditer `electron/main.js` :
```javascript
mainWindow.webContents.openDevTools(); // Décommenter cette ligne
```

### Voir les requêtes API

1. Ouvrir DevTools (`Ctrl+Shift+I`)
2. Onglet **Network**
3. Filtrer par `jikan.moe` ou `graphql.anilist.co`
4. Vérifier les codes de réponse (200 = OK, 429 = Rate limit, 404 = Not found)

### Inspecter la base de données

Utiliser DB Browser for SQLite :
1. Télécharger : https://sqlitebrowser.org/
2. Ouvrir : `C:\Users\[VotreNom]\Proton Drive\[...]\manga.db`
3. Onglet "Browse Data" pour voir les tables

---

## 🆘 Problème non résolu ?

Si aucune solution ne fonctionne :

1. **Vérifier les logs** dans le terminal
2. **Copier l'erreur complète**
3. **Noter les étapes pour reproduire**
4. **Créer un issue GitHub** avec ces informations

---

**Dernière mise à jour** : Octobre 2024

