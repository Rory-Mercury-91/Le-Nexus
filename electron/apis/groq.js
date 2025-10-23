const Groq = require('groq-sdk');

/**
 * Traduit un texte avec Groq AI
 * @param {string} text - Texte à traduire
 * @param {string} apiKey - Clé API Groq
 * @param {string} targetLang - Langue cible (par défaut 'fr')
 * @param {string} context - Contexte optionnel pour le prompt (ex: 'anime', 'manga')
 * @returns {Promise<{ success: boolean, text: string, error?: string }>}
 */
async function translateText(text, apiKey, targetLang = 'fr', context = 'anime et manga') {
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
    console.error('❌ Erreur traduction Groq:', error.message);
    return { 
      success: false, 
      text, 
      error: error.message 
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

