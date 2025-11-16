/**
 * Traduction des synopsis MAL
 * Traduit les synopsis des animes depuis l'anglais vers le français via Groq AI
 */

const fetch = require('node-fetch');

/**
 * Traduit les synopsis des animes via Groq AI en arrière-plan
 * @param {Object} db - Instance de la base de données
 * @param {Object} store - Instance du store Electron
 * @param {Function} onProgress - Callback pour notifier la progression (optionnel)
 */
async function translateSynopsisInBackground(db, store, onProgress = null) {
  try {
    // Récupérer la clé API Groq depuis le store principal
    const groqApiKey = store.get('groqApiKey');
    
    if (!groqApiKey) {
      console.log('⚠️ Clé API Groq non configurée, traduction des synopsis ignorée');
      return { translated: 0, skipped: 0, total: 0 };
    }
    
    console.log('🤖 Démarrage de la traduction des synopsis en arrière-plan...');
    
    // Récupérer TOUS les animes avec synopsis en anglais non traduit (pas de LIMIT)
    const animesToTranslate = db.prepare(`
      SELECT id, titre, description
      FROM anime_series
      WHERE description IS NOT NULL 
        AND description != ''
        AND description NOT LIKE '%Synopsis français%'
        AND description NOT LIKE '%traduit automatiquement%'
        AND description NOT LIKE 'https://myanimelist.net/anime/%'
      ORDER BY id DESC
    `).all();
    
    const total = animesToTranslate.length;
    
    if (total === 0) {
      console.log('✅ Aucun synopsis à traduire');
      return { translated: 0, skipped: 0, total: 0 };
    }
    
    console.log(`📝 ${total} synopsis à traduire (durée estimée: ~${Math.ceil(total * 3.5 / 60)} minutes)`);
    
    let translated = 0;
    let skipped = 0;
    const updateStmt = db.prepare('UPDATE anime_series SET description = ? WHERE id = ?');
    
    for (let i = 0; i < animesToTranslate.length; i++) {
      const anime = animesToTranslate[i];
      
      // Pause pour éviter le gel de l'UI
      await new Promise(resolve => setImmediate(resolve));
      
      try {
        // Notifier la progression
        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            translated,
            skipped,
            currentAnime: anime.titre
          });
        }
        
        // Respecter le rate limit Groq (délai augmenté à 3.5s pour éviter les 429)
        await new Promise(resolve => setTimeout(resolve, 3500));
        
        // Système de retry pour les erreurs 429 (rate limit)
        let retryCount = 0;
        const maxRetries = 2;
        let response;
        let success = false;
        
        while (retryCount <= maxRetries && !success) {
          response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content: 'Tu es un traducteur professionnel spécialisé dans les animes. Traduis le synopsis suivant en français de manière naturelle et fluide. Ne traduis PAS les noms de personnages, de lieux, ou de techniques. Retourne UNIQUEMENT la traduction, sans introduction ni conclusion.'
                },
                {
                  role: 'user',
                  content: anime.description
                }
              ],
              temperature: 0.3,
              max_tokens: 1000
            })
          });
          
          if (response.ok) {
            success = true;
          } else if (response.status === 429 && retryCount < maxRetries) {
            // Rate limit atteint : attendre plus longtemps avant de réessayer
            retryCount++;
            const waitTime = 10000 * retryCount; // 10s, 20s
            console.warn(`⚠️ Rate limit (429) pour "${anime.titre}", retry ${retryCount}/${maxRetries} dans ${waitTime/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            // Autre erreur ou max retries atteint
            break;
          }
        }
        
        if (!response.ok) {
          console.warn(`⚠️ Erreur traduction "${anime.titre}": ${response.status} (après ${retryCount} retry)`);
          skipped++;
          continue;
        }
        
        const data = await response.json();
        const translatedSynopsis = data.choices[0]?.message?.content?.trim();
        
        if (translatedSynopsis) {
          // Ajouter une mention de traduction
          const finalSynopsis = `${translatedSynopsis}\n\n(Synopsis français traduit automatiquement)`;
          updateStmt.run(finalSynopsis, anime.id);
          translated++;
          console.log(`✅ Traduit (${translated}/${total}): "${anime.titre}"`);
        } else {
          skipped++;
        }
      } catch (error) {
        console.warn(`⚠️ Erreur traduction "${anime.titre}":`, error.message);
        skipped++;
      }
    }
    
    console.log(`🎉 Traduction terminée: ${translated}/${total} synopsis traduits (${skipped} ignorés)`);
    
    return { translated, skipped, total };
    
  } catch (error) {
    console.error('❌ Erreur traduction synopsis:', error);
    return { translated: 0, skipped: 0, total: 0, error: error.message };
  }
}

module.exports = {
  translateSynopsisInBackground
};
