import { Tag } from 'lucide-react';
import React from 'react';
import { translateAdulteGameTags } from '../../../utils/translations';

interface AdulteGameTagsCardProps {
  tags?: string | string[] | null;
  tagPreferences?: Record<string, 'liked' | 'disliked' | 'neutral'>;
  onTagPreferenceToggle?: (tag: string) => void;
}

const AdulteGameTagsCard: React.FC<AdulteGameTagsCardProps> = ({ tags, tagPreferences = {}, onTagPreferenceToggle }) => {
  // Parser les tags (peut être JSON array, string, ou déjà parsé)
  const parseTags = (): string[] => {
    if (!tags) return [];

    // Si c'est déjà un tableau
    if (Array.isArray(tags)) {
      return tags;
    }

    // Si c'est une string
    if (typeof tags === 'string') {
      try {
        // Essayer de parser comme JSON
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Si ce n'est pas du JSON valide, séparer par virgules
        return tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }
    }

    return [];
  };

  const rawTagsList = parseTags();
  
  // Traduire les tags et les dédupliquer
  const tagsList = rawTagsList.length > 0
    ? translateAdulteGameTags(rawTagsList).split(',').map(t => t.trim()).filter(t => t)
    : [];

  if (tagsList.length === 0) {
    return (
      <div className="card">
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '700',
            color: 'var(--text)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Tag size={24} style={{ color: 'var(--warning)' }} />
          Tags
        </h2>

        <div
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            fontStyle: 'italic'
          }}
        >
          Aucun tag disponible
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2
        style={{
          fontSize: '20px',
          fontWeight: '700',
          color: 'var(--text)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <Tag size={24} style={{ color: 'var(--warning)' }} />
        Tags
      </h2>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        {tagsList.map((tag, index) => {
          const preference = tagPreferences[tag] || 'neutral';
          
          // Couleurs selon la préférence
          let tagColor = '#f59e0b'; // Neutre par défaut
          let borderColor = '#f59e0b';
          if (preference === 'liked') {
            tagColor = '#ef4444'; // Rouge pour favoris
            borderColor = '#ef4444';
          } else if (preference === 'disliked') {
            tagColor = '#1f2937'; // Noir pour dislikes
            borderColor = '#1f2937';
          }
          
          return (
            <button
              key={index}
              onClick={() => onTagPreferenceToggle?.(tag)}
              title={`Cliquez pour changer: ${preference === 'liked' ? 'Favori' : preference === 'disliked' ? 'Non apprécié' : 'Neutre'} → ${preference === 'liked' ? 'Non apprécié' : preference === 'disliked' ? 'Neutre' : 'Favori'}`}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                textTransform: 'lowercase',
                background: tagColor,
                color: 'white',
                border: `2px solid ${borderColor}`,
                fontWeight: preference !== 'neutral' ? '600' : '500',
                opacity: preference === 'disliked' ? 0.8 : 1,
                cursor: onTagPreferenceToggle ? 'pointer' : 'default',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdulteGameTagsCard;
