import { BookOpen, ChevronDown, ChevronUp, Package, RefreshCw, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CoverImage from '../components/common/CoverImage';
import { AnimeSerie, EvolutionStatistics, LectureStatistics, ProgressItem, RecentProgress, Statistics } from '../types';

// Schéma de couleurs cohérent
const COLORS = {
  series: '#f97316',      // Orange pour Séries
  tomes: '#d946ef'        // Magenta pour Tomes
};


// Liste des types de volumes
const TYPES_VOLUME = [
  'Tous les tomes',
  'Broché',
  'Broché Collector',
  'Coffret',
  'Kindle',
  'Webtoon',
  'Webtoon Physique',
  'Light Novel',
  'Scan Manga',
  'Scan Webtoon'
];

export default function Dashboard() {
  const location = useLocation();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [lectureStats, setLectureStats] = useState<LectureStatistics | null>(null);
  const [recentProgress, setRecentProgress] = useState<RecentProgress | null>(null);
  const [animes, setAnimes] = useState<AnimeSerie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtreType, setFiltreType] = useState<string>('Tous les tomes'); // Filtre pour le graphique
  const [evolutionStats, setEvolutionStats] = useState<EvolutionStatistics | null>(null);
  const [periodeEvolution, setPeriodeEvolution] = useState<'mois' | 'annee'>('mois'); // Par mois ou par année
  const [showEvolution, setShowEvolution] = useState(false); // Afficher/masquer graphique évolution
  const [showRepartition, setShowRepartition] = useState(false); // Afficher/masquer graphique répartition
  
  // Préférences de contenu
  const [contentPrefs, setContentPrefs] = useState({ showMangas: true, showAnimes: true, showAvn: true });

  useEffect(() => {
    loadStats();
    loadContentPreferences();
    
    // Écouter les changements de préférences en temps réel
    const unsubscribe = window.electronAPI.onContentPreferencesChanged(async (userName, preferences) => {
      const currentUser = await window.electronAPI.getCurrentUser();
      if (userName === currentUser) {
        setContentPrefs(preferences);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [location.pathname]); // Recharge quand on revient sur la page
  
  const loadContentPreferences = async () => {
    const currentUser = await window.electronAPI.getCurrentUser();
    if (currentUser) {
      const prefs = await window.electronAPI.getContentPreferences(currentUser);
      setContentPrefs(prefs);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    const data = await window.electronAPI.getStatistics();
    const lectureData = await window.electronAPI.getLectureStatistics();
    const progressData = await window.electronAPI.getRecentProgress();
    console.log('🔍 Dashboard - progressData reçu:', progressData);
    const animesData = await window.electronAPI.getAnimeSeries({});
    const evolutionData = await window.electronAPI.getEvolutionStatistics();
    setStats(data);
    setLectureStats(lectureData);
    setRecentProgress(progressData);
    if (animesData.success) {
      setAnimes(animesData.animes);
    }
    setEvolutionStats(evolutionData);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Chargement des statistiques...</p>
      </div>
    );
  }

  if (!stats) return null;

  // Vérification de sécurité : si users n'existe pas, initialiser un tableau vide
  const users = stats.users || [];

  // Calculer le coût total dynamiquement
  const coutTotal = users.reduce((sum, user) => sum + (stats.totaux[user.id] || 0), 0);


  return (
    <div style={{ padding: '40px' }} className="fade-in">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>🏠</span>
            Tableau de bord
          </h1>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>
        </div>

        {/* Statistiques Mangas et Animes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(500px, 100%), 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Progression de lecture */}
        {contentPrefs.showMangas && lectureStats && lectureStats.tomesTotal > 0 && (
          <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--surface), var(--surface-light))' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', width: '100%', gap: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  Progression de Mangas
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)', margin: 0 }}>
                  {lectureStats.tomesLus}/{lectureStats.tomesTotal} tomes
                </p>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>|</span>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success)', margin: 0 }}>
                  {lectureStats.seriesCompletes}/{lectureStats.seriesTotal} séries
                </p>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>|</span>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)', margin: 0 }}>
                  {lectureStats.progression.toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Barre de progression globale */}
            <div>
              <div style={{
                width: '100%',
                height: '10px',
                background: 'var(--surface)',
                borderRadius: '5px',
                overflow: 'hidden',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  width: `${lectureStats.progression}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Progression des Animes */}
        {animes.length > 0 && (() => {
          const episodesVus = animes.reduce((acc, a) => acc + (a.episodes_vus || 0), 0);
          const episodesTotal = animes.reduce((acc, a) => acc + (a.nb_episodes || 0), 0);
          const animesEnCours = animes.filter(a => {
            const epVus = a.episodes_vus || 0;
            const epTotal = a.nb_episodes || 0;
            return epVus > 0 && epVus < epTotal;
          }).length;
          const animesTermines = animes.filter(a => {
            const epVus = a.episodes_vus || 0;
            const epTotal = a.nb_episodes || 0;
            return epTotal > 0 && epVus === epTotal;
          }).length;
          const progression = episodesTotal > 0 ? (episodesVus / episodesTotal) * 100 : 0;

          return (
            <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--surface), var(--surface-light))' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', width: '100%', gap: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Tv size={20} style={{ color: 'var(--primary)' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                    Progression des Animes
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)', margin: 0 }}>
                    {episodesVus}/{episodesTotal} ép.
                  </p>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>|</span>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)', margin: 0 }}>
                    {animesEnCours} en cours
                  </p>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>|</span>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success)', margin: 0 }}>
                    {animesTermines} terminés
                  </p>
                </div>
              </div>

              {/* Barre de progression globale */}
              <div>
                <div style={{
                  width: '100%',
                  height: '10px',
                  background: 'var(--surface)',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    width: `${progression}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            </div>
          );
        })()}
        </div>

        {/* Carrousel unifié de progression récente */}
        {recentProgress && (
          (() => {
            // Fusionner et trier par date toutes les progressions
            const allProgress: ProgressItem[] = [
              ...(recentProgress.tomes || []),
              ...(recentProgress.chapitres || []),
              ...(recentProgress.episodes || [])
            ].sort((a, b) => {
              const dateA = a.dateProgression ? new Date(a.dateProgression).getTime() : 0;
              const dateB = b.dateProgression ? new Date(b.dateProgression).getTime() : 0;
              return dateB - dateA;
            });

            if (allProgress.length === 0) {
              return null;
            }

            return (
              <div className="card" style={{ padding: '20px', marginBottom: '32px', background: 'linear-gradient(135deg, var(--surface), var(--surface-light))' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📖 Progression récente
                </h2>
                <div 
                  className="horizontal-scroll"
                  style={{ 
                    display: 'flex',
                    gap: '12px',
                    overflowX: 'auto',
                    paddingBottom: '8px'
                  }}>
                  {allProgress.slice(0, 15).map((item, index) => (
                    <Link
                      key={`${item.type}-${item.serieId || item.animeId}-${index}`}
                      to={item.type === 'episode' ? `/anime/${item.animeId}` : `/serie/${item.serieId}`}
                      className="card"
                      style={{
                        flex: '0 0 auto',
                        width: '130px',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Badge type en haut à gauche */}
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          background: item.type === 'episode' ? 'rgba(99, 102, 241, 0.95)' : 'rgba(236, 72, 153, 0.95)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          backdropFilter: 'blur(4px)',
                          zIndex: 1
                        }}>
                          {item.type === 'episode' ? '🎬' : '📚'}
                        </div>
                        <CoverImage 
                          src={item.couvertureUrl || null} 
                          alt={item.serieTitre || item.animeTitre || ''}
                          style={{
                            width: '100%',
                            height: '182px',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                      <div style={{ padding: '10px' }}>
                        <p style={{ 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: 'var(--text)',
                          marginBottom: '3px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.serieTitre || item.animeTitre}
                        </p>
                        <p style={{ 
                          fontSize: '11px', 
                          color: 'var(--text-secondary)',
                          marginBottom: '5px',
                          fontWeight: '600'
                        }}>
                          {item.type === 'tome' && `Tome ${item.numero}`}
                          {item.type === 'chapitre' && `${item.chapitresLus}/${item.nbChapitres} ch.`}
                          {item.type === 'episode' && `${item.episodesVus}/${item.nbEpisodes} ep.`}
                        </p>
                        <p style={{ 
                          fontSize: '10px', 
                          color: 'var(--text-secondary)'
                        }}>
                          {new Date(item.dateProgression).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()
        )}

        {/* KPIs - Vue d'ensemble rapide */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <BookOpen size={24} style={{ color: COLORS.series, margin: '0 auto 8px' }} />
            <div style={{ fontSize: '32px', fontWeight: '700', color: COLORS.series, marginBottom: '4px' }}>
              {stats.nbSeries}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Série{stats.nbSeries > 1 ? 's' : ''}
            </div>
          </div>

          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <Package size={24} style={{ color: COLORS.tomes, margin: '0 auto 8px' }} />
            <div style={{ fontSize: '32px', fontWeight: '700', color: COLORS.tomes, marginBottom: '4px' }}>
              {stats.nbTomes}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Tome{stats.nbTomes > 1 ? 's' : ''}
            </div>
          </div>

          <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'linear-gradient(135deg, var(--surface), var(--surface-light))' }}>
            <div style={{ fontSize: '24px', margin: '0 auto 8px' }}>💰</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--warning)', marginBottom: '4px' }}>
              {coutTotal.toFixed(0)}€
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Investissement
            </div>
          </div>

          {lectureStats && lectureStats.tomesTotal > 0 && (
            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', margin: '0 auto 8px' }}>📖</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--success)', marginBottom: '4px' }}>
                {lectureStats.progression.toFixed(0)}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Progression
              </div>
            </div>
          )}
        </div>

        {/* Graphique d'évolution temporelle */}
        {evolutionStats && evolutionStats.totalTomes > 0 && (
          <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showEvolution ? '20px' : '0', flexWrap: 'wrap', gap: '12px' }}>
              <button
                onClick={() => setShowEvolution(!showEvolution)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--text)'
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📈 Évolution de votre collection
                </h3>
                {showEvolution ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {/* Dropdown pour la période */}
              {showEvolution && <select
                value={periodeEvolution}
                onChange={(e) => setPeriodeEvolution(e.target.value as 'mois' | 'annee')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="mois">Par mois</option>
                <option value="annee">Par année</option>
              </select>}
            </div>
            
            {showEvolution && (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={(() => {
                  const data = periodeEvolution === 'mois' ? evolutionStats.parMois : evolutionStats.parAnnee;
                  return Object.keys(data).sort().map(key => ({
                    periode: periodeEvolution === 'mois' 
                      ? new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
                      : key,
                    tomes: data[key].count,
                    montant: data[key].total
                  }));
                })()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="periode" 
                  stroke="var(--text-secondary)" 
                  style={{ fontSize: '11px' }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="var(--text-secondary)" 
                  style={{ fontSize: '11px' }}
                  label={{ value: 'Tomes', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-secondary)', fontSize: '12px' } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--text-secondary)" 
                  style={{ fontSize: '11px' }}
                  label={{ value: 'Montant (€)', angle: 90, position: 'insideRight', style: { fill: 'var(--text-secondary)', fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-light)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                  formatter={(value, name) => {
                    if (name === 'tomes') {
                      return [`${value} tome${Number(value) > 1 ? 's' : ''}`, 'Tomes achetés'];
                    } else {
                      return [`${Number(value).toFixed(2)}€`, 'Montant dépensé'];
                    }
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
                  formatter={(value) => {
                    if (value === 'tomes') return 'Tomes achetés';
                    if (value === 'montant') return 'Montant dépensé (€)';
                    return value;
                  }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="tomes" 
                  stroke={COLORS.tomes}
                  strokeWidth={2}
                  dot={{ fill: COLORS.tomes, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="montant" 
                  stroke={COLORS.series}
                  strokeWidth={2}
                  dot={{ fill: COLORS.series, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Graphique de répartition par propriétaire */}
        {users.length > 0 && (
          <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showRepartition ? '20px' : '0', flexWrap: 'wrap', gap: '12px' }}>
              <button
                onClick={() => setShowRepartition(!showRepartition)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--text)'
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={20} style={{ color: COLORS.tomes }} />
                  📊 Répartition par propriétaire
                </h3>
                {showRepartition ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {/* Dropdown pour filtrer par type */}
              {showRepartition && <select
                value={filtreType}
                onChange={(e) => setFiltreType(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {TYPES_VOLUME.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>}
            </div>
            
            {showRepartition && (
            <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart 
                data={users.map(user => {
                  // Calculer le nombre de tomes selon le filtre
                  let nbTomes = 0;
                  if (filtreType === 'Tous les tomes') {
                    nbTomes = stats.nbTomesParProprietaire[user.id] || 0;
                  } else {
                    // Vérification de sécurité : si nbTomesParProprietaireParType n'existe pas, afficher 0
                    nbTomes = stats.nbTomesParProprietaireParType?.[user.id]?.[filtreType] || 0;
                  }
                  
                  return {
                    name: user.name,
                    tomes: nbTomes,
                    cout: stats.totaux[user.id] || 0
                  };
                })}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-secondary)" 
                  style={{ fontSize: '12px', fontWeight: '600' }} 
                />
                <YAxis 
                  yAxisId="left"
                  stroke="var(--text-secondary)" 
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Tomes', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-secondary)', fontSize: '12px' } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--text-secondary)" 
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Coût (€)', angle: 90, position: 'insideRight', style: { fill: 'var(--text-secondary)', fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-light)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                  formatter={(value, name) => {
                    if (name === 'tomes') {
                      return [`${value} tome${Number(value) > 1 ? 's' : ''}`, filtreType];
                    } else {
                      return [`${Number(value).toFixed(2)}€`, 'Coût total'];
                    }
                  }}
                />
                {/* Barre des tomes (filtrée) */}
                <Bar 
                  yAxisId="left"
                  dataKey="tomes" 
                  fill={COLORS.tomes}
                  radius={[8, 8, 0, 0]}
                />
                {/* Barre du coût (fixe) */}
                <Bar 
                  yAxisId="right"
                  dataKey="cout" 
                  fill={COLORS.series}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS.tomes }} />
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Tomes ({filtreType})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS.series }} />
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Coût total</span>
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* Coûts par propriétaire */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '20px' }}>
            {users.map(user => {
              const nbTomes = stats.nbTomesParProprietaire[user.id] || 0;
              return (
                <div key={user.id} className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: user.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{user.emoji}</span>
                    {user.name}
                  </h3>
                  <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                    {(stats.totaux[user.id] || 0).toFixed(2)}€
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {nbTomes} tome{nbTomes > 1 ? 's' : ''}
                  </p>
                </div>
              );
            })}

            <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--surface), var(--surface-light))' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: 'var(--warning)' }}>
                Total
              </h3>
              <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                {coutTotal.toFixed(2)}€
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                {stats.nbTomes} tome{stats.nbTomes > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {stats.nbSeries === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--surface)',
            borderRadius: '16px',
            marginTop: '40px'
          }}>
            <BookOpen size={64} style={{ color: 'var(--text-secondary)', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
              Aucune série pour le moment
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Commencez par ajouter vos premières séries à votre collection !
            </p>
            <Link to="/collection" className="btn btn-primary">
              <BookOpen size={20} />
              Aller à la collection
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
