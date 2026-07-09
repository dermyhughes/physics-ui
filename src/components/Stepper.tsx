import Matter from 'matter-js';
import { useRef, useState } from 'react';
import { useFrame, useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import type { MaterialName } from '../physics/materials';
import { playEffect } from '../physics/sound';

export interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Fired when the gauge is pushed past max (or hit too hard) and bursts. */
  onBurst?: () => void;
  /** What the gauge is stamped from — sets weight, bounce and impact voice. */
  material?: MaterialName;
}

/**
 * A number input under real pressure. The value bubble physically inflates
 * with every increment and the whole gauge grows buoyant — crank it high and
 * it strains upward against its mounting bolts (rip it off and it floats away
 * like a balloon). Push past `max` and it BURSTS: rubber scraps everywhere,
 * a bang that shoves the neighbours, and the value slams back to `min`.
 *
 * Deflating is politely uneventful, like letting air out of anything.
 */
export function Stepper({ label, value, onChange, min = 0, max = 10, step = 1, unit, onBurst, material = 'rubber' }: StepperProps) {
  const [burst, setBurst] = useState(false);
  const { spawnLoose, engine } = useWorld();
  const burstTimer = useRef<ReturnType<typeof setTimeout>>();
  const rowRef = useRef<HTMLDivElement>(null);

  const fill = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const fillRef = useRef(fill);
  fillRef.current = fill;
  const burstRef = useRef(burst);
  burstRef.current = burst;

  const { ref, entry, impulse, shockwave } = usePhysicsBody<HTMLDivElement>({
    kind: 'stepper',
    material,
    mountBreakAt: 120,
    hitboxRef: rowRef,
    onImpact: (info) => {
      // An over-inflated balloon does not appreciate being hit.
      if (fillRef.current > 0.7 && info.speed > 9) pop();
    },
  });

  const pop = () => {
    if (burstRef.current) return;
    burstRef.current = true;
    setBurst(true);
    playEffect('bang', 1);
    const e = entry();
    if (e) {
      for (let i = 0; i < 9; i++) {
        const s = 8 + Math.random() * 12;
        spawnLoose({
          kind: 'scrap',
          material: 'rubber',
          shape: 'rect',
          w: s,
          h: s * 0.7,
          x: e.body.position.x + (Math.random() - 0.5) * e.size.w * 0.5,
          y: e.body.position.y + (Math.random() - 0.5) * e.size.h * 0.5,
          vx: (Math.random() - 0.5) * 12,
          vy: -Math.random() * 9,
          spin: (Math.random() - 0.5) * 1.2,
          ttl: 4000,
          debris: true,
          className: 'tmbl-scrap',
        });
      }
    }
    shockwave(140, 4.5);
    impulse(0, 2.5, (Math.random() - 0.5) * 0.2);
    onChange(min);
    onBurst?.();
    clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setBurst(false), 1600);
  };

  const inc = () => {
    if (burst) return;
    const next = value + step;
    if (next > max) {
      pop();
    } else {
      onChange(next);
      playEffect('pop', 0.25 + fill * 0.6);
      impulse(0, -1.4);
    }
  };

  const dec = () => {
    if (burst) return;
    if (value - step >= min) {
      onChange(value - step);
      playEffect('whoosh', 0.35);
      impulse(0, 1);
    }
  };

  // Buoyancy: the fuller the balloon, the harder it tugs upward. Bolted
  // gauges strain against their mounts; torn-off ones genuinely float.
  useFrame(() => {
    const e = entry();
    if (!e || burstRef.current || fillRef.current === 0) return;
    const g = engine.gravity;
    const bolted = e.mounts.length === e.mountCount;
    const lift = fillRef.current * (bolted ? 0.9 : 1.6);
    if (e.body.isSleeping && !bolted) Matter.Sleeping.set(e.body, false);
    e.body.force.y -= e.body.mass * g.y * g.scale * lift;
  });

  return (
    <div ref={ref} className="tmbl-stepper" data-burst={burst || undefined} data-material={material}>
      <span className="tmbl-field-label">{label}</span>
      <div ref={rowRef} className="tmbl-stepper__row">
        <button
          type="button"
          className="tmbl-stepper__btn"
          onClick={dec}
          disabled={burst || value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span
          className="tmbl-stepper__balloon"
          role="spinbutton"
          tabIndex={0}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') inc();
            if (e.key === 'ArrowDown') dec();
          }}
          style={{
            transform: `scale(${0.85 + fill * 0.75})`,
            background: `radial-gradient(circle at 34% 30%, hsl(${46 - fill * 42} ${62 + fill * 26}% ${68 - fill * 12}%), hsl(${40 - fill * 40} ${58 + fill * 28}% ${52 - fill * 12}%))`,
          }}
        >
          {burst ? '✷' : value}
          {!burst && unit && <em className="tmbl-stepper__unit">{unit}</em>}
        </span>
        <button
          type="button"
          className="tmbl-stepper__btn"
          onClick={inc}
          disabled={burst}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
      <span className="tmbl-stepper__gauge" aria-hidden="true">
        {burst ? 'BURST — refitting diaphragm' : `${Math.round(fill * 100)}% of rated pressure`}
      </span>
    </div>
  );
}
