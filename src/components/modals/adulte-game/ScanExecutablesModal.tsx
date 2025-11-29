import { Search, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import '../../../index.css';
import Modal from '../common/Modal';
import { useModalEscape } from '../common/useModalEscape';

interface ExecutableItem {
  path: string;
  filename: string;
  folder: string;
  isDuplicate: boolean;
  duplicatePaths?: string[];
  selectedGameId: number | null;
  selectedGame: {
    id: number;
    titre: string;
    f95_thread_id?: number | null;
    Lewdcorner_thread_id?: number | null;
  } | null;
  action: 'add' | 'replace' | null;
  currentExecutables?: Array<{ version: string; path: string; label: string }>;
  searchTerm: string;
  searchResults: Array<{
    id: number;
    titre: string;
    f95_thread_id?: number | null;
    Lewdcorner_thread_id?: number | null;
  }>;
  isSearching: boolean;
  label: string; // Label personnalisé pour l'exécutable
}

interface ScanExecutablesModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScanExecutablesModal({ onClose, onSuccess }: ScanExecutablesModalProps) {
  const { showToast, ToastContainer } = useToast();
  useModalEscape(onClose);
  
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [executables, setExecutables] = useState<ExecutableItem[]>([]);
  const [applying, setApplying] = useState(false);

  // Débounce pour les recherches
  const searchTimeouts = useMemo(() => new Map<number, NodeJS.Timeout>(), []);

  // Scanner les exécutables
  const handleScan = useCallback(async () => {
    try {
      setScanning(true);
      const result = await window.electronAPI.scanAdulteGameExecutables();
      
      if (result.canceled) {
        return;
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors du scan');
      }
      
      // Initialiser les items avec les exécutables trouvés
      const items: ExecutableItem[] = result.executables.map(exe => ({
        path: exe.path,
        filename: exe.filename,
        folder: exe.folder,
        isDuplicate: exe.isDuplicate || false,
        duplicatePaths: exe.duplicatePaths || [],
        selectedGameId: null,
        selectedGame: null,
        action: null,
        currentExecutables: undefined,
        searchTerm: '',
        searchResults: [],
        isSearching: false,
        label: exe.filename // Par défaut, utiliser le nom du fichier
      }));
      
      setExecutables(items);
      
      showToast({
        title: 'Scan terminé',
        message: `${items.length} exécutable(s) trouvé(s)`,
        type: 'success'
      });
      
    } catch (error) {
      console.error('Erreur scan:', error);
      showToast({
        title: 'Erreur de scan',
        message: error instanceof Error ? error.message : 'Impossible de scanner le dossier',
        type: 'error'
      });
    } finally {
      setScanning(false);
    }
  }, [showToast]);

  // Rechercher des jeux
  const handleSearch = useCallback((index: number, searchTerm: string) => {
    // Annuler le timeout précédent
    const existingTimeout = searchTimeouts.get(index);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Mettre à jour le terme de recherche immédiatement
    setExecutables(prev => {
      const item = prev[index];
      if (!item) return prev;
      
      const updated = [...prev];
      updated[index] = { ...item, searchTerm, isSearching: true, searchResults: [] };
      return updated;
    });
    
    if (!searchTerm || searchTerm.trim() === '') {
      setExecutables(prev => {
        const item = prev[index];
        if (!item) return prev;
        const updated = [...prev];
        updated[index] = { ...item, searchTerm: '', searchResults: [], isSearching: false };
        return updated;
      });
      return;
    }
    
    // Débounce de 300ms
    const timeout = setTimeout(async () => {
      try {
        const results = await window.electronAPI.searchAdulteGameGamesMinimal(searchTerm);
        setExecutables(prev => {
          const item = prev[index];
          if (!item) return prev;
          const updated = [...prev];
          updated[index] = { ...item, searchTerm, searchResults: results, isSearching: false };
          return updated;
        });
      } catch (error) {
        console.error('Erreur recherche:', error);
        setExecutables(prev => {
          const item = prev[index];
          if (!item) return prev;
          const updated = [...prev];
          updated[index] = { ...item, searchTerm, searchResults: [], isSearching: false };
          return updated;
        });
      }
    }, 300);
    
    searchTimeouts.set(index, timeout);
  }, [searchTimeouts]);

  // Sélectionner un jeu
  const handleSelectGame = useCallback(async (index: number, game: ExecutableItem['selectedGame']) => {
    if (!game) return;
    
    const updated = [...executables];
    updated[index] = {
      ...updated[index],
      selectedGameId: game.id,
      selectedGame: game,
      searchTerm: game.titre,
      searchResults: []
    };
    
    // Charger les exécutables actuels du jeu
    try {
      const currentExecs = await window.electronAPI.getAdulteGameCurrentExecutables(game.id);
      updated[index].currentExecutables = currentExecs;
    } catch (error) {
      console.error('Erreur chargement exécutables:', error);
    }
    
    setExecutables(updated);
  }, [executables]);

  // Définir l'action (add/replace)
  const handleSetAction = useCallback((index: number, action: 'add' | 'replace') => {
    const updated = [...executables];
    updated[index] = { ...updated[index], action };
    setExecutables(updated);
  }, [executables]);

  // Modifier le label de l'exécutable
  const handleLabelChange = useCallback((index: number, label: string) => {
    setExecutables(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], label };
      return updated;
    });
  }, []);

  // Détecter les conflits (même jeu avec actions différentes)
  const conflicts = useMemo(() => {
    const gameMap = new Map<number, Array<{ index: number; action: 'add' | 'replace' }>>();
    
    executables.forEach((exe, index) => {
      if (exe.selectedGameId && exe.action) {
        if (!gameMap.has(exe.selectedGameId)) {
          gameMap.set(exe.selectedGameId, []);
        }
        gameMap.get(exe.selectedGameId)!.push({ index, action: exe.action });
      }
    });
    
    const conflictsList: Array<{ gameId: number; gameTitle: string; assignments: Array<{ index: number; action: 'add' | 'replace' }> }> = [];
    
    gameMap.forEach((assignments, gameId) => {
      if (assignments.length > 1) {
        const game = executables[assignments[0].index]?.selectedGame;
        if (game) {
          conflictsList.push({
            gameId,
            gameTitle: game.titre,
            assignments
          });
        }
      }
    });
    
    return conflictsList;
  }, [executables]);

  // Appliquer toutes les attributions
  const handleApply = useCallback(async () => {
    const assignments = executables
      .filter(exe => exe.selectedGameId && exe.action)
      .map(exe => ({
        gameId: exe.selectedGameId!,
        executablePath: exe.path,
        action: exe.action!,
        label: exe.label || exe.filename
      }));
    
    if (assignments.length === 0) {
      showToast({
        title: 'Aucune attribution',
        message: 'Veuillez sélectionner au moins un jeu et définir une action',
        type: 'warning'
      });
      return;
    }
    
    try {
      setApplying(true);
      const result = await window.electronAPI.bulkUpdateAdulteGameExecutables(assignments);
      
      if (!result.success) {
        throw new Error('Erreur lors de la mise à jour');
      }
      
      showToast({
        title: 'Attributions appliquées',
        message: `${result.updated} jeu(x) mis à jour`,
        type: 'success'
      });
      
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Erreur application:', error);
      showToast({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Impossible d\'appliquer les attributions',
        type: 'error'
      });
    } finally {
      setApplying(false);
    }
  }, [executables, showToast, onSuccess, onClose]);

  // Nettoyer les timeouts au démontage
  useEffect(() => {
    return () => {
      searchTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [searchTimeouts]);

  // Synchroniser les hauteurs des sections correspondantes
  useEffect(() => {
    if (executables.length === 0) return;

    const syncHeights = () => {
      // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
      requestAnimationFrame(() => {
        executables.forEach((_, index) => {
          // Trouver la section gauche (première colonne, pas d'id)
          const allSections = document.querySelectorAll(`[data-executable-index="${index}"]`);
          const leftSection = Array.from(allSections).find(
            el => !el.id || el.id === ''
          ) as HTMLElement | null;
          
          // Trouver la section droite (avec l'id executable-section-)
          const rightSection = document.getElementById(`executable-section-${index}`);
          
          if (leftSection && rightSection) {
            const rightHeight = rightSection.offsetHeight;
            const leftHeight = leftSection.offsetHeight;
            
            // Prendre la hauteur maximale
            const maxHeight = Math.max(leftHeight, rightHeight, 120);
            
            if (maxHeight > 0) {
              leftSection.style.minHeight = `${maxHeight}px`;
              rightSection.style.minHeight = `${maxHeight}px`;
            }
          }
        });
      });
    };

    // Synchroniser avec un petit délai pour laisser le DOM se mettre à jour
    const timeout = setTimeout(syncHeights, 100);
    syncHeights();

    // Observer les changements
    const observer = new MutationObserver(() => {
      setTimeout(syncHeights, 50);
    });
    
    // Observer les deux colonnes
    const leftContainer = document.querySelector('[data-executable-index]')?.closest('div[style*="width: 50%"]');
    const rightContainer = document.getElementById('executable-section-0')?.parentElement;
    
    if (leftContainer) {
      observer.observe(leftContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
    
    if (rightContainer) {
      observer.observe(rightContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    // Synchroniser aussi sur resize
    window.addEventListener('resize', syncHeights);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      window.removeEventListener('resize', syncHeights);
    };
  }, [executables]);

  const hasAssignments = executables.some(exe => exe.selectedGameId && exe.action);

  return (
    <>
      {ToastContainer}
      <Modal onClickOverlay={onClose} maxWidth="1200px" maxHeight="90vh">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '24px'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '20px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text)'
            }}>
              Scanner les exécutables
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--border)';
                e.currentTarget.style.color = 'var(--text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            flex: 1,
            overflow: 'hidden'
          }}>
        {/* Bouton de scan */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: scanning ? 0.6 : 1
            }}
          >
            <Search size={16} />
            {scanning ? 'Scan en cours...' : 'Scanner un dossier'}
          </button>
          
          {executables.length > 0 && (
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {executables.length} exécutable(s) trouvé(s)
            </div>
          )}
        </div>

        {/* Contenu principal - Deux colonnes */}
        {executables.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '20px',
            flex: 1,
            overflow: 'hidden'
          }}>
            {/* Colonne gauche - Liste des exécutables */}
            <div style={{
              width: '50%',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px',
              overflowY: 'auto',
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '12px',
                color: 'var(--text)',
                flexShrink: 0
              }}>
                Exécutables trouvés
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                {executables.map((exe, index) => (
                  <div
                    key={index}
                    data-executable-index={index}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      border: exe.selectedGameId && exe.action
                        ? '2px solid var(--primary)'
                        : '1px solid var(--border)',
                      background: exe.selectedGameId && exe.action
                        ? 'rgba(139, 92, 246, 0.1)'
                        : 'var(--background)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start'
                    }}
                    onClick={() => {
                      // Scroll vers la section correspondante dans la colonne droite
                      const rightSection = document.getElementById(`executable-section-${index}`);
                      if (rightSection) {
                        rightSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      {exe.selectedGameId && exe.action ? (
                        <CheckCircle2 size={16} color="var(--primary)" />
                      ) : (
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid var(--text-secondary)',
                          borderRadius: '4px'
                        }} />
                      )}
                      <span style={{
                        fontWeight: '600',
                        fontSize: '13px',
                        color: 'var(--text)'
                      }}>
                        {exe.label || exe.filename}
                      </span>
                    </div>
                    
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      marginLeft: '24px',
                      marginTop: '4px',
                      wordBreak: 'break-all'
                    }}>
                      {exe.folder}
                    </div>
                    
                    {exe.isDuplicate && (
                      <div style={{
                        marginTop: '6px',
                        marginLeft: '24px',
                        fontSize: '11px',
                        color: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title={`Doublons détectés:\n${exe.duplicatePaths?.join('\n') || ''}`}
                      >
                        <AlertTriangle size={12} />
                        <span>Doublon détecté</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Colonne droite - Attribution */}
            <div style={{
              width: '50%',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px',
              overflowY: 'auto',
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '12px',
                color: 'var(--text)',
                flexShrink: 0
              }}>
                Attribution au jeu
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                {executables.map((exe, index) => (
                  <div
                    key={index}
                    id={`executable-section-${index}`}
                    data-executable-index={index}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Ligne 1: Recherche */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <Search
                          size={16}
                          style={{
                            position: 'absolute',
                            left: '12px',
                            color: 'var(--text-secondary)',
                            pointerEvents: 'none'
                          }}
                        />
                        <input
                          type="text"
                          placeholder="🔍 Rechercher un jeu..."
                          value={exe.searchTerm}
                          onChange={(e) => handleSearch(index, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px 8px 36px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '13px'
                          }}
                        />
                        {exe.isSearching && (
                          <div style={{
                            position: 'absolute',
                            right: '12px',
                            fontSize: '11px',
                            color: 'var(--text-secondary)'
                          }}>
                            Recherche...
                          </div>
                        )}
                      </div>
                      
                      {/* Résultats de recherche */}
                      {exe.searchResults.length > 0 && !exe.selectedGame && (
                        <div style={{
                          marginTop: '8px',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          background: 'var(--surface)',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {exe.searchResults.map((game) => (
                            <div
                              key={game.id}
                              onClick={() => handleSelectGame(index, game)}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border)',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--primary)20';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <div style={{
                                fontWeight: '600',
                                fontSize: '13px',
                                color: 'var(--text)',
                                marginBottom: '4px'
                              }}>
                                {game.titre}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)'
                              }}>
                                ID: {game.id}
                                {game.f95_thread_id && ` | F95: ${game.f95_thread_id}`}
                                {game.Lewdcorner_thread_id && ` | LC: ${game.Lewdcorner_thread_id}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Champ de label pour l'exécutable */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        fontWeight: '600'
                      }}>
                        Nom de l'exécutable :
                      </label>
                      <textarea
                        value={exe.label || exe.filename}
                        onChange={(e) => handleLabelChange(index, e.target.value)}
                        placeholder={exe.filename}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          minHeight: '40px',
                          lineHeight: '1.4'
                        }}
                      />
                    </div>

                    {/* Ligne 2: Jeu sélectionné + Actions */}
                    {exe.selectedGame && (
                      <div>
                        <div style={{
                          padding: '10px',
                          borderRadius: '6px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid var(--primary)',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            marginBottom: '4px'
                          }}>
                            ID: {exe.selectedGame.id}
                            {exe.selectedGame.f95_thread_id && ` | F95: ${exe.selectedGame.f95_thread_id}`}
                            {exe.selectedGame.Lewdcorner_thread_id && ` | LC: ${exe.selectedGame.Lewdcorner_thread_id}`}
                          </div>
                          <div style={{
                            fontWeight: '600',
                            fontSize: '14px',
                            color: 'var(--text)'
                          }}>
                            {exe.selectedGame.titre}
                          </div>
                        </div>

                        {/* Exécutables actuels */}
                        {exe.currentExecutables && exe.currentExecutables.length > 0 && (
                          <div style={{
                            marginBottom: '12px',
                            padding: '8px',
                            borderRadius: '6px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)'
                          }}>
                            <div style={{
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                              marginBottom: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              📋 Exécutable(s) actuel(s):
                            </div>
                            {exe.currentExecutables.map((currentExe, idx) => (
                              <div
                                key={idx}
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text)',
                                  wordBreak: 'break-all',
                                  marginLeft: '16px',
                                  marginTop: '2px'
                                }}
                              >
                                {currentExe.path}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Avertissement si plusieurs exécutables pointent vers ce jeu */}
                        {conflicts.some(c => c.gameId === exe.selectedGameId) && (
                          <div style={{
                            marginBottom: '12px',
                            padding: '8px',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid #f59e0b',
                            fontSize: '11px',
                            color: '#f59e0b'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                              <AlertTriangle size={12} />
                              <span style={{ fontWeight: '600' }}>Plusieurs exécutables pour ce jeu</span>
                            </div>
                            <div style={{ fontSize: '10px', marginLeft: '16px' }}>
                              {conflicts.find(c => c.gameId === exe.selectedGameId)?.assignments.some(a => a.action === 'replace')
                                ? 'Un "Remplacer" écrasera tous les exécutables, puis les "Ajouter" seront ajoutés.'
                                : 'Tous les exécutables seront ajoutés à la liste.'}
                            </div>
                          </div>
                        )}

                        {/* Boutons d'action */}
                        <div style={{
                          display: 'flex',
                          gap: '8px'
                        }}>
                          <button
                            onClick={() => handleSetAction(index, 'replace')}
                            className={exe.action === 'replace' ? 'btn btn-primary' : 'btn'}
                            style={{
                              flex: 1,
                              fontSize: '12px',
                              padding: '8px 12px'
                            }}
                          >
                            Remplacer
                          </button>
                          <button
                            onClick={() => handleSetAction(index, 'add')}
                            className={exe.action === 'add' ? 'btn btn-primary' : 'btn'}
                            style={{
                              flex: 1,
                              fontSize: '12px',
                              padding: '8px 12px'
                            }}
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bouton d'application */}
        {hasAssignments && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '12px',
            borderTop: '1px solid var(--border)'
          }}>
            <button
              onClick={handleApply}
              disabled={applying}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: applying ? 0.6 : 1
              }}
            >
              {applying ? 'Application...' : `Appliquer ${executables.filter(exe => exe.selectedGameId && exe.action).length} attribution(s)`}
            </button>
          </div>
        )}
          </div>
        </div>
      </Modal>
    </>
  );
}
