# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.8-Fix1] - 2026-01-05

### 🐛 Corrigé
- **Import JSON jeux adultes** : Correction de l'erreur `no such column: type_trad_fr` lors de l'import JSON
  - La fonction `updateGameTranslationsOnly` utilisait le mauvais nom de colonne `type_trad_fr` au lieu de `type_traduction`
  - L'erreur se produisait uniquement lors de l'import de jeux via JSON (LC Extractor / F95 Extractor)

## [1.0.8] - 2025-01-04

### Ajouté
- **Système de synchronisation global** : Tous les schedulers (MAL, AniList, Nautiljon, Traductions) sont maintenant connectés au système global de synchronisation
- **Scheduler de traductions** : Connexion du scheduler des traductions de jeux adultes au système global tout en conservant l'option manuelle
- **Vérification au démarrage** : Tous les schedulers vérifient maintenant si le délai est dépassé avant de lancer une synchronisation au démarrage
- **Avertissements de connexion** : Les toggles de synchronisation automatique affichent maintenant un message d'avertissement si l'utilisateur tente de les activer sans être connecté au service

### Corrigé
- **Import manquant** : Correction de l'erreur `startAniListScheduler is not defined` dans `electron/main.js`
- **Synchronisation au démarrage** : Correction des appels dupliqués et incohérents aux fonctions `syncOnStartup`
- **Protection des Promises** : Ajout de `Promise.resolve()` pour éviter les erreurs `Cannot read properties of undefined (reading 'catch')`
- **Handlers IPC** : Ajout des handlers manquants pour la gestion des intervalles de synchronisation des traductions
- **Vérifications de sécurité** : Ajout de vérifications pour les fonctions IPC non disponibles dans les hooks frontend

### Amélioré
- **UX des toggles** : Les toggles de synchronisation automatique ne sont plus désactivés, ils affichent un message explicatif à la place
- **Compatibilité** : Le scheduler des traductions accepte maintenant les intervalles numériques (1, 3, 6, 12, 24) en plus du format string
- **Gestion des erreurs** : Meilleure gestion des erreurs de synchronisation au démarrage avec messages plus clairs

## [1.0.7-Fix4] - 2026-01-04

### 🔧 Amélioré
- **Simplification du système d'enrichissement**
  - Suppression des modales de configuration d'enrichissement (AnimeEnrichmentConfigModal, MangaEnrichmentConfigModal)
  - Tous les champs sont maintenant enrichis par défaut automatiquement
  - Les options configurables sont désormais directement accessibles dans la section MyAnimeList :
    - Activation/désactivation de l'enrichissement (anime et manga)
    - Source des images (AniList HD ou MyAnimeList) - AniList par défaut
    - Traduction automatique (uniquement dans la section Groq API)
  - Nettoyage du code : suppression de tous les fichiers et références aux modales d'enrichissement
  - Suppression de la sélection individuelle des champs à enrichir pour simplifier l'interface

- **Réorganisation des paramètres d'enrichissement**
  - Déplacement de l'option "Source des images" depuis la page TMDB vers la section MyAnimeList
  - Toggle "Traduction automatique" uniquement dans la section Groq API (suppression de la duplication)
  - Options d'enrichissement regroupées sur une seule ligne dans MyAnimeList pour une meilleure cohérence visuelle

- **Support imageSource pour les mangas**
  - Ajout de l'option `imageSource` dans la configuration d'enrichissement des mangas
  - Les mangas peuvent maintenant utiliser AniList ou MyAnimeList pour les images de couverture
  - Mise à jour de `fetchAniListCover` pour supporter les mangas (type MANGA)

### 🗑️ Supprimé
- Modales de configuration d'enrichissement (AnimeEnrichmentConfigModal, MangaEnrichmentConfigModal, EnrichmentConfigModal)
- Helpers de configuration d'enrichissement (enrichment-config-helpers.ts)
- Sélection individuelle des champs à enrichir
- Option "Source des images" depuis la page TMDB (déplacée vers MyAnimeList)
- Toggle "Traduction automatique" depuis la section MyAnimeList (uniquement dans Groq API)

## [1.0.7-Fix3] - 2026-01-04

### 🐛 Corrigé
- **Fusion incorrecte lors de l'import MIHON avec titres alternatifs**
  - Correction du matching pour empêcher les fusions automatiques basées uniquement sur des titres alternatifs
  - Les matches sur titres alternatifs (priorité 5) ne sont plus considérés comme des matches exacts
  - Seuls les matches sur titres principaux (romaji, natif, anglais, titre principal) déclenchent une fusion automatique
  - Correction appliquée dans `findExistingSerieUnified` et `findExistingAnimeUnified`

- **Protection contre les fusions avec MAL_ID différents**
  - Ajout d'une vérification critique : deux entrées avec des MAL_ID différents ne seront jamais fusionnées
  - La vérification s'applique même si les titres correspondent exactement
  - Empêche les fusions incorrectes de séries différentes ayant le même titre mais des œuvres différentes
  - Correction appliquée dans :
    - `mihon-import-handlers.js` (import batch Mihon)
    - `manga-import-service.js` (imports depuis Nautiljon/autres sources)
  - Les matches avec MAL_ID différents sont loggés et une nouvelle entrée est créée à la place

## [1.0.7-Fix2] - 2026-01-04

### ✨ Ajouté
- **Champ "lien de traduction" dans la modale d'édition des jeux adultes**
  - Ajout du champ "Lien de traduction" dans la section "Traduction" de la modale d'édition
  - Le champ est maintenant visible et modifiable pour tous les jeux adultes
  - Le lien est récupéré depuis la base de données et peut être mis à jour manuellement
  - Support du champ `lien_traduction` dans le handler backend `update-adulte-game-game`

- **Support de la modification de la description pour les jeux RAWG**
  - Ajout du support du champ `rawg_description` dans le handler backend `update-adulte-game-game`
  - La description des jeux RAWG peut maintenant être modifiée et traduite dans la modale d'édition
  - La description modifiée par l'utilisateur est affichée en priorité sur la description de l'API RAWG

### 🐛 Corrigé
- **Recherche de traductions pour les jeux LewdCorner**
  - Correction de la fonction `searchTranslationForGame` pour prendre en compte `Lewdcorner_thread_id` et `lien_lewdcorner`
  - Correction de `syncTraductionsForExistingGames` pour rechercher les jeux LewdCorner dans le Google Sheet
  - Les jeux avec uniquement un ID LewdCorner (sans `f95_thread_id`) sont maintenant correctement trouvés dans le Google Sheet
  - La recherche utilise maintenant `Lewdcorner_thread_id` ou extrait l'ID depuis `lien_lewdcorner` en priorité pour les jeux LewdCorner

- **Affichage de la description modifiée pour les jeux RAWG**
  - Correction de l'affichage de la description dans la page détails des jeux RAWG
  - La description modifiée par l'utilisateur (`rawg_description`) est maintenant affichée en priorité sur la description de l'API RAWG
  - La description traduite ou modifiée manuellement apparaît correctement après enregistrement

- **Calcul de progression des jeux adultes dans le tableau de bord**
  - Correction de la logique de calcul de progression pour utiliser la même logique que la collection
  - Les jeux sont maintenant comptés comme "joués" uniquement si le statut est "En cours", "Terminé" ou "Abandonné"
  - La progression affichée dans le tableau de bord correspond maintenant à celle de la collection
  - Correction appliquée aux jeux adultes et aux jeux RAWG

- **Erreurs ERR_NAME_NOT_RESOLVED lors du scraping F95Zone**
  - Ajout du blocage des domaines publicitaires connus (adglare.net, doubleclick.net, etc.) dans le handler de scraping
  - Les requêtes publicitaires sont maintenant bloquées avant leur chargement, évitant les erreurs DNS
  - Amélioration de la gestion des erreurs pour ignorer les erreurs des sous-frames (publicités, analytics)
  - Les messages d'erreur pour les publicités bloquées (ERR_BLOCKED_BY_CLIENT) sont normaux et indiquent que le blocage fonctionne correctement

## [1.0.7-Fix] - 2026-01-04

### 🐛 Corrigé
- **Script Tampermonkey pour LewdCorner**
  - Correction de l'extraction des données pour la nouvelle architecture du site LewdCorner
  - Extraction de l'ID depuis l'URL (format `/threads/nom.669416/`) au lieu du JSON-LD
  - Amélioration de l'extraction du nom du jeu avec nettoyage des préfixes (KN, DAZ, etc.)
  - Ajout de l'extraction du développeur depuis les crochets du titre
  - Méthodes de fallback multiples pour une meilleure robustesse (JSON-LD, titre de page, URL, titre HTML)
  - Version du script mise à jour de 2.0.4 à 2.0.7

- **Affichage du sélecteur de statut utilisateur dans la page détails des jeux adultes**
  - Le sélecteur de statut s'affiche maintenant même si aucun statut n'a été défini auparavant
  - Correction de la condition d'affichage pour permettre la modification du statut dès l'ouverture de la page détails

