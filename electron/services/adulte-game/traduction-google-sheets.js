/**
 * API Google Sheets pour les traductions jeux adultes
 * Récupère les données depuis les Google Sheets
 */

const { google } = require('googleapis');

// Configuration Google Sheets API
const GOOGLE_SHEETS_API_KEY = 'AIzaSyDf-okvwDpqO2XuY18z6ckx1io8d6k8aBk';
const SPREADSHEET_ID = '1ELRF0kpF8SoUlslX5ZXZoG4WXeWST6lN9bLws32EPfs';
const SHEET_NAME = 'Jeux'; // Nom de l'onglet (à ajuster si nécessaire)
const RANGE = 'A2:N'; // De la ligne 2 (après l'en-tête) jusqu'à la colonne N (image URL)
const TRADUCTEURS_SHEET_NAME = 'Traducteurs/Relecteurs'; // Onglet des traducteurs

/**
 * Récupère et parse les données du Google Sheet via l'API
 * @returns {Promise<Array>} Données parsées
 */
async function fetchGoogleSheet() {
  try {
    console.log('📥 Téléchargement Google Sheet via API...');
    
    // Initialiser l'API Google Sheets
    const sheets = google.sheets({ version: 'v4', auth: GOOGLE_SHEETS_API_KEY });
    
    // Récupérer les valeurs ET les formules
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      ranges: [`'${SHEET_NAME}'!${RANGE}`],
      fields: 'sheets(data(rowData(values(formattedValue,hyperlink,userEnteredValue))))'
    });
    
    const rows = response.data.sheets[0].data[0].rowData || [];
    
    const data = [];
    let lewdCornerUrlsIgnored = 0;
    
    for (const row of rows) {
      const cells = row.values || [];
      
      // Colonnes : A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12
      const id = parseInt(cells[0]?.formattedValue) || null;
      const site = cells[1]?.formattedValue || '';
      const nom = cells[2]?.formattedValue || '';
      const version = cells[3]?.formattedValue || '';
      const versionTraduite = cells[4]?.formattedValue || '';
      
      // IMPORTANT : Extraire le lien depuis la formule HYPERLINK ou le champ hyperlink
      let lienTraduction = '';
      const cellF = cells[5];
      if (cellF) {
        // Si c'est un lien hypertexte Google Sheets
        if (cellF.hyperlink) {
          lienTraduction = cellF.hyperlink;
        }
        // Sinon essayer de parser la formule
        else if (cellF.userEnteredValue?.formulaValue) {
          const formula = cellF.userEnteredValue.formulaValue;
          const match = formula.match(/=(?:LIEN_HYPERTEXTE|HYPERLINK)\s*\(\s*"([^"]+)"\s*[;,]/i);
          if (match) {
            lienTraduction = match[1];
          }
        }
        // Sinon prendre la valeur formatée
        else {
          lienTraduction = cellF.formattedValue || '';
        }
      }
      
      const statut = cells[6]?.formattedValue || '';
      const tags = cells[7]?.formattedValue || '';
      const moteur = cells[8]?.formattedValue || '';
      const traducteur = cells[9]?.formattedValue || '';
      // cells[10] = Relecteur (ignoré)
      const typeTraduction = cells[11]?.formattedValue || '';
      const actif = cells[12]?.formattedValue?.trim().toUpperCase() === 'TRUE';
      // cells[13] = Colonne N (URL image de secours)
      let imageUrl = cells[13]?.formattedValue || null;
      
      // Ignorer les URLs LewdCorner (403 Forbidden)
      if (imageUrl && imageUrl.includes('lewdcorner.com')) {
        lewdCornerUrlsIgnored++;
        imageUrl = null;
      }
      
      // Ignorer les lignes vides
      if (!id && !nom) continue;
      
      data.push({
        id,
        site,
        nom,
        version,
        versionTraduite,
        lienTraduction,
        statut,
        tags,
        moteur,
        traducteur,
        typeTraduction,
        actif,
        imageUrl
      });
    }
    
    console.log(`📥 ${data.length} lignes récupérées depuis Google Sheet (avant filtrage par traducteur)`);
    if (lewdCornerUrlsIgnored > 0) {
      console.log(`🚫 ${lewdCornerUrlsIgnored} URLs LewdCorner ignorées (403 Forbidden)`);
    }
    return data;
  } catch (error) {
    console.error('❌ Erreur fetch Google Sheet:', error);
    console.error('Détails:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Récupère la liste des traducteurs depuis le Google Sheet
 * @returns {Promise<Array<string>>} Liste des traducteurs
 */
async function fetchTraducteurs() {
  try {
    console.log('📥 Téléchargement liste des traducteurs depuis Google Sheet...');
    
    // Initialiser l'API Google Sheets
    const sheets = google.sheets({ version: 'v4', auth: GOOGLE_SHEETS_API_KEY });
    
    // Récupérer la colonne A de l'onglet Traducteurs
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TRADUCTEURS_SHEET_NAME}'!A:A` // Toute la colonne A (guillemets pour caractères spéciaux)
    });
    
    const rows = response.data.values || [];
    const traducteurs = rows
      .slice(1) // Skip header row (NOM)
      .map(row => row[0])
      .filter(name => name && name.trim())
      .map(name => name.trim());
    
    console.log(`✅ ${traducteurs.length} traducteurs récupérés`);
    return traducteurs;
  } catch (error) {
    console.error('❌ Erreur fetch traducteurs:', error);
    console.error('Détails:', error.response?.data || error.message);
    // Retourner une liste vide en cas d'erreur
    return [];
  }
}

module.exports = {
  fetchGoogleSheet,
  fetchTraducteurs
};
