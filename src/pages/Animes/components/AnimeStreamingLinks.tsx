import { ExternalLink, Link2, Play, Plus, X } from 'lucide-react';

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
  shouldShow
}: AnimeStreamingLinksProps) {
  if (!shouldShow('liens_streaming')) return null;

  return (
    <div style={{ 
      padding: '16px', 
      marginBottom: '20px',
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
              placeholder="Plateforme (ex: ADN)"
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
          display: 'grid', 
          gridTemplateColumns: `repeat(${Math.min(streamingLinks.length, 4)}, 1fr)`,
          gap: '12px'
        }}>
          {streamingLinks.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: link.color ? `${link.color}15` : 'var(--surface-light)',
                border: `1px solid ${link.color || 'var(--border)'}`,
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                cursor: 'pointer',
                minHeight: '60px'
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {link.icon ? (
                      <img src={link.icon} alt={link.platform} style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                    ) : (
                      <Play size={20} style={{ color: link.color || 'var(--primary)' }} />
                    )}
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text)' }}>
                      {link.platform}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        <X size={16} />
                      </button>
                    )}
                    <ExternalLink size={16} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {link.language && link.language !== 'unknown' && (
                    <>
                      {link.language === 'fr' && '🇫🇷 Français'}
                      {link.language === 'en' && '🇬🇧 Anglais'}
                      {link.language === 'ja' && '🇯🇵 Japonais'}
                      {link.language !== 'fr' && link.language !== 'en' && link.language !== 'ja' && link.language}
                      {link.source === 'manual' && ' • Ajouté manuellement'}
                    </>
                  )}
                  {(!link.language || link.language === 'unknown') && link.source === 'manual' && 'Ajouté manuellement'}
                </div>
              </div>
            </a>
          ))}
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
    </div>
  );
}
