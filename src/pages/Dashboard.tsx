import { BookOpen, Home, Package, RefreshCw, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CoverImage from '../components/CoverImage';
import { AnimeSerie, LectureStatistics, Statistics } from '../types';

// Schéma de couleurs cohérent
const COLORS = {
  series: '#f97316',      // Orange pour Séries
  tomes: '#d946ef',       // Magenta pour Tomes
  alexandre: '#3b82f6',   // Bleu pour Alexandre
  celine: '#eab308',      // Jaune pour Céline
  sebastien: '#22c55e',   // Vert pour Sébastien
  commun: '#94a3b8'       // Gris pour Commun
};

const CHART_COLORS = ['#f97316', '#d946ef', '#22c55e', '#eab308'];

export default function Dashboard() {
  const location = useLocation();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [lectureStats, setLectureStats] = useState<LectureStatistics | null>(null);
  const [animes, setAnimes] = useState<AnimeSerie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, [location.pathname]); // Recharge quand on revient sur la page

  const loadStats = async () => {
    setLoading(true);
    const data = await window.electronAPI.getStatistics();
    const lectureData = await window.electronAPI.getLectureStatistics();
    const animesData = await window.electronAPI.getAnimeSeries({});
    setStats(data);
    setLectureStats(lectureData);
    setAnimes(animesData);
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

  const coutTotal = (stats.totaux['Céline'] || 0) + (stats.totaux['Sébastien'] || 0) + (stats.totaux['Alexandre'] || 0);

  const dataProprietaires = [
    { name: 'Céline', value: stats.totaux['Céline'] || 0 },
    { name: 'Sébastien', value: stats.totaux['Sébastien'] || 0 },
    { name: 'Alexandre', value: stats.totaux['Alexandre'] || 0 }
  ];

  const dataTypes = Object.entries(stats.parType).map(([name, data]) => ({
    name,
    tomes: data.count,
    montant: data.total
  }));

  const dataStatuts = Object.entries(stats.parStatut).map(([name, count]) => ({
    name,
    value: count
  }));

  return (
    <div style={{ padding: '40px' }} className="fade-in">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Home size={32} style={{ color: 'var(--primary)' }} />
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

        {/* Progressions Mangas et Animes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(500px, 100%), 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Progression de lecture */}
        {lectureStats && lectureStats.tomesTotal > 0 && (
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

            {/* Derniers tomes lus */}
            {lectureStats.derniersTomesLus && lectureStats.derniersTomesLus.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                    📖 Derniers tomes lus :
                  </p>
                  <div 
                    className="horizontal-scroll"
                    style={{ 
                      display: 'flex',
                      gap: '12px',
                      overflowX: 'auto',
                      paddingBottom: '8px'
                    }}>
                    {lectureStats.derniersTomesLus.slice(0, 5).map((tome, index) => (
                    <Link
                      key={tome.id}
                      to={`/serie/${tome.serieId}`}
                      className="card"
                      style={{
                        flex: '0 0 auto',
                        width: '120px',
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
                      <CoverImage 
                        src={tome.couvertureUrl} 
                        alt={`${tome.serieTitre} - Tome ${tome.numero}`}
                        style={{
                          width: '100%',
                          height: '168px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{ padding: '8px' }}>
                        <p style={{ 
                          fontSize: '11px', 
                          fontWeight: '600',
                          color: 'var(--text)',
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {tome.serieTitre}
                        </p>
                        <p style={{ 
                          fontSize: '10px', 
                          color: 'var(--text-secondary)',
                          marginBottom: '4px'
                        }}>
                          Tome {tome.numero}
                        </p>
                        <p style={{ 
                          fontSize: '9px', 
                          color: 'var(--text-secondary)'
                        }}>
                          {new Date(tome.dateLecture).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

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
          const episodesVus = animes.reduce((acc, a) => acc + (a.nb_episodes_vus || 0), 0);
          const episodesTotal = animes.reduce((acc, a) => acc + (a.nb_episodes_total || 0), 0);
          const animesEnCours = animes.filter(a => {
            const epVus = a.nb_episodes_vus || 0;
            const epTotal = a.nb_episodes_total || 0;
            return epVus > 0 && epVus < epTotal;
          }).length;
          const animesTermines = animes.filter(a => {
            const epVus = a.nb_episodes_vus || 0;
            const epTotal = a.nb_episodes_total || 0;
            return epTotal > 0 && epVus === epTotal;
          }).length;
          const progression = episodesTotal > 0 ? (episodesVus / episodesTotal) * 100 : 0;

          const animesEnCoursListe = animes
            .filter(a => {
              const epVus = a.nb_episodes_vus || 0;
              return epVus > 0; // Afficher tous les animes avec au moins un épisode vu
            })
            .sort((a, b) => {
              // Trier par date de mise à jour (les plus récents en premier)
              const dateA = new Date(a.updated_at || a.created_at || 0);
              const dateB = new Date(b.updated_at || b.created_at || 0);
              return dateB.getTime() - dateA.getTime();
            })
            .slice(0, 5);

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

              {/* Carrousel d'animes en cours */}
              {animesEnCoursListe.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                    🎬 Derniers animes visionnés :
                  </p>
                  <div 
                    className="horizontal-scroll"
                    style={{ 
                      display: 'flex',
                      gap: '12px',
                      overflowX: 'auto',
                      paddingBottom: '8px'
                    }}>
                    {animesEnCoursListe.map(anime => (
                      <Link
                        key={anime.id}
                        to={`/animes/${anime.id}`}
                        className="card"
                        style={{
                          flex: '0 0 auto',
                          width: '120px',
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
                        <div style={{ position: 'relative' }}>
                          <CoverImage 
                            src={anime.couverture_url} 
                            alt={anime.titre}
                            style={{
                              width: '100%',
                              height: '168px',
                              objectFit: 'cover'
                            }}
                          />
                          {/* Badge progression */}
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            right: '8px',
                            background: 'rgba(0, 0, 0, 0.8)',
                            backdropFilter: 'blur(8px)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            color: 'white',
                            textAlign: 'center'
                          }}>
                            {anime.nb_episodes_vus || 0}/{anime.nb_episodes_total || 0} ép.
                          </div>
                        </div>
                        <div style={{ padding: '8px' }}>
                          <p style={{ 
                            fontSize: '11px', 
                            fontWeight: '600',
                            color: 'var(--text)',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            minHeight: '30px'
                          }}>
                            {anime.titre}
                          </p>
                          {anime.type && (
                            <p style={{ 
                              fontSize: '9px', 
                              color: 'var(--text-secondary)',
                              textTransform: 'uppercase',
                              fontWeight: '600'
                            }}>
                              {anime.type}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

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

        {/* Cartes Séries et Tomes avec graphiques */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: '24px', marginBottom: '32px' }}>
          {/* Carte Séries */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: COLORS.series }} />
              Séries par statut
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{
                fontSize: '48px',
                fontWeight: '700',
                color: COLORS.series
              }}>
                {stats.nbSeries}
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>série{stats.nbSeries > 1 ? 's' : ''}</span>
            </div>
            
            {/* Graphique */}
            {dataStatuts.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={dataStatuts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dataStatuts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-light)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Carte Tomes */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} style={{ color: COLORS.tomes }} />
              Tomes par type
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{
                fontSize: '48px',
                fontWeight: '700',
                color: COLORS.tomes
              }}>
                {stats.nbTomes}
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>tome{stats.nbTomes > 1 ? 's' : ''}</span>
            </div>
            
            {/* Graphique */}
            {dataTypes.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dataTypes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                    <YAxis stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-light)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text)'
                      }}
                    />
                    <Bar dataKey="tomes" fill={COLORS.tomes} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Carte Tomes par propriétaire */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} style={{ color: COLORS.tomes }} />
              Tomes par propriétaire
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{
                fontSize: '48px',
                fontWeight: '700',
                color: COLORS.tomes
              }}>
                {stats.nbTomes}
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>tome{stats.nbTomes > 1 ? 's' : ''} au total</span>
            </div>
            
            <div style={{ marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart 
                data={[
                  { 
                    name: 'Sébastien', 
                    tomes: stats.nbTomesParProprietaire['Sébastien'] || 0,
                    fill: COLORS.sebastien
                  },
                  { 
                    name: 'Céline', 
                    tomes: stats.nbTomesParProprietaire['Céline'] || 0,
                    fill: COLORS.celine
                  },
                  { 
                    name: 'Alexandre', 
                    tomes: stats.nbTomesParProprietaire['Alexandre'] || 0,
                    fill: COLORS.alexandre
                  },
                  { 
                    name: 'Commun', 
                    tomes: stats.nbTomesParProprietaire['Commun'] || 0,
                    fill: COLORS.commun
                  }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-secondary)" 
                  style={{ fontSize: '11px' }} 
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  style={{ fontSize: '11px' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-light)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)'
                  }}
                  formatter={(value) => [`${value} tome${value > 1 ? 's' : ''}`, 'Tomes']}
                />
                <Bar 
                  dataKey="tomes" 
                  radius={[8, 8, 0, 0]}
                >
                  {[
                    { name: 'Sébastien', fill: COLORS.sebastien },
                    { name: 'Céline', fill: COLORS.celine },
                    { name: 'Alexandre', fill: COLORS.alexandre },
                    { name: 'Commun', fill: COLORS.commun }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Coûts par propriétaire */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '20px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: COLORS.sebastien }}>
                Sébastien
              </h3>
              <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                {(stats.totaux['Sébastien'] || 0).toFixed(2)}€
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                {stats.nbTomesParProprietaire['Sébastien'] || 0} tome{(stats.nbTomesParProprietaire['Sébastien'] || 0) > 1 ? 's' : ''}
              </p>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: COLORS.celine }}>
                Céline
              </h3>
              <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                {(stats.totaux['Céline'] || 0).toFixed(2)}€
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                {stats.nbTomesParProprietaire['Céline'] || 0} tome{(stats.nbTomesParProprietaire['Céline'] || 0) > 1 ? 's' : ''}
              </p>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: COLORS.alexandre }}>
                Alexandre
              </h3>
              <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                {(stats.totaux['Alexandre'] || 0).toFixed(2)}€
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                {stats.nbTomesParProprietaire['Alexandre'] || 0} tome{(stats.nbTomesParProprietaire['Alexandre'] || 0) > 1 ? 's' : ''}
              </p>
            </div>

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
