import { BookOpenCheck, ExternalLink, Globe2, KeyRound, ShieldCheck, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDisableBodyScroll } from '../../../hooks/common/useDisableBodyScroll';
import type { ApiKeyProvider } from '../../../pages/Settings/components/apiKeyGuideTypes';

interface ApiKeyGuideModalProps {
  initialProvider: ApiKeyProvider;
  onClose: () => void;
}

type ProviderBullet = string | { text: string; copyValue?: string };
type ProviderStep = string | { text: string; bullets?: ProviderBullet[]; copyValue?: string };

type ProviderConfig = {
  id: ApiKeyProvider;
  name: string;
  icon: string;
  accent: string;
  url: string;
  urlLabel: string;
  summary: string;
  recommendedName?: string;
  recommendedWebsite?: string;
  steps: ProviderStep[];
  notes?: string[];
  extra?: ReactNode;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'mal',
    name: 'MyAnimeList',
    icon: '📺',
    accent: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    url: 'https://myanimelist.net',
    urlLabel: 'Site MyAnimeList',
    summary: 'La connexion à MyAnimeList est entièrement simplifiée : cliquez simplement sur "Connexion" dans les paramètres MAL de Nexus pour démarrer l\'authentification OAuth.',
    recommendedName: 'Nexus (usage personnel)',
    steps: [
      'Allez dans les paramètres de Nexus, section MyAnimeList.',
      'Cliquez sur le bouton « Connexion ».',
      'Votre navigateur s\'ouvre automatiquement sur la page d\'autorisation MyAnimeList.',
      'Connectez-vous avec votre compte MyAnimeList si nécessaire.',
      'Cliquez sur « Allow » pour autoriser Nexus à accéder à votre liste.',
      'Vous serez automatiquement redirigé vers Nexus : la connexion est établie !'
    ],
    notes: [
      '✅ Aucune configuration de clé API n\'est nécessaire : tout est géré automatiquement.',
      'L\'authentification utilise le protocole OAuth 2.0 avec PKCE pour une sécurité maximale.',
      'Vous pouvez révoquer l\'accès à tout moment depuis les paramètres de votre compte MyAnimeList.'
    ]
  },
  {
    id: 'anilist',
    name: 'AniList',
    icon: '📺',
    accent: 'linear-gradient(135deg, #02a9ff, #0284c7)',
    url: 'https://anilist.co/settings/developer',
    urlLabel: 'Paramètres développeur AniList',
    summary: 'Requis pour la synchronisation et l\'enrichissement de votre collection anime/manga depuis AniList.',
    recommendedName: 'Nexus (usage personnel)',
    steps: [
      'Cliquez sur le bouton « Paramètres développeur AniList » (ci-dessus) : AniList vous demandera de vous connecter si nécessaire.',
      'Cliquez sur « Create New Client ».',
      {
        text: 'Remplissez les champs obligatoires :',
        bullets: [
          'App Name * : indiquez un nom explicite, par exemple « Nexus (usage personnel) ».',
          { text: 'App Redirect URL * : utilisez le bouton « Copier » pour coller l\'URL.', copyValue: 'http://localhost:8888/anilist-callback' },
          'App Description * : précisez « Synchronisation et consultation privée de ma collection dans Nexus » (ou formulation équivalente).',
          'App Website * : vous pouvez indiquer https://github.com/Rory-Mercury-91/le-nexus (ou votre page personnelle).'
        ]
      },
      'Validez la création, puis copiez le Client ID et le Client Secret affichés.',
      'Collez le Client ID et le Client Secret dans les paramètres AniList de Nexus.'
    ],
    notes: [
      'Ne partagez pas votre Client ID et Client Secret publiquement.',
      'Chaque utilisateur doit générer son propre Client ID et Client Secret : AniList limite les quotas par compte.',
      'Le Client Secret n\'est affiché qu\'une seule fois lors de la création : notez-le immédiatement dans un gestionnaire de mots de passe.'
    ]
  },
  {
    id: 'tmdb',
    name: 'The Movie Database (TMDb)',
    icon: '🎬',
    accent: 'linear-gradient(135deg, #10b981, #059669)',
    url: 'https://www.themoviedb.org/settings/api',
    urlLabel: 'Tableau de bord API TMDb',
    summary: 'Nécessaire pour les affiches, métadonnées complètes (films, séries, animes), images haute qualité, et fonctionnalités de recherche avancées.',
    recommendedName: 'Nexus (films & séries)',
    recommendedWebsite: 'https://github.com/Rory-Mercury-91/le-nexus',
    steps: [
      'Cliquez sur le bouton « Tableau de bord API TMDb » (ci-dessus) : The Movie Database vous demandera de vous connecter si nécessaire.',
      'Dans « Request an API Key », choisissez « Developer » puis indiquez un usage personnel/non commercial.',
      'Renseignez un nom d\'application (ex. « Nexus (perso) ») et l\'URL du site (vous pouvez mettre https://github.com/Rory-Mercury-91/le-nexus ou laisser vide).',
      'Décrivez brièvement l’utilisation : import local, consultation et enrichissement privés de votre médiathèque.',
      'Acceptez les conditions d’utilisation et envoyez la demande : la clé API (v3) est affichée immédiatement.',
      'Copiez la clé API (v3) et collez-la dans la section Médias de Nexus.',
      'Dans l’onglet « API Read Access Token », copiez le token v4 si vous souhaitez l’utiliser pour les requêtes avancées.'
    ],
    notes: [
      'La clé v3 suffit pour la plupart des opérations (recherche, détails, images).',
      'Le token v4 (Bearer) est optionnel mais recommandé pour les requêtes nécessitant l’API moderne.'
    ],
    extra: (
      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          background: 'rgba(16, 185, 129, 0.12)',
          color: 'var(--text)'
        }}
      >
        💡 Astuce&nbsp;: pensez à régénérer le token v4 si vous le soupçonnez d’être exposé. Les deux identifiants (v3 & v4) peuvent coexister.
      </div>
    )
  },
  {
    id: 'groq',
    name: 'Groq (Traductions IA)',
    icon: '🧠',
    accent: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    url: 'https://console.groq.com/keys',
    urlLabel: 'Console Groq',
    summary: 'Utilisé pour traduire les synopsis/backgrounds MyAnimeList lorsque le texte FR est absent.',
    steps: [
      'Cliquez sur le bouton « Console Groq » (ci-dessus) : Groq vous demandera de vous connecter si nécessaire. Ouvrez ensuite la section « API Keys ».',
      'Créez une nouvelle clé avec un nom explicite (ex. « Nexus traductions »).',
      'Copiez la clé et collez-la dans la section Intelligence Artificielle de Nexus.',
      'Conservez la clé dans un coffre-fort (1Password, Bitwarden, Vaultwarden…) : il n’est plus possible de l’afficher après la fermeture du dialogue.'
    ],
    notes: [
      'La facturation Groq dépend de votre usage. Consultez la console pour surveiller les quotas.',
      'Vous pouvez révoquer la clé à tout moment si vous suspectez une fuite.',
      '📊 Limite gratuite : 14 400 traductions/jour (30 par minute). Pensez à répartir vos enrichissements si vous approchez du quota.',
      '⚠️ Les VPN ou proxies agressifs peuvent bloquer les requêtes Groq : privilégiez une connexion directe.'
    ]
  },
  {
    id: 'rawg',
    name: 'RAWG (Jeux Vidéo)',
    icon: '🎮',
    accent: 'linear-gradient(135deg, #f59e0b, #d97706)',
    url: 'https://rawg.io/apidocs',
    urlLabel: 'Documentation API RAWG',
    summary: 'Nécessaire pour enrichir votre bibliothèque de jeux avec des métadonnées complètes (description, genres, plateformes, notes Metacritic, images haute qualité, etc.).',
    recommendedName: 'Nexus (jeux vidéo)',
    recommendedWebsite: 'https://github.com/Rory-Mercury-91/le-nexus',
    steps: [
      'Cliquez sur le bouton « Documentation API RAWG » (ci-dessus) : RAWG vous demandera de vous connecter si nécessaire.',
      'Créez un compte RAWG si vous n\'en avez pas déjà un (gratuit).',
      'Une fois connecté, accédez à votre profil et allez dans la section « API » ou « Developer ».',
      'Cliquez sur « Create API Key » ou « Generate API Key ».',
      {
        text: 'Remplissez les informations demandées :',
        bullets: [
          'Application Name * : indiquez un nom explicite, par exemple « Nexus (jeux vidéo) ».',
          'Application URL * : vous pouvez indiquer https://github.com/Rory-Mercury-91/le-nexus (ou votre page personnelle).',
          'Description * : précisez « Enrichissement et consultation privée de ma bibliothèque de jeux dans Nexus » (ou formulation équivalente).'
        ]
      },
      'Validez la création : la clé API est affichée immédiatement.',
      'Copiez la clé API et collez-la dans la section RAWG de Nexus.',
      'Testez la connexion avec le bouton « Tester la connexion » pour vérifier que tout fonctionne.'
    ],
    notes: [
      'La clé API RAWG est gratuite pour un usage personnel et non commercial.',
      'Ne partagez pas votre clé API publiquement.',
      'RAWG propose une limite de 20 000 requêtes par mois en gratuit, ce qui est largement suffisant pour un usage personnel.',
      'La clé API permet d\'enrichir vos jeux avec des métadonnées complètes : description, genres, plateformes, notes, dates de sortie, etc.',
      'Vous pouvez utiliser RAWG pour rechercher et ajouter des jeux directement depuis le modal d\'ajout dans Nexus.'
    ],
    extra: (
      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          background: 'rgba(245, 158, 11, 0.12)',
          color: 'var(--text)'
        }}
      >
        💡 Astuce : RAWG couvre plus de 500 000 jeux (indépendants et AAA). Utilisez l'onglet RAWG dans le modal d'ajout de jeux pour rechercher et enrichir automatiquement vos entrées.
      </div>
    )
  },
  {
    id: 'adulteGame',
    name: 'Jeux Adultes & Discord',
    icon: '🕹️',
    accent: 'linear-gradient(135deg, #ec4899, #f97316)',
    url: 'https://support.discord.com/hc/fr/articles/228383668-introduction-aux-webhooks',
    urlLabel: 'Créer un webhook Discord',
    summary: 'Permet d\'automatiser les alertes (webhook et mentions) pour les traductions/synchronisations des jeux adultes (le bouton « Créer un webhook Discord » ouvre simplement la documentation officielle pour vous guider).',
    steps: [
      'Ouvrez Discord (bureau ou web) et, sur le salon où doivent arriver les alertes, ouvrez les Paramètres du salon > Intégrations > Webhooks.',
      'Cliquez sur « Nouveau Webhook », choisissez un nom (ex. « Nexus - Jeux adultes ») et le salon de destination, puis copiez l\'URL générée.',
      'Collez cette URL dans la carte « Webhook Discord » de la section Jeux Adultes dans Nexus.',
      'Dans Discord, activez le mode développeur (Paramètres utilisateurs > Avancés) pour pouvoir copier les IDs des membres.',
      'Ajoutez vos traducteurs dans Nexus puis, dans « Mentions Discord automatiques », collez pour chacun l\'ID numérique (clic droit > Copier l\'ID).',
      'Enregistrez : chaque synchronisation ou mise à jour enverra désormais un message vers votre serveur Discord.'
    ],
    notes: [
      'Le webhook ne fonctionne que sur les salons où vous disposez des droits « Gérer les webhooks ». Demandez-les si besoin.',
      'Les IDs Discord sont sensibles : conservez-les en privé.',
      'Un seul webhook est utilisé par Nexus : choisissez le salon d\'alertes qui centralise vos notifications.'
    ]
  },
  {
    id: 'cloudSync',
    name: 'Synchronisation Cloud (Cloudflare R2)',
    icon: '☁️',
    accent: 'linear-gradient(135deg, #f59e0b, #f97316)',
    url: 'https://developers.cloudflare.com/r2/get-started/',
    urlLabel: 'Documentation Cloudflare R2',
    summary: 'Permet de synchroniser vos bases de données entre plusieurs appareils/utilisateurs via Cloudflare R2 (stockage compatible S3, gratuit jusqu\'à 10 GB).',
    steps: [
      'Créez un compte Cloudflare si vous n\'en avez pas déjà un (gratuit) : https://dash.cloudflare.com/sign-up',
      '⚠️ Important : Cloudflare requiert l\'ajout d\'une méthode de paiement (carte bancaire ou PayPal) même pour utiliser le plan gratuit. Aucun frais ne sera prélevé tant que vous restez dans les limites du plan gratuit (10 GB de stockage, 1M opérations de classe A, 10M opérations de classe B par mois).',
      'Une fois connecté, dans le menu de gauche, allez dans « Storage & Databases » => « R2 object storage » => « Overview ».',
      'Cliquez sur « +Create bucket », inscrivez un nom (ex: « nexus-sync ») et laissez le reste par défaut, puis validez.',
      'Revenez en arrière en recliquant sur « Overview » (ou en retournant à la page principale de R2).',
      'Dans la section « Account Details », cliquez sur « {} Manage » (le bouton avec l\'icône d\'accolades).',
      'Cliquez sur « Create User API token » dans la section « User API Tokens ».',
      {
        text: 'Configurez le token :',
        bullets: [
          'Token name : donnez un nom explicite (ex: « Nexus Sync Token »)',
          'Permissions : sélectionnez « Object Read & Write » (permissions minimales nécessaires)',
          'Specify bucket(s) : sélectionnez « Apply to specific buckets only » et choisissez votre bucket (nexus-sync)',
          'TTL : sélectionnez « Forever » pour un usage personnel',
          'Client IP Address Filtering : laissez vide (par défaut, le token fonctionne depuis toutes les adresses IP)',
          'Cliquez sur le bouton de création pour finaliser'
        ]
      },
      '⚠️ IMPORTANT : Après création, Cloudflare affichera l\'Access Key ID et le Secret Access Key. Ces informations ne sont affichées QU\'UNE SEULE FOIS et ne peuvent pas être réaffichées. Copiez-les immédiatement avant de fermer la page et conservez-les précieusement !',
      'Pour l\'Endpoint, dans votre bucket, allez dans l\'onglet « Settings » puis dans la section « General ». Vous verrez l\'URL S3 API (ex: https://xxx.r2.cloudflarestorage.com/nexus-sync). Vous pouvez copier l\'URL complète : Nexus nettoiera automatiquement l\'endpoint pour retirer le nom du bucket.',
      'Dans Nexus, collez ces trois informations dans la section Synchronisation Cloud : Endpoint, Nom du bucket, Access Key ID, Secret Access Key.',
      'Cliquez sur « Tester la connexion » pour vérifier que tout fonctionne.',
      'Activez la synchronisation et configurez la fréquence selon vos besoins (6h, 12h, 24h, 7j, 30j ou manuelle).',
      '💡 IMPORTANT - Partage entre utilisateurs :',
      { text: 'Tous les utilisateurs peuvent utiliser le MÊME bucket R2. Un seul utilisateur doit créer le bucket et les tokens API, puis partager la configuration (Endpoint, Nom du bucket, Access Key ID, Secret Access Key) avec les autres.', copyValue: '' },
      'Chaque utilisateur configure la même configuration R2 dans Nexus (même bucket, même tokens).',
      'Chaque utilisateur partage son UUID (visible dans les paramètres) avec les autres.',
      'Chaque utilisateur ajoute les UUIDs des autres dans « Utilisateurs à synchroniser » pour synchroniser leurs bases de données respectives.'
    ],
    notes: [
      '⚠️ Une méthode de paiement (carte bancaire ou PayPal) est requise pour utiliser R2, même pour le plan gratuit. Aucun frais ne sera prélevé tant que vous restez dans les limites gratuites.',
      'Cloudflare R2 offre 10 GB de stockage gratuit et des opérations illimitées, sans frais de bande passante.',
      'Un seul bucket R2 peut être partagé entre tous les utilisateurs. Seul l\'utilisateur qui crée le bucket doit avoir un compte Cloudflare avec méthode de paiement.',
      'Chaque utilisateur a un UUID unique généré automatiquement. Partagez-le avec confiance : il identifie uniquement votre base de données.',
      'Tous les utilisateurs utilisent la même configuration R2 (même bucket, même tokens API). Un seul utilisateur crée le bucket et partage les credentials avec les autres.',
      'La synchronisation téléverse d\'abord votre base locale, puis télécharge les bases des autres utilisateurs configurés, puis fusionne automatiquement les données.',
      'Les données générales (jeux, séries, etc.) sont fusionnées, tandis que les données utilisateur (progression, notes, etc.) restent séparées.',
      'Les bases téléchargées remplacent les anciennes avec un backup automatique. Vos propres données ne sont jamais écrasées par la synchronisation.',
      '⚠️ Ne partagez jamais vos Access Key ID et Secret Access Key publiquement. Partagez-les uniquement avec les personnes de confiance (famille, amis proches) qui doivent synchroniser leurs données.'
    ]
  }
];

