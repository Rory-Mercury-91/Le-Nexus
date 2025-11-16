const fs = require('fs');
const path = require('path');
const os = require('os');
const { resolveStorageDirectories } = require('./sync-error-reporter');

class SessionLogger {
  constructor() {
    this.started = false;
    this.filePath = null;
    this.data = null;
    this.startTime = null;
  }

  start(store = null, options = {}) {
    if (this.started) {
      return;
    }

    try {
      const dirs = resolveStorageDirectories();
      const sessionsDir = path.join(dirs.reportsDir, 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });

      const timestamp = new Date().toISOString();
      const sessionId = `session_${timestamp.replace(/[:.]/g, '-')}`;
      this.filePath = path.join(sessionsDir, `${sessionId}.json`);

      const currentUser = store?.get ? store.get('currentUser', '') : null;
      const appVersion = options.appVersion || null;

      this.startTime = Date.now();
      this.data = {
        sessionId,
        startedAt: timestamp,
        lastUpdated: timestamp,
        endedAt: null,
        durationMs: null,
        appVersion,
        baseDirectory: dirs.baseDir,
        currentUser,
        host: os.hostname(),
        counters: {},
        notes: []
      };

      this.started = true;
      this.flush();
    } catch (error) {
      console.warn('[session-logger] Impossible de démarrer la session:', error.message || error);
    }
  }

  ensureStarted() {
    if (!this.started) {
      this.start();
    }
  }

  mergeMetrics(target, metrics) {
    if (!metrics || typeof metrics !== 'object') {
      return target || {};
    }

    const result = target ? { ...target } : {};

    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        result[key] = (result[key] || 0) + value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.mergeMetrics(result[key] || {}, value);
      }
    }

    return result;
  }

  record(category, status = 'success', metrics = null) {
    this.ensureStarted();
    if (!this.data) {
      return;
    }

    const normalizedStatus = status === 'error' ? 'error' : 'success';
    const entry = this.data.counters[category] || { success: 0, error: 0, metrics: {} };
    entry[normalizedStatus] = (entry[normalizedStatus] || 0) + 1;

    if (metrics && typeof metrics === 'object') {
      entry.metrics = this.mergeMetrics(entry.metrics, metrics);
    }

    this.data.counters[category] = entry;
    this.data.lastUpdated = new Date().toISOString();
    this.flush();
  }

  addNote(message) {
    this.ensureStarted();
    if (!this.data) {
      return;
    }
    this.data.notes.push({
      timestamp: new Date().toISOString(),
      message
    });
    this.data.lastUpdated = new Date().toISOString();
    this.flush();
  }

  flush() {
    if (!this.started || !this.filePath || !this.data) {
      return;
    }

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), { encoding: 'utf-8' });
    } catch (error) {
      console.warn('[session-logger] Impossible d\'écrire le fichier de session:', error.message || error);
    }
  }

  end() {
    if (!this.started || !this.data) {
      return;
    }

    this.data.endedAt = new Date().toISOString();
    this.data.durationMs = Date.now() - (this.startTime || Date.now());
    this.data.durationSeconds = Number((this.data.durationMs / 1000).toFixed(1));
    this.flush();

    this.started = false;
    this.filePath = null;
    this.data = null;
    this.startTime = null;
  }
}

module.exports = new SessionLogger();

