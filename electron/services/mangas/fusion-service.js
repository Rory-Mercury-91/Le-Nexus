// Service de fusion intelligente MAL/Nautiljon pour mangas
// À compléter selon docs_perso/Gestion_Donnees_Mangas.md

function mergeMangaData(existing, updates) {
  const result = { ...existing };
  // Exemple: ne jamais écraser VO par VF, préférer VF pour titre/description
  if (updates.titre) result.titre = updates.titre;
  if (updates.description && !existing.description) result.description = updates.description;
  if (updates.annee_vf) result.annee_vf = updates.annee_vf;
  if (updates.nb_chapitres_vf != null) result.nb_chapitres_vf = updates.nb_chapitres_vf;
  if (updates.nb_volumes_vf != null) result.nb_volumes_vf = updates.nb_volumes_vf;
  if (updates.statut_publication_vf) result.statut_publication_vf = updates.statut_publication_vf;
  if (updates.editeur) result.editeur = updates.editeur;
  if (updates.editeur_vo) result.editeur_vo = updates.editeur_vo;
  if (updates.themes) result.themes = updates.themes;
  if (updates.genres && !existing.genres) result.genres = updates.genres;
  return result;
}

module.exports = { mergeMangaData };
