const fetch = require('electron-fetch').default;

const DISCORD_COLOR_VERSION = 0x6c5ce7;
const DISCORD_COLOR_TRANSLATION = 0x00b894;
const DISCORD_COLOR_BOTH = 0xf1c40f;

function sanitizeWebhookUrl(webhookUrl) {
  if (!webhookUrl || typeof webhookUrl !== 'string') {
    return '';
  }
  return webhookUrl.trim();
}

function normalize(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function formatVersionChange(oldValue, newValue) {
  const beforeValue = normalize(oldValue) || '—';
  const afterValue = normalize(newValue) || '—';
  return `${beforeValue} → ${afterValue}`;
}

function extractTranslatorNames(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap(extractTranslatorNames);
  }
  return String(raw)
    .split(/[,/&]/)
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

/**
 * Envoie une notification Discord pour un jeu adulte
 * @param {object} params
 * @param {string} params.webhookUrl - URL du webhook Discord
 * @param {string} params.gameTitle - Titre du jeu
 * @param {Array<{ label: string; oldValue: string | null; newValue: string | null; extra?: string; type?: 'version' | 'translation'; }>} params.changes
 * @param {string} [params.threadUrl] - Lien du thread (F95Zone ou LewdCorner)
 * @param {string} [params.platform] - Plateforme (F95Zone, LewdCorner, etc.)
 * @param {string} [params.coverUrl] - URL de couverture pour la miniature
 * @param {object} [params.mentionMap] - Dictionnaire traducteur -> ID Discord
 * @returns {Promise<boolean>} True si la notification a été envoyée
 */
async function notifyGameUpdate({ webhookUrl, gameTitle, changes, threadUrl, platform, coverUrl, mentionMap = {} }) {
  const sanitizedUrl = sanitizeWebhookUrl(webhookUrl);
  if (!sanitizedUrl) {
    return false;
  }

  if (!changes || !Array.isArray(changes) || changes.length === 0) {
    return false;
  }

  const hasTranslationChange = changes.some(change => change.type === 'translation');
  const hasVersionChange = changes.some(change => change.type === 'version');

  let color = DISCORD_COLOR_VERSION;
  if (hasTranslationChange && hasVersionChange) {
    color = DISCORD_COLOR_BOTH;
  } else if (hasTranslationChange) {
    color = DISCORD_COLOR_TRANSLATION;
  }

  const translationChanges = changes.filter(change => change.type === 'translation');
  const versionChanges = changes.filter(change => change.type === 'version');

  const descriptionParts = [];

  if (translationChanges.length > 0) {
    const change = translationChanges[0];
    descriptionParts.push(`**Traduction mise à jour :** ${formatVersionChange(change.oldValue, change.newValue)}`);
    if (change.link) {
      descriptionParts.push(`[Télécharger la nouvelle traduction](${change.link})`);
    }
  }

  if (versionChanges.length > 0) {
    const change = versionChanges[0];
    descriptionParts.push(`**Jeu mis à jour :** ${formatVersionChange(change.oldValue, change.newValue)}`);
  }

  const translatorNamesSet = new Set();
  const versionTranslatorNamesSet = new Set();

  for (const change of changes) {
    const names = extractTranslatorNames(change.traducteur);
    for (const name of names) {
      translatorNamesSet.add(name);
      if (change.type === 'version') {
        versionTranslatorNamesSet.add(name);
      }
    }
  }

  const versionMentionIds = Array.from(versionTranslatorNamesSet)
    .map(name => mentionMap[name.toLowerCase()])
    .filter(id => typeof id === 'string' && id.trim().length > 0);

  if (versionMentionIds.length > 0) {
    const uniqueMentions = Array.from(new Set(versionMentionIds));
    const mentionText = uniqueMentions.map(id => `<@${id}>`).join(' ');
    descriptionParts.push(`Salut ${mentionText} ! Une nouvelle version du jeu vient de sortir, pensez à mettre la traduction à jour.`);
  }

  const embed = {
    title: `🎮 ${gameTitle}`,
    url: threadUrl || undefined,
    description: descriptionParts.join('\n'),
    color,
    timestamp: new Date().toISOString()
  };

  const translatorNames = Array.from(translatorNamesSet);

  if (translatorNames.length > 0) {
    embed.fields = [
      {
        name: 'Traducteur(s)',
        value: translatorNames.map(name => `• ${name}`).join('\n'),
        inline: false
      }
    ];
  }

  const footerParts = [];
  if (platform) {
    footerParts.push(platform);
  }
  footerParts.push('Powered by Nexus');
  embed.footer = { text: footerParts.join(' • ') };

  if (coverUrl && /^https?:\/\//i.test(coverUrl)) {
    embed.image = { url: coverUrl };
  }

  const payload = {
    embeds: [embed]
  };

  try {
    const response = await fetch(sanitizedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ Envoi webhook Discord échoué (${response.status}): ${text}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l’envoi du webhook Discord:', error);
    return false;
  }
}

module.exports = { notifyGameUpdate };
