import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import Modal from '../common/Modal';
import CoverImage from '../../common/CoverImage';

export type MergeFieldType =
  | 'text'
  | 'longText'
  | 'image'
  | 'badge'
  | 'chips'
  | 'link'
  | 'list'
  | 'json'
  | 'boolean'
  | 'number'
  | 'date';

export interface MergeFieldPreview {
  key: string;
  label: string;
  type: MergeFieldType;
  sourceValue: any;
  sourceDisplayValue: string;
  targetValue: any;
  targetDisplayValue: string;
  targetHasValue: boolean;
  identical: boolean;
}

export interface MergePreviewData {
  success: true;
  type: string;
  entityLabel: string;
  source: { id: number; title: string; cover?: string | null };
  target: { id: number; title: string; cover?: string | null };
  fields: MergeFieldPreview[];
}

interface MergeEntitiesModalProps {
  preview: MergePreviewData;
  isSubmitting: boolean;
  onConfirm: (selectedFields: string[]) => Promise<void> | void;
  onClose: () => void;
}

function hasDisplayValue(value: any) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function renderChipList(value: any) {
  const chips: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (typeof entry === 'string') {
        chips.push(entry);
      } else if (entry && typeof entry.name === 'string') {
        chips.push(entry.name);
      }
    });
  } else if (typeof value === 'string') {
    value
      .split(/[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => chips.push(item));
  }

  if (chips.length === 0) {
    return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {chips.map((chip, index) => (
        <span
          key={`${chip}-${index}`}
          style={{
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.08)',
            fontSize: '11px'
          }}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function renderValue(field: MergeFieldPreview, isSource: boolean) {
  if (!hasDisplayValue(isSource ? field.sourceValue : field.targetValue)) {
    return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
  }

  const value = isSource ? field.sourceValue : field.targetValue;
  const displayValue = isSource ? field.sourceDisplayValue : field.targetDisplayValue;

  switch (field.type) {
    case 'image':
      return (
        <div
          style={{
            width: '120px',
            height: '160px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)'
          }}
        >
          <CoverImage
            src={typeof value === 'string' ? value : ''}
            alt={`${field.label} ${isSource ? 'source' : 'cible'}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      );
    case 'badge':
      return (
        <span
          style={{
            padding: '2px 10px',
            borderRadius: '999px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--primary)',
            fontSize: '11px',
            fontWeight: 600
          }}
        >
          {displayValue}
        </span>
      );
    case 'chips':
    case 'list':
      return renderChipList(value);
    case 'boolean':
      return (
        <span style={{ color: value ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
          {value ? 'Oui' : 'Non'}
        </span>
      );
    case 'link':
      return (
        <a
          href={typeof value === 'string' ? value : '#'}
          onClick={(event) => event.stopPropagation()}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--primary)', fontSize: '12px', wordBreak: 'break-all' }}
        >
          {displayValue || value}
        </a>
      );
    default:
      return (
        <div style={{ fontSize: field.type === 'longText' ? '12px' : '13px' }}>
          {displayValue || value}
        </div>
      );
  }
}

export default function MergeEntitiesModal({
  preview,
  isSubmitting,
  onConfirm,
  onClose
}: MergeEntitiesModalProps) {
  const defaultSelection = useMemo(() => {
    return new Set(
      preview.fields
        .filter((field) => !field.targetHasValue || !field.identical)
        .map((field) => field.key)
    );
  }, [preview.fields]);

  const [selectedFields, setSelectedFields] = useState<Set<string>>(defaultSelection);

  useEffect(() => {
    setSelectedFields(defaultSelection);
  }, [defaultSelection]);

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedFields(new Set(preview.fields.map((field) => field.key)));
  };

  const handleClearAll = () => {
    setSelectedFields(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedFields));
  };

  return (
    <Modal maxWidth="960px" maxHeight="90vh" onClickOverlay={onClose}>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Fusion {preview.entityLabel}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
              Choisissez les champs à transférer
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              L&apos;entrée source sera supprimée après la fusion. Les données associées (progressions,
              volumes, etc.) sont transférées automatiquement lorsque c&apos;est possible.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '4px' }}>
              Tous les champs où la cible est vide (ou différente) sont pré-sélectionnés par défaut.
              Vous pouvez les désélectionner si nécessaire.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
            aria-label="Fermer la modale"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)'
          }}
        >
          {[preview.source, preview.target].map((entity, index) => (
            <div key={entity.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-light)'
                }}
              >
                {entity.cover ? (
                  <CoverImage
                    src={entity.cover}
                    alt={entity.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: '12px'
                    }}
                  >
                    Aucune image
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{entity.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ID {entity.id}
                </div>
                {index === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px' }}>
                    Source (sera supprimée)
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px' }}>
                    Cible (conserve l&apos;entrée)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {selectedFields.size} champ(s) sélectionné(s)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSelectAll}
              className="btn secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Tout sélectionner
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="btn ghost"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              RAZ
            </button>
          </div>
        </div>

        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: '12px',
            maxHeight: '50vh',
            overflow: 'auto'
          }}
        >
          {preview.fields.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucun champ non vide dans l&apos;entrée source. Vous pouvez malgré tout fusionner pour
              transférer les données associées.
            </div>
          ) : (
            preview.fields.map((field) => {
              const selected = selectedFields.has(field.key);
              return (
                <div
                  key={field.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 60px 1fr',
                    gap: '12px',
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{field.label}</div>
                    {renderValue(field, true)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => toggleField(field.key)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: `1px solid ${
                          selected ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
                        }`,
                        background: selected
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'rgba(239, 68, 68, 0.12)',
                        color: selected ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      title={selected ? 'Ce champ sera copié' : 'Copie désactivée pour ce champ'}
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Valeur cible
                      {field.identical && field.targetHasValue && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: 'var(--success)'
                          }}
                        >
                          <CheckCircle size={12} />
                          Identique
                        </span>
                      )}
                    </div>
                    {renderValue(field, false)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            alignItems: 'center'
          }}
        >
          <button type="button" className="btn ghost" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={isSubmitting}
            onClick={handleConfirm}
            style={{ minWidth: '140px' }}
          >
            {isSubmitting ? 'Fusion en cours...' : 'Fusionner'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
