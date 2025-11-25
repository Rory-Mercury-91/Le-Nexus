import { BookOpen } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CoverImage from '../../../components/common/CoverImage';
import ExternalLinkIcon from '../../../components/common/ExternalLinkIcon';
import DetailStatusSection from '../../../components/details/DetailStatusSection';
import ImageModal from '../../../components/modals/common/ImageModal';
import { useCoverDragAndDrop } from '../../../hooks/details/useCoverDragAndDrop';
import { Serie, SerieTag, Tome } from '../../../types';
import { COMMON_STATUSES } from '../../../utils/status';
import { MangaCostsSection } from './MangaCostsSection';
import { MangaProgressSection } from './MangaProgressSection';

const MANGA_STATUS_OPTIONS = COMMON_STATUSES.MANGA;
type MangaStatus = (typeof MANGA_STATUS_OPTIONS)[number];

/**
 * Mapping des domaines de sites de scans vers leurs noms d'affichage
 * Liste des sites français supportés par Mihon
 * 
 * NOTE: Certains domaines sont commentés et nécessitent validation.
 * Les domaines sont détectés automatiquement depuis les URLs dans les backups Mihon.
 */
const SCAN_SITE_NAMES: Record<string, string> = {
  // Sites confirmés (déjà vus dans les backups)
  'sushiscan.fr': 'SushiScan',
  'sushi-scan.fr': 'Sushi-Scan',
  'scan-manga.com': 'Scan-Manga',
  'lelscan.com': 'Lelscan',
  'lelscan-vf.com': 'Lelscan-VF',
  'japscan.fr': 'Japscan',
  'mangascantrad.com': 'Manga-Scantrad',
  'mangas-scantrad.com': 'Manga-Scantrad',
  'scantrad.net': 'Scantrad',
  'scantrad-union.com': 'Scantrad Union',
  'scanvf.org': 'Scan VF',
  'scanvf.com': 'Scan VF',
  'mangahub.fr': 'MangaHub.fr',
  'mangas-origines.fr': 'Mangas-Origines.fr',
  'mangacorporation.com': 'Manga-Corporation',
  'mangacorporation.fr': 'Manga-Corporation',
  'manganova.com': 'MangaNova',
  'manganova.fr': 'MangaNova',
  'enlignemanga.com': 'En Ligne Manga',
  'enlignemanga.fr': 'En Ligne Manga',
  'frmanga.com': 'FR Manga',
  'frmanga.fr': 'FR Manga',
  'royalmanga.com': 'Royal Manga',
  'royalmanga.fr': 'Royal Manga',
  'mangakawaii.com': 'Mangakawaii',
  'mangakawaii.fr': 'Mangakawaii',
  'toonfr.com': 'Toon FR',
  'toonfr.fr': 'Toon FR',

  // Sites à valider (domaines supposés depuis les noms)
  'animesama.fr': 'AnimeSama', // À valider
  'animesama.com': 'AnimeSama', // À valider
  'anteikuscan.fr': 'Anteiku Scan', // À valider
  'anteikuscan.com': 'Anteiku Scan', // À valider
  'aralosbd.fr': 'AralosBD', // À valider
  'aralosbd.com': 'AralosBD', // À valider
  'astralmanga.fr': 'Astral-Manga', // À valider
  'astralmanga.com': 'Astral-Manga', // À valider
  'bananascan.fr': 'Harmony-Scan', // À valider (ancien nom: BananaScan)
  'bananascan.com': 'Harmony-Scan', // À valider
  'harmonyscan.fr': 'Harmony-Scan', // À valider
  'harmonyscan.com': 'Harmony-Scan', // À valider
  'bigsolo.fr': 'BigSolo', // À valider
  'bigsolo.com': 'BigSolo', // À valider
  'bluesolo.fr': 'Blue Solo', // À valider
  'bluesolo.com': 'Blue Solo', // À valider
  'edscanlation.fr': 'ED Scanlation', // À valider
  'edscanlation.com': 'ED Scanlation', // À valider
  'epsilonscan.fr': 'Epsilon Scan', // À valider
  'epsilonscan.com': 'Epsilon Scan', // À valider
  'flamescansfr.fr': 'Legacy Scans', // À valider (ancien nom: FlameScansFR)
  'flamescansfr.com': 'Legacy Scans', // À valider
  'legacyscans.fr': 'Legacy Scans', // À valider
  'legacyscans.com': 'Legacy Scans', // À valider
  'fmteam.fr': 'FMTEAM', // À valider
  'fmteam.com': 'FMTEAM', // À valider
  'furyosquad.fr': 'FuryoSquad', // À valider
  'furyosquad.com': 'FuryoSquad', // À valider
  'hentaiorigines.fr': 'Hentai Origines', // À valider
  'hentaiorigines.com': 'Hentai Origines', // À valider
  'hentaiscantrad.fr': 'Hentai-Scantrad', // À valider
  'hentaiscantrad.com': 'Hentai-Scantrad', // À valider
  'hentaizone.fr': 'HentaiZone', // À valider
  'hentaizone.com': 'HentaiZone', // À valider
  'histoiredhentai.fr': 'HistoireDHentai', // À valider
  'histoiredhentai.com': 'HistoireDHentai', // À valider
  'inovascanmanga.fr': 'Inova Scan Manga', // À valider
  'inovascanmanga.com': 'Inova Scan Manga', // À valider
  'invinciblecomics.fr': 'Invincible ComicsVF', // À valider
  'invinciblecomics.com': 'Invincible ComicsVF', // À valider
  'kiwiyascans.fr': 'Kiwiya Scans', // À valider
  'kiwiyascans.com': 'Kiwiya Scans', // À valider
  'lelmanga.fr': 'Lelmanga', // À valider
  'lelmanga.com': 'Lelmanga', // À valider
  'lelscanvf.fr': 'Lelscan-VF', // À valider
  'lelscanvf.com': 'Lelscan-VF', // À valider
  'lesporoiniens.fr': 'Les Poroiniens', // À valider
  'lesporoiniens.com': 'Les Poroiniens', // À valider
  'lunarscanshentai.fr': 'Pornhwa Scans', // À valider (ancien nom: LunarScansHentai)
  'lunarscanshentai.com': 'Pornhwa Scans', // À valider
  'pornhwascans.fr': 'Pornhwa Scans', // À valider
  'pornhwascans.com': 'Pornhwa Scans', // À valider
  'mangasscans.fr': 'Mangas Scans', // À valider
  'mangasscans.com': 'Mangas Scans', // À valider
  'pantheonscan.fr': 'Pantheon Scan', // À valider
  'pantheonscan.com': 'Pantheon Scan', // À valider
  'perfscan.fr': 'Perf Scan', // À valider
  'perfscan.com': 'Perf Scan', // À valider
  'phenixscans.fr': 'PhenixScans', // À valider
  'phenixscans.com': 'PhenixScans', // À valider
  'poseidonscans.fr': 'Poseidon Scans', // À valider
  'poseidonscans.com': 'Poseidon Scans', // À valider
  'raijinscans.fr': 'Raijin Scans', // À valider
  'raijinscans.com': 'Raijin Scans', // À valider
  'reaperscans.fr': 'Reaper Scans', // À valider
  'reaperscans.com': 'Reaper Scans', // À valider
  'rimuscans.fr': 'Rimu Scans', // À valider
  'rimuscans.com': 'Rimu Scans', // À valider
  'scanhentaimenu.fr': 'X-Manga', // À valider (ancien nom: ScanHentaiMenu)
  'scanhentaimenu.com': 'X-Manga', // À valider
  'x-manga.fr': 'X-Manga', // À valider
  'x-manga.com': 'X-Manga', // À valider
  'scanr.fr': 'ScanR', // À valider
  'scanr.com': 'ScanR', // À valider
  'sirenscansfr.fr': 'Siren Scans FR', // À valider
  'sirenscansfr.com': 'Siren Scans FR', // À valider
  'softepsilonscan.fr': 'Soft Epsilon Scan', // À valider
  'softepsilonscan.com': 'Soft Epsilon Scan', // À valider
  'yaoiscan.fr': 'YaoiScan', // À valider
  'yaoiscan.com': 'YaoiScan', // À valider

  // Sites internationaux (pour référence)
  'mangadex.org': 'MangaDex',
  'mangakakalot.com': 'MangaKakalot',
  'mangareader.to': 'MangaReader',
  'mangapark.net': 'MangaPark',
  'readm.org': 'ReadM',
  'mangasee123.com': 'MangaSee',
  'mangatown.com': 'MangaTown',
  'mangago.me': 'MangaGo',
  'mangafreak.net': 'MangaFreak',
  'mangahub.io': 'MangaHub',
  'mangairo.com': 'Mangairo',
};

