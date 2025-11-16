const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { app } = require('electron');

/**
 * Service de gestion du mot de passe maître jeux adultes
 * Stocké localement sur la machine (pas dans la BDD partagée)
 */

const getConfigPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'adulte-game-protection.json');
};

/**
 * Charger la configuration du mot de passe
 */
const loadConfig = () => {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
    return { hashedPassword: null, createdAt: null };
  } catch (error) {
    console.error('Erreur lecture config mot de passe jeux adultes:', error);
    return { hashedPassword: null, createdAt: null };
  }
};

/**
 * Sauvegarder la configuration du mot de passe
 */
const saveConfig = (config) => {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✅ Configuration mot de passe maître jeux adultes sauvegardée');
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde config mot de passe jeux adultes:', error);
    return false;
  }
};

/**
 * Vérifier si un mot de passe maître est défini
 */
const hasPassword = () => {
  const config = loadConfig();
  return !!config.hashedPassword;
};

/**
 * Définir le mot de passe maître
 */
const setPassword = async (password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const config = {
      hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (saveConfig(config)) {
      console.log('✅ Mot de passe maître jeux adultes défini');
      return { success: true };
    } else {
      return { success: false, error: 'Erreur lors de la sauvegarde' };
    }
  } catch (error) {
    console.error('Erreur définition mot de passe maître jeux adultes:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Vérifier le mot de passe maître
 */
const checkPassword = async (password) => {
  try {
    const config = loadConfig();
    
    if (!config.hashedPassword) {
      return { success: false, error: 'Aucun mot de passe défini' };
    }
    
    const isValid = await bcrypt.compare(password, config.hashedPassword);
    
    if (isValid) {
      console.log('✅ Mot de passe maître jeux adultes valide');
      return { success: true };
    } else {
      console.log('❌ Mot de passe maître jeux adultes invalide');
      return { success: false, error: 'Mot de passe incorrect' };
    }
  } catch (error) {
    console.error('Erreur vérification mot de passe maître jeux adultes:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Supprimer le mot de passe maître (après vérification)
 */
const removePassword = async (currentPassword) => {
  try {
    // Vérifier d'abord le mot de passe actuel
    const checkResult = await checkPassword(currentPassword);
    
    if (!checkResult.success) {
      return { success: false, error: 'Mot de passe incorrect' };
    }
    
    // Supprimer le fichier
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log('✅ Mot de passe maître jeux adultes supprimé');
      return { success: true };
    } else {
      return { success: false, error: 'Aucun mot de passe défini' };
    }
  } catch (error) {
    console.error('Erreur suppression mot de passe maître jeux adultes:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  hasPassword,
  setPassword,
  checkPassword,
  removePassword,
  getConfigPath
};
