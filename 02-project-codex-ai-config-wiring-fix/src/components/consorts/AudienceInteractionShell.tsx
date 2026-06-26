import type { ReactNode } from 'react';

export interface AudienceMetaRow {
  label: string;
  value: ReactNode;
}

interface AudienceInteractionShellProps {
  ariaLabel: string;
  heading: string;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
  headerActions?: ReactNode;
  metaRows?: AudienceMetaRow[];
  portrait: ReactNode;
  actions: ReactNode;
  picker?: ReactNode;
  dialogue?: ReactNode;
}

export function AudienceInteractionShell({
  ariaLabel,
  heading,
  onBack,
  backLabel = '返回',
  className = '',
  headerActions,
  metaRows = [],
  portrait,
  actions,
  picker,
  dialogue,
}: AudienceInteractionShellProps) {
  const rootClassName = ['harem-palace-view__audience', className].filter(Boolean).join(' ');

  return (
    <section className={rootClassName} aria-label={ariaLabel}>
      <header className="harem-palace-view__audience-header">
        <div className="harem-palace-view__heading">
          <span>{heading}</span>
        </div>

        {headerActions ? (
          <div className="harem-palace-view__header-actions">{headerActions}</div>
        ) : onBack ? (
          <div className="harem-palace-view__header-actions">
            <button type="button" className="harem-palace-view__utility-button" onClick={onBack}>
              {backLabel}
            </button>
          </div>
        ) : null}
      </header>

      {metaRows.length > 0 ? (
        <div className="harem-palace-view__audience-meta">
          <article className="harem-palace-view__audience-card">
            {metaRows.map((row) => (
              <div className="harem-palace-view__audience-kv" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </article>
        </div>
      ) : null}

      {portrait}
      {actions}
      {picker}
      {dialogue}
    </section>
  );
}
