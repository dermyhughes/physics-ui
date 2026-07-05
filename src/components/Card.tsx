import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useWorld, VehicleProvider, type VehicleHandle } from '../physics/PhysicsWorld';
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
  /**
   * Vehicle mode: children with physics bolt themselves to this card instead
   * of the page — they ride it when it's thrown, and can be torn off it.
   */
  vehicle?: boolean;
}

/**
 * A surface panel. Material matters: wood cards knock about, steel cards are
 * almost immovable, and GLASS cards shatter if anything hits them hard enough
 * — leaving a "COMPONENT DAMAGED" placard until you press REPAIR.
 */
export function Card({ children, title, material = 'wood', className, bolted, vehicle }: CardProps) {
  const [broken, setBroken] = useState(false);
  const { spawnLoose, containerRef } = useWorld();
  const lastShatter = useRef(0);
  const handle = useRef<VehicleHandle>({ entryRef: { current: null }, listeners: new Set() }).current;

  const { ref, entry } = usePhysicsBody<HTMLElement>({
    kind: 'card',
    material,
    // Vehicles are heavier so their riders don't wag the whole crate.
    weight: bolted ? 2 : vehicle ? 1.8 : 1,
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

  // Publish the card's body to riders once it exists (this effect runs after
  // usePhysicsBody's, and after all children have subscribed).
  useEffect(() => {
    if (!vehicle) return;
    handle.entryRef.current = entry();
    handle.listeners.forEach((cb) => cb());
    return () => {
      handle.entryRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      data-vehicle={vehicle || undefined}
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
      ) : vehicle ? (
        <VehicleProvider handle={handle}>
          <div className="tmbl-card__body">{children}</div>
        </VehicleProvider>
      ) : (
        <div className="tmbl-card__body">{children}</div>
      )}
    </section>
  );
}
