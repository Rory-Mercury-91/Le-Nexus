import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AdulteGame,
  AnimeSerie,
  BookListItem,
  ContentPreferences,
  EvolutionStatistics,
  LectureStatistics,
  MovieListItem,
  RecentProgress,
  Statistics,
  TvShowListItem
} from '../types';
import { useAdulteGameLock } from './useAdulteGameLock';

export function useDashboard() {
  const location = useLocation();
  const { hasPassword } = useAdulteGameLock();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [lectureStats, setLectureStats] = useState<LectureStatistics | null>(null);
  const [recentProgress, setRecentProgress] = useState<RecentProgress | null>(null);
  const [animes, setAnimes] = useState<AnimeSerie[]>([]);
  const [adulteGames, setAdulteGames] = useState<AdulteGame[]>([]);
  const [movies, setMovies] = useState<MovieListItem[]>([]);
  const [tvShows, setTvShows] = useState<TvShowListItem[]>([]);
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evolutionStats, setEvolutionStats] = useState<EvolutionStatistics | null>(null);
  
  // Préférences de contenu
  const defaultContentPrefs: ContentPreferences = {
    showMangas: true,
    showAnimes: true,
    showMovies: true,
    showSeries: true,
    showVideos: true,
    showBooks: true,
    showAdulteGame: true,
    showSubscriptions: true
  };
  const [contentPrefs, setContentPrefs] = useState<ContentPreferences>({ ...defaultContentPrefs });

  useEffect(() => {
    loadStats();
    loadContentPreferences();
    
    // Écouter les changements de préférences en temps réel
    const unsubscribe = window.electronAPI.onContentPreferencesChanged(async (userName: string, preferences: Partial<ContentPreferences>) => {
      const currentUser = await window.electronAPI.getCurrentUser();
      if (userName === currentUser) {
        setContentPrefs(prev => ({ ...defaultContentPrefs, ...prev, ...preferences }));
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [location.pathname, hasPassword]); // Recharge quand on revient sur la page ou que le statut du mot de passe change
  
  const loadContentPreferences = async () => {
    const currentUser = await window.electronAPI.getCurrentUser();
    if (currentUser) {
      const prefs = await window.electronAPI.getContentPreferences(currentUser);
      const mergedPrefs = { ...defaultContentPrefs, ...prefs };
      
      // Migration automatique : si showVideos n'existe pas, le calculer à partir des anciennes préférences
      if (mergedPrefs.showVideos === undefined) {
        mergedPrefs.showVideos = mergedPrefs.showAnimes || mergedPrefs.showMovies || mergedPrefs.showSeries;
        // Sauvegarder la migration
        if (mergedPrefs.showVideos !== undefined) {
          await window.electronAPI.setContentPreferences(currentUser, { showVideos: mergedPrefs.showVideos });
        }
      }
      
      setContentPrefs(mergedPrefs);
    } else {
      setContentPrefs({ ...defaultContentPrefs });
    }
  };

  const loadStats = async () => {
    setLoading(true);
    const data = await window.electronAPI.getStatistics();
    const lectureData = await window.electronAPI.getLectureStatistics();
    const progressData = await window.electronAPI.getRecentProgress();
    const animesData = await window.electronAPI.getAnimeSeries({});
    const evolutionData = await window.electronAPI.getEvolutionStatistics();
    const moviesData = await window.electronAPI.getMovies({});
    const tvShowsData = await window.electronAPI.getTvShows({});
    const booksData = await window.electronAPI.booksGet?.({}) || [];
    
    // Charger les jeux adultes seulement si pas de mot de passe
    if (!hasPassword) {
      try {
        const adulteGameData = await window.electronAPI.getAdulteGameGames({});
        setAdulteGames(adulteGameData);
      } catch (error) {
        console.error('Erreur chargement jeux adultes:', error);
        setAdulteGames([]);
      }
    }
    
    setStats(data);
    setLectureStats(lectureData);
    setRecentProgress(progressData);
    if (animesData.success) {
      setAnimes(animesData.animes);
    }
    setMovies(moviesData || []);
    setTvShows(tvShowsData || []);
    setBooks(booksData);
    setEvolutionStats(evolutionData);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  return {
    stats,
    lectureStats,
    recentProgress,
    animes,
    adulteGames,
    loading,
    refreshing,
    evolutionStats,
    contentPrefs,
    hasPassword,
    movies,
    tvShows,
    books,
    loadStats,
    handleRefresh
  };
}
