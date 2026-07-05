import Matter from 'matter-js';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  PhysicsExempt,
  useFrame,
  useWorld,
  type BodyEntry,
  type LooseSpec,
} from '../physics/PhysicsWorld';
import { playEffect } from '../physics/sound';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

let modalCounter = 0;

/**
 * A dialog lowered from the ceiling on two ropes. It drops in, bounces on its
 * ropes and swings while you read it. Dismissing it CUTS THE ROPES — the
 * whole panel tumbles down through the machine (knocking your form around on
 * the way) and falls off the bottom of the world.
 */
export function Modal(props: ModalProps) {
  if (!props.open) return null;
  return <ModalInner {...props} />;
}

function ModalInner({ onClose, title, children }: ModalProps) {
  const { containerRef, registerLooseEl, registry, engine, getBounds } = useWorld();
  const panelRef = useRef<HTMLDivElement>(null);
  const lineA = useRef<SVGLineElement>(null);
  const lineB = useRef<SVGLineElement>(null);
  const ropes = useRef<{ constraints: Matter.Constraint[]; entry: BodyEntry | null }>({
    constraints: [],
    entry: null,
  });
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const { w, h } = getBounds();
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const spawnX = w / 2;
    const spawnY = -ph / 2 - 40;
    el.style.transform = `translate(${spawnX - pw / 2}px, ${spawnY - ph / 2}px)`;

    const spec: LooseSpec = {
      id: `modal-${++modalCounter}`,
      kind: 'modal',
      material: 'wood',
      shape: 'rect',
      w: pw,
      h: ph,
      x: spawnX,
      y: spawnY,
      vy: 4,
    };
    const cleanup = registerLooseEl(spec, el);
    let entry: BodyEntry | null = null;
    for (const e of registry.values()) {
      if (e.el === el) {
        entry = e;
        break;
      }
    }
    ropes.current.entry = entry;

    if (entry) {
      // Hang the panel so it settles around the upper third of the machine.
      const ropeLen = Math.max(120, h * 0.34 - ph / 2);
      const spread = pw * 0.4;
      const cs = [-1, 1].map((side) =>
        Matter.Constraint.create({
          pointA: { x: spawnX + side * (spread + 30), y: 6 },
          bodyB: entry!.body,
          pointB: { x: side * spread, y: -ph / 2 + 6 },
          length: ropeLen,
          stiffness: 0.06,
          damping: 0.05,
        }),
      );
      ropes.current.constraints = cs;
      Matter.Composite.add(engine.world, cs);
      playEffect('whoosh', 0.8);
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cut();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      ropes.current.constraints.forEach((c) => Matter.Composite.remove(engine.world, c));
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw the ropes.
  useFrame(() => {
    const { constraints, entry } = ropes.current;
    if (!entry) return;
    const lines = [lineA.current, lineB.current];
    constraints.forEach((c, i) => {
      const line = lines[i];
      if (!line) return;
      // Matter keeps pointB rotated in place as the body rotates.
      const attach = Matter.Vector.add(entry.body.position, c.pointB as Matter.Vector);
      line.setAttribute('x1', String((c.pointA as Matter.Vector).x));
      line.setAttribute('y1', String((c.pointA as Matter.Vector).y));
      line.setAttribute('x2', String(attach.x));
      line.setAttribute('y2', String(attach.y));
    });
    if (closing && lines[0]) {
      lines.forEach((l) => l?.setAttribute('opacity', '0'));
    }
  });

  const cut = () => {
    if (closing) return;
    setClosing(true);
    playEffect('whoosh', 1);
    const { constraints, entry } = ropes.current;
    constraints.forEach((c) => Matter.Composite.remove(engine.world, c));
    ropes.current.constraints = [];
    if (entry) {
      Matter.Sleeping.set(entry.body, false);
      Matter.Body.setAngularVelocity(entry.body, (Math.random() - 0.5) * 0.24);
      // Let it fall out of the world instead of piling on the floor.
      entry.body.collisionFilter.mask = 0;
    }
    setTimeout(onClose, 1100);
  };

  const container = containerRef.current;
  if (!container) return null;

  return createPortal(
    <div className="tmbl-modal-overlay" data-closing={closing || undefined}>
      <svg className="tmbl-modal-ropes" aria-hidden="true">
        <line ref={lineA} className="tmbl-modal-rope" />
        <line ref={lineB} className="tmbl-modal-rope" />
      </svg>
      <div
        ref={panelRef}
        className="tmbl-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="tmbl-modal__title">
          <span>{title}</span>
          <button type="button" className="tmbl-modal__close" onClick={cut} aria-label="Close (cuts the ropes)">
            ✂
          </button>
        </header>
        {/* Contents ride the panel: they must not register their own bodies. */}
        <PhysicsExempt>
          <div className="tmbl-modal__body">{children}</div>
        </PhysicsExempt>
      </div>
    </div>,
    container,
  );
}
