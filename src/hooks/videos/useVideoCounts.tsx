import { useCallback, useEffect, useState } from 'react';
import { normalizeAnimeType } from '../../pages/Videos/common/utils/video-helpers';
import { AnimeSerie, MovieListItem, TvShowListItem } from '../../types';

interface VideoCounts {
  movies: number;
  series: number;
  total: number;
}

interface AnimeTypeCounts {
  TV: number;
  OVA: number;
  ONA: number;
  Movie: number;
  Special: number;
  Unclassified: number;
}

export function useVideoCounts() {
  const [videoCounts, setVideoCounts] = useState<VideoCounts>({
    movies: 0,
    series: 0,
    total: 0
  });
  const [animeTypeCounts, setAnimeTypeCounts] = useState<AnimeTypeCounts>({
    TV: 0,
    OVA: 0,
    ONA: 0,
    Movie: 0,
    Special: 0,
    Unclassified: 0
  });
  const [loading, setLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    try {
      const [animesData, moviesData, seriesData] = await Promise.all([
        window.electronAPI.getAnimeSeries?.({}) || Promise.resolve({ success: false, animes: [] }),
        window.electronAPI.getMovies?.({}) || Promise.resolve([]),
        window.electronAPI.getTvShows?.({}) || Promise.resolve([])
      ]);

      const loadedAnimes = animesData.success ? animesData.animes || [] : [];
      const loadedMovies = Array.isArray(moviesData) ? moviesData : [];
      const loadedSeries = Array.isArray(seriesData) ? seriesData : [];

      // Calculer les compteurs d'anime types
      const typeCounts: AnimeTypeCounts = {
        TV: 0,
        OVA: 0,
        ONA: 0,
        Movie: 0,
        Special: 0,
        Unclassified: 0
      };
      const visibleAnimes = loadedAnimes.filter(a => !a.is_masquee);
      visibleAnimes.forEach(anime => {
        const normalizedType = normalizeAnimeType(anime.type);
        if (normalizedType === 'TV') typeCounts.TV++;
        else if (normalizedType === 'OVA') typeCounts.OVA++;
        else if (normalizedType === 'ONA') typeCounts.ONA++;
        else if (normalizedType === 'Movie') typeCounts.Movie++;
        else if (normalizedType === 'Special') typeCounts.Special++;
        else typeCounts.Unclassified++;
      });
      setAnimeTypeCounts(typeCounts);

      // Calculer les compteurs de videos
      const visibleMovies = loadedMovies.filter(m => !m.is_hidden);
      const visibleSeries = loadedSeries.filter(s => !s.is_hidden);
      setVideoCounts({
        movies: visibleMovies.length,
        series: visibleSeries.length,
        total: visibleAnimes.length + visibleMovies.length + visibleSeries.length
      });
    } catch (error) {
      console.error('Erreur lors du chargement des compteurs vidéos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  return { videoCounts, animeTypeCounts, loading, reloadCounts: loadCounts };
}
