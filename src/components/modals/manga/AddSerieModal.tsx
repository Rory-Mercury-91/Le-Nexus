import { useEffect, useState } from 'react';
import { MangaDexResult } from '../../../types';
import MalCandidateSelectionModal from '../common/MalCandidateSelectionModal';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';
import { useModalEscape } from '../common/useModalEscape';
import AddSerieForm from './AddSerieForm';
import AddSerieSearchSection from './AddSerieSearchSection';

interface AddSerieModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialMalId?: string;
}

export default function AddSerieModal({ onClose, onSuccess, initialMalId }: AddSerieModalProps) {
  const [titre, setTitre] = useState(initialMalId || '');
  const [statut, setStatut] = useState<'En cours' | 'Terminée' | 'Abandonnée'>('En cours');
  const [typeVolume, setTypeVolume] = useState<'Broché' | 'Kindle' | 'Webtoon' | 'Broché Collector' | 'Coffret' | 'Webtoon Physique' | 'Light Novel' | 'Scan Manga' | 'Scan Webtoon'>('Broché');
  const [couvertureUrl, setCouvertureUrl] = useState('');
  const [description, setDescription] = useState('');
  const [statutPublication, setStatutPublication] = useState('');
  const [anneePublication, setAnneePublication] = useState('');
  const [genres, setGenres] = useState('');
  const [nbVolumes, setNbVolumes] = useState('');
  const [nbChapitres, setNbChapitres] = useState('');
  const [langueOriginale, setLangueOriginale] = useState('');
  const [demographie, setDemographie] = useState('');
  const [editeur, setEditeur] = useState('');
  const [malId, setMalId] = useState('');
  // Champs supplémentaires depuis Jikan /full (pour pré-remplissage complet)
  const [themes, setThemes] = useState('');
  const [auteurs, setAuteurs] = useState('');
  const [serialization, setSerialization] = useState('');
  const [titreRomaji, setTitreRomaji] = useState('');
  const [titreNatif, setTitreNatif] = useState('');
  const [titreAnglais, setTitreAnglais] = useState('');
  const [titresAlternatifs, setTitresAlternatifs] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [scoreMal, setScoreMal] = useState<number | null>(null);
  const [rankMal, setRankMal] = useState<number | null>(null);
  const [popularityMal, setPopularityMal] = useState<number | null>(null);
  const [background, setBackground] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [searchResults, setSearchResults] = useState<MangaDexResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importingDirectly, setImportingDirectly] = useState(false);
  const [malCandidateSelection, setMalCandidateSelection] = useState<{
    malId: number;
    candidates: Array<{
      id: number;
      titre: string;
      media_type?: string | null;
      type_volume?: string | null;
      source_donnees?: string | null;
      statut?: string | null;
      mal_id?: number | null;
    }>;
  } | null>(null);
  const [resolvingCandidate, setResolvingCandidate] = useState(false);

  // Fermer le modal avec la touche Échap
  useModalEscape(onClose, saving);

  // Lancer automatiquement la recherche si un ID MAL initial est fourni
  useEffect(() => {
    if (initialMalId && initialMalId.trim()) {
      setTitre(initialMalId);
      // Lancer la recherche automatiquement
      handleSearchMangadexAuto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchMangadexAuto = async () => {
    if (!titre.trim()) return;

    setSearching(true);

    // Détection recherche par ID MAL (chiffres uniquement)
    const isNumericId = /^\d+$/.test(titre.trim());

    if (isNumericId) {
      // Recherche directe par ID MAL via Jikan
      try {
        const malId = parseInt(titre.trim());
        const url = `https://api.jikan.moe/v4/manga/${malId}/full`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const data = json?.data;
          if (data) {
            // Simuler un résultat MangaDex pour l'affichage
            const result: MangaDexResult = {
              id: data.mal_id.toString(),
              titre: data.title || data.title_english || data.title_japanese || '',
              description: data.synopsis || '',
              couverture: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || '',
              source: 'MyAnimeList'
            };
            setSearchResults([result]);
          } else {
            setSearchResults([]);
          }
        } else {
          setSearchResults([]);
        }
      } catch (e) {
        console.warn('Recherche par ID MAL échouée:', (e as any)?.message);
        setSearchResults([]);
      }
    } else {
      // Recherche normale par titre
      const results = await window.electronAPI.searchManga(titre);
      setSearchResults(results);
    }

    setSearching(false);
  };

  const handleSearchMangadex = async () => {
    if (!titre.trim()) return;

    setSearching(true);

    // Détection recherche par ID MAL (chiffres uniquement)
    const isNumericId = /^\d+$/.test(titre.trim());

    if (isNumericId) {
      // Recherche directe par ID MAL via Jikan
      try {
        const malId = parseInt(titre.trim());
        const url = `https://api.jikan.moe/v4/manga/${malId}/full`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const data = json?.data;
          if (data) {
            // Simuler un résultat MangaDex pour l'affichage
            const result: MangaDexResult = {
              id: data.mal_id.toString(),
              titre: data.title || data.title_english || data.title_japanese || '',
              description: data.synopsis || '',
              couverture: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || '',
              source: 'MyAnimeList'
            };
            setSearchResults([result]);
          } else {
            setSearchResults([]);
          }
        } else {
          setSearchResults([]);
        }
      } catch (e) {
        console.warn('Recherche par ID MAL échouée:', (e as any)?.message);
        setSearchResults([]);
      }
    } else {
      // Recherche normale par titre
      const results = await window.electronAPI.searchManga(titre);
      setSearchResults(results);
    }

    setSearching(false);
  };

  const handleSearchAmazon = async () => {
    if (!titre.trim()) return;

    const searchQuery = encodeURIComponent(`${titre} manga français`);
    const amazonUrl = `https://www.amazon.fr/s?k=${searchQuery}`;
    await window.electronAPI.openExternal?.(amazonUrl);
  };

  const runMalImport = async (
    malIdValue: number,
    options: { targetSerieId?: number; forceCreate?: boolean } = {},
    fromSelection = false
  ) => {
    if (fromSelection) {
      setResolvingCandidate(true);
    } else {
      setImportingDirectly(true);
    }

    try {
      const result = await window.electronAPI.addMangaByMalId(malIdValue, options);
      if (result.success) {
        setMalCandidateSelection(null);
        onSuccess();
        onClose();
      } else if (result.requiresSelection && Array.isArray(result.candidates)) {
        setMalCandidateSelection({ malId: malIdValue, candidates: result.candidates });
      } else {
        console.error('Erreur import MAL:', result.error);
        window.alert(result.error || 'Erreur lors de l\'import depuis MyAnimeList');
      }
    } catch (error: any) {
      console.error('Erreur import direct MAL:', error);
      window.alert(error?.message || 'Erreur lors de l\'import depuis MyAnimeList');
    } finally {
      if (fromSelection) {
        setResolvingCandidate(false);
      } else {
        setImportingDirectly(false);
      }
    }
  };

  // Importer directement depuis MAL (sans passer par le formulaire)
  const handleImportDirectlyFromMal = async () => {
    const detectedMalId = /^\d+$/.test(titre.trim()) ? titre.trim() : malId;
    if (!detectedMalId) return;

    await runMalImport(parseInt(detectedMalId), {}, false);
  };


  const handleSelectManga = async (manga: any) => {
    // Réinitialiser tous les champs
    setTitre(manga.titre);
    setDescription(manga.description || '');
    setStatutPublication(manga.statut_publication || '');
    setAnneePublication(manga.annee_publication?.toString() || '');
    setGenres(manga.genres || '');
    setNbVolumes(manga.nb_volumes?.toString() || '');
    setNbChapitres(manga.nb_chapitres?.toString() || '');
    setLangueOriginale(manga.langue_originale || '');
    setDemographie(manga.demographie || '');
    setEditeur('');
    // Réinitialiser les champs supplémentaires
    setThemes('');
    setAuteurs('');
    setSerialization('');
    setTitreRomaji('');
    setTitreNatif('');
    setTitreAnglais('');
    setTitresAlternatifs('');
    setDateDebut('');
    setDateFin('');
    setScoreMal(null);
    setRankMal(null);
    setPopularityMal(null);
    setBackground('');
    setMediaType('');
    setSearchResults([]);

    // Télécharger la couverture si disponible
    if (manga.couverture) {
      setSearching(true);
      const fileName = `${manga.id}.jpg`;
      const result = await window.electronAPI.downloadCover(
        manga.couverture,
        fileName,
        manga.titre,
        'serie',
        {
          mediaType: manga.media_type || mediaType,
          typeVolume: manga.type_volume
        }
      );

      if (result.success && result.localPath) {
        // Image téléchargée avec succès
        setCouvertureUrl(result.localPath);
      } else {
        // Fallback sur l'URL en ligne
        setCouvertureUrl(manga.couverture);
      }
      setSearching(false);
    } else {
      setCouvertureUrl('');
    }

    // Résolution automatique du MAL ID et enrichissement de base via Jikan
    // Si le résultat vient d'une recherche par ID MAL (source === 'MyAnimeList' et id numérique), utiliser directement cet ID
    const isDirectMalId = manga.source === 'MyAnimeList' && /^\d+$/.test(manga.id);

    try {
      let malData: any = null;

      if (isDirectMalId) {
        // Recherche directe par ID MAL (endpoint /full pour toutes les données)
        const malId = parseInt(manga.id);
        setMalId(String(malId));
        const resp = await fetch(`https://api.jikan.moe/v4/manga/${malId}/full`);
        if (resp.ok) {
          const js = await resp.json();
          malData = js?.data;
        }
      } else {
        // Recherche par titre
        const normalize = (s: string) => (s || '')
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();
        const queryTitle = manga.titre;
        const resp = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(queryTitle)}&limit=8&sfw`);
        if (resp.ok) {
          const js = await resp.json();
          const items: any[] = js?.data || [];
          // Filtrer d'abord sur type Manga (éviter Light Novel)
          const preferred = items.filter(i => (i.type || '').toLowerCase() === 'manga');
          const pool = preferred.length > 0 ? preferred : items;
          // Choisir le meilleur match par similarité de titre
          const target = normalize(queryTitle);
          let best = pool[0];
          let bestScore = -1;
          for (const it of pool) {
            const cand = normalize(it.title || '') + ' ' + normalize(it.title_english || '') + ' ' + normalize(it.title_japanese || '');
            const overlap = target.split(' ').filter(w => w && cand.includes(w)).length;
            const score = overlap + ((it.type || '').toLowerCase() === 'manga' ? 1 : 0);
            if (score > bestScore) { bestScore = score; best = it; }
          }
          malData = best;
        }
      }

      if (malData) {
        if (!isDirectMalId) {
          setMalId(String(malData.mal_id));
        }

        // Si on a trouvé un match par titre, récupérer les données complètes depuis /full
        if (!isDirectMalId && malData.mal_id) {
          try {
            const fullResp = await fetch(`https://api.jikan.moe/v4/manga/${malData.mal_id}/full`);
            if (fullResp.ok) {
              const fullJson = await fullResp.json();
              malData = fullJson?.data || malData;
            }
          } catch (e) {
            console.warn('Récupération données complètes échouée:', (e as any)?.message);
          }
        }

        // Pré-remplir TOUS les champs disponibles depuis l'endpoint /full
        // Titre principal
        if (malData.title && !titre) setTitre(malData.title);

        // Description
        const currentDesc = description || manga.description || '';
        if (!currentDesc && malData.synopsis) setDescription(malData.synopsis);

        // Dates
        const y = malData.published?.from ? new Date(malData.published.from).getFullYear() : null;
        const currentAnnee = anneePublication || manga.annee_publication?.toString() || '';
        if (!currentAnnee && y) setAnneePublication(String(y));

        // Statut publication
        const currentStatut = statutPublication || manga.statut_publication || '';
        if (!currentStatut && malData.status) {
          const statusMap: Record<string, string> = {
            'Finished': 'Terminée',
            'Publishing': 'En cours',
            'On Hiatus': 'En pause',
            'Discontinued': 'Abandonnée'
          };
          setStatutPublication(statusMap[malData.status] || malData.status);
        }

        // Volumes et chapitres
        const currentVolumes = nbVolumes || manga.nb_volumes?.toString() || '';
        if (!currentVolumes && malData.volumes) setNbVolumes(String(malData.volumes));
        const currentChapitres = nbChapitres || manga.nb_chapitres?.toString() || '';
        if (!currentChapitres && malData.chapters) setNbChapitres(String(malData.chapters));

        // Genres
        const currentGenres = genres || manga.genres || '';
        if (!currentGenres && malData.genres) {
          setGenres(malData.genres.map((g: any) => g.name).join(', '));
        }

        // Thèmes (disponible depuis /full)
        if (malData.themes) {
          setThemes(malData.themes.map((t: any) => t.name).join(', '));
        }

        // Auteurs (disponible depuis /full)
        if (malData.authors) {
          const auteursList = malData.authors.map((a: any) => {
            const name = a.name || `${a.node?.first_name || ''} ${a.node?.last_name || ''}`.trim();
            return name;
          }).filter(Boolean).join(', ');
          if (auteursList) setAuteurs(auteursList);
        }

        // Sérialisation (disponible depuis /full)
        if (malData.serializations) {
          setSerialization(malData.serializations.map((s: any) => s.name).join(', '));
        }

        // Titres alternatifs (disponible depuis /full)
        if (malData.title) setTitreRomaji(malData.title);
        if (malData.title_japanese) setTitreNatif(malData.title_japanese);
        if (malData.title_english) setTitreAnglais(malData.title_english);
        if (malData.title_synonyms && malData.title_synonyms.length > 0) {
          setTitresAlternatifs(JSON.stringify(malData.title_synonyms));
        }

        // Dates complètes (disponible depuis /full)
        if (malData.published?.from) setDateDebut(malData.published.from);
        if (malData.published?.to) setDateFin(malData.published.to);

        // Scores MAL (disponible depuis /full)
        if (malData.score !== null && malData.score !== undefined) {
          setScoreMal(malData.score);
        }
        if (malData.rank !== null && malData.rank !== undefined) {
          setRankMal(malData.rank);
        }
        if (malData.popularity !== null && malData.popularity !== undefined) {
          setPopularityMal(malData.popularity);
        }

        // Background (disponible depuis /full)
        if (malData.background) setBackground(malData.background);

        // Langue originale - DÉDUITE depuis le type de média (comme dans add-manga-by-mal-id)
        const type = malData.type || 'Manga';
        const normalizedMediaType = type === 'manga' ? 'Manga' :
          type === 'manhwa' ? 'Manhwa' :
            type === 'manhua' ? 'Manhua' :
              type === 'novel' || type === 'light novel' ? 'Light Novel' :
                type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

        // Media type
        setMediaType(normalizedMediaType);

        // Démographie
        const demo = malData.demographics?.[0]?.name || '';
        const currentDemo = demographie || manga.demographie || '';
        if (!currentDemo && demo) setDemographie(demo);

        let langueOriginaleDeduite = 'ja'; // Par défaut japonais
        if (normalizedMediaType === 'Manhwa') {
          langueOriginaleDeduite = 'ko'; // Coréen
        } else if (normalizedMediaType === 'Manhua') {
          langueOriginaleDeduite = 'zh'; // Chinois
        } else if (normalizedMediaType === 'Manga') {
          langueOriginaleDeduite = 'ja'; // Japonais
        }

        const currentLangue = langueOriginale || manga.langue_originale || '';
        if (!currentLangue) setLangueOriginale(langueOriginaleDeduite);

        // Type de volume - Déduit depuis le type de média
        if (normalizedMediaType === 'Light Novel') {
          setTypeVolume('Light Novel');
        } else if (normalizedMediaType === 'Manhwa' || normalizedMediaType === 'Manhua') {
          // Par défaut Webtoon pour Manhwa/Manhua, mais l'utilisateur peut changer
          if (typeVolume === 'Broché') {
            setTypeVolume('Webtoon Physique');
          }
        }

        // Couverture Jikan
        if (!couvertureUrl) {
          const img = malData.images?.jpg?.large_image_url || malData.images?.jpg?.image_url;
          if (img) {
            const res = await window.electronAPI.downloadCover(
              img,
              `${malData.mal_id}.jpg`,
              manga.titre || malData.title,
              'serie',
              {
                mediaType: malData?.type || mediaType || manga.media_type,
                typeVolume: manga.type_volume
              }
            );
            if (res?.success && res.localPath) setCouvertureUrl(res.localPath);
          }
        }
      }
    } catch (e) {
      console.warn('Auto-Résolution MAL ID échouée:', (e as any)?.message);
    }
  };

  const handleUploadImage = async () => {
    // Utiliser le titre actuel ou un titre temporaire
    const titrePourDossier = titre.trim() || 'nouvelle_serie';

    // Supprimer l'ancienne image locale si elle existe
    if (couvertureUrl && !couvertureUrl.includes('://') && !couvertureUrl.startsWith('data:')) {
      await window.electronAPI.deleteCoverImage(couvertureUrl);
    }

    const result = await window.electronAPI.uploadCustomCover(titrePourDossier, 'serie', {
      mediaType: mediaType || null,
      typeVolume
    });
    if (result.success && result.localPath) {
      setCouvertureUrl(result.localPath);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      const titrePourDossier = titre.trim() || 'nouvelle_serie';

      // Supprimer l'ancienne image locale si elle existe
      if (couvertureUrl && !couvertureUrl.includes('://') && !couvertureUrl.startsWith('data:')) {
        await window.electronAPI.deleteCoverImage(couvertureUrl);
      }

      // Dans Electron, les fichiers droppés ont une propriété 'path'
      const filePath = (imageFile as any).path;
      const result = await window.electronAPI.saveCoverFromPath(filePath, titrePourDossier, 'serie', {
        mediaType: mediaType || undefined,
        typeVolume: typeVolume
      });
      if (result.success && result.localPath) {
        setCouvertureUrl(result.localPath);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titre.trim()) {
      return;
    }

    setSaving(true);
    try {
      // Déterminer automatiquement le type_contenu selon le type_volume
      const typeContenu = (typeVolume === 'Scan Manga' || typeVolume === 'Scan Webtoon') ? 'chapitre' : 'volume';

      // Préparer les données avec TOUS les champs disponibles depuis Jikan /full
      await window.electronAPI.createSerie({
        titre: titre.trim(),
        statut,
        type_volume: typeVolume,
        type_contenu: typeContenu,
        couverture_url: couvertureUrl || null,
        description: description || null,
        statut_publication: statutPublication || null,
        annee_publication: anneePublication ? parseInt(anneePublication) : null,
        genres: genres || null,
        nb_volumes: nbVolumes ? parseInt(nbVolumes) : null,
        nb_chapitres: nbChapitres ? parseInt(nbChapitres) : null,
        langue_originale: langueOriginale || null,
        demographie: demographie || null,
        editeur: editeur || null,
        mal_id: malId ? parseInt(malId) : null,
        // Champs supplémentaires depuis Jikan /full
        themes: themes || null,
        auteurs: auteurs || null,
        serialization: serialization || null,
        titre_romaji: titreRomaji || null,
        titre_natif: titreNatif || null,
        titre_anglais: titreAnglais || null,
        titres_alternatifs: titresAlternatifs || null,
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        score_mal: scoreMal || null,
        rank_mal: rankMal || null,
        popularity_mal: popularityMal || null,
        background: background || null,
        media_type: mediaType || null
      });
      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la création de la série:', error);
      setSaving(false);
    }
  };

  const formData = {
    titre,
    statut,
    typeVolume,
    couvertureUrl,
    description,
    statutPublication,
    anneePublication,
    genres,
    nbVolumes,
    nbChapitres,
    langueOriginale,
    demographie,
    editeur,
    malId
  };

  const setFormData = (data: typeof formData) => {
    setTitre(data.titre);
    setStatut(data.statut);
    setTypeVolume(data.typeVolume);
    setCouvertureUrl(data.couvertureUrl);
    setDescription(data.description);
    setStatutPublication(data.statutPublication);
    setAnneePublication(data.anneePublication);
    setGenres(data.genres);
    setNbVolumes(data.nbVolumes);
    setNbChapitres(data.nbChapitres);
    setLangueOriginale(data.langueOriginale);
    setDemographie(data.demographie);
    setEditeur(data.editeur);
    setMalId(data.malId);
  };

  return (
    <>
      <Modal maxWidth="900px">
        <ModalHeader title="Ajouter une série" onClose={onClose} />

        <div style={{ padding: '24px' }}>
          {/* Recherche MangaDex */}
          <AddSerieSearchSection
            titre={titre}
            setTitre={setTitre}
            searchResults={searchResults}
            searching={searching}
            onSearch={handleSearchMangadex}
            onSearchAmazon={handleSearchAmazon}
            onSelectManga={handleSelectManga}
            onImportDirectly={handleImportDirectlyFromMal}
            importingDirectly={importingDirectly}
            malId={malId}
          />

          {/* Formulaire */}
          <AddSerieForm
            formData={formData}
            setFormData={setFormData}
            dragging={dragging}
            saving={saving}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onUploadImage={handleUploadImage}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </div>
      </Modal>

      {malCandidateSelection && (
        <MalCandidateSelectionModal
          malId={malCandidateSelection.malId}
          candidates={malCandidateSelection.candidates}
          loading={resolvingCandidate}
          onSelect={(candidateId) => {
            void runMalImport(malCandidateSelection.malId, { targetSerieId: candidateId }, true);
          }}
          onCreateNew={() => {
            void runMalImport(malCandidateSelection.malId, { forceCreate: true }, true);
          }}
          onClose={() => {
            if (!resolvingCandidate) {
              setMalCandidateSelection(null);
            }
          }}
        />
      )}
    </>
  );
}
