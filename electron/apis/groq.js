const Groq = require('groq-sdk');

/**
 * Traduit un texte avec Groq AI
 * @param {string} text - Texte à traduire
 * @param {string} apiKey - Clé API Groq
 * @param {string} targetLang - Langue cible (par défaut 'fr')
 * @param {string} context - Contexte optionnel pour le prompt (ex: 'anime', 'manga')
 * @returns {Promise<{ success: boolean, text: string, error?: string }>}
 */
async function translateText(text, apiKey, targetLang = 'fr', context = 'anime et manga', retries = 3) {
  try {
    if (!apiKey || !text || text.length < 10) {
      return { 
        success: false, 
        text, 
        error: 'Clé API manquante ou texte trop court' 
      };
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `Tu es un traducteur professionnel spécialisé en ${context}. Traduis le texte suivant en ${targetLang === 'fr' ? 'français' : targetLang}. Ne renvoie QUE la traduction, sans commentaires, sans notes, sans explications.`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: text
            }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_tokens: 2000
        });

        const translatedText = response.choices[0]?.message?.content?.trim();
        
        if (!translatedText) {
          return { success: false, text, error: 'Aucune traduction reçue' };
        }

        return { success: true, text: translatedText };
      } catch (error) {
        // Vérifier si c'est une erreur de rate limit (429)
        const isRateLimit = error.status === 429 || 
                           (error.message && (error.message.includes('rate_limit') || error.message.includes('Rate limit')));
        
        if (isRateLimit && attempt < retries) {
          // Extraire le temps d'attente du message d'erreur si disponible
          let waitTime = 60000; // 1 minute par défaut
          try {
            const errorObj = typeof error.message === 'string' ? JSON.parse(error.message) : error.message;
            if (errorObj?.error?.message) {
              const match = errorObj.error.message.match(/Please try again in ([\d.]+)s/);
              if (match) {
                waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000; // Ajouter 1 seconde de marge
              }
            }
          } catch (e) {
            // Si on ne peut pas parser, utiliser le temps par défaut avec backoff exponentiel
            waitTime = Math.min(60000 * Math.pow(2, attempt - 1), 300000); // Max 5 minutes
          }
          
          console.warn(`⚠️ Rate limit Groq atteint, tentative ${attempt}/${retries}, attente ${Math.round(waitTime / 1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // Si ce n'est pas une erreur de rate limit ou qu'on a épuisé les tentatives, propager l'erreur
        throw error;
      }
    }
  } catch (error) {
    const errorMessage = error.message || error.toString();
    console.error('❌ Erreur traduction Groq:', error.status || '', errorMessage);
    return { 
      success: false, 
      text, 
      error: errorMessage 
    };
  }
}

/**
 * Vérifie si une clé API Groq est valide
 * @param {string} apiKey - Clé API à vérifier
 * @returns {Promise<boolean>}
 */
async function validateApiKey(apiKey) {
  try {
    if (!apiKey || !apiKey.startsWith('gsk_')) {
      return false;
    }

    const groq = new Groq({ apiKey });
    
    // Test simple avec un texte court
    await groq.chat.completions.create({
      messages: [
        { role: 'user', content: 'Hello' }
      ],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 10
    });

    return true;
  } catch (error) {
    console.error('❌ Clé API Groq invalide:', error.message);
    return false;
  }
}

module.exports = {
  translateText,
  validateApiKey
};
