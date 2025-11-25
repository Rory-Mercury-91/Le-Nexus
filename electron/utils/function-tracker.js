/**
 * Système de suivi des fonctions appelées en temps réel
 * Enregistre toutes les fonctions IPC appelées pendant l'exécution de l'application
 */

const fs = require('fs');
const path = require('path');

class FunctionTracker {
  constructor() {
    this.trackedCalls = new Map();
    this.isEnabled = false;
    this.outputPath = null;
  }

  /**
   * Active le suivi des fonctions
   * @param {string} outputPath - Chemin du fichier de sortie
   */
  enable(outputPath = null) {
    this.isEnabled = true;
    this.outputPath = outputPath || path.join(require('electron').app.getPath('userData'), 'function-calls.json');
    console.log('📊 Suivi des fonctions activé:', this.outputPath);
  }

  /**
   * Désactive le suivi des fonctions
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Enregistre un appel de fonction
   * @param {string} handlerName - Nom du handler IPC (ex: 'manga:getAll')
   * @param {string} filePath - Fichier source
   * @param {string} functionName - Nom de la fonction
   */
  track(handlerName, filePath, functionName) {
    if (!this.isEnabled) return;

    const key = `${filePath}:${functionName}`;
    
    if (!this.trackedCalls.has(key)) {
      this.trackedCalls.set(key, {
        handlerName,
        filePath,
        functionName,
        callCount: 0,
        firstCall: new Date().toISOString(),
        lastCall: null
      });
    }

    const entry = this.trackedCalls.get(key);
    entry.callCount++;
    entry.lastCall = new Date().toISOString();
  }

  /**
   * Sauvegarde les données de suivi dans un fichier
   */
  save() {
    if (!this.isEnabled) return;

    const data = {
      trackedAt: new Date().toISOString(),
      totalCalls: this.trackedCalls.size,
      calls: Array.from(this.trackedCalls.values())
    };

    try {
      fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
      fs.writeFileSync(this.outputPath, JSON.stringify(data, null, 2));
      console.log(`✅ Suivi sauvegardé: ${this.trackedCalls.size} fonctions appelées`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde suivi:', error);
    }
  }

  /**
   * Retourne les statistiques de suivi
   */
  getStats() {
    return {
      totalCalls: this.trackedCalls.size,
      calls: Array.from(this.trackedCalls.values())
    };
  }

  /**
   * Génère un rapport de suivi basé sur les appels
   */
  generateReport(functionListPath) {
    if (!this.isEnabled || !fs.existsSync(functionListPath)) {
      return null;
    }

    const functionList = JSON.parse(fs.readFileSync(functionListPath, 'utf8'));
    const trackedHandlers = new Set(this.trackedCalls.values().map(c => c.handlerName));
    
    const report = {
      trackedAt: new Date().toISOString(),
      totalFunctions: 0,
      trackedFunctions: this.trackedCalls.size,
      usage: {},
      unusedFunctions: []
    };

    // Analyser chaque fichier
    [...functionList.electron, ...functionList.src].forEach(fileInfo => {
      const trackedFile = Array.from(this.trackedCalls.values()).find(c => 
        c.filePath.includes(fileInfo.file)
      );

      report.totalFunctions += fileInfo.functions.length;

      if (!trackedFile) {
        // Fichier jamais appelé
        report.unusedFunctions.push({
          file: fileInfo.file,
          functions: fileInfo.functions,
          reason: 'Aucun appel enregistré'
        });
      }
    });

    return report;
  }
}

// Instance singleton
const tracker = new FunctionTracker();

// Sauvegarder automatiquement toutes les 30 secondes
setInterval(() => {
  if (tracker.isEnabled) {
    tracker.save();
  }
}, 30000);

// Sauvegarder à la fermeture
process.on('beforeExit', () => {
  if (tracker.isEnabled) {
    tracker.save();
  }
});

module.exports = tracker;
