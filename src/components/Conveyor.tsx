import { useState, type CSSProperties } from 'react';
import { usePhysicsBody } from '../physics/usePhysicsBody';

export interface ConveyorProps {
  /** Belt surface speed in px/tick. Positive = rightward. */
  speed?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A conveyor belt. Static machinery: it can't be knocked loose, but anything
 * that lands on it — balls, shards, letters, entire torn-off cards — gets
 * carried along. Click it to reverse the belt.
 */
export function Conveyor({ speed = 3, className, style }: ConveyorProps) {
  const [dir, setDir] = useState(1);
  const { ref, body } = usePhysicsBody<HTMLDivElement>({
    kind: 'conveyor',
    isStatic: true,
    material: 'steel',
    bodyOverrides: { plugin: { tumbleConveyor: speed } },
  });

  const reverse = () => {
    const next = -dir;
    setDir(next);
    const b = body();
    if (b) (b.plugin as any).tumbleConveyor = speed * next;
  };

  return (
    <div
      ref={ref}
      className={`tmbl-conveyor ${className ?? ''}`}
      style={{ ...style, ['--belt-dur' as string]: `${Math.max(0.2, 24 / Math.abs(speed)) / 10}s` }}
      data-dir={dir > 0 ? 'right' : 'left'}
      onClick={reverse}
      role="button"
      aria-label="Reverse conveyor belt"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') reverse();
      }}
    >
      <span className="tmbl-conveyor__belt" aria-hidden="true" />
      <span className="tmbl-conveyor__gear" data-end="left" aria-hidden="true" />
      <span className="tmbl-conveyor__gear" data-end="right" aria-hidden="true" />
    </div>
  );
}
