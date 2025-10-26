# ðŸ“‹ TODO LIST & CHANGELOG - Le Nexus

**Version actuelle** : 3.0.0  
**Date** : 26 octobre 2025  
**Application** : Le Nexus (anciennement Ma MangathÃ¨que)

---

## ðŸ“š Ã€ PROPOS

**Le Nexus** est une application de gestion complÃ¨te pour vos collections multimÃ©dias :
- ðŸ“š **Mangas** : SÃ©ries, tomes, progression de lecture
- ðŸŽ¬ **Animes** : SÃ©ries, Ã©pisodes, films, OVA avec architecture MyAnimeList pure
- ðŸŽ® **AVN** (Adult Visual Novels) : Jeux F95Zone/LewdCorner avec scraping automatique

### CaractÃ©ristiques principales

âœ… **Multi-utilisateurs** avec avatars et couleurs personnalisÃ©es  
âœ… **Base de donnÃ©es SQLite locale** avec support cloud (Proton Drive, OneDrive, Google Drive)  
âœ… **Synchronisation MyAnimeList** : OAuth 2.0 + sync auto pÃ©riodique  
âœ… **Traduction IA** : Groq AI pour synopsis anglais â†’ franÃ§ais  
âœ… **Import automatique** : Scripts Tampermonkey pour 6 sources  
âœ… **Scraping F95Zone/LewdCorner** : Extraction automatique donnÃ©es AVN  
âœ… **Interface moderne** : Dark/Light mode, 4 vues (grille, liste, carrousel 3D, prÃ©sentation)  
âœ… **Statistiques avancÃ©es** : Graphiques Recharts avec Ã©volution temporelle  
âœ… **Performance optimisÃ©e** : Import 26 animes/min, anti-gel UI, rate limiting intelligent

---

## ðŸ“œ CHANGELOG

### ðŸš€ VERSION 3.0.0 - INTÃ‰GRATION LEWDCORNER & REFONTE AVN (26 octobre 2025)

#### âœ¨ NouveautÃ©s majeures

**1. ðŸŒ Authentification LewdCorner**
- **SystÃ¨me OAuth personnalisÃ©** : FenÃªtre de connexion dÃ©diÃ©e avec session partagÃ©e
- **Gestion cookies automatique** : Intercepteur webRequest pour injection cookies
- **VÃ©rification session** : Check automatique au dÃ©marrage des paramÃ¨tres
- **UI intÃ©grÃ©e** : Section complÃ¨te dans ParamÃ¨tres AVN
  - Badge statut connexion (âœ… ConnectÃ© / âš ï¸ Non connectÃ©)
  - Boutons Se connecter / Se dÃ©connecter
  - Section aide "Pourquoi me connecter ?"
- **Affichage images LewdCorner** : Fix complet du 403 Forbidden
- **Reload automatique** : Rechargement fenÃªtre principale aprÃ¨s connexion

**2. ðŸ”„ VÃ©rification MAJ LewdCorner**
- **Support complet LewdCorner** : VÃ©rif MAJ pour jeux LewdCorner si connectÃ©
- **DÃ©tection session automatique** : Check cookies au dÃ©but du processus
- **Exclusion intelligente** : Jeux LewdCorner ignorÃ©s si non connectÃ©
- **URL dynamique** : F95Zone (95zone.to) ou LewdCorner (lewdcorner.com)
- **DÃ©lai adaptÃ©** : 1s pour LewdCorner, 500ms pour F95Zone
- **Message erreur explicite** : "Vous devez Ãªtre connectÃ©" si 403

**3. ðŸ–¼ï¸ Protection images locales**
- **DÃ©tection chemin local** : Ne pas Ã©craser les images dÃ©jÃ  tÃ©lÃ©chargÃ©es
- **Conservation automatique** : Images locales prÃ©servÃ©es lors des MAJ
- **Log explicite** : "Image locale conservÃ©e (non Ã©crasÃ©e)"
- **Formulaire Ã©dition amÃ©liorÃ©** : Accepte chemins locaux (type=text)
- **Extension automatique** : DÃ©tection magic bytes + ajout extension (.png, .jpg, .webp, .avif)

**4. ðŸ“¥ Import JSON AVN**
- **Modal ImportAvnJsonModal** : Interface dÃ©diÃ©e pour import JSON
- **Support LC Extractor** : Format JSON depuis script Tampermonkey LewdCorner
- **Support F95 Extractor** : Format JSON depuis script Tampermonkey F95Zone
- **TÃ©lÃ©chargement images local** : Tentative download avec fallback URL
- **CrÃ©ation/MAJ automatique** : DÃ©tection doublon par 95_thread_id ou titre
- **Instructions intÃ©grÃ©es** : Lien vers installation script dans modal

**5. ðŸ‘¤ DonnÃ©es AVN utilisateur-spÃ©cifiques**
- **Table vn_user_games** : SÃ©pare donnÃ©es globales vs user-specific
- **Champs utilisateur** :
  - chemin_executable : Chemin .exe du jeu (par utilisateur)
  - 
otes_privees : Notes personnelles privÃ©es
  - statut_perso : Statut personnel (Ã€ jouer, En cours, ComplÃ©tÃ©, AbandonnÃ©)
  - derniere_session : Date derniÃ¨re session de jeu
- **Queries jointes** : JOIN automatique pour rÃ©cupÃ©rer donnÃ©es user
- **Handlers sÃ©parÃ©s** : Update global vs update user-specific

**6. ðŸ  PrÃ©fÃ©rences de contenu personnalisÃ©es**
- **Customisation Home Boarding** : Choix contenus affichÃ©s (Mangas, Animes, AVN)
- **Configuration onboarding** : Ã‰tape dÃ©diÃ©e lors premiÃ¨re configuration
- **Ã‰dition post-config** : Modifiable depuis ParamÃ¨tres â†’ Apparence
- **Sidebar dynamique** : Liens navigation affichÃ©s selon prÃ©fÃ©rences
- **Dashboard adaptatif** : Sections affichÃ©es selon choix utilisateur
- **Real-time update** : Changements reflÃ©tÃ©s immÃ©diatement sans refresh
- **Storage electron-store** : Sauvegarde par utilisateur
- **Event emitter** : Communication changes entre processus

