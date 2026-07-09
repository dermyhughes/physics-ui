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
import { nextId } from '../physics/ids';
import type { MaterialName } from '../physics/materials';
import { playEffect } from '../physics/sound';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** What the panel is stamped from — sets how it swings and how it falls. */
  material?: MaterialName;
}

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

function ModalInner({ onClose, title, children, material = 'wood' }: ModalProps) {
  const { containerRef, registerLooseEl, registry, engine, getBounds } = useWorld();
  const panelRef = useRef<HTMLDivElement>(null);
  const lineA = useRef<SVGPathElement>(null);
  const lineB = useRef<SVGPathElement>(null);
  const ropes = useRef<{ constraints: Matter.Constraint[]; entry: BodyEntry | null }>({
    constraints: [],
    entry: null,
  });
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const el = panelRef.current;
    const container = containerRef.current;
    if (!el || !container) return;
    const { w } = getBounds();
    // The world container can be taller than the screen — hang the dialog
    // relative to the VIEWPORT the user is actually looking at.
    const crect = container.getBoundingClientRect();
    const viewTop = -crect.top;
    const viewH = window.innerHeight;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const spawnX = w / 2;
    const spawnY = viewTop - ph / 2 - 10;
    el.style.transform = `translate(${spawnX - pw / 2}px, ${spawnY - ph / 2}px)`;

    const spec: LooseSpec = {
      id: nextId('modal'),
      kind: 'modal',
      material,
      shape: 'rect',
      w: pw,
      h: ph,
      x: spawnX,
      y: spawnY,
      vy: 14,
      // Own layer: the drop-in never clips the header on its way down. It
      // can still catch a dismissed toast on its roof.
      overlay: true,
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
      // Hang the panel around the upper third of the viewport. The ropes
      // start paid out to the spawn distance (zero violation — a large
      // initial stretch makes Matter's sequential solver convert it into
      // torque and the panel corkscrews in). They winch in per-frame below,
      // so the dialog is genuinely LOWERED into view.
      const ropeLen = Math.max(110, viewH * 0.36 - ph / 2);
      const spread = pw * 0.4;
      const cs = [-1, 1].map((side) => {
        const pointA = { x: spawnX + side * (spread + 26), y: viewTop + 8 };
        const pointB = { x: side * spread, y: -ph / 2 + 6 };
        const attach = Matter.Vector.add(entry!.body.position, pointB);
        const c = Matter.Constraint.create({
          pointA,
          bodyB: entry!.body,
          pointB,
          length: Math.hypot(attach.x - pointA.x, attach.y - pointA.y) + 20,
          stiffness: 0.5,
          damping: 0.09,
        });
        (c as any).plugin = { targetLen: ropeLen };
        return c;
      });
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

  // Rope behaviour + rendering. A Matter constraint is a rod (it pushes when
  // compressed); a rope only pulls. Emulate slack by zeroing the stiffness
  // whenever the rope is shorter than its rest length — and draw it as a
  // sagging curve instead of a rigid line.
  useFrame(() => {
    const { constraints, entry } = ropes.current;
    if (!entry) return;
    const lines = [lineA.current, lineB.current];
    constraints.forEach((c, i) => {
      const line = lines[i];
      // Matter keeps pointB rotated in place as the body rotates.
      const attach = Matter.Vector.add(entry.body.position, c.pointB as Matter.Vector);
      const a = c.pointA as Matter.Vector;
      const dist = Math.hypot(attach.x - a.x, attach.y - a.y);
      // Winch in toward the hang length. Fast: a dialog is a request for
      // attention, not a ceremony.
      const target = (c as any).plugin?.targetLen ?? c.length;
      if (c.length > target) c.length = Math.max(target, c.length - 24);
      // Rope, not rod: pull-only, with give proportional to the violation so
      // the catch is a snub rather than a yank. Firm ramp — too soft and the
      // panel sags into place in slow motion instead of arriving. Damping only
      // while taut — Matter applies it even at zero stiffness, which brakes
      // free-fall.
      const violation = dist - c.length;
      c.stiffness = violation > 0 ? Math.min(0.9, 0.2 + violation * 0.08) : 0.0005;
      c.damping = violation > 0 ? 0.12 : 0;
      if (!line) return;
      // Sag grows with slack; a taut rope keeps a hint of droop.
      const sag = Math.min(90, Math.max(0, c.length - dist)) * 0.6 + 5;
      const mx = (a.x + attach.x) / 2;
      const my = (a.y + attach.y) / 2 + sag;
      line.setAttribute('d', `M ${a.x} ${a.y} Q ${mx} ${my} ${attach.x} ${attach.y}`);
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
        <path ref={lineA} className="tmbl-modal-rope" />
        <path ref={lineB} className="tmbl-modal-rope" />
      </svg>
      <div
        ref={panelRef}
        className="tmbl-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-material={material}
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
