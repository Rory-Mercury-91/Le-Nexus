/**
 * Service de synchronisation des avatars utilisateur via Cloudflare R2
 * Gère l'upload et le download des avatars et met à jour les chemins dans la base de données
 */

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

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
 * Téléverse un avatar vers R2
 * @param {string} avatarPath - Chemin local du fichier avatar
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @param {string} uuid - UUID de l'utilisateur propriétaire de l'avatar
 * @returns {Promise<{success: boolean, r2Path?: string, error?: string}>}
 */
async function uploadAvatar(avatarPath, bucketName, endpoint, accessKeyId, secretAccessKey, uuid) {
  try {
    if (!fs.existsSync(avatarPath)) {
      return { success: false, error: 'Le fichier avatar n\'existe pas' };
    }

    const ext = path.extname(avatarPath);
    const fileName = `avatars/${uuid}${ext}`; // Stocker dans un dossier "avatars" pour organisation
    const fileContent = fs.readFileSync(avatarPath);
    
    // Déterminer le Content-Type selon l'extension
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = contentTypes[ext.toLowerCase()] || 'image/jpeg';

    const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileContent,
      ContentType: contentType
    });

    await client.send(command);
    console.log(`✅ Avatar uploadé vers R2: ${fileName}`);
    return { success: true, r2Path: fileName };
  } catch (error) {
    console.error('❌ Erreur upload avatar R2:', error);
    return { success: false, error: error.message || 'Erreur lors de l\'upload de l\'avatar' };
  }
}

/**
 * Télécharge un avatar depuis R2
 * @param {string} downloadPath - Chemin de destination local
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @param {string} uuid - UUID de l'utilisateur
 * @returns {Promise<{success: boolean, localPath?: string, error?: string}>}
 */
async function downloadAvatar(downloadPath, bucketName, endpoint, accessKeyId, secretAccessKey, uuid) {
  try {
    const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
    
    // Chercher l'avatar dans R2 (peut avoir différentes extensions)
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    let avatarFound = false;
    let r2Key = null;
    let ext = null;

    for (const extension of extensions) {
      const fileName = `avatars/${uuid}${extension}`;
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: fileName
        });
        await client.send(command);
        r2Key = fileName;
        ext = extension;
        avatarFound = true;
        break;
      } catch (error) {
        if (error.name !== 'NoSuchKey') {
          throw error;
        }
      }
    }

    if (!avatarFound) {
      return { success: false, error: 'Avatar non trouvé sur le serveur' };
    }

    // Télécharger l'avatar
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: r2Key
    });

    const response = await client.send(command);
    
    // Créer le répertoire de destination s'il n'existe pas
    const dir = path.dirname(downloadPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Déterminer le chemin final avec la bonne extension
    const finalPath = downloadPath.replace(/\.[^.]+$/, ext) || downloadPath + ext;

    // Convertir le stream en buffer et sauvegarder
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(finalPath, buffer);

    console.log(`✅ Avatar téléchargé depuis R2: ${r2Key} -> ${finalPath}`);
    return { success: true, localPath: finalPath };
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return { success: false, error: 'Avatar non trouvé sur le serveur' };
    }
    console.error('❌ Erreur download avatar R2:', error);
    return { success: false, error: error.message || 'Erreur lors du téléchargement de l\'avatar' };
  }
}

/**
 * Synchronise tous les avatars des utilisateurs depuis R2
 * Télécharge les avatars manquants et met à jour les chemins dans la base de données
 * @param {Database} db - Instance de la base de données
 * @param {string} profilesPath - Chemin vers le dossier profiles local
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @returns {Promise<{success: boolean, downloaded: number, errors: Array}>}
 */
async function syncAllAvatars(db, profilesPath, bucketName, endpoint, accessKeyId, secretAccessKey) {
  try {
    const users = db.prepare('SELECT id, name, sync_uuid, avatar_path FROM users WHERE sync_uuid IS NOT NULL').all();
    let downloaded = 0;
    const errors = [];

    // Créer le dossier profiles s'il n'existe pas
    if (!fs.existsSync(profilesPath)) {
      fs.mkdirSync(profilesPath, { recursive: true });
    }

    for (const user of users) {
      if (!user.sync_uuid) continue;

      // Vérifier si l'avatar local existe
      let localAvatarExists = false;
      if (user.avatar_path) {
        const localPath = path.isAbsolute(user.avatar_path) 
          ? user.avatar_path 
          : path.join(profilesPath, path.basename(user.avatar_path));
        localAvatarExists = fs.existsSync(localPath);
      }

      // Si l'avatar local n'existe pas, essayer de le télécharger depuis R2
      if (!localAvatarExists) {
        const downloadPath = path.join(profilesPath, `${user.name.toLowerCase().replace(/\s+/g, '_')}`);
        const result = await downloadAvatar(downloadPath, bucketName, endpoint, accessKeyId, secretAccessKey, user.sync_uuid);
        
        if (result.success && result.localPath) {
          // Mettre à jour le chemin dans la base de données
          db.prepare('UPDATE users SET avatar_path = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .run(result.localPath, user.id);
          downloaded++;
          console.log(`✅ Avatar téléchargé et mis à jour pour: ${user.name}`);
        } else if (result.error && !result.error.includes('non trouvé')) {
          errors.push({ user: user.name, error: result.error });
        }
      }
    }

    return { success: true, downloaded, errors };
  } catch (error) {
    console.error('❌ Erreur synchronisation avatars:', error);
    return { success: false, downloaded: 0, errors: [{ error: error.message }] };
  }
}

module.exports = {
  uploadAvatar,
  downloadAvatar,
  syncAllAvatars
};