- **Réinitialisation de la recherche dans la modal de sélection d'exécutables**
  - Lors de l'effacement du champ de recherche, la sélection du jeu et les résultats sont maintenant complètement réinitialisés
  - Possibilité de recommencer une nouvelle recherche proprement après avoir effacé le texte
  - Correction du problème où les résultats de recherche précédents restaient affichés après l'effacement

- **Filtre "jeux masqués" dans la collection de jeux adultes**
  - Correction de la logique du filtre pour afficher UNIQUEMENT les jeux masqués quand le filtre est activé
  - Auparavant, le filtre affichait tous les jeux (masqués et non masqués) quand activé
  - Maintenant, quand le filtre est activé, seuls les jeux masqués sont affichés (comportement cohérent avec les autres collections)

- **Filtre "jeux non à jour" dans la collection de jeux adultes**
  - Les jeux avec "version intégrée" sont maintenant exclus du filtre "jeux non à jour"
  - Les traductions intégrées sont considérées comme étant à jour par défaut et n'apparaissent plus dans les jeux non à jour

## [1.0.7] - 2026-01-03

### ✨ Ajouté
- **Migration vers UUID pour la gestion de la possession**
  - Ajout de la colonne `user_uuid` dans toutes les tables de propriétaires :
    - `manga_manga_tomes_proprietaires`
    - `book_proprietaires`
    - `subscription_proprietaires`
    - `one_time_purchase_proprietaires`
    - `adulte_game_proprietaires`
  - Migration automatique des UUIDs existants pour les données déjà présentes
  - Utilisation des UUIDs pour une meilleure cohérence lors de la synchronisation cloud
  - Fonction helper `getUserUuidById()` ajoutée pour récupérer l'UUID d'un utilisateur par son ID

### 🔧 Amélioré
- **Barre de progression globale déplacée dans la sidebar**
  - La barre de progression globale a été déplacée du haut de la page principale vers la sidebar
  - Nouveau composant `GlobalProgressSidebar` créé pour remplacer `GlobalProgressFooter`
  - Affichage en bas de la sidebar avec un header collapsible
  - Chevron inversé (haut quand réduit, bas quand étendu) pour mieux refléter la position en bas de la sidebar
  - Boutons pause/reprendre/arrêter déplacés dans le header de la section pour une meilleure accessibilité
  - Suppression du padding de compensation dans la zone de contenu principal
  - Nettoyage des headers de pages de détails : suppression de `useGlobalProgress` et des calculs de `progressHeaderHeight` (MangaHeader, AdulteGameHeader, DetailPageHeader)

- **Fusion de données améliorée**
  - Priorité des données Nautiljon : les données avec `source_donnees='nautiljon'` ou `'mal+nautiljon'` ont désormais priorité sur toutes les autres sources lors de la fusion
  - Recherche améliorée de séries existantes : utilisation de `titre_alternatif` et `titre_original` en plus du titre principal pour détecter les doublons
  - Utilisation de la fonction de normalisation existante (`normalizeTitle`) pour une meilleure correspondance des titres
  - Division automatique des titres par `/` ou `|` pour comparer toutes les variantes
  - Détection plus précise des séries lors de la fusion, évitant la création de doublons

### 🔧 Technique
- **Handlers mis à jour pour utiliser `user_uuid`**
  - Tous les handlers de possession/utilisateur utilisent maintenant `user_uuid` au lieu de `user_id` uniquement :
    - Handlers de tomes (`toggle-tome-possede`, `posseder-tous-les-tomes`, `serie-mark-as-owned`, `create-tome`, `update-tome`)
    - Handlers de livres (`books-add-proprietaire`, `books-remove-proprietaire`, `books-mark-as-owned`, `books-create`)
    - Handlers d'abonnements (`subscriptions-create`, `subscriptions-update`)
    - Handlers d'achats ponctuels (`one-time-purchases-create`, `one-time-purchases-update`)
    - Handlers de jeux adultes (`adulte-game-mark-as-owned`)
    - Services d'import (`tomes-import-service`)
    - Services de fusion (`merge-service`)
  - Les suppressions utilisent maintenant `user_uuid` pour une meilleure précision
  - Les insertions incluent toujours `user_uuid` en plus de `user_id`

### 🔧 Amélioré
- **Refactorisation de la page des paramètres**
  - Réorganisation de la section "Intégrations" avec des sous-onglets pour chaque service (MyAnimeList, AniList, TMDb, Groq, RAWG, Jeux adultes, Nautiljon, Mihon, Tampermonkey)
  - Création d'une nouvelle section "Synchronisation" dans l'onglet "Données" pour centraliser tous les paramètres de synchronisation automatique
  - Déplacement de la "Fréquence de Synchronisation Globale" dans la section "Synchronisation" pour éviter la répétition
  - Regroupement de tous les schedulers de synchronisation (MyAnimeList, AniList, Nautiljon) dans une seule section dédiée
  - Refactorisation de la section "Scripts Tampermonkey" avec un layout plus propre et organisé
    - Suppression des cartes imbriquées pour une interface plus claire
    - Section "Installation guidée" avec titre, description fusionnée et bouton d'accès
    - Présentation des trois catégories (Lectures, Animes, Jeux adultes) en grille de cartes distinctes
  - Uniformisation des couleurs des cartes principales dans toute la fenêtre des paramètres
    - Utilisation de `var(--surface)` et `var(--card-shadow)` pour toutes les cartes principales
    - Correction appliquée aux sections MyAnimeList, AniList, TMDb, Groq, RAWG, Jeux adultes
  - Ajout des boutons "Guide" sur toutes les sections d'intégration (MyAnimeList, AniList, TMDb, Groq, RAWG)
    - Accès cohérent aux guides d'installation pour tous les services
    - Style uniforme pour tous les boutons de guide

### 🐛 Corrigé
- **Détection des doublons lors de la fusion**
  - Correction de la recherche de séries existantes pour utiliser aussi `titre_alternatif` et `titre_original`
  - Les séries avec des titres alternatifs ou originaux similaires sont maintenant correctement détectées comme étant la même entrée
  - Exemple : "2.5-Jigen no Yuuwaku / 2.5-Jigen no Yūwaku" et "2.5-jigen no Ririsa / 2.5次元の誘惑" sont maintenant correctement associées

- **Correction de `ReferenceError: users is not defined` dans `MangaTomesList.tsx`**
  - Ajout des props `users` et `profileImages` dans la destructuration des props du composant `MangaTomesList`
  - Résolution de l'erreur de référence causée par l'utilisation de `users` sans l'avoir déstructuré des props

### 🧹 Nettoyage
- **Suppression du code inutilisé**
  - Suppression du composant `NestedSection` et de son interface `NestedSectionProps` (remplacés par les sous-onglets)
  - Suppression des constantes et styles liés aux sections imbriquées (`nestedSectionIds`, `nestedHeaderStyle`, `nestedContainerStyle`, `nestedBodyStyle`)
  - Suppression des fonctions `getNestedSectionState` et `toggleNestedSection` non utilisées
  - Retrait des props `sectionStates` et `onSectionStateChange` de `IntegrationsSettings` (devenues obsolètes)
  - Suppression des commandes npm obsolètes `clean:electron-builder` et `clear-cache` du package.json (conservation uniquement de `clean:all`)

### 🔧 Amélioré
- **Synchronisation cloud des couvertures**
  - Ajout de logs détaillés pour le diagnostic de l'upload des couvertures
  - Comptage et affichage du nombre de fichiers non trouvés localement
  - Meilleure gestion des erreurs avec messages explicites
  - Logs indiquant le nombre de chemins trouvés dans la base de données et le nombre de fichiers uploadés/non trouvés

- **Statut de synchronisation cloud**
  - Ajout du handler `get-cloud-sync-history` pour récupérer l'historique de synchronisation
  - Implémentation de `loadLastSync()` dans le composant `CloudSyncSettings`
  - Le statut "Dernière sync" se met maintenant à jour correctement après chaque synchronisation
  - Affichage de la date de dernière synchronisation dans l'interface utilisateur

### 🐛 Corrigé
- **Erreur SQL dans l'extraction des chemins de couverture**
  - Correction de l'erreur `no such column: ""` dans `extractCoverPathsFromDatabase`
  - Remplacement de `!= ""` par `LENGTH(column) > 0` dans toutes les requêtes SQL pour une compatibilité correcte avec SQLite
  - Correction appliquée à toutes les tables (manga_series, manga_tomes, anime_series, movies, tv_shows, adulte_game_games, books)

- **Synchronisation cloud des couvertures**
  - Correction de la double déclaration de `performCloudSyncInternalRef` dans `cloud-sync-handlers.js`
  - Le scheduler de synchronisation cloud est maintenant correctement initialisé au démarrage et lors de la sauvegarde de la configuration
  - Les couvertures sont maintenant correctement synchronisées lors des synchronisations manuelles et automatiques

## [1.0.6] - 2026-01-02

