# 🔑 Comment obtenir votre Client ID MyAnimeList

## ⚠️ Important

Le Client ID fourni par défaut (`c1f6aa24be1077253e08321e39488a08`) est un placeholder qui ne fonctionne pas. Vous devez **créer votre propre application** sur MyAnimeList pour obtenir un Client ID valide.

---

## 📋 Étapes pour créer votre application MAL

### 1️⃣ Se connecter à MyAnimeList
- Allez sur https://myanimelist.net
- Connectez-vous avec votre compte

### 2️⃣ Accéder à la section API
- Allez sur https://myanimelist.net/apiconfig
- Ou depuis votre profil : **Settings** → **API** (dans le menu de gauche)

### 3️⃣ Créer une nouvelle application
Cliquez sur **"Create ID"** et remplissez le formulaire :

#### Informations requises :
- **App Name** : `Ma Mangathèque` (ou le nom que vous voulez)
- **App Type** : `other`
- **App Description** : `Application Windows pour gérer ma collection de mangas et animes`
- **App Redirect URL** : `http://localhost:8888/callback` ⚠️ **IMPORTANT : ne pas changer !**
- **Homepage URL** : `http://localhost:8888` (ou votre repo GitHub si vous en avez un)
- **Commercial / Non-Commercial** : `non-commercial`

#### Cochez :
- ✅ Je ne commercialise pas cette application
- ✅ J'accepte les conditions d'utilisation de l'API

### 4️⃣ Récupérer votre Client ID
Une fois créé, MyAnimeList vous affichera :
- ✅ **Client ID** : Une chaîne de caractères (ex: `a1b2c3d4e5f6g7h8i9j0`)
- ✅ **Client Secret** : Une autre chaîne (vous n'en aurez PAS besoin pour OAuth PKCE)

**⚠️ IMPORTANT** : Copiez votre **Client ID** et gardez-le en sécurité.

---

## 🔧 Configurer votre Client ID dans l'application

### Option 1 : Via l'interface (RECOMMANDÉ - À VENIR)
Une interface sera ajoutée dans les Paramètres pour saisir votre Client ID.

### Option 2 : Modifier le code directement
1. Ouvrez le fichier : `electron/apis/myanimelist-oauth.js`
2. Cherchez la ligne :
   ```javascript
   const MAL_CLIENT_ID = 'c1f6aa24be1077253e08321e39488a08';
   ```
3. Remplacez par votre Client ID :
   ```javascript
   const MAL_CLIENT_ID = 'VOTRE_CLIENT_ID_ICI';
   ```
4. Sauvegardez le fichier
5. Redémarrez l'application

---

## ✅ Tester la connexion

1. Redémarrez l'application
2. Allez dans **Paramètres** > **Synchronisation MyAnimeList**
3. Cliquez sur **"Connecter mon compte MyAnimeList"**
4. Vous devriez maintenant voir la page d'autorisation correcte (plus d'erreur 401)
5. Cliquez sur **"Autoriser"**
6. Vous êtes connecté ! ✅

---

## 🐛 Dépannage

### Erreur 401 persiste
**Solutions** :
- Vérifiez que le Client ID est correct
- Vérifiez que la Redirect URL est exactement `http://localhost:8888/callback`
- Essayez en navigation privée pour éviter les conflits de cookies

### "App not found"
- Vérifiez que l'application est bien créée sur https://myanimelist.net/apiconfig
- Assurez-vous d'être connecté avec le bon compte MAL

### Port 8888 déjà utilisé
- Fermez tous les programmes qui pourraient utiliser le port 8888
- Redémarrez l'application

---

## 📝 Notes importantes

### Client Secret
Vous n'avez **PAS besoin** du Client Secret pour OAuth PKCE. Seul le Client ID est nécessaire.

### Sécurité
- ✅ Le Client ID est **public** (pas de problème s'il est dans le code)
- ✅ Pas de mot de passe stocké (OAuth PKCE est très sécurisé)
- ✅ Vous pouvez révoquer l'accès depuis MyAnimeList à tout moment

### Redirect URL
Ne changez **JAMAIS** la Redirect URL une fois configurée. Elle doit être **exactement** :
```
http://localhost:8888/callback
```

---

**Bonne configuration ! 🚀**