**7. âš™ï¸ Refonte complÃ¨te ParamÃ¨tres**
- **Modularisation** : 7 composants sÃ©parÃ©s au lieu d'un fichier monolithique
  - UserManagement.tsx : Gestion utilisateurs (ajouter, Ã©diter, supprimer)
  - AppearanceSettings.tsx : ThÃ¨me, auto-launch, prÃ©fÃ©rences contenu
  - AISettings.tsx : Configuration Groq API
  - MALSettings.tsx : MyAnimeList OAuth + sync + traduction
  - AVNSettings.tsx : VÃ©rif MAJ + LewdCorner auth
  - DatabaseSettings.tsx : Emplacement DB + Import/Export
  - DangerZone.tsx : Actions destructives
- **Layout amÃ©liorÃ©** :
  - Sections pleine largeur pour meilleure lisibilitÃ©
  - Grid 2 colonnes dans AppearanceSettings (ThÃ¨me+Launch / Contenu)
  - Sections collapsibles pour "Comment Ã§a fonctionne ?"
- **Textes clarifiÃ©s** :
  - "DÃ©marrer automatiquement Le Nexus avec Windows"
  - "AVN - VÃ©rification automatique" : scraping direct au lieu d'API
  - "Emplacement de la base de donnÃ©es" : texte simplifiÃ©

**8. ðŸŽ¨ Renommage application : Le Nexus**
- **Nom complet** : "Le Nexus" (anciennement "Ma MangathÃ¨que")
- **Description** : "Application de gestion de collections multimÃ©dias (Mangas, AnimÃ©s, AVN)"
- **package.json** :
  - 
ame: "le-nexus"
  - productName: "Le Nexus"
  - ppId: "com.lenexus.app"
  - uthor: "Le Nexus Team"
- **UI complÃ¨te** : Tous les textes interface mis Ã  jour
- **Sidebar** : "Le Nexus" au lieu de "Ma MangathÃ¨que"
- **Splash screen** : "Bienvenue dans Le Nexus"
- **Onboarding** : "Bienvenue dans Le Nexus"
- **Tray** : "Le Nexus" dans tooltip et menu

**9. ðŸ—ï¸ AmÃ©liorations architecture**
- **Intercepteur LewdCorner** : electron/apis/lewdcorner-interceptor.js
- **Auth LewdCorner** : electron/apis/lewdcorner-auth.js
- **Handlers LewdCorner** : electron/handlers/lewdcorner-handlers.js
- **Magic bytes detection** : Identification format image automatique
- **Slug utility** : electron/utils/slug.js pour chemins images
- **Clear cache script** : scripts/clear-cache.js pour nettoyage

#### ðŸ› Corrections

**Images LewdCorner 403 Forbidden** :
- **ProblÃ¨me** : Images protÃ©gÃ©es non accessibles sans session active
- **Solution triple** :
  1. Auth LewdCorner avec fenÃªtre dÃ©diÃ©e + session partagÃ©e
  2. Reload mainWindow aprÃ¨s connexion pour appliquer cookies
  3. Intercepteur webRequest pour injection automatique cookies
- **RÃ©sultat** : Images LewdCorner s'affichent correctement âœ…

**Images locales Ã©crasÃ©es lors MAJ** :
- **ProblÃ¨me** : VÃ©rif MAJ remplaÃ§ait chemins locaux par URLs distantes
- **Solution** : DÃ©tection chemin local + conservation automatique
- **RÃ©sultat** : Images HD locales jamais perdues âœ…

**Validation formulaire AVN** :
- **ProblÃ¨me** : 	ype="url" refusait chemins locaux
- **Solution** : 	ype="text" avec placeholder "https://... ou chemin local"
- **RÃ©sultat** : Ã‰dition flexible sans contraintes âœ…

**Extension fichiers images manquante** :
- **ProblÃ¨me** : URLs sans extension (LewdCorner : image.24203/)
- **Solution** : Magic bytes + ajout auto extension (.png, .jpg, .webp, .avif)
- **RÃ©sultat** : Tous les fichiers ont extension correcte âœ…

**DonnÃ©es AVN partagÃ©es entre users** :
- **ProblÃ¨me** : chemin_executable, 
otes_privees globaux
- **Solution** : Table vn_user_games sÃ©parÃ©e
- **RÃ©sultat** : Chaque user a ses propres donnÃ©es âœ…

**Base de donnÃ©es non fusionnÃ©e** :
- **ProblÃ¨me** : Changement emplacement DB â†’ Ã©crasement donnÃ©es
- **Solution** : mergeDatabases() avec INSERT OR IGNORE
- **RÃ©sultat** : DonnÃ©es conservÃ©es lors dÃ©placement âœ…

**Profil recrÃ©Ã© aprÃ¨s move DB** :
- **ProblÃ¨me** : Double copie DB + DB ouverte pendant copie
- **Solution** : Close DB avant copy + reopen aprÃ¨s + pas de double call
- **RÃ©sultat** : Profil persistant aprÃ¨s changement emplacement âœ…

#### ðŸ“Š MÃ©triques