### 🐛 Corrigé
- **Affichage des liens LewdCorner sur les pages détails de jeux adultes**
  - Les liens des threads LewdCorner s'affichent maintenant correctement sur la page détail
  - Correction de la condition d'affichage dans `AdulteGameInfoCard` pour inclure `lien_lewdcorner` et `Lewdcorner_thread_id`
  - Les liens LewdCorner sont désormais visibles sur la page de détail, au même titre que les liens F95Zone

- **Filtres de traduction dans la collection de jeux adultes**
  - Correction complète de la logique de filtrage basée sur `version_traduite`
  - **Jeux traduits** : affiche les jeux avec `version_traduite` contenant un numéro de version (ex: "v1.0")
  - **Traduction intégrée** : affiche les jeux avec `version_traduite` contenant "intégré" (insensible à la casse)
  - **Jeux non traduits** : affiche les jeux sans `version_traduite` (null ou vide)
  - Les trois options de filtre fonctionnent désormais correctement selon la valeur de `version_traduite`

## [1.0.5-Fix2] - 2025-12-06

### 🐛 Corrigé
- **Suppression de vidéos indépendante du contrôle du chemin d'accès**
  - La suppression des vidéos fonctionne maintenant même si le fichier a été déplacé ou n'existe plus
  - Correction appliquée aux films, séries et épisodes de séries
  - La suppression de l'entrée en base de données se fait toujours, même si le fichier physique est introuvable
  - Message d'avertissement loggé si le fichier est introuvable, sans bloquer la suppression

- **Correction de la suppression de vidéos (films et séries)**
  - Correction de la signature de `deleteVideoApi` pour accepter correctement les deux paramètres (itemId, videoId)
  - Support des IDs de vidéos stockés comme strings dans le JSON
  - Conversion automatique des IDs en string pour correspondre au format stocké en base
  - Correction appliquée aux films, séries et épisodes de séries

- **Correction du transcodage FFmpeg pour fichiers MKV**
  - Correction du mapping des streams : utilisation de `-map 0:0` au lieu de `-map 0:v` pour éviter de transcoder les images JPEG intégrées
  - Ajout de `-max_muxing_queue_size 1024` pour limiter la taille de la queue et éviter l'erreur "Too many packets buffered"
  - Ajout de `-fflags +genpts` pour générer les timestamps si manquants
  - Le transcodage fonctionne maintenant correctement même pour les fichiers MKV avec images intégrées

- **Gestion des clics sur les boutons de suppression de vidéos**
  - Correction de la propagation des événements pour empêcher le déclenchement de la lecture lors du clic sur la poubelle
  - Ajout de protections supplémentaires (`stopImmediatePropagation`, `onMouseDown`, `onPointerDown`)
  - Positionnement absolu du bouton de suppression pour éviter les conflits avec le bouton de lecture

### 🔧 Amélioré
- **Masquage des champs API TMDb**
  - Ajout du masquage et de l'icône d'œil pour les champs "TMDb API Key (v3)" et "Jeton d'accès lecture (v4)"
  - Cohérence avec les autres champs sensibles de l'application (Groq, MAL, AniList)
  - Les champs sont maintenant masqués par défaut avec possibilité de les afficher via l'icône d'œil

- **Interface des paramètres RAWG**
  - Déplacement de l'information "La clé API RAWG permet d'enrichir..." dans un tooltip (icône d'information)
  - Suppression du paragraphe redondant avec le lien "Obtenir une clé API RAWG" (déjà présent dans le guide)
  - Remplacement du message de succès long par un message court "Connexion RAWG validée" affiché sur la même ligne que le label
  - Suppression de l'encadré de succès, seul l'encadré d'erreur reste affiché en cas d'échec

