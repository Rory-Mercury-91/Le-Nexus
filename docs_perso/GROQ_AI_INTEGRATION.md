# Intégration Groq AI pour la traduction automatique

Ce guide vous explique comment ajouter la traduction automatique des descriptions via Groq AI.

## Prérequis

1. Créer un compte gratuit sur [Groq Console](https://console.groq.com/)
2. Récupérer votre clé API

## Installation

```bash
npm install groq-sdk
```

## Configuration

### 1. Ajouter la clé API

Créez un fichier `.env` à la racine du projet :

```env
GROQ_API_KEY=votre_clé_api_ici
```

### 2. Modifier `electron/main.js`

Ajoutez en haut du fichier :

```javascript
require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
```

### 3. Ajouter le handler de traduction

Ajoutez ce code dans `electron/main.js` (avant la fermeture du fichier) :

```javascript
// IPC Handler - Traduction Groq AI
ipcMain.handle('translate-text', async (event, text, targetLang = 'fr') => {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.warn('Clé API Groq non configurée');
      return { success: false, text };
    }

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Tu es un traducteur professionnel. Traduis le texte suivant en ${targetLang === 'fr' ? 'français' : targetLang}. Ne renvoie que la traduction, sans commentaires.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      model: 'llama-3.3-70b-versatile', // Modèle gratuit et performant
      temperature: 0.3,
      max_tokens: 1000
    });

    const translatedText = response.choices[0]?.message?.content || text;
    return { success: true, text: translatedText };
  } catch (error) {
    console.error('Erreur de traduction:', error);
    return { success: false, text, error: error.message };
  }
});
```

### 4. Mettre à jour `electron/preload.js`

Ajoutez dans la section `contextBridge.exposeInMainWorld` :

```javascript
// Traduction
translateText: (text, targetLang) => ipcRenderer.invoke('translate-text', text, targetLang)
```

### 5. Mettre à jour `src/types.ts`

Ajoutez dans `window.electronAPI` :

```typescript
translateText: (text: string, targetLang?: string) => Promise<{ success: boolean; text: string; error?: string }>;
```

### 6. Modifier `src/components/AddSerieModal.tsx`

Ajoutez un bouton de traduction :

```typescript
const handleTranslateDescription = async () => {
  if (!description) return;
  
  setSearching(true);
  const result = await window.electronAPI.translateText(description, 'fr');
  if (result.success) {
    setDescription(result.text);
    alert('Description traduite avec succès !');
  } else {
    alert('Erreur lors de la traduction : ' + (result.error || 'Erreur inconnue'));
  }
  setSearching(false);
};
```

Ajoutez le bouton dans le formulaire (après le champ description) :

```tsx
<button
  type="button"
  onClick={handleTranslateDescription}
  className="btn btn-secondary"
  disabled={!description || searching}
  style={{ marginTop: '8px' }}
>
  🌐 Traduire en français
</button>
```

## Utilisation

1. Recherchez un manga sur MangaDex
2. Si la description est en anglais, cliquez sur "Traduire en français"
3. La description sera automatiquement traduite via Groq AI

## Modèles Groq disponibles (gratuits)

- `llama-3.3-70b-versatile` : Meilleur rapport qualité/vitesse
- `llama-3.1-70b-versatile` : Alternative performante
- `mixtral-8x7b-32768` : Plus rapide mais moins précis

## Limites gratuites

- **Groq** : Très généreux, environ 14 400 requêtes/jour gratuitement
- Parfait pour une utilisation personnelle

## Note

Cette intégration est **optionnelle**. L'application fonctionne parfaitement sans Groq AI. La traduction n'est qu'une fonctionnalité de confort pour traduire les descriptions en anglais.