/**
 * Extrait le nom du site depuis une URL ou un source_id
 * Utilise l'index des sources en priorité, avec fallback sur le mapping hardcodé
 */
async function getSiteName(serie: { source_id?: string | null; source_url?: string | null }): Promise<string | null> {
  // Priorité 1: Utiliser source_id avec l'index
  if (serie.source_id) {
    try {
      const getAvailableSources = window.electronAPI?.getAvailableSources;
      if (getAvailableSources && typeof getAvailableSources === 'function') {
        const result = await getAvailableSources();
        if (result?.success && result.sources) {
          const source = result.sources.find((s: { id: string }) => s.id === serie.source_id);
          if (source) {
            return source.name;
          }
        }
      }
    } catch (error) {
      console.warn('Erreur récupération nom site depuis index:', error);
    }
  }

  // Priorité 2: Utiliser source_url avec le mapping hardcodé (fallback)
  if (serie.source_url) {
    return getSiteNameFromUrl(serie.source_url);
  }

  return null;
}

/**
 * @deprecated Utiliser getSiteName à la place
 * Extrait le nom du site depuis une URL (fallback pour compatibilité)
 */
function getSiteNameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase();

    // Retirer le www. si présent
    hostname = hostname.replace(/^www\./, '');

    // Chercher dans le mapping (correspondance exacte)
    if (SCAN_SITE_NAMES[hostname]) {
      return SCAN_SITE_NAMES[hostname];
    }

    // Chercher par correspondance partielle (pour gérer les sous-domaines)
    // Ex: "manga.sushiscan.fr" -> "sushiscan.fr"
    for (const [domain, name] of Object.entries(SCAN_SITE_NAMES)) {
      // Vérifier si le hostname se termine par le domaine (pour gérer les sous-domaines)
      // Ex: "manga.sushiscan.fr" se termine par "sushiscan.fr"
      if (hostname.endsWith(domain)) {
        return name;
      }

      // Vérifier si le domaine contient le hostname (pour les domaines plus courts)
      const hostnameParts = hostname.split('.');
      if (hostnameParts.length >= 2 && domain.endsWith(hostnameParts[hostnameParts.length - 2] || '')) {
        return name;
      }
    }

    // Si pas trouvé, essayer de formater le hostname
    // Ex: "sushiscan.fr" -> "Sushiscan"
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const domain = parts[0];
      // Capitaliser la première lettre de chaque mot (pour les noms avec tirets)
      const formatted = domain
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return formatted;
    }

    return hostname;
  } catch {
    return null;
  }
}

