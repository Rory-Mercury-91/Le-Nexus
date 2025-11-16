# Guide des Tests - Le Nexus

Ce dossier contient tous les tests du projet Le Nexus.

## 📁 Structure

```
tests/
├── setup.ts                    # Configuration globale des tests
├── README.md                   # Ce fichier
├── backend/                     # Tests Electron (handlers, services, utils)
│   ├── handlers/
│   ├── services/
│   ├── utils/
│   └── apis/
├── frontend/                    # Tests React (hooks, components, pages)
│   ├── hooks/
│   ├── components/
│   ├── pages/
│   └── utils/
└── integration/                 # Tests d'intégration
```

## 🚀 Commandes disponibles

```bash
# Lancer les tests en mode watch
npm run test

# Lancer les tests une fois
npm run test:run

# Lancer les tests avec coverage
npm run test:coverage

# Lancer l'interface UI des tests
npm run test:ui
```

## 📊 Coverage

Le coverage est configuré avec les seuils suivants :
- **Lignes** : 80%
- **Fonctions** : 80%
- **Branches** : 75%
- **Statements** : 80%

Les rapports de coverage sont générés dans `coverage/` après l'exécution de `npm run test:coverage`.

## 📝 Règles de test

### Backend (Electron)
- Mocker l'API Electron
- Utiliser des bases de données en mémoire pour les tests
- Tester tous les cas d'erreur
- Tester les validations de données

### Frontend (React)
- Tester les hooks isolément
- Tester les composants avec React Testing Library
- Tester les interactions utilisateur
- Tester les états de chargement et d'erreur

### Intégration
- Tester les flux complets
- Tester les interactions frontend/backend
- Utiliser des données de test réalistes

## 🔍 Code mort

Le coverage permet d'identifier :
- Les fonctions jamais appelées
- Les branches jamais exécutées
- Les lignes de code mortes

Après chaque exécution de coverage, documenter le code mort identifié ou le supprimer.
