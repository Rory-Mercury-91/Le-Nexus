import { ExternalLink, Link2, Play, Plus, X } from 'lucide-react';
import { getPlatformIcon } from '../../../utils/platformIcons';

interface StreamingLink {
  source: 'anilist' | 'manual';
  platform: string;
  url: string;
  language: string;
  id?: number;
  color?: string;
  icon?: string;
}

interface AnimeStreamingLinksProps {
  streamingLinks: StreamingLink[];
  showAddLinkForm: boolean;
  newLink: { platform: string; url: string; language: string };
  onShowAddForm: () => void;
  onHideAddForm: () => void;
  onLinkChange: (link: { platform: string; url: string; language: string }) => void;
  onAddLink: () => void;
  onDeleteLink: (linkId: number) => void;
  shouldShow: (field: string) => boolean;
  noCard?: boolean; // Si true, n'affiche pas la div card externe
}

export default function AnimeStreamingLinks({
  streamingLinks,
  showAddLinkForm,
  newLink,
  onShowAddForm,
  onHideAddForm,
  onLinkChange,
  onAddLink,
  onDeleteLink,
  shouldShow,
  noCard = false
}: AnimeStreamingLinksProps) {
  if (!shouldShow('liens_streaming')) return null;

  const content = (
    <>
      {/* Bouton d'ajout (affiché uniquement si noCard et pas de formulaire ouvert) */}
      {noCard && !showAddLinkForm && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            onClick={onShowAddForm}
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Ajouter un lien
          </button>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showAddLinkForm && (
        <div style={{ 
          padding: '16px', 
          background: 'var(--surface)', 
          borderRadius: '8px', 
          marginBottom: '16px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px', gap: '12px', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Plateforme (ex: Netflix, Crunchyroll, ADN)"
              value={newLink.platform}
              onChange={(e) => onLinkChange({ ...newLink, platform: e.target.value })}
              className="input"
              style={{ fontSize: '13px' }}
            />
            <input
              type="url"
              placeholder="URL du lien"
              value={newLink.url}
              onChange={(e) => onLinkChange({ ...newLink, url: e.target.value })}
              className="input"
              style={{ fontSize: '13px' }}
            />
            <select
              value={newLink.language}
              onChange={(e) => onLinkChange({ ...newLink, language: e.target.value })}
              className="select"
              style={{ fontSize: '13px' }}
            >
              <option value="fr">🇫🇷 FR</option>
              <option value="en">🇬🇧 EN</option>
              <option value="ja">🇯🇵 JA</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onAddLink}
              className="btn btn-primary"
              style={{ fontSize: '13px', padding: '6px 16px' }}
            >
              Ajouter
            </button>
            <button
              onClick={onHideAddForm}
              className="btn btn-outline"
              style={{ fontSize: '13px', padding: '6px 16px' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des liens */}
      {streamingLinks.length > 0 ? (
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%',
          alignItems: 'center'
        }}>
          {streamingLinks.map((link, index) => {
            const iconPath = link.icon || getPlatformIcon(link.platform);
            const hasIcon = !!iconPath;
            
            if (hasIcon) {
              // Si on a une icône, afficher uniquement l'icône cliquable directement
              return (
                <div key={index} style={{ position: 'relative', display: 'inline-block' }}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.platform + (link.language && link.language !== 'unknown' ? ` (${link.language === 'fr' ? 'FR' : link.language === 'en' ? 'EN' : link.language === 'ja' ? 'JA' : link.language})` : '')}
                    style={{
                      display: 'inline-block',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, opacity 0.2s',
                      lineHeight: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    <img 
                      src={iconPath} 
                      alt={link.platform} 
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        objectFit: 'contain',
                        borderRadius: '8px',
                        display: 'block'
                      }} 
                    />
                  </a>
                  {link.source === 'manual' && link.id && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteLink(link.id!);
                      }}
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            }
            
            // Si pas d'icône, afficher l'icône par défaut + texte dans un bouton
            return (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: link.color ? `${link.color}15` : 'var(--surface-light)',
                  border: `1px solid ${link.color || 'var(--border)'}`,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  width: '100%',
                  boxSizing: 'border-box',
                  minWidth: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${link.color || 'rgba(0,0,0,0.1)'}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <Play size={18} style={{ color: link.color || 'var(--primary)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '13px', 
                      color: 'var(--text)', 
                      marginBottom: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {link.platform}
                    </div>
                    {link.language && link.language !== 'unknown' && (
                      <div style={{ 
                        fontSize: '11px', 
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {link.language === 'fr' && '🇫🇷 Français'}
                        {link.language === 'en' && '🇬🇧 Anglais'}
                        {link.language === 'ja' && '🇯🇵 Japonais'}
                        {link.language !== 'fr' && link.language !== 'en' && link.language !== 'ja' && link.language}
                        {link.source === 'manual' && ' • Manuel'}
                      </div>
                    )}
                    {(!link.language || link.language === 'unknown') && link.source === 'manual' && (
                      <div style={{ 
                        fontSize: '11px', 
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        Ajouté manuellement
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                  {link.source === 'manual' && link.id && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteLink(link.id!);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                  <ExternalLink size={14} style={{ color: 'var(--text-secondary)', opacity: 0.6, flexShrink: 0 }} />
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px dashed var(--border)'
        }}>
          <Link2 size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '14px' }}>
            Aucun lien de streaming disponible.<br />
            Ajoutez-en un manuellement pour retrouver facilement où regarder cet anime.
          </p>
        </div>
      )}
    </>
  );

  if (noCard) {
    return content;
  }

  return (
    <div style={{ 
      padding: '16px', 
      border: '1px solid var(--border)',
      borderRadius: '8px',
      background: 'var(--surface)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
          <Play size={18} />
          Où regarder
        </h3>
        {!showAddLinkForm && (
          <button
            onClick={onShowAddForm}
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Ajouter un lien
          </button>
        )}
      </div>
      {content}
    </div>
  );
}
