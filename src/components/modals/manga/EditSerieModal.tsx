import { useState } from 'react';
import { Serie } from '../../../types';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';
import { useModalEscape } from '../common/useModalEscape';
import EditSerieForm from './EditSerieForm';

interface EditSerieModalProps {
  serie: Serie;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSerieModal({ serie, onClose, onSuccess }: EditSerieModalProps) {
  const [titre, setTitre] = useState(serie.titre);
  const [typeVolume, setTypeVolume] = useState(serie.type_volume);
  const [couvertureUrl, setCouvertureUrl] = useState(serie.couverture_url || '');
  const [description, setDescription] = useState(serie.description || '');
  const [statutPublication, setStatutPublication] = useState(serie.statut_publication || '');
  const [statutPublicationVf, setStatutPublicationVf] = useState(serie.statut_publication_vf || '');
  const [anneePublication, setAnneePublication] = useState(serie.annee_publication?.toString() || '');
  const [anneeVf, setAnneeVf] = useState(serie.annee_vf?.toString() || '');
  const [genres, setGenres] = useState(serie.genres || '');
  const [nbChapitres, setNbChapitres] = useState(serie.nb_chapitres?.toString() || '');
  const [nbChapitresVf, setNbChapitresVf] = useState(serie.nb_chapitres_vf?.toString() || '');
  const [nbVolumes, setNbVolumes] = useState(serie.nb_volumes?.toString() || '');
  const [nbVolumesVf, setNbVolumesVf] = useState(serie.nb_volumes_vf?.toString() || '');
  const [langueOriginale, setLangueOriginale] = useState(serie.langue_originale || '');
  const [demographie, setDemographie] = useState(serie.demographie || '');
  const [editeur, setEditeur] = useState(serie.editeur || '');
  const [editeurVo, setEditeurVo] = useState(serie.editeur_vo || '');
  const [themes, setThemes] = useState(serie.themes || '');
  const [serialization, setSerialization] = useState(serie.serialization || '');
  const [auteurs, setAuteurs] = useState(serie.auteurs || '');
  // Fusionner tous les titres alternatifs en un seul champ
  const [titresAlternatifs, setTitresAlternatifs] = useState(() => {
    const allTitles: string[] = [];

    // Ajouter titre_romaji, titre_natif, titre_anglais s'ils existent
    if (serie.titre_romaji) allTitles.push(serie.titre_romaji);
    if (serie.titre_natif) allTitles.push(serie.titre_natif);
    if (serie.titre_anglais) allTitles.push(serie.titre_anglais);

    // Ajouter titres_alternatifs (format JSON array)
    if (serie.titres_alternatifs) {
      try {
        const parsed = JSON.parse(serie.titres_alternatifs);
        if (Array.isArray(parsed)) {
          allTitles.push(...parsed.map(t => String(t).trim()).filter(Boolean));
        }
      } catch {
        // Si ce n'est pas du JSON valide, ignorer
      }
    }

    // Dédupliquer et retourner comme chaîne séparée par " // "
    const uniqueTitles = Array.from(new Set(allTitles.map(t => t.toLowerCase().trim())))
      .map(normalized => allTitles.find(t => t.toLowerCase().trim() === normalized))
      .filter(Boolean) as string[];

    return uniqueTitles.join(' // ');
  });

  // Garder les champs individuels pour compatibilité mais ils ne seront plus utilisés séparément
  const [titreRomaji] = useState(serie.titre_romaji || '');
  const [titreNatif] = useState(serie.titre_natif || '');
  const [titreAnglais] = useState(serie.titre_anglais || '');
  const [mediaType, setMediaType] = useState(serie.media_type || '');
  const [dateDebut, setDateDebut] = useState(() => {
    if (!serie.date_debut) return '';
    const d = new Date(serie.date_debut);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  });
  const [dateFin, setDateFin] = useState(() => {
    if (!serie.date_fin) return '';
    const d = new Date(serie.date_fin);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  });
  const [malId, setMalId] = useState(serie.mal_id?.toString() || '');
  const [scoreMal, setScoreMal] = useState(serie.score_mal?.toString() || '');
  const [rankMal, setRankMal] = useState(serie.rank_mal?.toString() || '');
  const [popularityMal, setPopularityMal] = useState(serie.popularity_mal?.toString() || '');
  const [background, setBackground] = useState(serie.background || '');
  const [prequelMalId, setPrequelMalId] = useState(serie.prequel_mal_id?.toString() || '');
  const [sequelMalId, setSequelMalId] = useState(serie.sequel_mal_id?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatingBackground, setTranslatingBackground] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fermer le modal avec la touche Échap
  useModalEscape(onClose, saving);

  const handleUploadImage = async () => {
    // Supprimer l'ancienne image locale si elle existe
    if (couvertureUrl && couvertureUrl.startsWith('covers/')) {
      await window.electronAPI.deleteCoverImage(couvertureUrl);
    }

    const result = await window.electronAPI.uploadCustomCover(titre, 'serie', {
      mediaType: serie.media_type,
      typeVolume: serie.type_volume
    });
    if (result.success && result.localPath) {
      setCouvertureUrl(result.localPath);
    }
  };

  const handleTranslate = async () => {
    if (!description || !description.trim()) {
      setMessage({ type: 'error', text: 'Aucune description à traduire' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (description.includes('traduit automatiquement') || description.includes('Synopsis français')) {
      setMessage({ type: 'error', text: 'Cette description semble déjà traduite' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setTranslating(true);
    setMessage(null);

    try {
      const result = await window.electronAPI.translateSerieDescription(serie.id);

      if (result.success && result.translatedDescription) {
        setDescription(result.translatedDescription);
        setMessage({ type: 'success', text: 'Description traduite avec succès !' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de la traduction' });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Erreur traduction:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la traduction' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setTranslating(false);
    }
  };

  const handleTranslateBackground = async () => {
    if (!background || !background.trim()) {
      setMessage({ type: 'error', text: 'Aucun background à traduire' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (background.includes('traduit automatiquement') || background.includes('Background traduit')) {
      setMessage({ type: 'error', text: 'Ce background semble déjà traduit' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setTranslatingBackground(true);
    setMessage(null);

    try {
      const result = await window.electronAPI.translateSerieBackground?.(serie.id);

      if (result && result.success && result.translatedBackground) {
        setBackground(result.translatedBackground);
        setMessage({ type: 'success', text: 'Background traduit avec succès !' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result?.error || 'Erreur lors de la traduction' });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Erreur traduction background:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la traduction' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setTranslatingBackground(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titre.trim()) {
      return;
    }

    setSaving(true);
    try {
      await window.electronAPI.updateSerie(serie.id, {
        titre: titre.trim(),
        type_volume: typeVolume,
        couverture_url: couvertureUrl || null,
        description: description || null,
        statut_publication: statutPublication || null,
        statut_publication_vf: statutPublicationVf || null,
        annee_publication: anneePublication ? parseInt(anneePublication) : null,
        annee_vf: anneeVf ? parseInt(anneeVf) : null,
        genres: genres || null,
        nb_chapitres: nbChapitres ? parseInt(nbChapitres) : null,
        nb_chapitres_vf: nbChapitresVf ? parseInt(nbChapitresVf) : null,
        nb_volumes: nbVolumes ? parseInt(nbVolumes) : null,
        nb_volumes_vf: nbVolumesVf ? parseInt(nbVolumesVf) : null,
        langue_originale: langueOriginale || null,
        demographie: demographie || null,
        editeur: editeur || null,
        editeur_vo: editeurVo || null,
        themes: themes || null,
        serialization: serialization || null,
        auteurs: auteurs || null,
        // Unifier tous les titres alternatifs dans titres_alternatifs (format JSON array)
        // titre_alternatif sera mis à null car tout est maintenant dans titres_alternatifs
        titre_alternatif: null,
        titre_romaji: titreRomaji || null,
        titre_natif: titreNatif || null,
        titre_anglais: titreAnglais || null,
        titres_alternatifs: titresAlternatifs ? JSON.stringify(titresAlternatifs.split(' // ').map((t: string) => t.trim()).filter(Boolean)) : null,
        media_type: mediaType || null,
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        mal_id: malId ? parseInt(malId) : null,
        score_mal: scoreMal ? parseFloat(scoreMal) : null,
        rank_mal: rankMal ? parseInt(rankMal) : null,
        popularity_mal: popularityMal ? parseInt(popularityMal) : null,
        background: background || null,
        prequel_mal_id: prequelMalId ? parseInt(prequelMalId) : null,
        sequel_mal_id: sequelMalId ? parseInt(sequelMalId) : null
      });
      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la modification de la série:', error);
      setSaving(false);
    }
  };

  const formData = {
    titre,
    typeVolume: typeVolume as 'Broché' | 'Kindle' | 'Webtoon' | 'Broché Collector' | 'Coffret' | 'Webtoon Physique' | 'Light Novel' | 'Scan Manga' | 'Scan Webtoon' | 'Numérique',
    couvertureUrl,
    description,
    statutPublication,
    statutPublicationVf,
    anneePublication,
    anneeVf,
    genres,
    nbChapitres,
    nbChapitresVf,
    nbVolumes,
    nbVolumesVf,
    langueOriginale,
    demographie,
    editeur,
    editeurVo,
    themes,
    serialization,
    auteurs,
    titresAlternatifs,
    mediaType,
    dateDebut,
    dateFin,
    malId,
    scoreMal,
    rankMal,
    popularityMal,
    background,
    prequelMalId,
    sequelMalId
  };

  const setFormData = (data: typeof formData) => {
    setTitre(data.titre);
    setTypeVolume(data.typeVolume as any);
    setCouvertureUrl(data.couvertureUrl);
    setDescription(data.description);
    setStatutPublication(data.statutPublication);
    setStatutPublicationVf(data.statutPublicationVf);
    setAnneePublication(data.anneePublication);
    setAnneeVf(data.anneeVf);
    setGenres(data.genres);
    setNbChapitres(data.nbChapitres);
    setNbChapitresVf(data.nbChapitresVf);
    setNbVolumes(data.nbVolumes);
    setNbVolumesVf(data.nbVolumesVf);
    setLangueOriginale(data.langueOriginale);
    setDemographie(data.demographie);
    setEditeur(data.editeur);
    setEditeurVo(data.editeurVo);
    setThemes(data.themes);
    setSerialization(data.serialization);
    setAuteurs(data.auteurs);
    setTitresAlternatifs(data.titresAlternatifs);
    setMediaType(data.mediaType);
    setDateDebut(data.dateDebut);
    setDateFin(data.dateFin);
    setMalId(data.malId);
    setScoreMal(data.scoreMal);
    setRankMal(data.rankMal);
    setPopularityMal(data.popularityMal);
    setBackground(data.background);
    setPrequelMalId(data.prequelMalId);
    setSequelMalId(data.sequelMalId);
  };

  return (
    <Modal maxWidth="900px">
      <ModalHeader title="Modifier la série" onClose={onClose} />

      <div style={{ padding: '24px' }}>
        <EditSerieForm
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          translating={translating}
          translatingBackground={translatingBackground}
          onUploadImage={handleUploadImage}
          onTranslate={handleTranslate}
          onTranslateBackground={handleTranslateBackground}
          onSubmit={handleSubmit}
          onCancel={onClose}
          message={message}
          serie={serie}
        />
      </div>
    </Modal>
  );
}
