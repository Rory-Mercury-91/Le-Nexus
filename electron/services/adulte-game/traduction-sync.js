/**
 * Service de synchronisation des traductions jeux adultes
 * Orchestration principale de la synchronisation depuis Google Sheets
 */

// Utiliser des getters pour éviter les dépendances circulaires
// Les modules ne seront chargés qu'au moment de l'accès à la propriété
module.exports = {
  get syncTraductions() {
    return require('./traduction-sync-core').syncTraductions;
  },
  get syncTraductionsForExistingGames() {
    return require('./traduction-sync-core').syncTraductionsForExistingGames;
  },
  get clearTraduction() {
    return require('./traduction-db').clearTraduction;
  },
  get updateTraductionManually() {
    return require('./traduction-db').updateTraductionManually;
  },
  get searchTranslationForGame() {
    return require('./traduction-db').searchTranslationForGame;
  },
  get extractF95Id() {
    return require('./traduction-parsers').extractF95Id;
  },
  get initScheduler() {
    return require('../schedulers/adulte-game-traduction-scheduler').initScheduler;
  },
  get stopScheduler() {
    return require('../schedulers/adulte-game-traduction-scheduler').stopScheduler;
  },
  get restartScheduler() {
    return require('../schedulers/adulte-game-traduction-scheduler').restartScheduler;
  },
  get fetchTraducteurs() {
    return require('./traduction-google-sheets').fetchTraducteurs;
  }
};
