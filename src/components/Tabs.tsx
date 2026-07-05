import { useId, type ReactNode } from 'react';
import { playEffect } from '../physics/sound';

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabDef[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  className?: string;
}

/**
 * Tabs are wayfinding — they stay out of the physics entirely. Plain folder
 * tabs with proper tablist semantics and arrow-key roving; the incoming
 * panel settles into place with a small mechanical drop, and that's it.
 * (The panel's CONTENTS bring their own physics, of course.)
 */
export function Tabs({ tabs, value, onChange, label, className }: TabsProps) {
  const baseId = useId();
  const active = tabs.find((t) => t.id === value) ?? tabs[0];

  const switchTo = (id: string) => {
    if (id === value) return;
    playEffect('ratchet', 0.5);
    onChange(id);
  };

  const onTablistKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.id === value);
    const next =
      e.key === 'ArrowRight' ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
    switchTo(tabs[next].id);
    document.getElementById(`${baseId}-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div className={`tmbl-tabs ${className ?? ''}`}>
      <div className="tmbl-tabs__list" role="tablist" aria-label={label} onKeyDown={onTablistKey}>
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`${baseId}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={t.id === value}
            aria-controls={`${baseId}-panel`}
            tabIndex={t.id === value ? 0 : -1}
            className="tmbl-tabs__tab"
            data-active={t.id === value || undefined}
            onClick={() => switchTo(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        key={active.id}
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active.id}`}
        className="tmbl-tabs__panel"
      >
        {active.content}
      </div>
    </div>
  );
}
