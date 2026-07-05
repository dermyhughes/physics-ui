import { useRef, useState, type ReactNode } from 'react';
import { useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { MATERIALS, type MaterialName } from '../physics/materials';
import { playEffect } from '../physics/sound';

export interface CardProps {
  children: ReactNode;
  title?: string;
  material?: MaterialName;
  className?: string;
  /** Extra-firm mounting for cards that anchor a layout. */
  bolted?: boolean;
}

/**
 * A surface panel. Material matters: wood cards knock about, steel cards are
 * almost immovable, and GLASS cards shatter if anything hits them hard enough
 * — leaving a "COMPONENT DAMAGED" placard until you press REPAIR.
 */
export function Card({ children, title, material = 'wood', className, bolted }: CardProps) {
  const [broken, setBroken] = useState(false);
  const { spawnLoose, containerRef } = useWorld();
  const lastShatter = useRef(0);

  const { ref, entry } = usePhysicsBody<HTMLElement>({
    kind: 'card',
    material,
    weight: bolted ? 2 : 1,
    mountStiffness: bolted ? 0.12 : 0.06,
    mountBreakAt: bolted ? 160 : 100,
    onImpact: (info) => {
      const tolerance = MATERIALS[material].shatterAt;
      const now = performance.now();
      if (info.speed > tolerance && !broken && now - lastShatter.current > 1000) {
        lastShatter.current = now;
        shatter();
      }
    },
  });

  const shatter = () => {
    const e = entry();
    const container = containerRef.current;
    if (!e || !container) return;
    playEffect('shatter', 1);
    const { position } = e.body;
    const { w, h } = e.size;
    // The pane explodes into shards.
    for (let i = 0; i < 12; i++) {
      const sw = 14 + Math.random() * 26;
      spawnLoose({
        kind: 'shard',
        material: 'glass',
        shape: 'rect',
        w: sw,
        h: sw,
        x: position.x + (Math.random() - 0.5) * w * 0.8,
        y: position.y + (Math.random() - 0.5) * h * 0.8,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 7,
        spin: (Math.random() - 0.5) * 0.9,
        ttl: 3500,
        debris: true,
        className: 'tmbl-shard',
      });
    }
    setBroken(true);
  };

  return (
    <section
      ref={ref as React.RefObject<HTMLElement> & React.Ref<HTMLElement>}
      className={`tmbl-card ${className ?? ''}`}
      data-material={material}
      data-broken={broken || undefined}
    >
      {title && (
        <header className="tmbl-card__title">
          <span>{title}</span>
          <span className="tmbl-card__spec">{material.toUpperCase()}</span>
        </header>
      )}
      {broken ? (
        <div className="tmbl-card__wreckage">
          <span className="tmbl-card__wreckage-label">⚠ component damaged</span>
          <button
            type="button"
            className="tmbl-card__repair"
            onClick={(ev) => {
              ev.stopPropagation();
              playEffect('ratchet', 1);
              setBroken(false);
            }}
          >
            repair
          </button>
        </div>
      ) : (
        <div className="tmbl-card__body">{children}</div>
      )}
    </section>
  );
}
