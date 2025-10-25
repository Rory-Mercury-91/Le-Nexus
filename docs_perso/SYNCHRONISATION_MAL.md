# 🔄 Synchronisation MyAnimeList

## 📖 Vue d'ensemble

La synchronisation MyAnimeList permet de **synchroniser automatiquement** votre progression de lecture (mangas/chapitres) et de visionnage (animes/épisodes) depuis votre compte MyAnimeList vers votre application locale.

### ✅ Cas d'usage principal
Si vous utilisez des applications mobiles comme **Mihon**, **Tachiyomi**, **AniList** ou d'autres qui synchronisent avec MyAnimeList, cette fonctionnalité mettra à jour automatiquement votre progression dans Ma Mangathèque.

---

## 🚀 Guide d'utilisation

### 1️⃣ Première connexion

1. Allez dans **Paramètres** > **Synchronisation MyAnimeList**
2. Cliquez sur **"Connecter mon compte MyAnimeList"**
3. Votre navigateur s'ouvre sur MyAnimeList
4. Connectez-vous si ce n'est pas déjà fait
5. Cliquez sur **"Autoriser"** pour donner l'accès à l'application
6. Revenez à l'application → vous êtes connecté ! ✅

### 2️⃣ Configuration

#### Synchronisation manuelle
- Cliquez sur **"Synchroniser maintenant"** pour déclencher une synchronisation immédiate
- Affiche le nombre d'éléments mis à jour

#### Synchronisation automatique
- Activez la case **"Synchronisation automatique"**
- Choisissez la fréquence :
  - Toutes les heures
  - Toutes les 3 heures
  - Toutes les 6 heures (recommandé)
  - Toutes les 12 heures
  - Une fois par jour

### 3️⃣ Workflow typique

```
Mobile (Mihon/Tachiyomi)
  → Lire des chapitres
  → Sync avec MyAnimeList
  ↓
MyAnimeList (nuage)
  ↓
Ma Mangathèque (app Windows)
  → Sync automatique toutes les 6h
  → Progression mise à jour ! ✅
```

---

## 🔐 Sécurité & Confidentialité

### OAuth 2.0 PKCE
- **Aucun mot de passe stocké** : Seul un jeton d'accès sécurisé est conservé
- **Révocable** : Vous pouvez révoquer l'accès depuis MyAnimeList à tout moment
- **Chiffrement** : Les tokens sont stockés de manière sécurisée dans electron-store

### Permissions demandées
- ✅ Lecture de votre liste de mangas
- ✅ Lecture de votre liste d'animes
- ❌ Aucune permission d'écriture (l'app ne modifie PAS votre liste MAL)

---

## 📊 Fonctionnement technique

### Logique de synchronisation

#### Pour les mangas
1. Récupère votre liste de mangas depuis MAL
2. Cherche les séries correspondantes dans votre DB locale (via MAL ID dans description/URL)
3. Si `chapitres_lus` sur MAL **> `chapitres_lus` local** → met à jour
4. Sinon → skip (priorité au local)

#### Pour les animes
1. Récupère votre liste d'animes depuis MAL
2. Cherche les animes dans votre DB locale (via `mal_id`)
3. Si `episodes_watched` sur MAL **> épisodes locaux** → marque les épisodes manquants comme vus
4. Sinon → skip (priorité au local)

### Rate Limiting
- **Pause de 500ms** entre chaque requête API
- Respecte les limites de MyAnimeList (pas de ban)

### Scheduler automatique
- Utilise `node-cron` pour exécuter la synchronisation en arrière-plan
- **Sync au démarrage** : Si la dernière sync date de plus de X heures, déclenche une sync
- **Logs détaillés** : Console pour suivi des opérations

---

## 🛠️ Dépannage

### ❌ "Erreur de connexion"
- Vérifiez votre connexion Internet
- Assurez-vous que MyAnimeList est accessible
- Réessayez après quelques minutes

### ❌ "Aucun élément mis à jour"
- Vérifiez que vos séries/animes ont bien un MAL ID associé
- Assurez-vous que votre progression sur MAL est bien à jour
- Les séries doivent être dans votre DB locale pour être synchronisées

### ❌ "Token expiré"
- Déconnectez-vous et reconnectez-vous
- Le refresh token se renouvelle automatiquement normalement

### 🔍 Logs de debug
- Ouvrez la console de développement (`F12`)
- Cherchez les logs préfixés par `🔄`, `✅`, ou `❌`
- Vérifiez les messages d'erreur détaillés

---

## 📝 Limitations actuelles

### Mangas
- ⚠️ **Mapping MAL ID** : Les mangas doivent avoir leur URL MAL dans la description ou un champ dédié
- 💡 **Solution future** : Ajouter un champ `mal_id` dédié dans la table `series`

### Animes
- ✅ Mapping direct via `mal_id` (déjà implémenté)
- ✅ Fonctionnement optimal

### Synchronisation bidirectionnelle
- 🔴 **Non supportée** : L'app ne peut PAS envoyer votre progression locale vers MAL
- 🔵 **Direction unique** : MAL → App (lecture seule)

---

## 🔮 Améliorations futures

### Court terme
- [ ] Ajouter un champ `mal_id` dédié pour les mangas
- [ ] Afficher les statistiques de sync dans le Dashboard
- [ ] Notifications toast lors des syncs automatiques

### Moyen terme
- [ ] Synchronisation bidirectionnelle (App → MAL)
- [ ] Support d'autres plateformes (AniList, Kitsu, MangaDex)
- [ ] Résolution de conflits intelligente

### Long terme
- [ ] Synchronisation en temps réel via WebSockets
- [ ] Import automatique de séries depuis MAL
- [ ] Suggestions basées sur votre liste MAL

---

## 🤝 Contribution

Si vous rencontrez des bugs ou avez des suggestions d'amélioration, n'hésitez pas à :
- Ouvrir une issue sur GitHub
- Proposer une Pull Request
- Contacter le développeur

---

**Bonne synchronisation ! 📚✨**

