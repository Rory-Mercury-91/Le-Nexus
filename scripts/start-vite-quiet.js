#!/usr/bin/env node

/**
 * Script pour lancer Vite en masquant le warning CJS deprecated
 * Ce warning est cosmétique et ne peut pas être corrigé côté utilisateur
 */

const { spawn } = require('child_process');

const vite = spawn('vite', [], {
  stdio: ['inherit', 'inherit', 'pipe'],
  shell: true
});

// Filtrer stderr pour masquer le warning CJS
vite.stderr.on('data', (data) => {
  const output = data.toString();
  
  // Ignorer le warning CJS de Vite
  if (output.includes('The CJS build of Vite')) {
    return; // Ne pas afficher ce warning
  }
  
  // Afficher tous les autres messages d'erreur
  process.stderr.write(data);
});

vite.on('close', (code) => {
  process.exit(code);
});

// Transférer les signaux (Ctrl+C, etc.)
process.on('SIGINT', () => {
  vite.kill('SIGINT');
});

process.on('SIGTERM', () => {
  vite.kill('SIGTERM');
});

