/**
 * Système de suivi en temps réel des appels IPC
 * Intercepte tous les appels IPC et les enregistre pendant l'exécution de l'application
 */

const fs = require('fs');
const path = require('path');

class IPCTracker {
  constructor() {
    this.calls = new Map();
    this.isEnabled = false;
    this.outputPath = null;
    this.startTime = null;
    this.initialLoadTime = null;
  }

  /**
   * Charge les données existantes depuis le fichier
   */
  loadExistingData() {
    if (!this.outputPath || !fs.existsSync(this.outputPath)) {
      return;
    }

    try {
      const existingData = JSON.parse(fs.readFileSync(this.outputPath, 'utf8'));
      
      // Restaurer les données de calls
      if (existingData.channels && Array.isArray(existingData.channels)) {
        existingData.channels.forEach(channel => {
          this.calls.set(channel.channel, {
            channel: channel.channel,
            filePath: channel.filePath,
            functionName: channel.functionName,
            count: channel.count || 0,
            firstCall: channel.firstCall || new Date().toISOString(),
            lastCall: channel.lastCall || null,
            errors: channel.errors || 0
          });
        });
      }

      // Restaurer le temps de début initial si disponible
      if (existingData.initialStartTime) {
        this.initialLoadTime = new Date(existingData.initialStartTime);
      } else if (existingData.startTime) {
        this.initialLoadTime = new Date(existingData.startTime);
      }

      console.log(`📊 Données IPC existantes chargées : ${this.calls.size} canaux, ${Array.from(this.calls.values()).reduce((sum, e) => sum + e.count, 0)} appels totaux`);
    } catch (error) {
      console.warn('⚠️ Impossible de charger les données IPC existantes:', error.message);
    }
  }

  /**
   * Active le suivi IPC
   */
  enable(outputPath = null) {
    this.isEnabled = true;
    this.outputPath = outputPath || path.join(
      require('electron').app.getPath('userData'), 
      'ipc-coverage.json'
    );
    
    // Charger les données existantes avant de démarrer
    this.loadExistingData();
    
    // Si c'est la première fois, enregistrer le temps de début
    if (!this.initialLoadTime) {
      this.initialLoadTime = new Date();
    }
    
    this.startTime = new Date();
    console.log('📊 Suivi IPC activé (accumulation des données):', this.outputPath);
  }

  /**
   * Enregistre un appel IPC
   */
  track(channel, filePath, functionName) {
    if (!this.isEnabled) return;

    const key = channel;
    
    if (!this.calls.has(key)) {
      this.calls.set(key, {
        channel,
        filePath,
        functionName,
        count: 0,
        firstCall: new Date().toISOString(),
        lastCall: null,
        errors: 0
      });
    }

    const entry = this.calls.get(key);
    entry.count++;
    entry.lastCall = new Date().toISOString();
    
    // Mettre à jour le filePath et functionName si fournis (peuvent changer)
    if (filePath) entry.filePath = filePath;
    if (functionName) entry.functionName = functionName;
  }

  /**
   * Enregistre une erreur
   */
  trackError(channel, error) {
    if (!this.isEnabled) return;
    
    if (this.calls.has(channel)) {
      this.calls.get(channel).errors++;
    }
  }

  /**
   * Sauvegarde le rapport (avec accumulation)
   */
  save() {
    if (!this.isEnabled) return;

    // Calculer la durée totale depuis le début initial
    const totalDuration = this.initialLoadTime 
      ? Date.now() - new Date(this.initialLoadTime).getTime()
      : (this.startTime ? Date.now() - new Date(this.startTime).getTime() : 0);

    const data = {
      initialStartTime: this.initialLoadTime?.toISOString() || this.startTime?.toISOString(),
      lastUpdateTime: new Date().toISOString(),
      lastStartTime: this.startTime?.toISOString(),
      totalDuration: totalDuration,
      totalChannels: this.calls.size,
      totalCalls: Array.from(this.calls.values()).reduce((sum, e) => sum + e.count, 0),
      channels: Array.from(this.calls.values()).sort((a, b) => b.count - a.count),
      // Métadonnées pour le debug
      _metadata: {
        sessionCount: (this.initialLoadTime && this.startTime && this.initialLoadTime.getTime() !== new Date(this.startTime).getTime()) ? 'multi' : 'single',
        note: 'Les données sont accumulées entre les sessions. Utilisez reset() pour réinitialiser.'
      }
    };

    try {
      fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
      fs.writeFileSync(this.outputPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Erreur sauvegarde IPC tracker:', error);
    }
  }

  /**
   * Réinitialise les données (pour recommencer à zéro)
   */
  reset() {
    this.calls.clear();
    this.initialLoadTime = null;
    this.startTime = new Date();
    
    if (this.outputPath && fs.existsSync(this.outputPath)) {
      try {
        fs.unlinkSync(this.outputPath);
        console.log('🔄 Données IPC réinitialisées');
      } catch (error) {
        console.warn('⚠️ Impossible de supprimer le fichier IPC:', error.message);
      }
    }
  }

  /**
   * Retourne les statistiques en temps réel
   */
  getStats() {
    return {
      totalChannels: this.calls.size,
      totalCalls: Array.from(this.calls.values()).reduce((sum, e) => sum + e.count, 0),
      channels: Array.from(this.calls.values()).sort((a, b) => b.count - a.count).slice(0, 20)
    };
  }

  /**
   * Génère un rapport de coverage
   */
  generateCoverageReport(functionListPath) {
    if (!this.isEnabled) return null;

    const functionList = JSON.parse(fs.readFileSync(functionListPath, 'utf8'));
    const trackedChannels = new Set(Array.from(this.calls.keys()));
    
    const report = {
      generatedAt: new Date().toISOString(),
      trackedChannels: this.calls.size,
      totalCalls: Array.from(this.calls.values()).reduce((sum, e) => sum + e.count, 0),
      unusedHandlers: [],
      usedHandlers: []
    };

    // Analyser les handlers
    functionList.electron.forEach(fileInfo => {
      const used = [];
      const unused = [];

      fileInfo.functions.forEach(func => {
        // Chercher si ce handler est appelé
        const isCalled = Array.from(this.calls.values()).some(call => 
          call.filePath && call.filePath.includes(fileInfo.file.replace(/\\/g, '/')) &&
          call.functionName === func
        );

        if (isCalled) {
          used.push(func);
        } else {
          unused.push(func);
        }
      });

      if (used.length > 0 || unused.length > 0) {
        report.usedHandlers.push({
          file: fileInfo.file,
          used,
          unused,
          coverage: used.length / (used.length + unused.length) * 100
        });
      }

      if (unused.length === fileInfo.functions.length) {
        report.unusedHandlers.push({
          file: fileInfo.file,
          functions: unused
        });
      }
    });

    return report;
  }
}

// Instance singleton
const tracker = new IPCTracker();

// Sauvegarder toutes les 10 secondes
setInterval(() => {
  if (tracker.isEnabled) {
    tracker.save();
  }
}, 10000);

// Sauvegarder à la fermeture
process.on('beforeExit', () => {
  if (tracker.isEnabled) {
    tracker.save();
    console.log('📊 Rapport IPC sauvegardé');
  }
});

module.exports = tracker;
