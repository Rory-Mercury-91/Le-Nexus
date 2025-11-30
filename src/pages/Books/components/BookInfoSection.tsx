import { Star } from 'lucide-react';
import { useState } from 'react';
import { useDevMode } from '../../../hooks/common/useDevMode';
import { Book } from '../../../types';

interface BookInfoSectionProps {
  book: Book;
  shouldShow: (field: string) => boolean;
}

export default function BookInfoSection({ book, shouldShow }: BookInfoSectionProps) {
  const auteurs = Array.isArray(book.auteurs) ? book.auteurs : (book.auteur ? [book.auteur] : []);
  const genres = Array.isArray(book.genres) ? book.genres : (book.genres ? book.genres.split(',').map(g => g.trim()) : []);
  const { devMode } = useDevMode();
  const [exporting, setExporting] = useState(false);
  
  // Formater le score (sur 5 pour Google Books)
  const score = book.score_moyen ? (book.score_moyen / 5 * 10).toFixed(1) : null;
  const nbVotes = book.nb_votes || 0;

  const handleExport = async () => {
    if (!window.electronAPI?.exportEntityData) {
      window.alert('Export indisponible dans ce contexte.');
      return;
    }
    try {
      setExporting(true);
      const result = await window.electronAPI.exportEntityData('book', book.id);
      if (result?.success && result.filePath) {
        window.alert(`Données exportées vers : ${result.filePath}`);
      } else {
        window.alert(result?.error || "Erreur lors de l'export des données.");
      }
    } catch (error: any) {
      console.error('Erreur export données livre:', error);
      window.alert(error?.message || "Erreur inattendue lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ flex: 1, minWidth: '320px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>
      {/* 1. Titre et métadonnées principales */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <h1 className="detail-page-title" style={{ flex: 1 }}>
            {book.titre}
          </h1>
          {devMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                background: 'var(--surface)',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontFamily: 'monospace'
              }}>
                ID: {book.id}
              </span>
              <button
                onClick={handleExport}
                className="btn btn-outline"
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px'
                }}
                disabled={exporting}
              >
                {exporting ? 'Extraction...' : 'Extraire données'}
              </button>
            </div>
          )}
        </div>
        {/* 2. Titres secondaires */}
        {book.titre_original && book.titre_original !== book.titre && (
          <p className="detail-page-subtitle">
            {book.titre_original}
          </p>
        )}
      </div>

      {/* 3. Badges : Type de livre, Score, Prix */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '14px'
        }}
      >
        {shouldShow('type_livre') && book.type_livre && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#93c5fd',
              borderRadius: '999px',
              padding: '8px 14px',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            📖 {book.type_livre}
          </span>
        )}
        {score && shouldShow('score') && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#34d399',
              borderRadius: '999px',
              padding: '8px 14px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              fontSize: '14px'
            }}
          >
            <Star size={16} />
            {score} / 10
            {nbVotes > 0 && (
              <span style={{ fontSize: '12px', opacity: 0.8 }}>
                ({nbVotes} {nbVotes > 1 ? 'avis' : 'avis'})
              </span>
            )}
          </span>
        )}
        {shouldShow('prix') && book.prix_suggere && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#93c5fd',
              borderRadius: '999px',
              padding: '8px 14px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            💰 {book.prix_suggere.toFixed(2)} {book.devise || '€'}
          </span>
        )}
      </div>

      {/* 4. Genres */}
      {shouldShow('genres') && genres.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {genres.map((genre, index) => (
            <span
              key={`genre-${index}`}
              style={{
                fontSize: '13px',
                padding: '6px 12px',
                borderRadius: '999px',
                background: 'rgba(34, 197, 94, 0.18)',
                border: '1px solid rgba(34, 197, 94, 0.32)',
                color: '#86efac'
              }}
            >
              {genre}
            </span>
          ))}
        </div>
      )}

      {/* 5. Description/Synopsis */}
      {shouldShow('description') && book.description && (
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>
            Description
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.6', margin: 0, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {book.description}
          </p>
        </div>
      )}

      {/* 6. Autres métadonnées */}
      {shouldShow('auteur') && auteurs.length > 0 && (
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>
            Auteur(s)
          </h3>
          <p style={{ fontSize: '16px', margin: 0, color: 'var(--text)' }}>
            {auteurs.join(', ')}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {shouldShow('editeur') && book.editeur && (
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>
              Éditeur
            </h3>
            <p style={{ fontSize: '15px', margin: 0, color: 'var(--text)' }}>
              {book.editeur}
            </p>
          </div>
        )}

        {shouldShow('date_publication') && book.date_publication && (
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>
              Date de publication
            </h3>
            <p style={{ fontSize: '15px', margin: 0, color: 'var(--text)' }}>
              {new Date(book.date_publication).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        )}

        {shouldShow('nombre_pages') && book.nombre_pages && (
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>
              Nombre de pages
            </h3>
            <p style={{ fontSize: '15px', margin: 0, color: 'var(--text)' }}>
              {book.nombre_pages} pages
            </p>
          </div>
        )}

        {shouldShow('isbn') && (book.isbn || book.isbn13) && (
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>
              ISBN
            </h3>
            <p style={{ fontSize: '15px', margin: 0, color: 'var(--text)' }}>
              {book.isbn13 || book.isbn}
            </p>
          </div>
        )}

        {shouldShow('langue') && book.langue && (
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>
              Langue
            </h3>
            <p style={{ fontSize: '15px', margin: 0, color: 'var(--text)' }}>
              {book.langue}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
