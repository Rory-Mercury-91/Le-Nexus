const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Importer FFmpeg
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
let ffmpegPath = ffmpegInstaller.path;

// Fonction pour corriger le chemin FFmpeg en production
function getFfmpegPath() {
  try {
    const { app } = require('electron');

    // En production, FFmpeg est dans app.asar.unpacked (via asarUnpack)
    // Si le chemin actuel pointe vers app.asar, corriger pour pointer vers app.asar.unpacked
    if (app && app.isPackaged && ffmpegPath.includes('app.asar')) {
      // Remplacer app.asar par app.asar.unpacked dans le chemin
      const correctedPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');

      // Vérifier si le chemin corrigé existe
      if (fs.existsSync(correctedPath)) {
        console.log(`🔧 FFmpeg path corrigé pour production: ${correctedPath}`);
        return correctedPath;
      } else {
        console.warn(`⚠️ Chemin FFmpeg corrigé introuvable: ${correctedPath}`);
        console.warn(`   Utilisation du chemin original: ${ffmpegPath}`);
      }
    }
  } catch (error) {
    // Si app n'est pas disponible, utiliser le chemin original
    console.warn('⚠️ Impossible d\'accéder à app, utilisation du chemin FFmpeg par défaut');
  }

  return ffmpegPath;
}

// Résoudre le chemin FFmpeg (seulement quand nécessaire, pas au chargement du module)
let resolvedFfmpegPath = null;

function resolveFfmpegPath() {
  if (!resolvedFfmpegPath) {
    resolvedFfmpegPath = getFfmpegPath();

    // Vérifier que FFmpeg existe
    if (!fs.existsSync(resolvedFfmpegPath)) {
      console.error(`❌ FFmpeg introuvable à: ${resolvedFfmpegPath}`);
      console.error(`   Vérifiez que @ffmpeg-installer/ffmpeg est bien installé et dans asarUnpack`);
      console.error(`   Chemin original: ${ffmpegPath}`);
    } else {
      console.log(`✅ FFmpeg trouvé à: ${resolvedFfmpegPath}`);
    }
  }

  return resolvedFfmpegPath;
}

const ffmpeg = require('fluent-ffmpeg');
const { PORTS } = require('../config/constants');
const net = require('net');

let streamingServer = null;
let streamingPort = PORTS.STREAMING_SERVER; // Port initial pour le serveur de streaming

// Vérifie si un port est libre sur l'interface donnée
function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        // EADDRINUSE -> occupé
        resolve(false);
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, host);
  });
}

/**
 * Obtenir les métadonnées d'une vidéo (durée, etc.) en utilisant FFmpeg directement
 * Car FFprobe n'est pas inclus dans @ffmpeg-installer/ffmpeg
 */
