import { BookOpenCheck, ExternalLink, Globe2, KeyRound, ShieldCheck, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ApiKeyProvider } from '../../../pages/Settings/components/apiKeyGuideTypes';
import { useDisableBodyScroll } from '../../../hooks/common/useDisableBodyScroll';

interface ApiKeyGuideModalProps {
  initialProvider: ApiKeyProvider;
  onClose: () => void;
}

type ProviderBullet = string | { text: string; copyValue?: string };
type ProviderStep = string | { text: string; bullets?: ProviderBullet[] };

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
    url: 'https://myanimelist.net/apiconfig',
    urlLabel: 'Portail développeur MAL',
    summary: 'Requis pour la synchronisation et l’enrichissement de votre collection anime/manga.',
    recommendedName: 'Nexus (usage personnel)',
    steps: [
      'Cliquez sur le bouton « Portail développeur MAL » (ci-dessus) : MyAnimeList vous demandera de vous connecter si nécessaire.',
      'Cliquez sur « Create ID ».',
      {
        text: 'Pour vous simplifier la vie, voici nos suggestions pour chaque champ obligatoire :',
        bullets: [
          'App Name * : indiquez un nom explicite, par exemple « Nexus (usage personnel) ».',
          'App Type * : choisissez « Other ».',
          'App Description * : précisez « Synchronisation et consultation privée de ma collection dans Nexus » (ou formulation équivalente).',
          { text: 'App Redirect URL * : utilisez le bouton « Copier » pour coller l\'URL.', copyValue: 'http://localhost:8888/callback' },
          'Homepage URL * : vous pouvez indiquer https://github.com/Rory-Mercury-91/le-nexus (ou votre page personnelle).',
          'Commercial / Non-Commercial * : sélectionnez « Non-commercial ».',
          'Name / Company Name * : renseignez votre nom/pseudo (ou « Usage personnel »).',
          'Purpose of Use * : choisissez « Hobbyist » (usage passion).'
        ]
      },
      'Validez la création, puis utilisez le bouton de retour à la liste et ouvrez l’ID en cliquant sur « Edit » pour afficher le Client ID : copiez-le et collez-le dans les paramètres MAL de Nexus.'
    ],
    notes: [
      'Ne partagez pas votre Client ID publiquement.',
      'Chaque utilisateur doit générer son propre Client ID : MyAnimeList limite les quotas par compte et exige un OAuth personnel.'
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
  }
];

export default function ApiKeyGuideModal({ initialProvider, onClose }: ApiKeyGuideModalProps) {
  const [activeProvider, setActiveProvider] = useState<ApiKeyProvider>(initialProvider);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  
  // Désactiver le scroll du body quand la modale est ouverte
  useDisableBodyScroll(true);
  
  const handleCopy = useCallback((value: string) => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(value).then(() => {
        setCopiedValue(value);
        setTimeout(() => setCopiedValue(null), 2000);
      }).catch(() => undefined);
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
