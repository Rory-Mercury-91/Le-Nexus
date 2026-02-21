import { ExternalLink } from 'lucide-react';
// Fichiers dans public/assets/ (servis via le chemin public)
// Helper pour obtenir le chemin correct selon l'environnement
const getAssetPath = (path: string) => {
  // En production Electron (file://), utiliser un chemin relatif
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return `./assets/${path.split('/assets/')[1]}`;
  }
  return path;
};
// Utiliser une fonction pour obtenir les chemins dynamiquement
const getLogos = () => ({
  mal: getAssetPath('/assets/MyAnimeList_favicon.svg'),
  nautiljon: getAssetPath('/assets/logo_nautiljon.webp'),
  groq: getAssetPath('/assets/Groq_logo.svg'),
  tmdb: getAssetPath('/assets/Tmdb.new.logo.svg')
});
// Fichiers dans build-assets/ (imports directs - fichiers spécifiques à l'application)
import f95Logo from '../../../../build-assets/F95logo.png';
import googleLogo from '../../../../build-assets/google-wordmarks-2x.webp';
import googleSheetsLogo from '../../../../build-assets/google-sheets.webp';

// Fonction pour créer les crédits avec les logos dynamiques
const createSourceCredits = () => {
  const logos = getLogos();
  return [
  {
    name: 'MyAnimeList',
    url: 'https://myanimelist.net',
    type: 'API officielle & export XML',
    usage: 'Synchronisation des listes d\'animes/mangas, enrichissement des métadonnées et suivi des statuts.',
    logo: logos.mal
  },
  {
    name: 'Google Cloud',
    url: 'https://developers.google.com/sheets/api',
    type: 'API officielle Google',
    usage: 'Synchronisation des données de configuration et récupération d\'informations via Google Sheets.',
    logos: [googleLogo, googleSheetsLogo]
  },
  {
    name: 'Groq',
    url: 'https://groq.com',
    type: 'API IA générative',
    usage: 'Génération et amélioration des traductions, résumés et assistants contextuels.',
    logo: logos.groq
  },
  {
    name: 'The Movie Database (TMDb)',
    url: 'https://www.themoviedb.org',
    type: 'API communautaire',
    usage: 'Import et enrichissement des fiches films/séries : visuels HD, distributions, recommandations et notes.',
    logo: logos.tmdb
  },
  {
    name: 'Nautiljon',
    url: 'https://www.nautiljon.com',
    type: 'Scraping encadré',
    usage: 'Mise à jour des titres, jaquettes françaises et informations spécifiques à la communauté francophone.',
    logo: logos.nautiljon
  },
  {
    name: 'F95Zone',
    url: 'https://f95zone.to',
    type: 'Scraping encadré',
    usage: 'Collecte des métadonnées, jaquettes alternatives et informations communautaires pour les jeux adultes (via scripts dédiés respectant les limitations du site).',
    logo: f95Logo
  }
  ];
};

export default function SourceCredits() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>
        Les services ci-dessous alimentent l\'application en données ou fonctionnalités. Merci de respecter leurs conditions d\'utilisation et limitations d\'API.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '20px',
          width: '100%'
        }}
      >
        {createSourceCredits().map((source) => (
          <div
            key={source.name}
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minHeight: '160px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {(() => {
                  const logos = source.logos || (source.logo ? [source.logo] : []);
                  if (!logos.length) return null;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {logos.map((logoSrc, index) => (
                        <div
                          key={`${source.name}-logo-${index}`}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'var(--surface-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px'
                          }}
                        >
                          <img
                            src={logoSrc}
                            alt={`Logo ${source.name}`}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text)' }}>{source.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{source.type}</div>
                </div>
              </div>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(var(--primary-rgb), 0.12)',
                  color: 'var(--primary)'
                }}
              >
                <ExternalLink size={18} strokeWidth={1.75} />
              </a>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {source.usage}
            </p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
        📌 Les contenus restent la propriété exclusive de leurs auteurs et des plateformes citées. Les scripts de collecte respectent les limites publiques et ne contournent aucun mécanisme de protection.
      </p>
    </div>
  );
}
