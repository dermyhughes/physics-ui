import { useRef, useState } from 'react';
import { useFrame, useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { relativeRect } from '../physics/geometry';

export interface PartsBinProps {
  label?: string;
}

const UNCOLLECTIBLE = new Set(['claw', 'modal']);

/**
 * The humble trash can, promoted to machinery. Three static steel walls form
 * an open-top bin; any loose part that comes to rest inside is collected with
 * a pop and added to the tally. Feed it by hand, by conveyor, or let the
 * crane do its rounds.
 */
export function PartsBin({ label = 'Scrap' }: PartsBinProps) {
  const [count, setCount] = useState(0);
  const { getLoose, removeLoose, containerRef } = useWorld();
  const interiorRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const wallL = usePhysicsBody<HTMLSpanElement>({ kind: 'bin-wall', isStatic: true, material: 'steel' });
  const wallR = usePhysicsBody<HTMLSpanElement>({ kind: 'bin-wall', isStatic: true, material: 'steel' });
  const base = usePhysicsBody<HTMLSpanElement>({ kind: 'bin-wall', isStatic: true, material: 'steel' });

  useFrame(() => {
    // Cheap poll: every ~20 ticks, collect settled parts inside the bin.
    if (++frame.current % 20 !== 0) return;
    const interior = interiorRef.current;
    const container = containerRef.current;
    if (!interior || !container) return;
    const r = relativeRect(interior, container);
    const box = {
      minX: r.x,
      maxX: r.x + r.w,
      minY: r.y,
      maxY: r.y + r.h + 6,
    };
    for (const kind of ['radio-ball', 'nut', 'tick', 'scrap', 'letter', 'shard']) {
      for (const part of getLoose(kind)) {
        if (UNCOLLECTIBLE.has(part.kind)) continue;
        const { x, y } = part.body.position;
        const speed = Math.hypot(part.body.velocity.x, part.body.velocity.y);
        if (x > box.minX && x < box.maxX && y > box.minY && y < box.maxY && speed < 2) {
          removeLoose(String(part.data?.looseId ?? ''), { pop: true });
          setCount((c) => c + 1);
        }
      }
    }
  });

  return (
    <div className="tmbl-bin" aria-label={`${label} bin, ${count} parts collected`}>
      <span ref={wallL.ref} className="tmbl-bin__wall" data-side="left" />
      <div ref={interiorRef} className="tmbl-bin__interior" aria-hidden="true" />
      <span ref={wallR.ref} className="tmbl-bin__wall" data-side="right" />
      <span ref={base.ref} className="tmbl-bin__base" />
      <span className="tmbl-bin__label">
        {label} <em className="tmbl-bin__count">{count}</em>
      </span>
    </div>
  );
}
