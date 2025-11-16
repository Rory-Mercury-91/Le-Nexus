import { Ban } from 'lucide-react';

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

export function AdulteGameWebhookCard({
  webhookUrl,
  onChangeWebhook
}: WebhookCardProps) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--surface-light)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <label
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text)'
        }}
      >
        Webhook Discord (notifications MAJ jeux adultes)
      </label>
      <p
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          margin: 0,
          lineHeight: '1.45'
        }}
      >
        Collez l’URL du webhook Discord dédié pour recevoir une alerte lorsqu’un jeu suivi reçoit une nouvelle version ou une nouvelle traduction.
      </p>
      <input
        type="url"
        value={webhookUrl}
        onChange={(event) => onChangeWebhook(event.target.value)}
        placeholder="https://discord.com/api/webhooks/..."
        className="input"
        style={{
          width: '100%',
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
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
        background: 'var(--surface-light)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
        Mentions Discord automatiques
      </div>
      <p
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          margin: 0,
          lineHeight: '1.45'
        }}
      >
        Saisissez l’ID Discord (numérique) de chaque traducteur pour qu’il soit mentionné lorsqu’une nouvelle version du jeu est disponible.
      </p>
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
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
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
        background: 'var(--surface-light)',
        borderRadius: '8px',
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
