/**
 * Service de synchronisation Cloudflare R2
 * Gère l'upload et le download des bases de données
 */

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const crypto = require('crypto');

// Configuration par défaut pour Cloudflare R2
// Compatible avec l'API S3
function createR2Client(endpoint, accessKeyId, secretAccessKey) {
  return new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    }
  });
}

/**
 * Téléverse une base de données vers R2
 * @param {string} dbPath - Chemin local du fichier .db
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2 (ex: https://xxx.r2.cloudflarestorage.com)
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @param {string} uuid - UUID de l'utilisateur
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function uploadDatabase(dbPath, bucketName, endpoint, accessKeyId, secretAccessKey, uuid) {
  try {
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Le fichier de base de données n\'existe pas' };
    }

    const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
    const fileName = `${uuid}.db`;
    const fileContent = fs.readFileSync(dbPath);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileContent,
      ContentType: 'application/x-sqlite3'
    });

    await client.send(command);
    console.log(`✅ Base de données uploadée vers R2: ${fileName}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur upload R2:', error);
    return { success: false, error: error.message || 'Erreur lors de l\'upload' };
  }
}

/**
 * Télécharge une base de données depuis R2
 * @param {string} downloadPath - Chemin de destination local
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @param {string} uuid - UUID de l'utilisateur à télécharger
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function downloadDatabase(downloadPath, bucketName, endpoint, accessKeyId, secretAccessKey, uuid) {
  try {
    const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
    const fileName = `${uuid}.db`;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName
    });

    const response = await client.send(command);
    
    // Créer le répertoire de destination s'il n'existe pas
    const dir = path.dirname(downloadPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Convertir le stream en buffer et sauvegarder
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(downloadPath, buffer);

    console.log(`✅ Base de données téléchargée depuis R2: ${fileName}`);
    return { success: true };
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return { success: false, error: 'Base de données non trouvée sur le serveur' };
    }
    console.error('❌ Erreur download R2:', error);
    return { success: false, error: error.message || 'Erreur lors du téléchargement' };
  }
}

/**
 * Liste toutes les bases de données disponibles dans le bucket
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @returns {Promise<{success: boolean, uuids?: string[], error?: string}>}
 */
async function listDatabases(bucketName, endpoint, accessKeyId, secretAccessKey) {
  try {
    const client = createR2Client(endpoint, accessKeyId, secretAccessKey);

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: '' // Tous les fichiers .db
    });

    const response = await client.send(command);
    const uuids = (response.Contents || [])
      .filter(obj => obj.Key.endsWith('.db'))
      .map(obj => obj.Key.replace('.db', ''));

    return { success: true, uuids };
  } catch (error) {
    console.error('❌ Erreur list R2:', error);
    return { success: false, error: error.message || 'Erreur lors de la liste' };
  }
}

/**
 * Teste la connexion R2
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function testConnection(bucketName, endpoint, accessKeyId, secretAccessKey) {
  try {
    const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
    
    // Tenter de lister les objets (opération simple pour tester la connexion)
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1
    });

    await client.send(command);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur test connexion R2:', error);
    if (error.name === 'NoSuchBucket') {
      return { success: false, error: 'Le bucket n\'existe pas' };
    }
    if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
      return { success: false, error: 'Clés d\'accès invalides' };
    }
    return { success: false, error: error.message || 'Erreur de connexion' };
  }
}

module.exports = {
  uploadDatabase,
  downloadDatabase,
  listDatabases,
  testConnection
};
