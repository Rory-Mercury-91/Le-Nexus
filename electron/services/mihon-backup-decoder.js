/**
 * Service de décodage des backups Mihon (.tachibk)
 * Utilise protobufjs pour décoder le format protobuf de kotlinx.serialization
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

let protobuf;
try {
  protobuf = require('protobufjs');
} catch (e) {
  console.error('❌ protobufjs n\'est pas installé !');
  console.error('   Installez-le avec: npm install protobufjs');
  throw new Error('protobufjs is not installed');
}

// Chemin vers le fichier .proto (dans le dossier electron)
const PROTO_FILE = path.join(__dirname, 'backup.proto');

/**
 * Décode un fichier backup Mihon (.tachibk)
 * @param {string} filePath - Chemin vers le fichier .tachibk
 * @returns {Promise<Object>} Données décodées du backup
 */
async function decodeMihonBackup(filePath) {
  try {
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier introuvable: ${filePath}`);
    }

    // Vérifier que le fichier .proto existe
    if (!fs.existsSync(PROTO_FILE)) {
      throw new Error(`Fichier .proto introuvable: ${PROTO_FILE}`);
    }

    // Lire et décompresser le fichier
    const compressedData = fs.readFileSync(filePath);
    const decompressedData = zlib.gunzipSync(compressedData);

    // Charger le schéma protobuf
    const root = await protobuf.load(PROTO_FILE);
    const Backup = root.lookupType('Backup');

    // Schéma simplifié (sans BackupPreference) pour gérer les erreurs
    const simpleProto = `
      syntax = "proto3";
      message Backup {
        repeated BackupManga backupManga = 1;
        repeated BackupCategory backupCategories = 2;
        repeated BackupSource backupSources = 101;
        repeated BackupExtensionRepos backupExtensionRepo = 106;
      }
      message BackupManga {
        int64 source = 1;
        string url = 2;
        string title = 3;
        string artist = 4;
        string author = 5;
        string description = 6;
        repeated string genre = 7;
        int32 status = 8;
        string thumbnailUrl = 9;
        int64 dateAdded = 13;
        int32 viewer = 14;
        repeated BackupChapter chapters = 16;
        repeated int64 categories = 17;
        repeated BackupTracking tracking = 18;
        bool favorite = 100;
        int32 chapterFlags = 101;
        int32 viewer_flags = 103;
        repeated BackupHistory history = 104;
        int32 updateStrategy = 105;
        int64 lastModifiedAt = 106;
        int64 favoriteModifiedAt = 107;
        repeated string excludedScanlators = 108;
        int64 version = 109;
        string notes = 110;
        bool initialized = 111;
      }
      message BackupChapter {
        string url = 1;
        string name = 2;
        string scanlator = 3;
        bool read = 4;
        bool bookmark = 5;
        int64 lastPageRead = 6;
        int64 dateFetch = 7;
        int64 dateUpload = 8;
        float chapterNumber = 9;
        int64 sourceOrder = 10;
        int64 lastModifiedAt = 11;
        int64 version = 12;
      }
      message BackupCategory {
        string name = 1;
        int64 order = 2;
        int64 id = 3;
        int64 flags = 100;
      }
      message BackupSource {
        string name = 1;
        int64 sourceId = 2;
      }
      message BackupTracking {
        int32 syncId = 1;
        int64 libraryId = 2;
        int32 mediaIdInt = 3;
        string trackingUrl = 4;
        string title = 5;
        float lastChapterRead = 6;
        int32 totalChapters = 7;
        float score = 8;
        int32 status = 9;
        int64 startedReadingDate = 10;
        int64 finishedReadingDate = 11;
        bool private = 12;
        int64 mediaId = 100;
      }
      message BackupHistory {
        string url = 1;
        int64 lastRead = 2;
        int64 readDuration = 3;
      }
      message BackupExtensionRepos {
        string baseUrl = 1;
        string name = 2;
        string shortName = 3;
        string website = 4;
        string signingKeyFingerprint = 5;
      }
    `;

    let message;
    let usedSimpleSchema = false;
    let MessageType = Backup;

    try {
      // Essayer de décoder avec le schéma complet
      message = Backup.decode(decompressedData);
    } catch (decodeError) {
      // Si échec, utiliser le schéma simplifié
      console.log(`⚠️  Erreur de décodage avec schéma complet: ${decodeError.message}`);
      console.log('   Tentative avec schéma simplifié...');
      
      const simpleRoot = protobuf.parse(simpleProto, { keepCase: true }).root;
      const SimpleBackup = simpleRoot.lookupType('Backup');
      message = SimpleBackup.decode(decompressedData);
      MessageType = SimpleBackup;
      usedSimpleSchema = true;
    }

    // Convertir en objet JavaScript
    const json = MessageType.toObject(message, {
      longs: String,
      enums: String,
      bytes: String,
      defaults: true,
      arrays: true,
      objects: true
    });

    return {
      success: true,
      data: json,
      metadata: {
        decodedAt: new Date().toISOString(),
        sourceFile: filePath,
        schemaUsed: usedSimpleSchema ? 'simplified' : 'full'
      }
    };
  } catch (error) {
    console.error('Erreur lors du décodage du backup Mihon:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { decodeMihonBackup };