- **Interface des paramètres d'intégrations**
  - Suppression de l'information redondante "Dernière sync : ..." sous le bouton de synchronisation AniList
  - Uniformisation du design du bouton "Synchroniser maintenant" avec les autres boutons de l'interface
  - Déplacement des informations détaillées de synchronisation (date, nombre d'animes/lectures) dans les encadrés de connexion pour MAL et AniList
  - Suppression de l'encadré séparé qui affichait ces informations de manière redondante

- **Affichage des cartes de jeux RAWG**
  - Masquage des informations de version (Version actuelle, Version traduite, Dernière version jouée) pour les jeux RAWG
  - Seul le titre du jeu est affiché pour les jeux venant de RAWG, cohérent avec le fait que les jeux vidéo n'ont pas de versions comme les jeux adultes

- **Bouton de traduction dans les modales d'édition**
  - Ajout du bouton "Traduire en français" pour les champs synopsis/description/background dans toutes les modales d'édition
  - Support dans les modales : Films, Séries, Épisodes, Livres, Jeux RAWG
  - Utilisation du hook `useTranslation` pour une traduction cohérente via l'API Groq
  - Le bouton est désactivé si le texte fait moins de 10 caractères
  - Affichage d'un loader pendant la traduction avec message "Traduction en cours..."

- **Ajout rapide de jeux RAWG depuis la barre de recherche**
  - Détection automatique des URLs RAWG (`rawg.io/games/...`) et des IDs numériques dans la barre de recherche
  - Support des slugs RAWG (ex: `rawg.io/games/grand-theft-auto-v`) et des IDs numériques
  - Bouton "Ajouter depuis RAWG" qui apparaît automatiquement si aucun résultat n'est trouvé mais qu'un ID/URL RAWG est détecté
  - Fonctionnement identique à l'ajout rapide F95Zone pour une expérience utilisateur cohérente
  - La recherche textuelle inclut maintenant les IDs RAWG pour trouver les jeux existants

- **Bouton d'aide dans toutes les pages de collection**
  - Ajout du bouton d'aide (icône "?") dans la barre de recherche de toutes les pages de collection
  - Modale d'aide complète avec explications détaillées pour : Vidéos (Tout), Lectures (toutes les pages)
  - Configuration spécifique pour chaque type de collection (Animes, Mangas, Films, Séries, Livres, Jeux)
  - Les pages de jeux avaient déjà le bouton d'aide, maintenant toutes les pages en bénéficient

- **Guide d'aide pour les jeux**
  - Mise à jour du guide d'aide pour inclure les informations sur l'ajout rapide RAWG
  - Exemples de recherche mis à jour avec des URLs RAWG
  - Description améliorée expliquant la détection automatique des IDs/URLs
  - Configuration spécifique pour les jeux vidéo RAWG avec filtres adaptés

## [1.0.5-Fix] - 2025-12-05

### ✨ Ajouté
- **Suppression multiple dans les collections**
  - Nouvelle fonctionnalité de suppression multiple pour les animes, mangas, livres et jeux
  - Bouton "Supprimer" dans le header de chaque collection pour activer le mode sélection
  - Cases à cocher affichées sur chaque élément en mode sélection (positionnées à gauche du menu trois points)
  - Boutons "Tout sélectionner" / "Tout désélectionner" pour faciliter la sélection
  - Compteur d'éléments sélectionnés affiché dans le header
  - Confirmation avant suppression avec liste des éléments à supprimer
  - Respect des filtres actifs : seuls les éléments visibles peuvent être sélectionnés
  - Gestion des erreurs avec messages appropriés en cas d'échec partiel
  - Rechargement automatique de la collection après suppression
  - Support pour toutes les vues : grille, liste et images uniquement
  - Hook réutilisable `useMultiDelete` pour faciliter l'intégration dans d'autres collections

### 🐛 Corrigé
- **Affichage du logo en production**
  - Correction du problème d'affichage du logo Nexus en production Electron
  - Utilisation de la fonction `getAssetPath` pour gérer correctement les chemins selon l'environnement
  - Le logo s'affiche maintenant correctement en production avec le protocole `file://`

- **Navigation après suppression**
  - Correction de l'écran blanc lors de la suppression d'un anime en production
  - Remplacement de `window.location.href` par `navigate()` de React Router
  - Navigation fluide sans rechargement complet de la page
  - Compatible avec le système de routage HashRouter utilisé en production Electron

### 🔧 Amélioré
- **Interface utilisateur**
  - Positionnement des cases à cocher optimisé : placées à gauche du menu trois points plutôt qu'en haut à gauche
  - Meilleure visibilité et accessibilité des contrôles de sélection
  - Interface de confirmation de suppression améliorée avec affichage des titres des éléments

## [1.0.5] - 2025-12-03

### 🎬 Refonte complète de la section Vidéos

#### Architecture modulaire et DRY
- **Restructuration complète des pages Vidéos**
  - Nouvelle organisation modulaire dans `src/pages/Videos/` avec sous-dossiers `common/` pour les composants partagés
  - Séparation claire par type de contenu : pages dédiées pour chaque sous-type d'anime (TV, ONA, OVA, Films animé, Spécial, Non classé)
  - Création d'une page "Tout" (`All.tsx`) qui regroupe tous les types de vidéos (animes, films, séries)
  - Application stricte du principe DRY : réduction de ~6000 lignes de code dupliqué à ~1100 lignes partagées
  - Architecture en composants configurables : `AnimeCollectionPage` réutilisable pour toutes les pages d'animes

- **Composants communs créés**
  - `AnimeCollectionPage.tsx` : composant principal réutilisable avec configuration personnalisable par page
  - `AnimeCollectionPageConfig` : interface de configuration permettant de personnaliser chaque page (titre, icône, type, messages vides, etc.)
  - Utilitaires communs dans `common/utils/` :
    - `video-helpers.ts` : fonctions de normalisation et helpers partagés
    - `video-types.ts` : types TypeScript unifiés pour tous les types de vidéos
    - `constants.ts` : constantes et validateurs centralisés (options de tri, statuts, etc.)
    - `anime-page-config.ts` : configuration des pages d'animes
  - Système de filtres unifié dans `VideoCollectionFilters` intégrant genres, thèmes, labels et statuts

- **Pages créées et refactorisées**
  - `TV.tsx`, `ONA.tsx`, `OVA.tsx`, `MovieAnime.tsx`, `Special.tsx`, `Unclassified.tsx` : pages dédiées pour chaque type d'anime (~16 lignes chacune, simple wrapper de configuration)
  - `Movies.tsx` : page Films refactorisée avec filtres dynamiques
  - `Series.tsx` : page Séries refactorisée avec filtres dynamiques
  - `All.tsx` : nouvelle page regroupant tous les types de vidéos avec système de filtres unifié

#### Réorganisation des modales
- **Centralisation des modales vidéos**
  - Déplacement de toutes les modales vidéos dans `src/components/modals/videos/`
  - `AddVideoTypeModal.tsx` : nouvelle modale principale permettant de choisir le type de vidéo à ajouter (Anime, Série, Film)
  - `AddAnimeModal.tsx`, `AddSeriesModal.tsx`, `AddMovieModal.tsx` : modales déplacées et réorganisées
  - Suppression des anciennes modales obsolètes (`src/components/modals/anime/AddAnimeModal.tsx`, etc.)
  - Intégration du bouton "+ Ajouter une Vidéo" dans la page "Tout" avec ouverture de la modale de sélection

#### Améliorations fonctionnelles
- **Support AniList ID pour les animes**
  - Import direct par AniList ID ou URL en plus de MAL ID
  - Détection automatique des URLs AniList dans la barre de recherche
  - Enrichissement symétrique : import par MAL ID enrichit avec AniList, import par AniList ID enrichit avec Jikan (si informations disponibles)
  - Handler backend `handleAddAnimeByAnilistId` créé avec logique complète de matching unifié
  - Support dans `AddMalItemModal` et `mal-modal-helpers.ts` pour la recherche et l'import

- **Filtres dynamiques intelligents**
  - Les filtres par genres et thèmes n'affichent que les options présentes dans les items actuellement filtrés
  - Les filtres ne montrent plus toutes les options de la base de données, mais uniquement celles pertinentes pour la page courante
  - Extraction dynamique des genres/thèmes/labels disponibles depuis les données chargées
  - Application sur toutes les pages (Animes, Films, Séries, Tout)

- **Lazy loading amélioré des images**
  - Pré-chargement des images 2 lignes au-dessus et en dessous de la zone visible
  - `rootMargin` de l'IntersectionObserver augmenté de `50px` à `1000px 0px`
  - Réduction des images blanches lors du scroll rapide
  - Expérience utilisateur plus fluide avec chargement anticipé

- **Gestion de la visibilité consolidée**
  - Nouvelle option `showVideos` dans les préférences de contenu pour masquer/afficher toute la section Vidéos
  - Remplacement des toggles séparés "Animes", "Films", "Séries" par un seul toggle "Vidéos"
  - Migration automatique : les anciennes préférences (`showAnimes`, `showMovies`, `showSeries`) sont automatiquement converties en `showVideos`
  - Synchronisation bidirectionnelle pour maintenir la compatibilité
  - Mise à jour de l'onboarding et des paramètres avec interface simplifiée

#### Améliorations techniques
- **Normalisation et nettoyage**
  - Normalisation du `media_type` pour les mangas synchronisés depuis AniList avec détection intelligente (Manhua/Manhwa/Manga)
  - Nettoyage HTML amélioré : suppression complète des balises HTML (`<br>`, etc.) et décodage des entités HTML dans les synopsis
  - Détection des caractères chinois/japonais/coréens pour mieux identifier le type de média
  - Fonction `cleanHtmlText()` robuste appliquée lors de la transformation et l'enrichissement AniList

- **Suppression du code obsolète**
  - Suppression des anciennes pages redondantes : `src/pages/Animes/Animes.tsx`, `src/pages/Movies/Movies.tsx`, `src/pages/Series/Series.tsx`
  - Suppression de `src/pages/Videos/Videos.tsx` (remplacé par `All.tsx`)
  - Suppression des anciennes modales obsolètes
  - Nettoyage des imports et routes non utilisées
  - Redirection automatique de `/videos` vers `/videos/all`

- **Améliorations de la navigation**
  - Structure de menu déroulant dans la sidebar : "Vidéos" avec sous-menus pour chaque type
  - Compteurs dynamiques pour chaque sous-catégorie
  - Navigation cohérente entre les pages avec restauration du scroll
  - **Affichage conditionnel des pages** : les pages vidéos (TV, ONA, OVA, Films animé, Spécial, Non classé, Films, Séries) n'apparaissent dans la sidebar que si elles contiennent au moins une entrée
  - La page "Tout" reste toujours visible pour permettre l'ajout de vidéos même si toutes les collections sont vides

### 🔧 Amélioré
- **Interface utilisateur**
  - Design unifié et cohérent entre toutes les pages de vidéos
  - Intégration visuelle des filtres dans une seule section (fusion de `VideoFiltersPanel` et `VideoCollectionFilters`)
  - Messages d'erreur et vides personnalisés par type de page
  - Bouton de rechargement des données visible dans les en-têtes
  - **Ajout rapide depuis le Dashboard** : le bouton "Ajoute ta première vidéo" dans le Dashboard ouvre directement la modale d'ajout au lieu de rediriger vers la page Vidéos
  - Expérience utilisateur améliorée : pas besoin de quitter le Dashboard pour ajouter une première vidéo

- **Performance**
  - Réduction significative de la duplication de code (de ~6000 à ~1100 lignes)
  - Chargement optimisé des données avec extraction dynamique des filtres
  - Meilleure gestion mémoire avec lazy loading amélioré

### 🐛 Corrigé
- Correction du problème de filtres qui ne s'actualisaient pas correctement (résolu par la nouvelle architecture)
- Correction de la sauvegarde de `media_type` et `type_volume` lors de la synchronisation AniList
- Correction de l'affichage des balises HTML dans les synopsis (nettoyage complet)
- Correction des types TypeScript avec types unifiés `VideoItem`
- Correction des imports et chemins après réorganisation
- **Section Lectures** : Correction du filtrage des "One-shot" : les séries avec `media_type = 'One-shot'` apparaissent maintenant correctement dans la collection "One-shot"
- **Section Lectures** : Correction du comptage "Non classé" : les one-shots ne sont plus comptés dans "Non classé"
- **Section Lectures** : Correction du filtre de sites Mihon : suppression de la logique fallback incorrecte
- **Section Lectures** : Correction des redirections : mise à jour de tous les liens `/collection` vers `/lectures`
- **Section Lectures** : Correction des types TypeScript avec types unifiés `LectureItem` et `ContentType`

### 🧹 Nettoyage
- Suppression de `src/pages/Videos/common/components/VideoFiltersPanel.tsx` (fonctionnalité intégrée dans `VideoCollectionFilters`)
- Suppression de `src/pages/Videos/common/hooks/useVideoCollection.ts` (non utilisé)
- Suppression des anciennes pages de collection redondantes
- Suppression des anciennes modales obsolètes
- Nettoyage des fichiers non utilisés et consolidation du code
- **Section Lectures** : Suppression de `src/pages/Mangas/Mangas.tsx` (1743 lignes obsolètes)
- **Section Lectures** : Suppression de `src/pages/Bd/Bd.tsx`, `src/pages/Comics/Comics.tsx`, `src/pages/Books/Books.tsx`
- **Section Lectures** : Suppression de `src/components/modals/lectures/AddContentTypeModal.tsx`
- **Section Lectures** : Suppression de `src/components/modals/manga/AddSerieModal.tsx`
- **Section Lectures** : Suppression de `src/components/modals/book/AddBookModal.tsx`
- **Section Lectures** : Suppression de `src/components/modals/lectures/AddComicModal.tsx` et `AddBdModal.tsx`
- **Section Lectures** : Suppression des fonctions non utilisées dans `lecture-helpers.ts` et `constants.ts`

### 🎮 Création complète de la page Jeux RAWG

#### Architecture et intégration
- **Nouvelle page de collection Jeux RAWG**
  - Page dédiée `/games/rawg` pour les jeux vidéo depuis l'API RAWG
  - Architecture modulaire partagée avec les jeux adultes : `GameCollectionPage` réutilisable
  - Filtrage intelligent par type de moteur (Unity, Unreal Engine, RenPy, RPGM, etc.)
  - Support des jeux vidéo classiques et jeux adultes dans la même table `adulte_game_games`
  - Distinction visuelle entre jeux RAWG et jeux adultes dans les collections

- **Intégration API RAWG complète**
  - Recherche de jeux par titre ou ID RAWG avec pagination
  - Enrichissement automatique depuis l'API RAWG avec métadonnées complètes
  - Stockage des données RAWG dans la base de données (rawg_id, rawg_rating, rawg_released, rawg_platforms, rawg_description, rawg_website)
  - Support de la clé API RAWG configurable dans les paramètres
  - Handler backend `registerRawgHandlers` avec recherche, import et enrichissement

- **Page de détail complète**
  - Page de détail `/games/rawg/:id` avec toutes les informations du jeu
  - Affichage des métadonnées RAWG : description, notes (rating, metacritic), plateformes, genres, tags
  - Informations développeurs et éditeurs
  - Section boutiques avec liens vers les stores (Steam, Epic Games, GOG, etc.)
  - Exigences système (PC, PlayStation, Xbox, Nintendo Switch, etc.)
  - Captures d'écran et vidéos depuis RAWG
  - Statistiques communautaires (Reddit, Twitch, YouTube, reviews)
  - Liens externes (site officiel, Reddit, etc.)
  - Personnalisation complète de l'affichage avec préférences par section

- **Gestion de la propriété et des coûts**
  - Système de propriétaires multi-utilisateurs avec coûts par propriétaire
  - Section "Coûts par propriétaire" avec calcul automatique du coût divisé
  - Support des plateformes par propriétaire (Steam, Epic, GOG, etc.)
  - Modal de gestion de propriété (`RawgGameOwnershipModal`) pour ajouter/modifier propriétaires et coûts
  - Affichage des coûts dans les statistiques du tableau de bord

- **Fonctionnalités avancées**
  - Labels personnalisés avec couleurs
  - Statut personnel (À jouer, En cours, Terminé, Abandonné, En pause)
  - Favoris et masquage
  - Notes privées
  - Galerie d'images et vidéos utilisateur
  - Lancement direct des jeux depuis l'application (si exécutable configuré)
  - Suivi de la dernière session et version jouée

#### Composants créés
- `Rawg.tsx` : page de collection principale
- `RawgGameDetail.tsx` : page de détail complète avec toutes les sections
- `RawgGameInfoSection.tsx` : section d'informations avec métadonnées RAWG
- `RawgGameCostsSection.tsx` : section des coûts par propriétaire
- `RawgGameBanner.tsx` : bannière du jeu avec image de fond RAWG
- `GameCollectionPage.tsx` : composant réutilisable pour toutes les collections de jeux
- `useRawgGameDetail.tsx` : hook personnalisé pour la gestion de la page de détail

#### Handlers backend
- `rawg-handlers.js` : handlers pour recherche, import et enrichissement RAWG
- `rawg-game-gallery-handlers.js` : gestion de la galerie d'images/vidéos utilisateur
- `rawg-game-video-handlers.js` : gestion des vidéos utilisateur
- Intégration complète avec le système de propriétaires existant

### 💳 Création complète de la page Abonnements

#### Gestion des abonnements récurrents
- **Page principale `/subscriptions`**
  - Interface complète pour gérer les abonnements et achats ponctuels
  - Affichage en grille responsive de 4 tuiles côte à côte (adaptation automatique sur mobile)
  - Statistiques en temps réel : abonnements actifs, coût mensuel, coût annuel, total achats ponctuels
  - Filtres par statut (Actifs, Expirés, Annulés) et recherche par nom
  - Gestion complète CRUD : création, modification, suppression

- **Fonctionnalités des abonnements**
  - Types d'abonnements : Mensuel, Trimestriel, Annuel, Autre
  - Calcul automatique de la prochaine date de paiement selon la fréquence
  - Mise à jour automatique des dates de paiement pour les abonnements actifs
  - Support multi-propriétaires avec division automatique des coûts
  - Gestion des statuts : Actif, Expiré, Annulé
  - Notes optionnelles pour chaque abonnement
  - **Support multi-devises** : EUR, USD, GBP, CHF, CAD, JPY, AUD avec affichage du symbole approprié

- **Gestion des achats ponctuels**
  - Création et gestion d'achats ponctuels avec site d'achat
  - Gestion des sites référencés (création automatique si nouveau site)
  - Support du nombre de crédits pour les achats avec crédits
  - Filtres par site d'achat et recherche par nom
  - Affichage en grille responsive de 4 tuiles côte à côte
  - **Support multi-devises** : même système que les abonnements

- **Tables de base de données créées**
  - `subscriptions` : table principale des abonnements avec colonne `devise`
  - `subscription_proprietaires` : table de liaison pour les propriétaires
  - `one_time_purchases` : table des achats ponctuels avec colonne `devise`
  - `one_time_purchase_proprietaires` : table de liaison pour les propriétaires
  - `purchase_sites` : table des sites d'achat référencés
  - Migration automatique pour ajouter la colonne `devise` aux bases existantes

- **Handlers backend créés**
  - `subscription-handlers.js` : CRUD complet pour les abonnements
  - `purchase-handlers.js` : CRUD complet pour les achats ponctuels
  - Calcul automatique des dates de paiement selon la fréquence
  - Gestion automatique des propriétaires (ajout du currentUserId si aucun propriétaire fourni)
  - Mise à jour automatique des dates de paiement expirées

- **Modales créées**
  - `AddSubscriptionModal.tsx` : création d'abonnement avec sélection de devise
  - `EditSubscriptionModal.tsx` : modification d'abonnement avec gestion de devise
  - `AddPurchaseModal.tsx` : création d'achat ponctuel avec sélection de devise
  - `EditPurchaseModal.tsx` : modification d'achat ponctuel avec gestion de devise
  - Support complet du multi-sélection de propriétaires

- **Intégration dans les statistiques**
  - Calcul des coûts mensuels des abonnements par propriétaire dans `statistics-handlers.js`
  - Conversion automatique des fréquences (trimestriel → mensuel, annuel → mensuel)
  - Calcul des coûts totaux des achats ponctuels par propriétaire
  - Affichage dans le tableau de bord avec section "Coûts par propriétaire"
  - Inclusion dans les totaux généraux du tableau de bord
  - Correction du bug : les abonnements/achats sans propriétaires sont maintenant attribués au premier utilisateur disponible

### 💰 Système de coûts par propriétaire étendu

#### Affichage des coûts dans les pages de détails
- **Section "Coûts par propriétaire" ajoutée dans :**
  - Pages de détails Mangas (`MangaCostsSection.tsx`) : coûts des tomes avec calcul du gain Mihon
  - Pages de détails Livres (`BookCostsSection.tsx`) : coûts des livres par propriétaire
  - Pages de détails Jeux RAWG (`RawgGameCostsSection.tsx`) : coûts des jeux avec plateformes par propriétaire
  - Pages de détails Jeux adultes (`AdulteGameCostsSection.tsx`) : coûts des jeux adultes par propriétaire

- **Fonctionnalités des sections de coûts**
  - Calcul automatique du coût divisé par le nombre de propriétaires
  - Affichage du coût total et du coût par propriétaire avec avatar et nom
  - Support des avatars personnalisés (images ou emoji)
  - Affichage conditionnel : section masquable via préférences d'affichage
  - Design cohérent entre toutes les sections de coûts

#### Intégration dans le tableau de bord
- **Section "Coûts par propriétaire" (`CostsByOwner.tsx`)**
  - Affichage des coûts totaux par utilisateur dans le tableau de bord
  - Détail par type de contenu : Mangas, BD, Comics, Livres, Jeux vidéo, Jeux adultes, Abonnements, Achats ponctuels
  - Carte de total général avec récapitulatif de tous les types
  - Comptage des items par type pour chaque propriétaire
  - Calcul automatique des totaux depuis les statistiques

- **Calculs backend dans `statistics-handlers.js`**
  - Calcul des coûts des mangas par propriétaire (avec division par nombre de propriétaires)
  - Calcul des coûts des BD, Comics et Livres par propriétaire
  - Calcul des coûts des jeux vidéo (RAWG) par propriétaire
  - Calcul des coûts des jeux adultes par propriétaire
  - Calcul des coûts mensuels des abonnements par propriétaire (avec conversion de fréquence)
  - Calcul des coûts totaux des achats ponctuels par propriétaire
  - Gestion des cas sans propriétaires : attribution au premier utilisateur disponible

#### Graphiques et visualisations
- **Graphique de répartition (`RepartitionChart.tsx`)**
  - Affichage des coûts par type de contenu dans un graphique circulaire
  - Support de tous les types : Mangas, BD, Comics, Livres, Jeux vidéo, Jeux adultes, Abonnements, Achats ponctuels
  - Légende interactive avec pourcentages et montants
  - Couleurs distinctes pour chaque type de contenu

### 🔧 Outils de développement

#### Extension de la fonctionnalité de fusion
- **Fusion de deux entrées étendue à toutes les pages**
  - Support de la fusion pour : Lectures (Mangas), Animes, Films, Séries TV, Jeux, **Livres** (nouveau)
  - Exclusion des abonnements comme demandé
  - Configuration complète pour les livres dans `merge-config.js` avec tous les champs pertinents
  - Fonction de transfert des associations pour les livres (`transferBookAssociations`)
  - Transfert automatique des propriétaires et données utilisateur lors de la fusion de livres
  - Interface mise à jour : label "Jeux" au lieu de "Jeux adultes" pour plus de précision

### 📚 Refonte complète de la section Lectures

#### Architecture modulaire et DRY
- **Restructuration complète des pages Lectures**
  - Nouvelle organisation modulaire dans `src/pages/Lectures/` avec sous-dossiers `common/` pour les composants partagés
  - Séparation claire par type de contenu : pages dédiées pour chaque type (Manga, Manhwa, Manhua, Light Novel, Webtoon, One-shot, Comics, BD, Livres, Non classé)
  - Création d'une page "Tout" (`All.tsx`) qui regroupe tous les types de lectures (séries manga + livres)
  - Application stricte du principe DRY : réduction drastique de la duplication de code
  - Architecture en composants configurables : `LectureCollectionPage` réutilisable pour toutes les pages de lectures
  - Alignement de la structure avec la section Vidéos pour cohérence architecturale

- **Composants communs créés**
  - `LectureCollectionPage.tsx` : composant principal réutilisable avec configuration personnalisable par page
  - `LectureCollectionPageConfig` : interface de configuration permettant de personnaliser chaque page (titre, icône, type, messages vides, etc.)
  - `LectureCollectionFilters.tsx` : composant de filtres unifié pour toutes les pages de lectures
  - Utilitaires communs dans `common/utils/` :
    - `lecture-types.ts` : types TypeScript unifiés pour tous les types de lectures
    - `lecture-helpers.ts` : fonctions de normalisation et helpers partagés (détection MAL/AniList, résolution de statut, mapping media_type)
    - `constants.ts` : constantes et validateurs centralisés (options de tri, statuts, types de volumes)
    - `lecture-page-config.ts` : configuration des pages de lectures

- **Pages créées et refactorisées**
  - `All.tsx` : page principale regroupant toutes les lectures (séries + livres)
  - `Manga.tsx`, `Manhwa.tsx`, `Manhua.tsx`, `LightNovel.tsx`, `Webtoon.tsx`, `OneShot.tsx`, `Comics.tsx`, `Bd.tsx`, `Books.tsx`, `Unclassified.tsx` : pages dédiées pour chaque type (~17 lignes chacune, simple wrapper de configuration)
  - Suppression de l'ancienne page monolithique `Mangas.tsx` (1743 lignes) remplacée par la nouvelle architecture modulaire

#### Réorganisation des modales
- **Consolidation des modales d'ajout**
  - Déplacement et consolidation de toutes les modales lectures dans `src/components/modals/lectures/`
  - `AddLectureTypeModal.tsx` : nouvelle modale principale permettant de choisir le type de lecture à ajouter (Manga/Manhwa/Manhua/Light Novel/Webtoon via MAL/AniList OU Livre/Comic/BD via Google Books/Open Library/BnF)
  - `AddMangaModal.tsx` : modale unifiée pour ajouter les séries depuis MAL/AniList (remplace `AddSerieModal.tsx`)
  - `AddBookComicBdModal.tsx` : modale unifiée pour ajouter les livres, comics et BD depuis Google Books, Open Library ou BnF (remplace `AddBookModal.tsx`, `AddComicModal.tsx`, `AddBdModal.tsx`)
    - Restructuration visuelle pour alignement avec la modale d'ajout des mangas : recherche API et formulaire manuel visibles simultanément
    - Suppression du système d'onglets : tout est affiché en même temps avec séparateur "OU" entre recherche et formulaire
    - Pré-remplissage automatique du formulaire (titre, image, année, description, ISBN) quand un résultat API est sélectionné
    - Ajout des champs Description et ISBN 13 au formulaire de création manuelle
    - Disposition optimisée : Année de sortie et ISBN 13 côte à côte pour une meilleure organisation visuelle
    - Deux boutons d'action disponibles : "Importer depuis API" (si résultat sélectionné) et "Créer" (toujours visible pour création manuelle)
    - Navigation automatique vers la page de détail avec ouverture du mode édition après création manuelle
  - Suppression des anciennes modales obsolètes : `AddContentTypeModal.tsx`, `AddSerieModal.tsx`, `AddBookModal.tsx`, `AddComicModal.tsx`, `AddBdModal.tsx`
  - Intégration du bouton "+ Ajouter une lecture" dans la page "Tout" avec ouverture de la modale de sélection
  - Boutons d'ajout dynamiques dans les pages dédiées : "+ Ajouter un Manga", "+ Ajouter un Livre", etc.

#### Améliorations fonctionnelles
- **Support du type "One-shot"**
  - Ajout de la page dédiée `/lectures/one-shot` pour les one-shots
  - Support du type "One-shot" dans le filtrage et le comptage backend
  - Ajout de "One-shot" dans les options de `media_type` du modal d'édition
  - Détection automatique des one-shots dans la normalisation des types de contenu

- **Filtres unifiés et améliorés**
  - Création de `LectureCollectionFilters` : composant de filtres unifié pour toutes les pages
  - Filtres par genres, thèmes et labels avec extraction dynamique depuis les données
  - Filtre par statut de lecture (À lire, En cours, Terminé, etc.)
  - Filtre par statut de publication (En cours, Terminée, Abandonnée)
  - Filtre par type de volume (Broché, Kindle, Webtoon, etc.)
  - Filtre Mihon/Source (Mihon, MAL, AniList, Nautiljon) avec options "Pas sur..."
  - Filtre par site (source_id) conditionnel à la présence d'imports Mihon
  - Suppression du filtre "Tag" redondant avec le filtre "Statut de lecture"
  - Correction du filtre de sites : suppression de la logique fallback incorrecte qui comparait des domaines avec des source_id

- **Navigation améliorée**
  - Clic sur le groupe "Lectures" dans la sidebar navigue directement vers `/lectures` (page Tout)
  - Comportement identique à la section Vidéos pour cohérence
  - Compteurs dynamiques pour chaque sous-catégorie
  - Affichage conditionnel des sous-catégories : n'apparaissent que si elles contiennent au moins une entrée
  - La page "Tout" reste toujours visible pour permettre l'ajout de lectures même si toutes les collections sont vides

#### Gestion de la visibilité consolidée
- **Groupe Lectures comme entité unifiée**
  - Le groupe "Lectures" est géré comme un tout dans les préférences de contenu
  - Option `showMangas` dans les paramètres masque/affiche toute la section Lectures (Manga, Manhwa, Manhua, Comics, BD, Livres, One-shot, Non classé)
  - Synchronisation automatique : `showBooks` suit automatiquement `showMangas` (dans les paramètres, l'onboarding et le backend)
  - Dashboard : comptage unifié de toutes les lectures (séries + livres) pour déterminer si le bouton "Ajoute ta première lecture" doit s'afficher
  - Suppression du bouton séparé "Ajoute ton premier livre" (fusionné dans le bouton principal)

#### Améliorations techniques
- **Nettoyage et consolidation**
  - Suppression de l'ancienne page `Mangas.tsx` (1743 lignes) et redirection de `/collection` vers `/lectures`
  - Suppression des anciennes pages redondantes : `src/pages/Bd/Bd.tsx`, `src/pages/Comics/Comics.tsx`, `src/pages/Books/Books.tsx`
  - Suppression des anciennes modales obsolètes
  - Nettoyage des imports et routes non utilisées
  - Suppression des fonctions non utilisées : `normalizeContentType()`, `isLectureStatusFilter()`
  - Mise à jour de tous les liens de navigation et redirections vers la nouvelle structure

- **Backend**
  - Ajout du comptage "One-shot" dans `handleGetAvailableContentTypes`
  - Exclusion des "One-shot" du comptage "Non classé"
  - Correction de la logique de filtrage pour détecter correctement les one-shots

## [1.0.4-Fix] - 2025-12-01

### 🐛 Corrigé
- **Erreur SQLite `no such column: b.prix_suggere`**
  - Ajout des colonnes `prix_suggere` et `devise` à la table `books` dans le schéma de base de données
  - Migration automatique pour les bases de données existantes
  - Ajout d'une fonction de sécurité `ensureBookColumns` pour garantir la présence des colonnes
- **Incohérence des compteurs entre sidebar et pages de collection**
  - Correction du compteur total dans l'en-tête des pages (affichage du nombre d'items filtrés au lieu du total brut)
  - Exclusion des séries masquées dans les compteurs de la sidebar pour cohérence avec l'affichage
  - Correction de la catégorisation des séries avec `media_type` NULL (comptées comme "Manga" au lieu de "Non classé")
- **Catégorie "Non classé" pour les séries sans media_type**
  - Création d'une nouvelle catégorie "Non classé" pour les séries avec `media_type` NULL ou vide
  - Ajout du lien "Non classé" dans la sidebar sous la section Lectures
  - Support du filtre "Non classé" dans les pages Lectures et Mangas
  - Comptage correct des séries non classées (131 entrées identifiées)

### 🔧 Amélioré
- **Champ `media_type` transformé en select**
  - Remplacement du champ texte par un menu déroulant avec options prédéfinies
  - Options disponibles : Non classé, Manga, Manhwa, Manhua, Light Novel, Novel, Webtoon, Comic, BD
  - Réduction des erreurs de saisie et standardisation des valeurs
  - Interface plus intuitive pour classer les séries non classées

### 🧹 Nettoyage
- **Suppression des modals non utilisés**
  - Suppression de `EditSerieForm.tsx` (remplacé par `EditSerieModal` avec `EditMalItemModal`)
  - Suppression de `ImportAdulteGameJsonModal.tsx` (non utilisé)
  - Suppression de `MalSyncOverlay.tsx` (non utilisé)

## [1.0.4] - 2025-11-30

### ✨ Ajouté
- **Fonction d'aide pour le système de recherche par page**
  - Modal d'aide explicative pour comprendre le fonctionnement du système de recherche par page
  - Accessible depuis toutes les pages de collections (Animes, Mangas, Films, Séries, Jeux Adultes)
  - Explications détaillées sur les fonctionnalités de recherche et de filtrage
- **Intégration Google Books pour BD et Comics**
  - Remplacement de l'API Comic Vine par Google Books pour les comics
  - Recherche unifiée BD et Comics via Google Books API
  - Filtrage automatique par langue (français uniquement) pour les comics
  - Détection intelligente des BD et Comics basée sur les catégories, éditeurs et mots-clés
  - Support des métadonnées complètes (auteurs, éditeurs, ISBN, descriptions)
  - Images de couverture fonctionnelles depuis Google Books
- **Pages dédiées pour BD et Comics**
  - Création de pages de collection dédiées `/bd` et `/comics`
  - Filtrage automatique par type de média (BD, Comic)
  - Interface cohérente avec les autres collections (Mangas, Livres)
  - Modales d'import dédiées avec recherche Google Books intégrée
  - Support complet des statuts de lecture, favoris et masquage
- **Recherche globale étendue**
  - Support de tous les types de contenu dans la recherche globale (Livres, Films, Séries)
  - Navigation directe vers les pages de détails depuis les résultats
  - Groupement des résultats par type avec compteurs
  - Icônes et labels spécifiques pour chaque type de contenu

### 🔧 Amélioré
- **Navigation et organisation des pages Lectures**
  - Regroupement de toutes les pages Lectures en sous-catégorie dans la navigation
  - Menu expandable "Lectures" avec sous-menus pour chaque type (Tout, Manga, Manhwa, Manhua, BD, Comics, Livres)
  - Navigation plus claire et organisée avec hiérarchie visuelle
  - Expansion automatique du menu "Lectures" lorsque l'utilisateur est sur une page de cette section
- **Compteurs d'entrées dans la navigation**
  - Affichage du nombre total d'entrées pour chaque collection dans la navigation
  - Compteur sur "Lectures" (parent) et "Tout" affichant le total de toutes les entrées Lectures
  - Compteurs individuels pour chaque sous-catégorie (Manga, Manhwa, Manhua, BD, Comics, Livres)
  - Compteurs pour les autres collections principales (Animes, Films, Séries, Jeux Adultes)
  - Rechargement automatique des compteurs lors de la navigation
  - Cohérence visuelle avec affichage entre parenthèses pour toutes les collections
- **Modales d'import BD et Comics**
  - Design harmonisé avec le reste de l'application
  - Affichage structuré des résultats (couverture, titre, auteurs, éditeur, année)
  - Indication visuelle des items déjà dans la collection
  - Badge indiquant la source (BnF ou Google Books) pour les BD
  - Gestion améliorée des descriptions HTML avec nettoyage et troncature
  - Feedback utilisateur amélioré avec messages d'erreur explicites
- **Gestion de la visibilité des contenus**
  - Consolidation de la visibilité "Lectures" : un seul toggle masque/affiche toute la section (Mangas, Manhua, Manhwa, BD, Comics, Livres)
  - Suppression du toggle séparé pour les Livres
  - Synchronisation automatique de `showBooks` avec `showMangas`
  - Cohérence dans l'onboarding et les paramètres

### 🐛 Corrigé
- Corrections multiples d'erreurs TypeScript dans les composants React
- Correction de la syntaxe JavaScript dans le serveur d'import (accolade manquante)
- Correction des types pour les composants de cartes (BookCard, etc.)
- Harmonisation des types SearchResult dans la recherche globale
- Correction des handlers d'import BD et Comics (gestion correcte des retours de création)
- Correction de l'affichage des images de couverture (conversion null → undefined)

### 🔄 Migration de base de données
- Migration automatique pour les colonnes `source_id` et `source_donnees` dans la table `manga_series`
- Nécessaire pour le support des BD et Comics (stockage des identifiants BNF et Google Books)
- Migration appliquée automatiquement au démarrage pour toutes les bases de données existantes

## [1.0.3] - 2025-11-29

### ✨ Ajouté
- **Scanner d'exécutables pour les jeux adultes**
  - Scan récursif d'un dossier pour détecter tous les fichiers .exe
  - Interface modale avec deux colonnes : exécutables trouvés et attribution au jeu
  - Recherche de jeux dans la base de données avec barre de recherche
  - Attribution en masse avec actions "Remplacer" ou "Ajouter"
  - Gestion des conflits lorsque plusieurs exécutables pointent vers le même jeu
  - Label personnalisé pour chaque exécutable (modifiable avant attribution)
  - Affichage du label personnalisé dans le dropdown de lancement du jeu (au lieu de "Version scanned-...")
  - Détection et affichage des doublons d'exécutables

### 🔧 Amélioré
- **Système de pagination amélioré**
  - Remontée automatique en haut de la liste lors du changement de page manuel
  - Préservation de la restauration du scroll lors du retour depuis une page de détails
  - Effacement automatique de la position de scroll sauvegardée lors des changements de page
  - Ajout de la pagination en haut de la page Animes (cohérence avec les autres collections)

## [1.0.2] - 2025-11-27

### ✨ Ajouté
- **Traduction automatique des genres et thèmes**
  - Traduction automatique de tous les genres et thèmes de l'anglais vers le français
  - Support de 179 traductions de genres et 54 traductions de thèmes
  - Gestion des variantes d'écriture (majuscules, espaces, tirets)
  - Déduplication automatique des genres et thèmes après traduction
  - Traduction appliquée dans les pages de détails des Animes et Mangas
  - Traduction des genres et thèmes dans les filtres de recherche des collections Animes et Mangas
  - Les valeurs originales (anglais) sont conservées en base de données pour la recherche, seul l'affichage est traduit
- **Traduction automatique des tags jeux adultes**
  - Dictionnaire complet de 95 traductions de tags jeux adultes
  - Support de toutes les catégories : graphismes, types de jeux, personnages, thèmes, actes sexuels
  - Traduction des tags dans les filtres de recherche de la collection Jeux Adultes
  - Traduction des tags dans les pages de détails des jeux adultes
  - Les valeurs originales (anglais) sont conservées en base de données pour la recherche, seul l'affichage est traduit
- **Traduction automatique des démographies**
  - Normalisation et traduction des démographies (Shounen → Shōnen, Shoujo → Shōjo, etc.)
  - Support de toutes les variantes d'écriture (avec/sans accent, majuscules/minuscules)
  - Traduction appliquée dans les pages de détails des Animes et Mangas

### 🐛 Corrigé
- **Erreur `isFieldUserModified is not defined` dans la synchronisation MAL**
  - Ajout de l'import manquant de `isFieldUserModified` dans `mal-sync-core.js`
  - Correction des erreurs lors de la synchronisation des mangas depuis MAL
- **Erreur `getPathManager is not defined` dans le scheduler de traductions**
  - Ajout du paramètre `getPathManager` manquant dans `adulte-game-traduction-scheduler.js`
  - Mise à jour de l'appel dans les handlers pour passer correctement le paramètre
- **Erreur SQLite dans `checkAnimeUpdates` du scheduler de notifications**
  - Correction de la requête SQL utilisant des tables inexistantes (`anime_episodes_vus`, `anime_statut_utilisateur`)
  - Remplacement par l'utilisation correcte de `anime_user_data` et du champ `episodes_vus`
  - Correction de la valeur de statut (`'watching'` → `'En cours'`)
- **Exclusion automatique des équipes de scanlation des genres et thèmes**
  - Exclusion automatique des noms d'équipes de scanlation dans les filtres de genres et thèmes
  - Filtrage appliqué pour les Animes et les Mangas (genres et thèmes)
  - Exclusion basée sur une liste complète de 200+ équipes de scanlation
  - Comparaison insensible à la casse, aux accents et aux espaces
  - Exclusion effectuée avant et après traduction pour garantir la propreté des listes
  - Exclusion également des ratings (Content rating: Suggestive, etc.) qui peuvent être stockés par erreur dans les genres

## [1.0.1] - 2025-11-26

### ✨ Ajouté
- **Système de filtres par genres et thèmes pour toutes les collections**
  - Filtres par genres et thèmes pour les Mangas (depuis Nautiljon, MAL)
  - Filtres par genres et thèmes pour les Animes (depuis MAL, Nautiljon)
  - Filtres par genres pour les Films et Séries TV (depuis TMDB)
  - Interface de sélection unifiée avec boutons toggle pour chaque genre/thème
  - Filtrage côté backend avec recherche dans les données (texte pour mangas/animes, JSON pour films/séries)
  - Compteur de genres/thèmes sélectionnés dans l'interface
  - Persistance des filtres sélectionnés en session
  - Intégration complète avec le système de filtres existant (recherche, statut, favoris, etc.)

### 🔧 Amélioré
- **Système de rapports unifié pour tous les imports, synchronisations et enrichissements**
  - Format standardisé basé sur le rapport Mihon
  - Sections détaillées : créés, mis à jour, ignorés, erreurs, matchs, correspondances potentielles
  - Rapport unique même pour les opérations multi-étapes (ex: Google Sheet + Scraping)
  - Rapports précis pour : Import Mihon, Sync MAL, Sync Nautiljon, Enrichissement, Jeux adultes
- **Gestion des titres alternatifs améliorée**
  - Fusion automatique intelligente des titres depuis différentes sources (Mihon, MAL, Nautiljon)
  - Déduplication avancée avec normalisation Unicode pour éviter les doublons
  - Conservation automatique de l'ancien titre principal dans les titres alternatifs lors d'un changement
  - Support correct des caractères asiatiques (japonais, coréen, chinois) dans la normalisation
  - Affichage séparé des titres romaji et anglais dans les pages de détails des mangas
- **Normalisation des données**
  - Normalisation des tags (genres et thèmes) depuis Nautiljon : séparateur " - " remplacé par ", " pour une meilleure cohérence
  - Normalisation appliquée également aux animes importés depuis Nautiljon

### 🐛 Corrigé
- Priorité des données Nautiljon : les données Nautiljon prévalent désormais sur MAL, Mihon et l'enrichissement automatique
- Correction du handler "posseder-tous-les-tomes" pour marquer tous les tomes comme possédés
- Mise à jour du lien de traduction pour les jeux adultes depuis Google Sheets
- Respect des champs modifiés par l'utilisateur pour les jeux adultes (titre, version, statut, etc.)

## [1.0.0] - 2025-11-26

### ✨ Ajouté
- **Gestion complète des Mangas**
  - Suivi détaillé des séries avec volumes et chapitres
  - Import automatique depuis Nautiljon via script Tampermonkey
  - Support de 9 types de volumes (Broché, Collector, Coffret, Kindle, Webtoon, etc.)
  - Gestion multi-propriétaires avec calcul automatique des coûts
  - Masquage de séries (conserve les données pour les autres utilisateurs)
  - Recherche et filtres avancés
  - Filtres avancés avec select multi-options : Tout, Mihon, Pas sur Mihon, My Anime List, Pas sur MyAnimeList, Nautiljon, Pas sur Nautiljon
  - Filtres combinés pour afficher plusieurs sources simultanément

- **Système de labels personnalisés pour Mangas et Animes**
  - Création et gestion de labels personnalisés avec couleurs
  - Labels partagés entre tous les éléments d'une même collection
  - Filtrage par labels dans les collections Mangas et Animes
  - Affichage des labels dans les pages de détails
  - Labels intégrés sous la section "Mon statut" pour les animes
  - Labels intégrés à droite de la section "Relations" pour les mangas

- **Gestion complète des Animes**
  - Architecture MyAnimeList pure avec import XML et synchronisation OAuth
  - Gestion complète des épisodes (TV, Movie, OVA, ONA, Special)
  - Progression de visionnage avec timestamps précis
  - 28 champs enrichis (titres multiples, genres, thèmes, studios, etc.)
  - Traduction automatique des synopsis via Groq AI
  - Liens de streaming depuis AniList
  - Amélioration de l'affichage des liens de streaming
    - Affichage uniquement de l'icône SVG pour les plateformes reconnues (Netflix, Crunchyroll, Disney+, etc.)
    - Icônes agrandies (48x48px) et directement cliquables
    - Affichage texte + icône pour les plateformes sans icône SVG
    - Section "Où regarder" intégrée dans la colonne de couverture

- **Gestion des Jeux Adultes**
  - Scraping automatique F95Zone et LewdCorner
  - Recherche par ID avec extraction complète (titre, version, statut, moteur, tags)
  - Authentification OAuth intégrée pour F95Zone & LewdCorner
  - Vérification automatique des mises à jour
  - Import JSON depuis scripts Tampermonkey (F95 Extractor, LC Extractor)
  - Données utilisateur-spécifiques (chemin exécutable, notes privées, statut personnel)
  - Lancement direct des jeux depuis l'application
  - Protection des images locales lors des mises à jour

- **Gestion des Films et Séries TV**
  - Import depuis TMDb avec métadonnées complètes
  - Gestion des saisons et épisodes pour les séries
  - Suivi de visionnage personnalisé
  - Distribution, genres, et informations détaillées

- **Système Multi-utilisateurs**
  - Onboarding guidé au premier lancement
  - Gestion dynamique des utilisateurs depuis les Paramètres
  - Profils personnalisés avec avatar (image ou emoji) et couleur
  - Données de lecture individuelles par utilisateur
  - Partage de l'achat avec calcul automatique des coûts

- **Fonctionnalités Avancées**
  - Synchronisation automatique avec MyAnimeList (OAuth)
  - Enrichissement automatique des données (Jikan API, AniList)
  - Propagation logique bidirectionnelle des relations entre entrées
  - Système de fusion avancé pour les entrées dupliquées
  - Thèmes clair/sombre
  - Personnalisation complète de l'affichage des fiches
  - Export des données en JSON
  - Sauvegarde automatique de la base de données
  - Scripts Tampermonkey pour l'import depuis Nautiljon, MyAnimeList, F95Zone

- **Interface Utilisateur**
  - Design moderne et responsive
  - Recherche globale avec raccourci clavier (Ctrl+K)
  - Tableaux de bord avec statistiques détaillées
  - Navigation intuitive entre les différentes sections
  - Modales de configuration et d'édition avancées

### 🔧 Amélioré
- Interface des pages de détails mieux organisée
- Optimisation de l'espace dans la colonne de couverture
- Meilleure intégration visuelle des sections personnalisables

### 🔧 Technique
- Architecture Electron + React + TypeScript
- Base de données SQLite avec migrations automatiques
- Système de logging backend vers frontend
- Gestion des erreurs avec ErrorBoundary
- Protection du contenu sensible (jeux adultes) avec mot de passe
- Support des chemins personnalisés pour la base de données (cloud sync)
- Optimisation des performances avec lazy loading et pagination

### 📝 Documentation
- README complet avec guide d'installation
- Documentation des scripts Tampermonkey
- Guide de configuration Discord pour les notifications de release

---

[1.0.7-Fix]: https://github.com/Rory-Mercury-91/Le-Nexus/releases/tag/v1.0.7-Fix
[1.0.7]: https://github.com/Rory-Mercury-91/Le-Nexus/releases/tag/v1.0.7
[1.0.6]: https://github.com/Rory-Mercury-91/Le-Nexus/releases/tag/v1.0.6
[1.0.5-Fix2]: https://github.com/Rory-Mercury-91/Le-Nexus/releases/tag/v1.0.5-Fix2
[1.0.5-Fix]: https://github.com/Rory-Mercury-91/Le-Nexus/releases/tag/v1.0.5-Fix
[1.0.5]: https://github.com/Rory-Mercury-91/Le-Nexus/releases/tag/v1.0.5
[1.0.4]: https://github.com/Rory-Mercury-91/le-nexus/releases/tag/v1.0.4
[1.0.3]: https://github.com/Rory-Mercury-91/le-nexus/releases/tag/v1.0.3
[1.0.2]: https://github.com/Rory-Mercury-91/le-nexus/releases/tag/v1.0.2
[1.0.1]: https://github.com/Rory-Mercury-91/le-nexus/releases/tag/v1.0.1
[1.0.0]: https://github.com/Rory-Mercury-91/le-nexus/releases/tag/v1.0.0
