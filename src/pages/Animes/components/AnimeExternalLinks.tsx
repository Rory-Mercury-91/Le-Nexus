import { ExternalLink, Globe } from 'lucide-react';
import { AnimeSerie } from '../../../types';

interface AnimeExternalLinksProps {
  anime: AnimeSerie;
  liensExternes: Array<{ name: string; url: string }>;
  shouldShow: (field: string) => boolean;
}

export default function AnimeExternalLinks({ anime, liensExternes, shouldShow }: AnimeExternalLinksProps) {
  if (!shouldShow('liens_externes')) return null;

  // Fonction pour extraire le code langue depuis une URL Wikipedia
  const getWikipediaLang = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      // Pattern: xx.wikipedia.org ou xx.m.wikipedia.org
      const match = hostname.match(/^([a-z]{2,3})\.(m\.)?wikipedia\.org$/i);
      return match ? match[1].toUpperCase() : null;
    } catch {
      return null;
    }
  };

  // Fonction pour déterminer la source d'un lien selon son URL
  const getLinkSource = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // MyAnimeList
      if (hostname.includes('myanimelist.net')) {
        return 'MAL';
      }

      // AniDB
      if (hostname.includes('anidb.net')) {
        return 'AniDB';
      }

      // Wikipedia - toujours de MAL/Jikan
      if (hostname.includes('wikipedia.org')) {
        return 'MAL';
      }

      // Site officiel (sololeveling-anime.net, etc.)
      if (hostname.includes('sololeveling-anime.net') || hostname.includes('anime.net')) {
        return 'MAL';
      }

      // Twitter/X - généralement de MAL
      if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
        return 'MAL';
      }

      // Par défaut, ne pas afficher de badge si on ne peut pas déterminer la source
      return null;
    } catch {
      return null;
    }
  };

  // Préparer tous les liens externes à afficher
  const allLinks: Array<{ name: string; url: string; source?: string; langCode?: string }> = [];

  // Ajouter les liens externes
  if (liensExternes && liensExternes.length > 0) {
    liensExternes.forEach(link => {
      if (link.url && !allLinks.find(l => l.url === link.url)) {
        const isWikipedia = link.url.includes('wikipedia.org');
        const langCode = isWikipedia ? getWikipediaLang(link.url) : null;

        let displayName = link.name || new URL(link.url).hostname.replace('www.', '');

        // Si c'est Wikipedia, utiliser juste "Wikipedia" comme nom (le code langue sera dans le badge)
        if (isWikipedia) {
          displayName = 'Wikipedia';
        }

        // Déterminer la source selon l'URL
        const source = getLinkSource(link.url);

        allLinks.push({
          name: displayName,
          url: link.url,
          source: source || undefined,
          langCode: langCode || undefined
        });
      }
    });
  }

  // Ajouter le lien MAL si présent
  if (anime.mal_url && !allLinks.find(l => l.url === anime.mal_url)) {
    allLinks.push({
      name: 'MyAnimeList',
      url: anime.mal_url,
      source: 'MAL'
    });
  }

  // Trier les liens : Wikipedia français en premier, puis par ordre alphabétique
  allLinks.sort((a, b) => {
    // Wikipedia français en premier
    if (a.langCode === 'FR') return -1;
    if (b.langCode === 'FR') return 1;
    // Puis par nom
    return a.name.localeCompare(b.name);
  });

  if (allLinks.length === 0) {
    return null;
  }

  return (
    <div style={{
      marginBottom: '20px',
      padding: '16px',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      background: 'var(--surface)'
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: '700',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text)'
      }}>
        <Globe size={18} />
        Liens externes
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(allLinks.length, 4)}, 1fr)`,
        gap: '12px'
      }}>
        {allLinks.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              window.electronAPI.openExternal?.(link.url);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#6366f115',
              border: '1px solid #6366f1',
              textDecoration: 'none',
              color: 'var(--text)',
              fontSize: '14px',
              transition: 'all 0.2s',
              cursor: 'pointer',
              minHeight: '60px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                  {link.source && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: link.source === 'MAL'
                        ? 'rgba(46, 81, 162, 0.2)'
                        : link.source === 'AniDB'
                          ? 'rgba(255, 102, 0, 0.2)'
                          : 'rgba(139, 92, 246, 0.2)',
                      color: link.source === 'MAL'
                        ? '#2E51A2'
                        : link.source === 'AniDB'
                          ? '#FF6600'
                          : 'var(--primary)',
                      fontWeight: '600'
                    }}>
                      {link.source}
                    </span>
                  )}
                  {link.langCode && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: link.langCode === 'FR' ? 'rgba(0, 123, 255, 0.2)' : 'rgba(128, 128, 128, 0.2)',
                      color: link.langCode === 'FR' ? '#007bff' : 'var(--text-secondary)',
                      fontWeight: '600'
                    }}>
                      {link.langCode}
                    </span>
                  )}
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{link.name}</span>
                </div>
                <ExternalLink size={16} style={{ color: 'var(--text-secondary)', opacity: 0.6, flexShrink: 0 }} />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
