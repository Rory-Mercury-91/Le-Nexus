import { Ban, Info } from 'lucide-react';
import { useState } from 'react';

type WebhookCardProps = {
  webhookUrl: string;
  onChangeWebhook: (url: string) => void;
};

type MentionsCardProps = {
  traducteurs: string[];
  discordMentions: Record<string, string>;
  onChangeMention: (traducteur: string, value: string) => void;
};

type BlacklistCardProps = {
  onOpen: () => void;
  count?: number;
};

const tooltipTexts = {
  webhook: "Collez l'URL d'un webhook Discord pour recevoir les alertes jeux adultes.",
  mentions: "Associez l'ID Discord de chaque traducteur pour qu'il soit mentionné automatiquement.",
} as const;

type TooltipId = keyof typeof tooltipTexts;

const TooltipIcon = ({ id, placement = 'center' }: { id: TooltipId; placement?: 'center' | 'end' }) => {
  const [active, setActive] = useState(false);
  return (
    <span
      tabIndex={0}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      aria-label={tooltipTexts[id]}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        outline: 'none',
        borderRadius: '50%'
      }}
    >
      <Info size={16} aria-hidden="true" />
      {active && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: placement === 'end' ? 'auto' : '50%',
            right: placement === 'end' ? 0 : 'auto',
            transform: placement === 'end' ? 'none' : 'translateX(-50%)',
            background: 'var(--surface-light)',
            color: 'var(--text)',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 16px 32px rgba(0, 0, 0, 0.22)',
            border: '1px solid var(--border)',
            fontSize: '12px',
            lineHeight: 1.45,
            zIndex: 30,
            minWidth: '200px',
            maxWidth: '260px',
            textAlign: 'center'
          }}
        >
          {tooltipTexts[id]}
        </div>
      )}
    </span>
  );
};

export function AdulteGameWebhookCard({
  webhookUrl,
  onChangeWebhook
}: WebhookCardProps) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--surface)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <label
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text)'
        }}
      >
        Webhook Discord (notifications MAJ jeux adultes)
      </label>
        <TooltipIcon id="webhook" placement="end" />
      </div>
      <input
        type="url"
        value={webhookUrl}
        onChange={(event) => onChangeWebhook(event.target.value)}
        placeholder="https://discord.com/api/webhooks/..."
        className="input"
      />
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}
      >
        Laissez vide pour désactiver les notifications Discord.
      </span>
    </div>
  );
}

export function AdulteGameMentionsCard({ traducteurs, discordMentions, onChangeMention }: MentionsCardProps) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--surface)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
        Mentions Discord automatiques
        </div>
        <TooltipIcon id="mentions" placement="end" />
      </div>
      {traducteurs.length === 0 ? (
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Ajoutez d’abord des traducteurs pour configurer leurs mentions.
        </span>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {traducteurs.map(trad => (
            <div
              key={`mention-${trad}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 1fr',
                gap: '12px',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text)' }}>{trad}</span>
              <input
                type="text"
                inputMode="numeric"
                value={discordMentions[trad] || ''}
                onChange={(event) => onChangeMention(trad, event.target.value)}
                placeholder="Ex. 394893413843206155"
                className="input"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdulteGameBlacklistCard({ onOpen, count = 0 }: BlacklistCardProps) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--surface)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Ban size={18} style={{ color: 'var(--danger)' }} />
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', flex: 1 }}>
          Liste noire
        </div>
      </div>
      <p
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: '1.4',
          margin: 0
        }}
      >
        Gérez les jeux exclus de la synchronisation automatique.
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '180px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Jeux exclus : ajustez la liste pour empêcher leur synchronisation.
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            IDs en liste noire :{' '}
            <strong style={{ color: 'var(--text)' }}>{count}</strong>
          </span>
        </div>
        <button
          onClick={onOpen}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '10px'
          }}
        >
          <Ban size={16} />
          Gérer
        </button>
      </div>
    </div>
  );
}
