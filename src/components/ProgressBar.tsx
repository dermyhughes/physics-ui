import { useEffect, useRef, useState } from 'react';
import { useFrame, useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { playEffect } from '../physics/sound';

export interface ProgressBarProps {
  label: string;
  /** 0..max */
  value: number;
  max?: number;
  /** Fired once when the bar reaches 100%. */
  onOverflow?: () => void;
}

const BALL = 12; // px, matches .tmbl-progress__ball

/**
 * A progress bar filled with actual ball bearings. Progress pours in from
 * the left; at 100% the trough is full and starts OVERFLOWING — surplus
 * bearings dribble over the right brim onto whatever is below. Tip the
 * component past ~25° (throw it, or leave it dangling off one bolt) and the
 * entire quota spills onto the floor; it refills when you level it again.
 * Progress, like everything else here, must be kept level to be retained.
 */
export function ProgressBar({ label, value, max = 100, onOverflow }: ProgressBarProps) {
  const { spawnLoose, containerRef, onMachineReset } = useWorld();
  const trackRef = useRef<HTMLDivElement>(null);
  const [spilled, setSpilled] = useState(false);
  const lastDrip = useRef(0);
  const dripsLeft = useRef(0);
  const prevFull = useRef(false);

  // "Reset machine" also mops up: spilled quota is restored on the spot.
  useEffect(() => {
    return onMachineReset(() => {
      setSpilled(false);
      dripsLeft.current = 0;
    });
  }, [onMachineReset]);

  const fill = Math.max(0, Math.min(1, value / (max || 1)));
  const full = fill >= 1;

  const { ref, entry } = usePhysicsBody<HTMLDivElement>({
    kind: 'progress',
    material: 'wood',
    mountBreakAt: 100,
    hitboxRef: trackRef,
  });

  const spillBalls = (count: number, vyBase: number) => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;
    const tr = track.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      spawnLoose({
        kind: 'radio-ball', // spilled progress is still a perfectly good ball
        material: 'brass',
        shape: 'circle',
        w: BALL,
        h: BALL,
        x: tr.left - cr.left + Math.random() * tr.width,
        y: tr.top - cr.top + tr.height / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: vyBase - Math.random() * 2,
        className: 'tmbl-radio-ball',
        data: { bornAt: performance.now() },
      });
    }
  };

  const dripOverflow = () => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;
    const tr = track.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    playEffect('pop', 0.4);
    for (let i = 0; i < 2; i++) {
      spawnLoose({
        kind: 'radio-ball',
        material: 'brass',
        shape: 'circle',
        w: BALL,
        h: BALL,
        x: tr.right - cr.left - 4 + Math.random() * 8,
        y: tr.top - cr.top - 4,
        vx: 1.5 + Math.random() * 2,
        vy: -1 - Math.random(),
        className: 'tmbl-radio-ball',
        data: { bornAt: performance.now() },
      });
    }
  };

  // Reaching 100% announces itself — and starts a finite overflow, not a
  // ball fountain.
  useEffect(() => {
    if (full && !prevFull.current) {
      playEffect('pop', 1);
      dripsLeft.current = 5;
      onOverflow?.();
    }
    prevFull.current = full;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  useFrame(() => {
    const e = entry();
    if (!e) return;
    const now = performance.now();
    const tilt = Math.abs(e.body.angle);
    if (!spilled && tilt > 0.45 && fill > 0) {
      setSpilled(true);
      playEffect('whoosh', 1);
      spillBalls(Math.min(14, Math.max(3, Math.round(fill * 14))), 0);
    } else if (spilled && tilt < 0.08) {
      const speed = Math.hypot(e.body.velocity.x, e.body.velocity.y);
      if (speed < 1) {
        setSpilled(false);
        playEffect('ratchet', 0.7);
      }
    }
    if (full && !spilled && dripsLeft.current > 0 && now - lastDrip.current > 1200) {
      lastDrip.current = now;
      dripsLeft.current -= 1;
      dripOverflow();
    }
  });

  const capacity = 22;
  const ballCount = spilled ? 0 : Math.round(fill * capacity);

  return (
    <div
      ref={ref}
      className="tmbl-progress"
      data-full={full || undefined}
      data-spilled={spilled || undefined}
    >
      <div className="tmbl-progress__head">
        <span className="tmbl-field-label">{label}</span>
        <span className="tmbl-progress__value">
          {spilled ? 'SPILLED' : `${Math.round(fill * 100)}%`}
        </span>
      </div>
      <div
        ref={trackRef}
        className="tmbl-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(fill * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: ballCount }, (_, i) => (
          <span key={i} className="tmbl-progress__ball" style={{ animationDelay: `${i * 18}ms` }} />
        ))}
      </div>
      <span className="tmbl-progress__hint">
        {spilled ? 'level the component to recover progress' : full ? 'overflowing' : 'keep level'}
      </span>
    </div>
  );
}