| MÃ©trique | Avant | AprÃ¨s | AmÃ©lioration |
|----------|-------|-------|--------------|
| **Images LewdCorner fonctionnelles** | 0% (403) | 100% (auth) | **âˆž** |
| **Images locales prÃ©servÃ©es MAJ** | 0% (Ã©crasÃ©es) | 100% (dÃ©tection) | **âˆž** |
| **Support LewdCorner vÃ©rif MAJ** | âŒ | âœ… | **Nouveau** |
| **Import JSON AVN** | âŒ | âœ… | **Nouveau** |
| **DonnÃ©es AVN user-specific** | âŒ | âœ… | **Nouveau** |
| **PrÃ©fÃ©rences contenu customisÃ©es** | âŒ | âœ… | **Nouveau** |
| **Fichiers ParamÃ¨tres (Settings)** | 1 (2296 lignes) | 7 modules | **-67% lignes/fichier** |

---

### ðŸŽ® VERSION 2.3.1 - SCRAPING F95ZONE & HARMONISATION AVN (25 octobre 2025)

#### âœ¨ NouveautÃ©s

**Scraping direct F95Zone** :
- Abandon API Google Apps Script dÃ©faillante (404)
- HTML parsing robuste avec regex
- Support complet mÃ©tadonnÃ©es (titre, version, statut, moteur, tags, image)
- DÃ©codage HTML entities (&#039; â†’ ')

**TÃ©lÃ©chargement images optimisÃ©** :
- Electron.net.request (moteur Chromium)
- Contournement CORS (headers User-Agent, Referer, Accept)
- Validation magic bytes (JPEG, PNG, WEBP, AVIF)
- Stockage local covers/avn/{slug}/cover.jpg
- Fallback URL distante si Ã©chec

**Harmonisation UI AVN** :
- Style cohÃ©rent avec pages Anime
- Suppression popups redondantes
- Composant CoverImage avec support chemins vn/

#### ðŸ› Corrections

- API F95List 404 â†’ Scraping direct âœ…
- Statut mal mappÃ© â†’ Anglais (Completed, Abandoned, Ongoing) âœ…
- Images miniatures â†’ Pleine rÃ©solution (suppression /thumb/) âœ…
- ERR_BLOCKED_BY_CLIENT â†’ Electron.net au lieu de node-fetch âœ…
- PathManager undefined â†’ Passage fonction getter âœ…

---

### ðŸš€ VERSION 2.3.0 - SYNCHRONISATION MAL & IA (25 octobre 2025)

#### âœ¨ NouveautÃ©s

**Synchronisation automatique MyAnimeList** :
- OAuth 2.0 PKCE sÃ©curisÃ©
- Sync unidirectionnelle (MAL â†’ App)
- Import/MAJ automatique mangas + animes
- Scheduler pÃ©riodique configurable (ex: 6h)
- Progression temps rÃ©el (X/Y)
- Interface dÃ©diÃ©e ParamÃ¨tres

**Traduction automatique synopsis** :
- Groq AI (llama-3.3-70b-versatile)
- Background non-bloquant post-sync
- Rate limiting intelligent (3.5s, retry 10s/20s)
- Progression dÃ©taillÃ©e (compteurs, ETA, durÃ©e)
- Quota gratuit : 14 400 trad/jour

**18 nouveaux champs manga MAL** :
- mal_id, source_donnees
- Titres : romaji, anglais, alternatifs (JSON)
- MÃ©tadonnÃ©es : type mÃ©dia, thÃ¨mes, auteurs, nb_volumes
- Dates : dÃ©but, fin
- Progression : volumes lus, statut lecture, score
- Suivi : dates lecture, tags (JSON)
- Relations : prequels, sequels (JSON)

**SystÃ¨me hybride MAL + Nautiljon** :
- Import MAL complet
- Couvertures Nautiljon prioritaires (Ã©crasement auto)
- Matching intelligent (titre + alternatifs)
- Badges visuels ðŸ“Š MAL, ðŸ‡«ðŸ‡· Nautiljon, ðŸ“ŠðŸ‡«ðŸ‡· Hybride

**Section MAL dans SerieDetail** :
- Affichage conditionnel (si mal_id)
- 3 colonnes (titres alternatifs, publication, stats user)
- Lien direct vers fiche MAL
- Badge bleu cohÃ©rent

#### ðŸ› Corrections

- Rate limit Groq 429 â†’ DÃ©lai 3.5s + retry âœ…
- Duplicate key "display" AnimeEditModal â†’ SupprimÃ© âœ…
- Carrousel Dashboard non fonctionnel â†’ Logs debug âœ…

---

### ðŸŽ¯ VERSION 2.2.0 - CAROUSEL UNIFIÃ‰ (24 octobre 2025)

#### âœ¨ NouveautÃ©s

**Carousel de progression unifiÃ©** :
- Fusion mangas/chapitres/animes en un seul
- Affichage intelligent selon type :
  - Mangas : "Titre - Tome 5"
  - Scans : "Titre - 18/118 ch."
  - Animes : "Titre - 12/24 ep."
- Tri chronologique (rÃ©cents en premier)
- Jusqu'Ã  10 Ã©lÃ©ments
- Handler get-recent-progress centralisÃ©

**Dashboard Ã©purÃ©** :
- Suppression carousels redondants (tomes lus, animes visionnÃ©s)
- Remplacement par "ðŸ“– Progression rÃ©cente" universel
- -95 lignes dans Dashboard.tsx

#### ðŸ› Corrections

- Erreur 
o such column: a.episodes_vus â†’ Sous-requÃªte COUNT âœ…

---

### ðŸŽ¨ VERSION 2.1.0 - OPTIMISATION & I18N (24 octobre 2025)

#### âš¡ Optimisations

**ParallÃ©lisation requÃªtes API** :
- Jikan + AniList + Groq en parallÃ¨le (Promise.all())
- Wait unique 800ms aprÃ¨s toutes requÃªtes
- Traduction arriÃ¨re-plan pendant traitement franchise
- **Performance : +118%** (11-12 â†’ 26.2 animes/min)

**ChronomÃ¨tre temps rÃ©el** :
- Temps Ã©coulÃ© (MM:SS)
- ETA calculÃ© dynamiquement
- Vitesse import (animes/min)
- Stats finales (temps total + vitesse moyenne)
- Compteurs : importÃ©s, mis Ã  jour, ignorÃ©s, erreurs

#### ðŸ‡«ðŸ‡· Internationalisation

**Dictionnaire traductions** (src/utils/translations.ts) :
- 150+ traductions franÃ§aises auto
- Genres (21) : Comedy â†’ ComÃ©die, Fantasy â†’ Fantastique
- ThÃ¨mes (60+) : School â†’ Ã‰cole, Reincarnation â†’ RÃ©incarnation
- Demographics : Shounen â†’ ShÅnen, Seinen, Josei
- Sources : Game â†’ Jeu vidÃ©o, Original â†’ Å’uvre originale
- Statuts : Finished Airing â†’ TerminÃ©
- Ratings : PG-13 â†’ PG-13 - Adolescents 13 ans et +
- Saisons : Summer â†’ Ã‰tÃ©, Winter â†’ Hiver

#### ðŸŽ¨ AmÃ©liorations UI

**Logo MyAnimeList** :
- Zone titre avec fond bleu (#2e51a2)
- Badge compact "MAL" Ã  cÃ´tÃ© titre + favori
- Meilleure visibilitÃ© couverture

**Section Informations 2 colonnes** :
- Grid responsive
- Ã‰conomise espace vertical
- Gap optimisÃ© (16px vertical, 20px horizontal)

#### ðŸ› Corrections

- Erreur dragEvent is not defined â†’ Cache Electron âœ…
- Handler update-anime incomplet â†’ 28 champs supportÃ©s âœ…

---

### ðŸš€ VERSION 2.0.0 - REFONTE MYANIMELIST (24 octobre 2025)

#### âš¡ BREAKING CHANGES

- âŒ SupprimÃ© : Table nime_saisons, groupement ADKami, extractBaseTitre()
- âœ… AjoutÃ© : Architecture MAL pure, relations franchise natives
- âš ï¸ Migration requise : RÃ©initialisation base animes

#### âœ¨ NouveautÃ©s

**Nouveau schÃ©ma BDD** :
- 1 anime = 1 entrÃ©e distincte avec mal_id unique
- Relations : ranchise_name, ranchise_order, prequel_mal_id, sequel_mal_id
- Progression individuelle par anime

**Ajout anime par MAL ID/URL** :
- Handler ddAnimeByMalId(59027) ou ddAnimeByMalId('https://...')
- Fetch auto : Jikan + AniList + Groq
- Proposition import prequels/sequels

**Simplification code** :
- anime-handlers.js : 1100 â†’ 900 lignes (-18%)
- Suppression logique groupement complexe
- Import XML : 1 entrÃ©e = 1 anime

#### ðŸ› Corrections

- Duplication Ã©pisodes (Chuunibyou) âœ…
- Ordre inversÃ© (Date A Live V avant IV) âœ…
- Progression linÃ©aire ADKami âœ…

---

## ðŸš€ TODO LIST

### ðŸŽ¯ PrioritÃ© Haute

#### âœ… FonctionnalitÃ©s actuellement implÃ©mentÃ©es

- [x] **Interface gestion utilisateurs** : Add/Edit/Delete dynamique
- [x] **Onboarding amÃ©liorÃ©** : 4 Ã©tapes (Bienvenue, Profil, Emplacement DB, Finalisation)
- [x] **Traduction automatique synopsis** : Groq AI (animes + mangas)
- [x] **Couvertures HD** : AniList GraphQL API avec fallback Jikan
- [x] **Architecture MyAnimeList pure** : 1 anime = 1 MAL ID unique
- [x] **28 champs enrichis anime** : Titres, themes, demographics, producteurs, etc.
- [x] **Optimisation vitesse import** :
  - [x] ParallÃ©lisation Jikan + AniList + Groq
  - [x] ChronomÃ¨tre temps rÃ©el avec ETA
  - [x] 26.2 animes/min (+118%)
- [x] **Support Tampermonkey** : 6 scripts (3 anime, 1 manga, 1 AVN, 1 MAL Quick Add)
- [x] **Badge plateforme streaming** : ADN, Crunchyroll, ADKami
- [x] **Mode sombre/clair** : Toggle ParamÃ¨tres
- [x] **Page ParamÃ¨tres dÃ©diÃ©e** : 7 modules sÃ©parÃ©s
- [x] **Sidebar collapsible** : RÃ©duction avec icÃ´nes uniquement
- [x] **Vues collection** : Grille, Carrousel 3D, Liste, PrÃ©sentation
- [x] **Raccourcis clavier** : Ã‰chap (fermer modals), F12 (DevTools)
- [x] **DÃ©marrage automatique** : Lancer au boot Windows
- [x] **Traductions franÃ§aises** : 150+ termes (genres, thÃ¨mes, demographics, etc.)
- [x] **BanniÃ¨res diagonales** : Statuts avec couleurs (TerminÃ© vert, En cours orange, AbandonnÃ© gris)
- [x] **Tags systÃ¨me** : Automatiques (en_cours, lu/terminÃ©) + manuels (a_lire/a_regarder, abandonne)
- [x] **Favoris indÃ©pendants** : Flag sÃ©parÃ©, combinable avec tags
- [x] **Horodatage prÃ©cis** : Date + heure pour lectures/visionnages
- [x] **Carousel progression unifiÃ©** : Mangas + chapitres + animes en un
- [x] **Statistiques avancÃ©es** : Graphiques Recharts (Ã©volution temporelle, rÃ©partition)
- [x] **Multi-propriÃ©taires** : Dropdown multi-sÃ©lection + coÃ»ts partagÃ©s auto
- [x] **9 types volumes** : BrochÃ©, Collector, Coffret, Kindle, Webtoon, Light Novel, Scan Manga, Scan Webtoon, NumÃ©rique
- [x] **Synchronisation MyAnimeList** : OAuth 2.0 + sync auto pÃ©riodique
- [x] **18 champs MAL manga** : mal_id, titres alternatifs, relations, etc.
- [x] **SystÃ¨me hybride MAL+Nautiljon** : Matching intelligent + badges
- [x] **TÃ©lÃ©chargement covers locales** : SÃ©ries, tomes, animes, AVN
- [x] **Anti-rate-limiting** : DÃ©lais adaptatifs (Groq 3.5s, AniList 800ms, F95Zone 500ms, Nautiljon 350-1500ms)
- [x] **Scraping F95Zone** : Extraction complÃ¨te (titre, version, statut, moteur, tags, image)
- [x] **TÃ©lÃ©chargement images Electron.net** : Contournement CORS pour F95Zone
- [x] **SystÃ¨me MAJ AVN automatique** : VÃ©rif complÃ¨te + notification badge
- [x] **Authentification LewdCorner** : OAuth + intercepteur cookies + UI complÃ¨te
- [x] **VÃ©rification MAJ LewdCorner** : Support complet si connectÃ©
- [x] **Protection images locales** : Conservation auto lors MAJ
- [x] **Import JSON AVN** : Support LC Extractor + F95 Extractor
- [x] **DonnÃ©es AVN user-specific** : Table sÃ©parÃ©e (chemin exe, notes, statut, session)
- [x] **PrÃ©fÃ©rences contenu** : Customisation Home Boarding (Mangas/Animes/AVN)
- [x] **Renommage application** : "Le Nexus" avec branding complet
- [x] **Refonte ParamÃ¨tres** : 7 modules au lieu de monolithe 2296 lignes
- [x] **Extension images automatique** : Magic bytes + ajout .png/.jpg/.webp/.avif
- [x] **Merge databases** : Fusion lors changement emplacement DB

#### ðŸ“‹ Ã€ faire

- [ ] **Visualiseur images plein Ã©cran** :
  - [ ] Lightbox modal avec fond semi-transparent
  - [ ] Navigation clavier (Ã‰chap, flÃ¨ches)
  - [ ] Zoom et pan pour grandes images
  - [ ] Applicable sur toutes pages (Collection, DÃ©tails, Dashboard)
- [ ] **Import automatique depuis trackers anime** :
  - [ ] ADKami : AmÃ©liorer dÃ©tection nombre rÃ©el Ã©pisodes
  - [ ] Crunchyroll : Optimiser dÃ©tection multi-saisons
- [ ] **Support Kitsu API** : Source alternative mÃ©tadonnÃ©es
- [ ] **PrÃ©visions de coÃ»t** : Estimation pour sÃ©ries en cours
- [ ] **Import JSON AVN amÃ©liorÃ©** :
  - [ ] Support batch (plusieurs jeux Ã  la fois)
  - [ ] PrÃ©-visualisation avant import
- [ ] **Scraping LewdCorner direct** : Support extraction depuis pages LC (actuellement F95 uniquement)

---

### â­ PrioritÃ© Moyenne

#### âœ… ImplÃ©mentÃ©

- [x] **Graphiques progression** : Recharts avec Ã©volution temporelle
- [x] **Comparaison multi-utilisateurs** : RÃ©partition tomes + coÃ»ts
- [x] **Tags personnalisÃ©s** : SystÃ¨me complet avec auto + manuels
- [x] **Badges visuels compacts** : BanniÃ¨res diagonales colorÃ©es
- [x] **Filtrage par tags** : Dans collections mangas + animes
- [x] **Marquer plusieurs tomes** : Bouton "Marquer comme lu" en masse
- [x] **Carrousel lectures rÃ©centes** : 10 derniers tomes/chapitres/Ã©pisodes

#### ðŸ“‹ Ã€ faire

- [ ] **Gestion Ã©ditions manga** : Variantes (Collector, Deluxe, IntÃ©grale)
- [ ] **Lien vers plateformes** : Ouvrir Crunchyroll/Netflix directement
- [ ] **Import CSV** : Format personnalisÃ© pour mangas
- [ ] **Synchronisation bidirectionnelle** : MAL/AniList â†’ App + App â†’ MAL/AniList
- [ ] **Notifications desktop** : Nouveaux Ã©pisodes, MAJ AVN, sync MAL terminÃ©e

---

### ðŸ”§ PrioritÃ© Basse

#### ðŸ“‹ Ã€ faire

- [ ] **Application mobile** : Android APK
  - [ ] Interface tactile adaptÃ©e
  - [ ] Connexion DB cloud partagÃ©e
  - [ ] FonctionnalitÃ©s lecture simplifiÃ©es
- [ ] **Mode hors-ligne complet** : PWA-like
- [ ] **Migration BDD** : Outil migration entre versions
- [ ] **Logs d'activitÃ©** : Journal toutes actions
- [ ] **Import Anilist/Kitsu direct** : En complÃ©ment MAL
- [ ] **Enrichissement auto mÃ©tadonnÃ©es** : Refresh pÃ©riodique donnÃ©es

---

## âš™ï¸ FONCTIONNALITÃ‰S ACTUELLES

### ðŸ“š Gestion Mangas

**Ajout sÃ©ries** :
- Recherche MangaDex/Nautiljon avec rÃ©cupÃ©ration auto mÃ©tadonnÃ©es
- Ajout manuel complet
- Import Tampermonkey (Nautiljon)

**Informations supportÃ©es** :
- Titre, auteur, Ã©diteur, ISBN
- Type : BrochÃ©, Collector, Coffret, Kindle, Webtoon, Light Novel, Scan Manga, Scan Webtoon, NumÃ©rique
- Genre, statut publication, description
- Couverture (upload ou URL)
- Date sortie, notes privÃ©es
- PropriÃ©taires multiples (coÃ»ts partagÃ©s)
- Source donnÃ©es : MAL, Nautiljon, Hybride

**Gestion tomes** :
- Ajout : numÃ©ro, titre, date, prix, couverture, notes
- Suivi lecture : marquer lu avec timestamp prÃ©cis
- Marquer plusieurs tomes d'un coup
- Progression auto (X/Y lus)
- Historique chronologique

**Synchronisation MAL Manga** :
- OAuth 2.0 PKCE
- Import auto liste manga MAL
- 18 champs enrichis (mal_id, titres alternatifs, relations, etc.)
- Matching intelligent Nautiljon (titre + alternatifs)
- Ã‰crasement auto covers MAL par Nautiljon
- Badge visuel source

**Tags & Organisation** :
- Tags auto : ðŸ”µ En cours, âœ… Lu
- Tags manuels : ðŸ“š Ã€ lire, ðŸš« AbandonnÃ©
- Favoris : â­ Flag indÃ©pendant
- BanniÃ¨res diagonales colorÃ©es
- Filtrage avancÃ©

**Vues** :
- Grille responsive (2-6 colonnes)
- Carrousel 3D Cover Flow (rotation Â±45Â°, effet parallaxe)
- Liste compacte (miniatures + progression inline)
- PrÃ©sentation (zoom au survol)

**Chapitres-based series** :
- Support scans/webtoons (comptage chapitres au lieu tomes)
- Input "Nb de chapitres" + "Chapitres lus"
- Traduction IA descriptions (bouton "Traduire")
- BanniÃ¨re "Tout lu" si 100% chapitres lus

---

### ðŸŽ¬ Gestion Animes

**Architecture MAL pure** :
- 1 anime = 1 entrÃ©e distincte (mal_id unique)
- Relations franchise natives
- Plus de groupement saisons

**Ajout animes** :
- Par MAL ID/URL (fetch auto Jikan + AniList + Groq)
- Import XML MyAnimeList (en masse)
- Scripts Tampermonkey (ADKami, Crunchyroll, ADN)
- MyAnimeList Quick Add

**28 champs enrichis** :
- Titres multiples (romaji, natif, anglais, alternatifs)
- Type (TV, Movie, OVA, ONA, Special)
- Source (Manga, Light Novel, Jeu vidÃ©o, Original)
- Nb Ã©pisodes, durÃ©e, annÃ©e, saison diffusion
- Couverture HD (AniList prioritaire)
- Description (traduite en franÃ§ais)
- Statut (TerminÃ©, En cours, Ã€ venir)
- Genres, thÃ¨mes, demographics (traduits en franÃ§ais)
- Studios, producteurs, diffuseurs
- Rating (PG-13, R+, etc.)
- Score MAL, dates diffusion
- Relations franchise (prequel, sequel)
- Liens externes
- Badge plateforme (ADN, Crunchyroll, ADKami)

**Suivi progression** :
- Toggle individuel par Ã©pisode
- Marquer tout vu d'un coup
- Timestamp prÃ©cis (date + heure)
- Calcul auto progression (X/Y Ã©pisodes)

**Statuts personnels** :
- Ã€ regarder, En cours, TerminÃ©, AbandonnÃ©
- Tags auto : en_cours, termine
- Tags manuels : a_regarder, abandonne
- Favoris indÃ©pendants

**Import optimisÃ©** :
- ParallÃ©lisation Jikan + AniList + Groq
- 26.2 animes/min (+118%)
- ChronomÃ¨tre temps rÃ©el (temps Ã©coulÃ©, ETA, vitesse)
- Traduction auto synopsis (Groq AI)
- Rate limiting intelligent

**Traductions franÃ§aises** :
- 150+ termes traduits automatiquement
- Genres, thÃ¨mes, demographics, sources, statuts, ratings, saisons
- Fallback termes originaux

**Vues** :
- Grille (cartes avec image + infos)
- Liste compacte (miniatures + progression)
- Vue Images (focus couvertures)
- BanniÃ¨res diagonales (TerminÃ© vert, En cours orange, AbandonnÃ© gris)

---

### ðŸŽ® Gestion AVN

**Scraping F95Zone** :
- Recherche par ID F95Zone
- Scraping direct HTML
- Extraction : titre, version, statut, moteur, tags, image
- TÃ©lÃ©chargement images Electron.net (contournement CORS)
- Validation magic bytes + extension auto

**Scraping LewdCorner** :
- Support pages LewdCorner
- Authentification requise (systÃ¨me OAuth intÃ©grÃ©)
- Intercepteur cookies automatique
- VÃ©rification session au dÃ©marrage

**Ajout jeux** :
- Par ID F95Zone/LewdCorner (scraping auto)
- Ajout manuel complet
- Import JSON (LC Extractor, F95 Extractor)

**Informations supportÃ©es** :
- Titre, version, moteur
- Statut jeu (EN COURS, TERMINÃ‰, ABANDONNÃ‰)
- Tags multiples
- Liens (F95Zone, LewdCorner, traduction, jeu, tÃ©lÃ©chargement)
- Couverture locale ou URL
- **Champs traduction** :
  - Version traduction
  - Statut traduction (Traduction, Traduction (Mod inclus), Traduction intÃ©grÃ©)
  - Type traduction (Manuelle, Semi-automatique, Automatique, VO franÃ§aise)

**DonnÃ©es utilisateur-spÃ©cifiques** (table vn_user_games) :
- Chemin exÃ©cutable (par user)
- Notes privÃ©es (par user)
- Statut personnel (par user) : Ã€ jouer, En cours, ComplÃ©tÃ©, AbandonnÃ©
- DerniÃ¨re session (par user)
- PropriÃ©taires multiples (partagÃ©)

**Lancement jeux** :
- Bouton "Ã€ jouer" direct
- MAJ auto derniÃ¨re session

**SystÃ¨me MAJ automatique** :
- Bouton "VÃ©rifier MAJ" dans page AVN
- Support F95Zone + LewdCorner (si connectÃ©)
- Scraping complet chaque jeu
- Comparaison intelligente donnÃ©es
- MAJ auto : version, statut, moteur, tags, image
- **Protection images locales** : Conserve chemins locaux lors MAJ
- Badge ðŸ”„ "Mise Ã  jour disponible !"
- Bouton "Marquer comme vu"
- SystÃ¨me silencieux (pas popups)

**Authentification LewdCorner** :
- Section dÃ©diÃ©e ParamÃ¨tres AVN
- FenÃªtre connexion dÃ©diÃ©e
- Session cookies partagÃ©e
- Intercepteur webRequest automatique
- Badge statut (âœ… ConnectÃ© / âš ï¸ Non connectÃ©)
- Boutons Se connecter / Se dÃ©connecter
- Section aide intÃ©grÃ©e

**Protection donnÃ©es** :
- Images locales jamais Ã©crasÃ©es
- DÃ©tection automatique chemin local
- Log explicite conservation

---

### ðŸ‘¥ Multi-Utilisateurs

**Gestion profils** :
- CrÃ©ation : nom, avatar/emoji, couleur (color picker)
- Modification : renommer (migration auto donnÃ©es), changer avatar, couleur
- Suppression : confirmation + rÃ©assignation donnÃ©es
- Aucune limite profils

**Multi-propriÃ©taires** :
- Dropdown multi-sÃ©lection
- Calcul auto coÃ»ts partagÃ©s
- Statistiques individuelles
- Comparaison multi-users

**Onboarding** :
- 4 Ã©tapes (Bienvenue, Profil, Emplacement DB, Finalisation)
- Configuration Home Boarding (choix contenus affichÃ©s)
- Choix emplacement DB cloud-friendly

**PrÃ©fÃ©rences contenu personnalisÃ©es** :
- Customisation contenus affichÃ©s (Mangas, Animes, AVN)
- Configuration onboarding + Ã©ditable ParamÃ¨tres
- Sidebar dynamique selon choix
- Dashboard adaptatif
- Real-time update sans refresh
- Storage electron-store par user
- Event emitter changes

---

### ðŸ“Š Dashboard & Statistiques

**Dashboard** :
- KPIs visuels (SÃ©ries, Tomes, Investissement, Progression)
- Carousel progression unifiÃ© (mangas + chapitres + animes)
- Tri chronologique (10 rÃ©cents)
- Affichage intelligent selon type

**Statistiques** :
- Graphique Ã©volution temporelle (achats/mois, dÃ©penses)
- Graphique rÃ©partition (Tomes + CoÃ»t par user)
- Filtrage annÃ©e + type volume
- Graphiques collapsibles
- Statistiques par type volume

---

### ðŸ’¾ Import & Export

**Import Mangas** :
- Tampermonkey Nautiljon
- Serveur local port 51234
- DÃ©duplication intelligente
- Attribution auto propriÃ©taire actif

**Import Animes** :
- XML MyAnimeList (export compte MAL)
- Tampermonkey (ADKami, Crunchyroll, ADN)
- MyAnimeList Quick Add
- Multi-saisons auto (Crunchyroll)
- Enrichissement auto (Jikan + AniList + traduction)

**Import AVN** :
- Tampermonkey F95Zone AVN Extractor
- Import JSON (LC Extractor, F95 Extractor)
- Serveur local port 51234

**Import BDD** :
- Import DB externe complÃ¨te
- Fusion auto avec DB existante (INSERT OR IGNORE)

**Export** :
- Export SQLite complet
- Format : mangatheque_backup_YYYYMMDD_HHMMSS.db
- Transfert entre machines

---

### ðŸ”„ Synchronisation MyAnimeList

**OAuth 2.0** :
- Client ID MAL requis
- PKCE sÃ©curisÃ©
- Tokens stockÃ©s localement
- Refresh auto

**Sync unidirectionnelle** :
- Liste manga complÃ¨te
- Liste anime complÃ¨te
- Progression user (chap lus, ep vus)
- Scores, dates, tags

**CrÃ©ation automatique** :
- SÃ©ries/animes manquants crÃ©Ã©s
- MÃ©tadonnÃ©es complÃ¨tes MAL API v2
- 18 champs manga + 28 champs anime

**MAJ intelligente** :
- Compare local vs MAL
- MAJ uniquement changements
- Garde maximum infos

**Scheduler auto** :
- PÃ©riodique configurable (ex: 6h)
- Activable/dÃ©sactivable
- ArriÃ¨re-plan
- Affichage derniÃ¨re sync

**Traduction auto synopsis** :
- Groq AI intÃ©grÃ©
- LancÃ© auto aprÃ¨s sync MAL
- Progression dÃ©taillÃ©e temps rÃ©el
- Rate limiting intelligent

---

### ðŸ”§ Scripts Tampermonkey

**6 scripts actifs** :

**Anime (4)** :
1. ADKami Episode Tracker
2. Crunchyroll Episode Tracker
3. ADN Episode Tracker
4. MyAnimeList Quick Add

**Manga (1)** :
1. Nautiljon Extractor

**AVN (1)** :
1. F95Zone AVN Extractor

**Serveur import local** :
- Port 51234
- API REST rÃ©ception imports
- DÃ©tection auto source (URL)
- Attribution propriÃ©taire actif
- Overlay progression

---

### âš™ï¸ ParamÃ¨tres & Configuration

**7 modules sÃ©parÃ©s** :

**1. UserManagement** :
- Liste utilisateurs existants
- CrÃ©ation formulaire dÃ©diÃ©
- Modification (nom, emoji, couleur, avatar)
- Suppression avec confirmation

**2. AppearanceSettings** :
- ThÃ¨me (Dark/Light)
- DÃ©marrage auto Windows
- PrÃ©fÃ©rences contenu (Mangas, Animes, AVN)
- Layout 2 colonnes (ThÃ¨me+Launch / Contenu)

**3. AISettings** :
- ClÃ© API Groq configurable
- Masquable/affichable
- Guide obtention inclus
- Validation clÃ©

**4. MALSettings** :
- OAuth Client ID
- Connexion/dÃ©connexion
- Sync maintenant + auto-sync pÃ©riodique
- Traduction synopsis (bouton manuel)
- Import XML MyAnimeList
- Progression temps rÃ©el

**5. AVNSettings** :
- Authentification LewdCorner (Se connecter/dÃ©connecter)
- VÃ©rification MAJ (bouton "VÃ©rifier maintenant")
- Badge statut connexion LC
- Messages inline (pas popups)
- Section aide collapsible

**6. DatabaseSettings** :
- Affichage chemin actuel
- Changement emplacement (avec merge DB)
- Import/Export DB
- Support cloud

**7. DangerZone** :
- Suppression donnÃ©es utilisateur
- Suppression toutes donnÃ©es app
- Confirmations multiples

**FenÃªtre** :
- Persistance taille/position/Ã©tat
- Restauration dÃ©marrage
- Debounce 500ms

**Raccourcis** :
- Ã‰chap : Fermer modals
- F12 : Ouvrir/fermer DevTools

**Sidebar** :
- Collapsible (icÃ´nes uniquement)
- Animations fluides
- Bordure avatar couleur user
- Navigation dynamique selon prÃ©fÃ©rences contenu

---

## ðŸ› ï¸ Technologies

**Frontend** :
- React + TypeScript + Vite
- Lucide React (icÃ´nes SVG)
- Recharts (graphiques)
- React Router DOM

**Backend** :
- Electron
- better-sqlite3 (SQLite)
- electron-store (config)
- node-cron (scheduler)

**APIs Externes** :
- Jikan (MyAnimeList API v4)
- AniList GraphQL
- MangaDex API
- Kitsu API
- MangaUpdates
- Groq AI (traduction)
- MyAnimeList API v2 (OAuth)

**Scraping** :
- F95Zone (HTML parsing + regex)
- LewdCorner (HTML parsing + auth)
- Nautiljon (dÃ©lai adaptatif)

**Services Internes** :
- PathManager (chemins covers/DB)
- CoverManager (tÃ©lÃ©chargement images)
- ImportServer (port 51234)
- MAL Sync Service
- AVN Update Scheduler
- LewdCorner Auth + Interceptor

---

## ðŸ“ˆ Performances

**Vitesse import** :
- Avant : 331 animes â†’ 27-30 min (~11-12 animes/min)
- AprÃ¨s : 331 animes â†’ ~12-13 min (**26.2 animes/min**)
- **+118% grÃ¢ce parallÃ©lisation**

**Anti-gel UI** :
- setImmediate() dans toutes boucles
- Import XML anime : pause tous les 5
- Sync MAL : pause tous les 5
- Traduction : pause chaque itÃ©ration
- VÃ©rif MAJ AVN : pause tous les 3
- **RÃ©sultat** : App reste rÃ©active

**Rate Limiting** :
- Groq AI : 3.5s + retry 10s/20s (99%+ succÃ¨s)
- AniList : 800ms (limite 90 req/min)
- F95Zone : 500ms / LewdCorner : 1s
- Nautiljon : 350-1500ms adaptatif

**Stockage Local** :
- Mangas : covers/series/{slug}/
- Animes : covers/animes/{slug}/
- AVN : covers/avn/{slug}/
- Ã‰vite requÃªtes rÃ©seau rÃ©pÃ©tÃ©es

---

## ðŸ” SÃ©curitÃ© & Vie PrivÃ©e

âœ… **DonnÃ©es 100% locales**  
âœ… **Pas de tracking, pas de tÃ©lÃ©mÃ©trie**  
âœ… **Tokens MAL stockÃ©s sÃ©curisÃ©**  
âœ… **ClÃ© API Groq masquable UI**  
âœ… **Session LewdCorner cookies locaux**  
âœ… **Cloud optionnel** (Proton Drive, OneDrive, Google Drive)

---

## ðŸ“ Notes DÃ©veloppement

**Architecture** :
- Frontend : React + TypeScript + Vite
- Backend : Electron + better-sqlite3
- APIs : 7 sources (Jikan, AniList, MangaDex, Kitsu, MangaUpdates, Groq, MAL)
- Scripts : 6 Tampermonkey

**Fichiers clÃ©s** :
- electron/services/database.js : SchÃ©ma + migrations
- electron/services/import-server.js : API import Tampermonkey
- electron/handlers/ : 9 IPC handlers
- electron/apis/ : 9 modules API externes
- src/components/ : 30+ composants React
- 	ampermonkey/ : 6 scripts extraction

**Conventions** :
- Commits franÃ§ais
- PrÃ©fixes : eat:, ix:, docs:, efactor:, style:, 	est:
- Branche : main
- Pas de force push

---

## ðŸŽ¯ Roadmap

**Court terme (1-2 mois)** :
1. Visualiseur images plein Ã©cran (lightbox)
2. Import automatique trackers anime optimisÃ©
3. Support Kitsu API complet
4. PrÃ©visions coÃ»t sÃ©ries en cours

**Moyen terme (3-6 mois)** :
1. Application mobile Android (APK)
2. Mode hors-ligne complet (PWA)
3. Synchronisation bidirectionnelle MAL/AniList
4. Notifications desktop

**Long terme (6+ mois)** :
1. Gestion Ã©ditions manga
2. Liens directs plateformes streaming
3. Import CSV personnalisÃ©
4. Enrichissement auto mÃ©tadonnÃ©es

---

**ðŸ’œ Le Nexus - Votre hub de collections multimÃ©dias**

**DÃ©veloppeur** : Rory Mercury 91  
**Version actuelle** : 3.0.0  
**DerniÃ¨re mise Ã  jour** : 26 octobre 2025  
**Licence** : PropriÃ©taire

---
