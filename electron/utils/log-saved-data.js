/**
 * Fonction utilitaire pour logger toutes les données sauvegardées en base de données
 * Affiche tous les champs, même s'ils sont null ou undefined
 */

function logSavedData(data, type = 'manga') {
  console.log(`💾 ========== DONNÉES SAUVEGARDÉES DANS LA BDD (${type.toUpperCase()}) ==========`);
  
  if (type === 'manga') {
    // Logs pour les mangas
    console.log(`📖 titre: ${data.titre ?? 'null'}`);
    console.log(`📊 statut: ${data.statut ?? 'null'}`);
    console.log(`📦 type_volume: ${data.type_volume ?? 'null'}`);
    console.log(`📦 type_contenu: ${data.type_contenu ?? 'null'}`);
    console.log(`🆔 mal_id: ${data.mal_id ?? 'null'}`);
    console.log(`🖼️ couverture_url: ${data.couverture_url ?? 'null'}`);
    console.log(`📝 description: ${data.description ?? 'null'}`);
    console.log(`📊 statut_publication: ${data.statut_publication ?? 'null'}`);
    console.log(`📊 statut_publication_vf: ${data.statut_publication_vf ?? 'null'}`);
    console.log(`📅 annee_publication: ${data.annee_publication ?? 'null'}`);
    console.log(`📅 annee_vf: ${data.annee_vf ?? 'null'}`);
    console.log(`🏷️ genres: ${data.genres ?? 'null'}`);
    console.log(`📚 nb_volumes: ${data.nb_volumes ?? 'null'}`);
    console.log(`📚 nb_volumes_vf: ${data.nb_volumes_vf ?? 'null'}`);
    console.log(`📖 nb_chapitres: ${data.nb_chapitres ?? 'null'}`);
    console.log(`📖 nb_chapitres_vf: ${data.nb_chapitres_vf ?? 'null'}`);
    console.log(`🌍 langue_originale: ${data.langue_originale ?? 'null'}`);
    console.log(`👥 demographie: ${data.demographie ?? 'null'}`);
    console.log(`🏢 editeur: ${data.editeur ?? 'null'}`);
    console.log(`🏢 editeur_vo: ${data.editeur_vo ?? 'null'}`);
    console.log(`⭐ rating: ${data.rating ?? 'null'}`);
    console.log(`📖 titre_romaji: ${data.titre_romaji ?? 'null'}`);
    console.log(`📖 titre_natif: ${data.titre_natif ?? 'null'}`);
    console.log(`📖 titre_anglais: ${data.titre_anglais ?? 'null'}`);
    console.log(`🏷️ titres_alternatifs: ${data.titres_alternatifs ?? 'null'}`);
    console.log(`📅 date_debut: ${data.date_debut ?? 'null'}`);
    console.log(`📅 date_fin: ${data.date_fin ?? 'null'}`);
    console.log(`🎭 themes: ${data.themes ?? 'null'}`);
    console.log(`⭐ score_mal: ${data.score_mal ?? 'null'}`);
    console.log(`📊 rank_mal: ${data.rank_mal ?? 'null'}`);
    console.log(`📈 popularity_mal: ${data.popularity_mal ?? 'null'}`);
    console.log(`✍️ auteurs: ${data.auteurs ?? 'null'}`);
    console.log(`📰 serialization: ${data.serialization ?? 'null'}`);
    console.log(`📝 background: ${data.background ?? 'null'}`);
    console.log(`📖 media_type: ${data.media_type ?? 'null'}`);
    console.log(`🔗 prequel_mal_id: ${data.prequel_mal_id ?? 'null'}`);
    console.log(`🔗 sequel_mal_id: ${data.sequel_mal_id ?? 'null'}`);
    console.log(`🎬 anime_adaptation_mal_id: ${data.anime_adaptation_mal_id ?? 'null'}`);
    console.log(`📚 light_novel_mal_id: ${data.light_novel_mal_id ?? 'null'}`);
    console.log(`📖 manga_adaptation_mal_id: ${data.manga_adaptation_mal_id ?? 'null'}`);
    console.log(`🔗 relations: ${data.relations ? 'présentes (JSON)' : 'null'}`);
  } else if (type === 'anime') {
    // Logs pour les animes
    console.log(`🆔 mal_id: ${data.mal_id ?? 'null'}`);
    console.log(`🔗 mal_url: ${data.mal_url ?? 'null'}`);
    console.log(`📖 titre: ${data.titre ?? 'null'}`);
    console.log(`📖 titre_romaji: ${data.titre_romaji ?? 'null'}`);
    console.log(`📖 titre_natif: ${data.titre_natif ?? 'null'}`);
    console.log(`📖 titre_anglais: ${data.titre_anglais ?? 'null'}`);
    console.log(`🏷️ titres_alternatifs: ${data.titres_alternatifs ?? 'null'}`);
    console.log(`📺 type: ${data.type ?? 'null'}`);
    console.log(`📚 source: ${data.source ?? 'null'}`);
    console.log(`📊 nb_episodes: ${data.nb_episodes ?? 'null'}`);
    console.log(`🖼️ couverture_url: ${data.couverture_url ?? 'null'}`);
    console.log(`📝 description: ${data.description ?? 'null'}`);
    console.log(`📊 statut_diffusion: ${data.statut_diffusion ?? 'null'}`);
    console.log(`🔄 en_cours_diffusion: ${data.en_cours_diffusion ?? 'null'}`);
    console.log(`📅 date_debut: ${data.date_debut ?? 'null'}`);
    console.log(`📅 date_fin: ${data.date_fin ?? 'null'}`);
    console.log(`⏱️ duree: ${data.duree ?? 'null'}`);
    console.log(`📅 annee: ${data.annee ?? 'null'}`);
    console.log(`🗓️ saison_diffusion: ${data.saison_diffusion ?? 'null'}`);
    console.log(`🏷️ genres: ${data.genres ?? 'null'}`);
    console.log(`🎭 themes: ${data.themes ?? 'null'}`);
    console.log(`👥 demographics: ${data.demographics ?? 'null'}`);
    console.log(`🎬 studios: ${data.studios ?? 'null'}`);
    console.log(`🎥 producteurs: ${data.producteurs ?? 'null'}`);
    console.log(`📺 diffuseurs: ${data.diffuseurs ?? 'null'}`);
    console.log(`⭐ rating: ${data.rating ?? 'null'}`);
    console.log(`⭐ score: ${data.score ?? 'null'}`);
    console.log(`📊 rank_mal: ${data.rank_mal ?? 'null'}`);
    console.log(`📈 popularity_mal: ${data.popularity_mal ?? 'null'}`);
    console.log(`👥 scored_by: ${data.scored_by ?? 'null'}`);
    console.log(`❤️ favorites: ${data.favorites ?? 'null'}`);
    console.log(`📝 background: ${data.background ?? 'null'}`);
    console.log(`🔗 liens_externes: ${data.liens_externes ? 'présents (JSON)' : 'null'}`);
    console.log(`📺 liens_streaming: ${data.liens_streaming ? 'présents (JSON)' : 'null'}`);
    console.log(`🏷️ franchise_name: ${data.franchise_name ?? 'null'}`);
    console.log(`🔢 franchise_order: ${data.franchise_order ?? 'null'}`);
    console.log(`🔗 prequel_mal_id: ${data.prequel_mal_id ?? 'null'}`);
    console.log(`🔗 sequel_mal_id: ${data.sequel_mal_id ?? 'null'}`);
    console.log(`📖 manga_source_mal_id: ${data.manga_source_mal_id ?? 'null'}`);
    console.log(`📚 light_novel_source_mal_id: ${data.light_novel_source_mal_id ?? 'null'}`);
    console.log(`📥 source_import: ${data.source_import ?? 'null'}`);
    console.log(`👤 user_id_ajout: ${data.user_id_ajout ?? 'null'}`);
  }
  
  console.log('===============================================================');
}

module.exports = { logSavedData };
