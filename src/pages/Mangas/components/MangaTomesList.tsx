import { BookOpen, CheckCircle, Edit, Plus, Trash2 } from 'lucide-react';
import CoverImage from '../../../components/common/CoverImage';
import { Serie, Tome } from '../../../types';

interface MangaTomesListProps {
  serie: Serie;
  tomes: Tome[];
  users: Array<{ id: number; name: string; color: string; emoji: string }>;
  profileImages: Record<string, string | null>;
  currentUserId: number | null;
  draggingTomeId: number | null;
  onDragOver: (e: React.DragEvent, tomeId: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, tome: Tome) => void;
  onToggleTomeLu: (tomeId: number, checked: boolean) => Promise<void>;
  onToggleTomePossede: (tomeId: number, checked: boolean) => Promise<void>;
  onToggleTomeMihon: (tomeId: number, checked: boolean) => Promise<void>;
  onEditTome: (tomeId: number) => void;
  onDeleteTome: (tomeId: number) => void;
  onAddTome: () => void;
  onPossederTousLesTomes: () => Promise<void>;
  shouldShow: boolean;
}

export function MangaTomesList({
  serie,
  tomes,
  users,
  profileImages,
  currentUserId,
  draggingTomeId,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggleTomeLu,
  onToggleTomePossede,
  onToggleTomeMihon,
  onEditTome,
  onDeleteTome,
  onAddTome,
  onPossederTousLesTomes,
  shouldShow
}: MangaTomesListProps) {
  // Toujours permettre l'affichage pour que l'utilisateur puisse ajouter des tomes
  // même si type_contenu est 'chapitre' ou si la section est masquée
  if (!shouldShow) {
    return null;
  }

  // Si c'est une série de type "chapitre" uniquement, afficher un message informatif
  const isChapitreOnly = serie.type_contenu === 'chapitre';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} />
            Tomes ({tomes.length})
          </h2>
          {isChapitreOnly && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
              💡 Cette série est configurée pour les chapitres, mais vous pouvez toujours ajouter des tomes
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tomes.length > 0 && (
            <button
              onClick={onPossederTousLesTomes}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <CheckCircle size={18} />
              Posséder tous les tomes
            </button>
          )}
          <button
            onClick={onAddTome}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} />
            Ajouter un tome
          </button>
        </div>
      </div>

      {tomes.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
          gap: '16px'
        }}>
          {tomes.sort((a, b) => a.numero - b.numero).map((tome) => {
            const isDragging = draggingTomeId === tome.id;
            const isPossede = currentUserId !== null && tome.proprietaireIds?.includes(currentUserId) === true;
            const isLu = tome.lu === 1;
            const isMihon = tome.mihon === 1;
            // Vérifier si le tome est possédé par quelqu'un d'autre (mais pas par l'utilisateur actuel)
            const hasOtherOwners = tome.proprietaires && tome.proprietaires.length > 0;
            const otherOwners = hasOtherOwners && currentUserId !== null
              ? tome.proprietaires.filter(p => p.id !== currentUserId)
              : (tome.proprietaires || []);
            // Vérifier qui a coché la case Mihon (pour l'affichage avec couleur)
            const mihonUser = tome.mihon_user_id ? users.find(u => u.id === tome.mihon_user_id) : null;
            const isMihonByOther = isMihon && mihonUser && currentUserId !== null && mihonUser.id !== currentUserId;

            return (
              <div
                key={tome.id}
                className="card"
                style={{
                  padding: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                  cursor: 'pointer',
                  border: isDragging ? '3px dashed var(--primary)' : undefined,
                  background: isDragging ? 'var(--surface-light)' : undefined,
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }
                }}
                onDragOver={(e) => onDragOver(e, tome.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, tome)}
              >
                {/* Header: Tome X + Trois checkboxes (Possédé | Lu | Mihon) */}
                <div style={{
                  padding: '12px 16px',
                  background: isLu ? 'var(--success)22' : 'var(--surface-light)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  fontWeight: '600',
                  fontSize: '16px'
                }}>
                  {/* Gauche: Tome X */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>Tome {tome.numero}</span>
                  </div>

                  {/* Droite: Trois checkboxes (Possédé | Lu | Mihon) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Checkbox Possédé */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                      <div style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...(hasOtherOwners && !isPossede && otherOwners.length > 0 ? {
                          padding: '2px',
                          borderRadius: '4px',
                          border: `2px solid ${otherOwners[0].color || 'var(--primary)'}`,
                          background: `${otherOwners[0].color || 'var(--primary)'}22`
                        } : {})
                      }}>
                        <input
                          type="checkbox"
                          checked={isPossede}
                          onChange={async (e) => {
                            e.stopPropagation();
                            await onToggleTomePossede(tome.id, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: 'var(--primary)',
                            flexShrink: 0,
                            margin: 0
                          }}
                          title={(() => {
                            if (hasOtherOwners && tome.proprietaires && tome.proprietaires.length > 0) {
                              const ownerNames = tome.proprietaires.map(p => `${p.emoji || ''} ${p.name}`).join(', ');
                              if (isPossede) {
                                return `Possédé par : ${ownerNames}\nCliquer pour ne plus posséder`;
                              } else {
                                return `Possédé par : ${ownerNames}\nCliquer pour posséder aussi`;
                              }
                            }
                            return isPossede ? 'Marquer comme non possédé' : 'Marquer comme possédé';
                          })()}
                        />
                      </div>
                      <span style={{
                        fontSize: '13px',
                        color: hasOtherOwners && !isPossede && otherOwners.length > 0
                          ? (otherOwners[0].color || 'var(--text-secondary)')
                          : 'var(--text-secondary)',
                        fontWeight: hasOtherOwners && !isPossede && otherOwners.length > 0 ? '600' : '500'
                      }}>
                        Possédé
                      </span>
                    </label>

                    {/* Checkbox Lu */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isLu}
                        onChange={async (e) => {
                          e.stopPropagation();
                          await onToggleTomeLu(tome.id, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: 'var(--success)',
                          flexShrink: 0
                        }}
                        title={isLu ? 'Marquer comme non lu' : 'Marquer comme lu'}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Lu
                      </span>
                    </label>

                    {/* Checkbox Mihon */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                      <div style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...(isMihonByOther && mihonUser ? {
                          padding: '2px',
                          borderRadius: '4px',
                          border: `2px solid ${mihonUser.color || 'var(--warning)'}`,
                          background: `${mihonUser.color || 'var(--warning)'}22`
                        } : {})
                      }}>
                        <input
                          type="checkbox"
                          checked={isMihon}
                          onChange={async (e) => {
                            e.stopPropagation();
                            await onToggleTomeMihon(tome.id, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: 'var(--warning)',
                            flexShrink: 0,
                            margin: 0
                          }}
                          title={(() => {
                            if (!isMihon) return 'Marquer comme Mihon';
                            // Vérifier si la série vient d'un import Mihon
                            const isImported = serie.source_donnees === 'mihon_import';
                            if (isImported) {
                              return 'Importé depuis Mihon';
                            }
                            // Vérifier si on a l'information de l'utilisateur qui a coché la case
                            if (tome.mihon_user_id && mihonUser) {
                              return `Marqué comme Mihon par ${mihonUser.emoji} ${mihonUser.name}`;
                            }
                            return 'Mihon';
                          })()}
                        />
                      </div>
                      <span style={{
                        fontSize: '13px',
                        color: isMihonByOther && mihonUser
                          ? (mihonUser.color || 'var(--text-secondary)')
                          : 'var(--text-secondary)',
                        fontWeight: isMihonByOther && mihonUser ? '600' : '500'
                      }}>
                        Mihon
                      </span>
                    </label>
                  </div>
                </div>

                {/* Layout: Image à gauche, infos à droite */}
                <div style={{ display: 'flex', gap: '16px', padding: '16px', flexWrap: 'wrap' }}>
                  {/* Image du tome - Ratio manga fixe */}
                  <div style={{
                    width: 'clamp(120px, 15vw, 170px)',
                    height: 'clamp(168px, 21vw, 238px)',
                    flexShrink: 0,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: isDragging ? '3px dashed var(--primary)' : tome.couverture_url ? '2px solid var(--border)' : '2px dashed var(--border)',
                    position: 'relative',
                    background: 'var(--surface)'
                  }}>
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
                        padding: '10px',
                        gap: '6px'
                      }}>
                        📥
                        <div>Déposer<br />l'image</div>
                      </div>
                    ) : tome.couverture_url ? (
                      <CoverImage
                        src={tome.couverture_url}
                        alt={`Tome ${tome.numero}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--surface-light)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        textAlign: 'center',
                        padding: '6px'
                      }}>
                        Glissez une image ici
                      </div>
                    )}
                  </div>

                  {/* Colonne droite: Informations */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Prix :</p>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>
                        {tome.prix.toFixed(2)}€
                      </p>
                    </div>

                    {tome.date_sortie && (
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Sortie :</p>
                        <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                          {new Date(tome.date_sortie).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}

                    {tome.date_achat && (
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Acheté :</p>
                        <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                          {new Date(tome.date_achat).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Boutons d'action en bas */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '12px 16px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--surface)'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTome(tome.id);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '10px', fontSize: '13px', flex: 1 }}
                  >
                    <Edit size={16} />
                    Modifier
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTome(tome.id);
                    }}
                    className="btn btn-danger"
                    style={{ padding: '10px', fontSize: '13px', flex: 1 }}
                  >
                    <Trash2 size={16} />
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: 'var(--text-secondary)'
        }}>
          <BookOpen size={48} style={{ margin: '0 auto 16px' }} />
          <p>Aucun tome pour le moment</p>
          <button
            onClick={onAddTome}
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
          >
            <Plus size={18} />
            Ajouter le premier tome
          </button>
        </div>
      )}
    </div>
  );
}
