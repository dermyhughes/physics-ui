import { useRef, useState } from 'react';
import { useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';

export interface BumperProps {
  /** Kick velocity applied to whatever touches it. */
  kick?: number;
  size?: number;
  className?: string;
}

/**
 * A pinball bumper. Anything that touches it gets launched. Racks up a hit
 * counter like a proper arcade machine — build score by keeping a radio ball
 * alive between two bumpers.
 */
export function Bumper({ kick = 13, size = 64, className }: BumperProps) {
  const [hits, setHits] = useState(0);
  const [lit, setLit] = useState(false);
  const litTimer = useRef<ReturnType<typeof setTimeout>>();
  const { spawnLoose, containerRef } = useWorld();

  const { ref, entry } = usePhysicsBody<HTMLDivElement>({
    kind: 'bumper',
    isStatic: true,
    material: 'rubber',
    shape: 'circle',
    bodyOverrides: { plugin: { tumbleBumper: kick }, restitution: 1 },
    onImpact: (info) => {
      if (info.speed < 1.5) return;
      setHits((h) => h + 1);
      setLit(true);
      clearTimeout(litTimer.current);
      litTimer.current = setTimeout(() => setLit(false), 180);
      // Arcade score tag floats up.
      const e = entry();
      const container = containerRef.current;
      if (e && container) {
        spawnLoose({
          kind: 'score',
          material: 'paper',
          shape: 'rect',
          w: 44,
          h: 18,
          x: e.body.position.x,
          y: e.body.position.y - size / 2 - 14,
          vy: -4,
          ttl: 650,
          debris: true,
          className: 'tmbl-score-pop',
          text: '+100',
        });
      }
    },
  });

  return (
    <div
      ref={ref}
      className={`tmbl-bumper ${className ?? ''}`}
      style={{ width: size, height: size }}
      data-lit={lit || undefined}
      aria-hidden="true"
    >
      <span className="tmbl-bumper__ring" />
      <span className="tmbl-bumper__count">{hits}</span>
    </div>
  );
}