export default function ApiKeyGuideModal({ initialProvider, onClose }: ApiKeyGuideModalProps) {
  const [activeProvider, setActiveProvider] = useState<ApiKeyProvider>(initialProvider);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  // Désactiver le scroll du body quand la modale est ouverte
  useDisableBodyScroll(true);

  const handleCopy = useCallback(async (value: string) => {
    try {
      // Utiliser l'API Electron clipboard si disponible (plus fiable)
      if (window.electronAPI?.copyToClipboard) {
        await window.electronAPI.copyToClipboard(value);
        setCopiedValue(value);
        setTimeout(() => setCopiedValue(null), 2000);
        return;
      }

      // Fallback : utiliser l'API Clipboard moderne du navigateur
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopiedValue(value);
        setTimeout(() => setCopiedValue(null), 2000);
        return;
      }

      // Fallback final : utiliser l'ancienne API execCommand
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopiedValue(value);
          setTimeout(() => setCopiedValue(null), 2000);
        } else {
          console.error('Échec de la copie avec execCommand');
        }
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Erreur lors de la copie dans le presse-papiers:', error);
      // Afficher un message d'erreur à l'utilisateur si possible
    }
  }, []);

  const providerConfig = useMemo(
    () => PROVIDERS.find((provider) => provider.id === activeProvider) ?? PROVIDERS[0],
    [activeProvider]
  );

  return createPortal(
    <>
      <style>{`
        .api-guide-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .api-guide-scroll::-webkit-scrollbar-track {
          background: var(--surface-light);
          border-radius: 4px;
        }
        .api-guide-scroll::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 4px;
        }
        .api-guide-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary);
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10, 10, 10, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          zIndex: 10000,
          backdropFilter: 'blur(6px)'
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: 'min(960px, 100%)',
            height: '80vh',
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            boxShadow: '0 32px 80px rgba(15, 23, 42, 0.45)',
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            overflow: 'hidden'
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <aside
            style={{
              background: 'var(--surface-light)',
              borderRight: '1px solid var(--border)',
              padding: '28px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpenCheck size={18} />
                Guides clés API
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px'
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'var(--surface)';
                  event.currentTarget.style.color = 'var(--text)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'none';
                  event.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <X size={18} />
              </button>
            </header>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setActiveProvider(provider.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    borderRadius: '12px',
                    border: '1px solid transparent',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    background: provider.id === providerConfig.id ? 'var(--surface)' : 'transparent',
                    color: provider.id === providerConfig.id ? 'var(--text)' : 'var(--text-secondary)',
                    borderColor: provider.id === providerConfig.id ? 'var(--border)' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(event) => {
                    if (provider.id !== providerConfig.id) {
                      event.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      event.currentTarget.style.borderColor = 'var(--border)';
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (provider.id !== providerConfig.id) {
                      event.currentTarget.style.background = 'transparent';
                      event.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>
                    {provider.icon} {provider.name}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="api-guide-scroll" style={{ padding: '32px 36px', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) var(--surface-light)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '24px'
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    color: 'white',
                    background: providerConfig.accent,
                    boxShadow: '0 12px 24px rgba(0,0,0,0.25)'
                  }}
                >
                  {providerConfig.icon} {providerConfig.name}
                </span>
                <h3 style={{ marginTop: '18px', fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>
                  Comment obtenir la clé {providerConfig.name} ?
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                  {providerConfig.summary}
                </p>
              </div>
            </div>

            <a
              href={providerConfig.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'var(--surface-light)',
                border: '1px solid var(--border)',
                color: 'var(--primary)',
                textDecoration: 'none',
                marginBottom: '24px'
              }}
            >
              <ExternalLink size={16} />
              {providerConfig.urlLabel}
            </a>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {providerConfig.recommendedName && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--surface-light)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'var(--text)'
                  }}
                >
                  <KeyRound size={16} />
                  <span>
                    Nom recommandé : <strong>{providerConfig.recommendedName}</strong>
                  </span>
                </div>
              )}

              {providerConfig.recommendedWebsite && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--surface-light)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'var(--text)'
                  }}
                >
                  <Globe2 size={16} />
                  <span>
                    URL suggérée : <code style={{ fontFamily: 'monospace' }}>{providerConfig.recommendedWebsite}</code>
                  </span>
                </div>
              )}
            </div>

            <ol
              style={{
                marginTop: '24px',
                paddingLeft: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '14px',
                color: 'var(--text)'
              }}
            >
              {providerConfig.steps.map((step, index) => {
                if (typeof step === 'string') {
                  return (
                    <li key={index} style={{ lineHeight: 1.6 }}>
                      {step}
                    </li>
                  );
                }
                return (
                  <li key={index} style={{ lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span>{step.text}</span>
                    {step.bullets && (
                      <ul style={{ margin: 0, paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                        {step.bullets.map((bullet, bulletIndex) => {
                          if (typeof bullet === 'string') {
                            return (
                              <li key={bulletIndex} style={{ lineHeight: 1.5 }}>
                                {bullet}
                              </li>
                            );
                          }
                          return (
                            <li key={bulletIndex} style={{ lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span>{bullet.text}</span>
                              {bullet.copyValue && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(bullet.copyValue!)}
                                  style={{
                                    border: '1px solid var(--border)',
                                    background: copiedValue === bullet.copyValue ? 'rgba(34, 197, 94, 0.15)' : 'var(--surface)',
                                    color: copiedValue === bullet.copyValue ? '#10b981' : 'var(--text-secondary)',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  {copiedValue === bullet.copyValue ? 'Copié !' : 'Copier'}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>

            {providerConfig.notes && providerConfig.notes.length > 0 && (
              <div
                style={{
                  marginTop: '24px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(244, 114, 182, 0.4)',
                  background: 'rgba(244, 114, 182, 0.12)',
                  color: 'var(--text)'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                  <ShieldCheck size={16} style={{ marginRight: '8px' }} />
                  Conseils de sécurité
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  {providerConfig.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {providerConfig.extra}
          </section>
        </div>
      </div>
    </>,
    document.body
  );
}