interface MangaCoverProps {
  serie: Serie;
  tomes: Tome[];
  shouldShow: (field: string) => boolean;
  onToggleFavorite: () => void;
  onStatusChange: (status: MangaStatus) => void;
  onCoverUpdated?: () => void;
  onMarkAllRead?: () => Promise<void>;
  onMarkAllChaptersRead?: () => Promise<void>;
  costsByUser?: Array<{ user: { id: number; name: string; color: string; emoji: string }; cost: number; tomesCount: number }>;
  totalPrix?: number;
  totalMihon?: number;
  profileImages?: Record<string, string | null>;
}

export default function MangaCover({
  serie,
  tomes,
  shouldShow,
  onToggleFavorite,
  onStatusChange,
  onCoverUpdated,
  onMarkAllRead,
  onMarkAllChaptersRead,
  costsByUser,
  totalPrix,
  totalMihon,
  profileImages
}: MangaCoverProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [siteName, setSiteName] = useState<string | null>(null);

  // Charger le nom du site depuis l'index
  useEffect(() => {
    getSiteName(serie).then(name => setSiteName(name));
  }, [serie.source_id, serie.source_url]);

  // Hook pour le drag & drop de couverture
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useCoverDragAndDrop({
    mediaType: 'serie',
    title: serie.titre,
    itemId: serie.id,
    currentCoverUrl: serie.couverture_url,
    saveOptions: {
      ...(serie.media_type && { mediaType: serie.media_type }),
      ...(serie.type_volume && { typeVolume: serie.type_volume })
    },
    updateCoverApi: async (itemId, coverUrl) => {
      const serieId = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
      await window.electronAPI.updateSerie?.(serieId, { couverture_url: coverUrl });
    },
    onCoverUpdated: () => {
      onCoverUpdated?.();
    },
    onError: (error) => {
      console.error('Erreur mise à jour couverture manga:', error);
    }
  });

  // Calculer le statut actuel selon la progression
  const currentStatus = useMemo(() => {
    // Si un statut manuel est défini, l'utiliser
    const manualTagMap: Record<SerieTag, string> = {
      a_lire: 'À lire',
      en_cours: 'En cours',
      lu: 'Terminé',
      abandonne: 'Abandonné',
      en_pause: 'En pause'
    };
    if (serie.tag && manualTagMap[serie.tag]) {
      return manualTagMap[serie.tag];
    }

    // Sinon, calculer selon la progression
    const tomesLus = tomes.filter(t => t.lu === 1).length;
    const tousTomesLus = tomes.length > 0 && tomesLus === tomes.length;

    const chapitresLus = serie.chapitres_lus || 0;
    const chapitresTotal = serie.nb_chapitres || 0;
    const tousChapitresLus = chapitresTotal > 0 && chapitresLus >= chapitresTotal;

    // Vérifier aussi volumes_lus depuis serie_statut_utilisateur
    const volumesLus = serie.volumes_lus || 0;

    // Si aucune progression (tomes = 0 ET chapitres = 0 ET volumes = 0) → "À lire"
    if (tomesLus === 0 && chapitresLus === 0 && volumesLus === 0) {
      return 'À lire';
    }

    // Si l'œuvre est terminée (tous les tomes OU tous les chapitres lus)
    if (tousTomesLus || tousChapitresLus) {
      return 'Terminé';
    }

    // Si progression >= 1 → "En cours"
    if (tomesLus >= 1 || chapitresLus >= 1 || volumesLus >= 1) {
      return 'En cours';
    }

    // Par défaut, "À lire"
    return 'À lire';
  }, [serie, tomes]);

  if (!shouldShow('couverture')) return null;

  return (
    <div style={{ width: 'clamp(180px, 20vw, 250px)', flexShrink: 0 }}>
      <div
        style={{
          width: '100%',
          height: '350px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: isDragging ? '3px dashed var(--primary)' : '2px solid var(--border)',
          position: 'relative',
          transition: 'border-color 0.2s',
          background: isDragging ? 'var(--primary)22' : 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--primary)22',
            color: 'var(--primary)',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center',
            padding: '20px',
            gap: '12px'
          }}>
            📥
            <div>Déposer l'image<br />de la série</div>
          </div>
        ) : serie.couverture_url ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowImageModal(true);
            }}
            style={{
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CoverImage
              src={serie.couverture_url}
              alt={serie.titre}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                filter: 'none',
                imageRendering: 'auto',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden' as any,
                transform: 'translateZ(0)'
              }}
            />
          </div>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, var(--surface-light), var(--surface))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            gap: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <BookOpen size={64} />
            <div style={{ fontSize: '12px' }}>Glissez une image ici</div>
          </div>
        )}
      </div>

      {/* Boutons liens externes sous la couverture */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', alignItems: 'center', justifyContent: 'center' }}>
        {/* Première ligne : MyAnimeList | Nautiljon */}
        {(serie.mal_id || serie.nautiljon_url) && (
          <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
            {serie.mal_id && (
              <ExternalLinkIcon
                href={`https://myanimelist.net/manga/${serie.mal_id}`}
                type="mal"
                size={40}
                title="Voir sur MyAnimeList"
              />
            )}

            {serie.mal_id && serie.nautiljon_url && (
              <span style={{
                color: 'var(--text-secondary)',
                fontSize: '16px',
                fontWeight: '500',
                userSelect: 'none'
              }}>
                |
              </span>
            )}

            {serie.nautiljon_url && (
              <ExternalLinkIcon
                href={serie.nautiljon_url}
                type="nautiljon"
                size={40}
                title="Voir sur Nautiljon"
              />
            )}
          </div>
        )}

        {/* Deuxième ligne : Site Mihon */}
        {serie.source_url && siteName && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={() => window.electronAPI?.openExternal?.(serie.source_url!)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 16px',
                background: 'var(--primary)',
                border: '2px solid var(--primary)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                width: 'auto',
                height: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary-hover)';
                e.currentTarget.style.borderColor = 'var(--primary-hover)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--primary-rgb), 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title={`Voir sur ${siteName}`}
            >
              <span style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '700',
                letterSpacing: '0.5px'
              }}>
                {siteName}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Section Mon Statut : Utilisation du composant commun */}
      <div style={{ marginTop: '24px' }}>
        <DetailStatusSection
          isFavorite={serie.is_favorite ?? false}
          currentStatus={currentStatus}
          availableStatuses={MANGA_STATUS_OPTIONS}
          statusCategory="manga"
          onToggleFavorite={onToggleFavorite}
          onStatusChange={(status: string) => {
            // Convertir le string en MangaStatus pour correspondre au type attendu
            onStatusChange(status as MangaStatus);
          }}
          showLabel={true}
        />
      </div>

      {/* Section Votre progression */}
      {onMarkAllRead && onMarkAllChaptersRead && (
        <div style={{ marginTop: '24px' }}>
          <MangaProgressSection
            serie={serie}
            tomes={tomes}
            shouldShow={shouldShow('section_progression')}
            onMarkAllRead={onMarkAllRead}
            onMarkAllChaptersRead={onMarkAllChaptersRead}
          />
        </div>
      )}

      {/* Section Coûts */}
      {costsByUser && totalPrix !== undefined && totalMihon !== undefined && profileImages && (
        <div style={{ marginTop: '24px' }}>
          <MangaCostsSection
            costsByUser={costsByUser}
            totalPrix={totalPrix}
            totalMihon={totalMihon}
            serie={serie}
            profileImages={profileImages}
            shouldShow={shouldShow('section_costs')}
          />
        </div>
      )}

      {/* Modal image plein écran */}
      {showImageModal && serie.couverture_url && (
        <ImageModal
          src={serie.couverture_url}
          alt={serie.titre}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}