function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    // Utiliser FFmpeg avec -i pour obtenir les informations
    const ffmpegExePath = resolveFfmpegPath();

    // Si FFmpeg n'existe pas, résoudre avec durée 0 (ne pas bloquer)
    if (!fs.existsSync(ffmpegExePath)) {
      console.warn(`⚠️ FFmpeg introuvable, utilisation de durée 0 pour: ${filePath}`);
      resolve({
        format: {
          duration: 0
        }
      });
      return;
    }

    const ffmpegProcess = spawn(ffmpegExePath, ['-i', filePath], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';

    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpegProcess.on('close', (code) => {
      // FFmpeg retourne toujours un code d'erreur quand on utilise -i sans sortie
      // Mais les infos sont dans stderr
      try {
        // Parser la durée depuis stderr (ex: "Duration: 01:23:45.67")
        const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        let duration = 0;

        if (durationMatch) {
          const hours = parseInt(durationMatch[1], 10);
          const minutes = parseInt(durationMatch[2], 10);
          const seconds = parseInt(durationMatch[3], 10);
          const centiseconds = parseInt(durationMatch[4], 10);

          duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        }

        resolve({
          format: {
            duration: duration
          }
        });
      } catch (err) {
        // Si on ne peut pas parser, retourner 0 (sans erreur pour ne pas bloquer)
        console.warn(`⚠️ Impossible de parser la durée pour ${filePath}, utilisation de 0`);
        resolve({
          format: {
            duration: 0
          }
        });
      }
    });

    ffmpegProcess.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Obtenir les pistes audio et sous-titre disponibles d'une vidéo
 * Retourne un objet avec { audio: [], subtitles: [] }
 */
function getVideoTracks(filePath) {
  return new Promise((resolve, reject) => {
    const ffmpegExePath = resolveFfmpegPath();

    if (!fs.existsSync(ffmpegExePath)) {
      console.warn(`⚠️ FFmpeg introuvable, impossible de détecter les pistes pour: ${filePath}`);
      resolve({ audio: [], subtitles: [] });
      return;
    }

    const ffmpegProcess = spawn(ffmpegExePath, ['-i', filePath], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';

    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpegProcess.on('close', () => {
      try {
        const audioTracks = [];
        const subtitleTracks = [];

        // Parser les streams depuis stderr
        // Format: "Stream #0:1(fra): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 128 kb/s (default)"
        // ou: "Stream #0:2(eng): Subtitle: subrip (srt / 0x74727473)"
        // L'index dans "Stream #0:N" est l'index global du stream dans le fichier
        const streamRegex = /Stream #(\d+):(\d+)(\(([^)]+)\))?: (Audio|Video|Subtitle):/g;
        let match;
        let audioTrackCounter = 0; // Compteur pour l'index dans la liste des pistes audio uniquement

        while ((match = streamRegex.exec(stderr)) !== null) {
          const streamGlobalIndex = parseInt(match[2], 10); // Index global dans le fichier (ex: Stream #0:2)
          const streamType = match[5];
          const language = match[4] || 'unknown';

          // Extraire les métadonnées supplémentaires
          const streamInfo = stderr.substring(match.index, stderr.indexOf('\n', match.index));
          let title = '';
          const titleMatch = streamInfo.match(/title\s*:\s*"([^"]+)"/i);
          if (titleMatch) {
            title = titleMatch[1];
          }

          if (streamType === 'Audio') {
            // Stocker l'index global ET l'index dans la liste audio
            audioTracks.push({
              index: streamGlobalIndex, // Index global du stream
              audioIndex: audioTrackCounter++, // Index dans la liste des pistes audio (0, 1, 2...)
              language: language,
              title: title || `${language.toUpperCase()} Audio`,
              codec: streamInfo.match(/Audio:\s*([^\s,]+)/)?.[1] || 'unknown'
            });
          } else if (streamType === 'Subtitle') {
            subtitleTracks.push({
              index: streamGlobalIndex, // Index global du stream
              language: language,
              title: title || `${language.toUpperCase()} Subtitles`,
              codec: streamInfo.match(/Subtitle:\s*([^\s,]+)/)?.[1] || 'unknown'
            });
          }
        }

        // Trier par audioIndex (index dans la liste audio)
        audioTracks.sort((a, b) => a.audioIndex - b.audioIndex);
        subtitleTracks.sort((a, b) => a.index - b.index);

        resolve({
          audio: audioTracks,
          subtitles: subtitleTracks
        });
      } catch (err) {
        console.warn(`⚠️ Impossible de parser les pistes pour ${filePath}:`, err.message);
        resolve({ audio: [], subtitles: [] });
      }
    });

    ffmpegProcess.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Démarrer le serveur de streaming vidéo
 */
function startStreamingServer() {
  if (streamingServer) {
    console.log('✅ Serveur de streaming déjà démarré');
    return streamingServer;
  }

  streamingServer = http.createServer((req, res) => {
    // Parser l'URL pour obtenir le chemin du fichier
    const url = new URL(req.url, `http://localhost:${streamingPort}`);
    const filePath = url.searchParams.get('file');

    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Paramètre "file" manquant');
      return;
    }

    // Décoder le chemin du fichier
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(filePath);
    } catch (e) {
      decodedPath = filePath;
    }

    console.log(`📹 [Streaming] Requête pour: ${decodedPath}`);

    // Vérifier que le fichier existe
    if (!fs.existsSync(decodedPath)) {
      console.error(`❌ Fichier introuvable: ${decodedPath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Fichier introuvable');
      return;
    }

    const ext = path.extname(decodedPath).toLowerCase();

    // Si c'est un MKV ou AVI, transcoder en MP4
    if (ext === '.mkv' || ext === '.avi') {
      const formatName = ext === '.mkv' ? 'MKV' : 'AVI';
      console.log(`🔄 [Streaming] Transcodage ${formatName} → MP4: ${decodedPath}`);

      // Obtenir la position de départ si demandée (seeking)
      const startTime = url.searchParams.get('start') || '0';
      const seekPosition = parseFloat(startTime) || 0;

      // Obtenir les pistes audio et sous-titre sélectionnées
      const audioTrackParam = url.searchParams.get('audioTrack');
      const subtitleTrackParam = url.searchParams.get('subtitleTrack');
      const audioTrackIndex = audioTrackParam !== null ? parseInt(audioTrackParam, 10) : null;
      const subtitleTrackIndex = subtitleTrackParam !== null ? parseInt(subtitleTrackParam, 10) : null;

      // Obtenir les métadonnées pour la durée
      getVideoMetadata(decodedPath).then(metadata => {
        const duration = metadata.format.duration || 0; // Durée en secondes

        // Stocker la référence au processus FFmpeg pour pouvoir le tuer si nécessaire
        let ffmpegChildProcess = null;

        // Vérifier que FFmpeg est disponible avant de transcoder
        const ffmpegExePath = resolveFfmpegPath();
        if (!fs.existsSync(ffmpegExePath)) {
          console.error(`❌ FFmpeg introuvable, impossible de transcoder: ${decodedPath}`);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
          }
          res.end('FFmpeg non disponible. Impossible de transcoder ce fichier vidéo.');
          return;
        }

        // Configurer le chemin FFmpeg pour fluent-ffmpeg
        ffmpeg.setFfmpegPath(ffmpegExePath);

        // Créer le processus FFmpeg pour transcoder
        const ffmpegCommand = ffmpeg(decodedPath);

        // Configurer le mapping des pistes
        // Par défaut, on prend uniquement le premier stream vidéo (0:0) et la première piste audio (0:a:0)
        // Ne pas utiliser 0:v car cela mappe TOUS les streams vidéo, y compris les images JPEG
        let mapOptions = ['-map', '0:0']; // Premier stream vidéo uniquement

        if (audioTrackIndex !== null && !isNaN(audioTrackIndex) && audioTrackIndex >= 0) {
          // Utiliser la piste audio spécifiée
          // audioTrackIndex est l'index global du stream (ex: Stream #0:2)
          // On utilise -map 0:N où N est l'index global du stream
          mapOptions.push('-map', `0:${audioTrackIndex}`);
          console.log(`🎵 [FFmpeg] Utilisation de la piste audio (stream index: ${audioTrackIndex})`);
        } else {
          // Utiliser la première piste audio par défaut
          // On doit d'abord trouver l'index du premier stream audio
          // Pour l'instant, on utilise -map 0:a:0 qui sélectionne le premier stream audio
          mapOptions.push('-map', '0:a:0');
        }

        // Note: Les sous-titres ne peuvent pas être intégrés dans un flux MP4 de cette manière
        // Il faudrait utiliser un format différent ou brûler les sous-titres dans la vidéo
        // Pour l'instant, on ignore subtitleTrackIndex car MP4 ne supporte pas bien les sous-titres en streaming

        // Si on cherche une position, commencer à partir de cette position
        if (seekPosition > 0) {
          ffmpegCommand.seekInput(seekPosition);
          console.log(`⏩ [FFmpeg] Seeking à ${seekPosition}s`);
        }

        ffmpegCommand
          .videoCodec('libx264') // Codec vidéo H.264
          .audioCodec('aac') // Codec audio AAC
          .format('mp4')
          .videoBitrate('3000k') // Qualité vidéo
          .audioBitrate('192k') // Qualité audio
          .fps(30)
          .outputOptions([
            ...mapOptions, // Ajouter les options de mapping des pistes
            '-movflags', 'frag_keyframe+empty_moov+faststart', // Permet le streaming avec seeking amélioré
            '-preset', 'ultrafast', // Transcodage rapide
            '-tune', 'zerolatency', // Latence minimale
            '-threads', '0', // Utiliser tous les threads disponibles
            '-g', '30', // GOP size pour améliorer le seeking
            '-max_muxing_queue_size', '1024', // Limiter la taille de la queue pour éviter "Too many packets buffered"
            '-fflags', '+genpts' // Générer les timestamps si manquants
          ])
          .on('start', (commandLine) => {
            const formatName = ext === '.mkv' ? 'MKV' : 'AVI';
            console.log(`▶️ [FFmpeg] Transcodage ${formatName} démarré${seekPosition > 0 ? ` à ${seekPosition}s` : ''}`);
            // Capturer le processus enfant pour pouvoir le tuer si nécessaire
            ffmpegChildProcess = ffmpegCommand.ffmpegProc;
          })
          .on('error', (err, stdout, stderr) => {
            console.error('❌ [FFmpeg] Erreur:', err.message);
            if (stderr) {
              console.error('   Stderr:', stderr);
            }
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
            }
            try {
              res.end(`Erreur de transcodage: ${err.message}`);
            } catch (e) {
              // Ignorer les erreurs si la connexion est déjà fermée
            }
          })
          .on('end', () => {
            console.log('✅ [FFmpeg] Transcodage terminé');
            try {
              res.end();
            } catch (e) {
              // Ignorer les erreurs si la connexion est déjà fermée
            }
          });

        // Headers pour le streaming (avec durée si disponible)
        const headers = {
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Transfer-Encoding': 'chunked'
        };

        // Ajouter la durée dans les headers personnalisés (pour référence)
        if (duration > 0) {
          headers['X-Video-Duration'] = duration.toString();
        }

        res.writeHead(200, headers);

        // Streamer le résultat vers la réponse HTTP
        try {
          ffmpegCommand.pipe(res, { end: false });
        } catch (error) {
          console.error('❌ Erreur création stream FFmpeg:', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
          }
          res.end(`Erreur: ${error.message}`);
          return;
        }

        // Gérer la fermeture de la connexion
        req.on('close', () => {
          console.log('🛑 [Streaming] Connexion fermée par le client');
          try {
            if (ffmpegChildProcess) {
              ffmpegChildProcess.kill('SIGKILL');
            }
          } catch (e) {
            // Ignorer les erreurs
          }
        });

        req.on('aborted', () => {
          console.log('🛑 [Streaming] Requête annulée');
          try {
            if (ffmpegChildProcess) {
              ffmpegChildProcess.kill('SIGKILL');
            }
          } catch (e) {
            // Ignorer les erreurs
          }
        });
      }).catch(err => {
        console.error('❌ Erreur récupération métadonnées:', err);
        // Si on ne peut pas obtenir les métadonnées, continuer quand même
        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Transfer-Encoding': 'chunked'
        });

        // Vérifier que FFmpeg est disponible avant de transcoder
        const ffmpegExePath = resolveFfmpegPath();
        if (!fs.existsSync(ffmpegExePath)) {
          console.error(`❌ FFmpeg introuvable, impossible de transcoder: ${decodedPath}`);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
          }
          res.end('FFmpeg non disponible. Impossible de transcoder ce fichier vidéo.');
          return;
        }

        // Configurer le chemin FFmpeg pour fluent-ffmpeg
        ffmpeg.setFfmpegPath(ffmpegExePath);

        // Créer le processus FFmpeg sans métadonnées
        let ffmpegChildProcess = null;
        const ffmpegCommand = ffmpeg(decodedPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .format('mp4')
          .videoBitrate('3000k')
          .audioBitrate('192k')
          .fps(30)
          .outputOptions([
            '-movflags', 'frag_keyframe+empty_moov+faststart',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-threads', '0',
            '-g', '30'
          ])
          .on('start', () => {
            ffmpegChildProcess = ffmpegCommand.ffmpegProc;
          })
          .on('error', (err) => {
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
            }
            try {
              res.end(`Erreur: ${err.message}`);
            } catch (e) { }
          })
          .on('end', () => {
            try {
              res.end();
            } catch (e) { }
          })
          .pipe(res, { end: false });

        req.on('close', () => {
          if (ffmpegChildProcess) {
            ffmpegChildProcess.kill('SIGKILL');
          }
        });
      });
    } else {
      // Pour les autres formats, servir directement le fichier
      console.log(`📁 [Streaming] Service direct: ${decodedPath}`);
      const fileStream = fs.createReadStream(decodedPath);
      const stat = fs.statSync(decodedPath);

      const mimeTypes = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo'
      };

      const contentType = mimeTypes[ext] || 'video/mp4';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      });

      fileStream.pipe(res);

      req.on('close', () => {
        fileStream.destroy();
      });
    }
  });

  // Trouver un port libre en évitant explicitement le port du serveur d'import
  (async () => {
    const maxAttempts = 200; // Plage d'exploration
    let attempt = 0;
    let candidate = streamingPort;

    while (attempt < maxAttempts) {
      // Ne pas utiliser le port réservé IMPORT_SERVER
      if (candidate === PORTS.IMPORT_SERVER) {
        console.warn(`⚠️ Port ${candidate} réservé pour le serveur d'import: saut vers ${candidate + 1}`);
        candidate++;
        attempt++;
        continue;
      }

      const free = await isPortFree(candidate, '127.0.0.1');
      if (free) break;

      candidate++;
      attempt++;
    }

    if (attempt >= maxAttempts) {
      console.error('❌ Impossible de trouver un port libre pour le streaming (plage atteinte)');
    } else {
      streamingPort = candidate;
      streamingServer.listen(streamingPort, '127.0.0.1', () => {
        if (streamingPort !== PORTS.STREAMING_SERVER) {
          console.warn(`⚠️ Port ${PORTS.STREAMING_SERVER} occupé → serveur de streaming démarré sur http://127.0.0.1:${streamingPort}`);
        } else {
          console.log(`✅ Serveur de streaming vidéo démarré sur http://127.0.0.1:${streamingPort}`);
        }
      });

      streamingServer.on('error', (err) => {
        console.error('❌ Erreur serveur de streaming:', err);
      });
    }
  })();

  return streamingServer;
}

/**
 * Arrêter le serveur de streaming
 */
function stopStreamingServer() {
  if (streamingServer) {
    streamingServer.close();
    streamingServer = null;
    console.log('🛑 Serveur de streaming arrêté');
  }
}

/**
 * Obtenir l'URL de streaming pour un fichier
 */
function getStreamingUrl(filePath) {
  if (!streamingServer) {
    startStreamingServer();
  }

  const encodedPath = encodeURIComponent(filePath.replace(/\\/g, '/'));
  return `http://127.0.0.1:${streamingPort}/?file=${encodedPath}`;
}

/**
 * Vérifier si un fichier nécessite un transcodage
 */
function needsTranscoding(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  // MKV et AVI nécessitent un transcodage pour être lus dans le navigateur
  return ext === '.mkv' || ext === '.avi';
}

module.exports = {
  startStreamingServer,
  stopStreamingServer,
  getStreamingUrl,
  needsTranscoding,
  getVideoTracks
};
