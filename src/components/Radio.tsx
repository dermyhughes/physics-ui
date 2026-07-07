import Matter from 'matter-js';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useFrame, useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { relativeCenter } from '../physics/geometry';
import { playEffect } from '../physics/sound';

interface RadioGroupCtx {
  name: string;
  value: string | null;
  setValue: (v: string) => void;
}

const GroupCtx = createContext<RadioGroupCtx | null>(null);

export interface RadioGroupProps {
  name: string;
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Radio buttons whose selection indicator is an actual brass ball.
 *
 * Select a different option and the old ball is EJECTED — it drops out of the
 * dial, bounces off whatever is below, and rolls around the machine. Any
 * loose ball that comes to rest in an empty radio dial is caught and SELECTS
 * that option. Yes, you can make a selection by throwing the ball.
 */
export function RadioGroup({ name, value, onChange, label, children, className }: RadioGroupProps) {
  return (
    <GroupCtx.Provider value={{ name, value, setValue: onChange }}>
      <div role="radiogroup" aria-label={label} className={`tmbl-radiogroup ${className ?? ''}`}>
        {label && <span className="tmbl-field-label">{label}</span>}
        {children}
      </div>
    </GroupCtx.Provider>
  );
}

export interface RadioProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}

const BALL = 15; // px, must match .tmbl-radio-ball

export function Radio({ value, children, disabled }: RadioProps) {
  const group = useContext(GroupCtx);
  if (!group) throw new Error('<Radio> must be inside a <RadioGroup>');
  const { spawnLoose, removeLoose, getLoose, containerRef } = useWorld();

  const checked = group.value === value;
  const wellRef = useRef<HTMLSpanElement>(null);
  const prevChecked = useRef(checked);
  const lastCatch = useRef(0);

  const { ref } = usePhysicsBody<HTMLLabelElement>({
    kind: 'radio',
    material: 'wood',
    mountBreakAt: 80,
  });

  const wellCenter = () => {
    const well = wellRef.current;
    const container = containerRef.current;
    if (!well || !container) return null;
    return relativeCenter(well, container);
  };

  // Deselected → the ball physically drops out of the dial.
  useEffect(() => {
    if (prevChecked.current && !checked) {
      const c = wellCenter();
      if (c) {
        playEffect('pop', 0.7);
        spawnLoose({
          kind: 'radio-ball',
          material: 'brass',
          shape: 'circle',
          w: BALL,
          h: BALL,
          x: c.x,
          y: c.y + 4,
          vx: (Math.random() - 0.5) * 3,
          vy: 3.5,
          spin: (Math.random() - 0.5) * 0.4,
          className: 'tmbl-radio-ball',
          data: { bornAt: performance.now() },
        });
      }
    }
    prevChecked.current = checked;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  // An empty dial is gently magnetic: it guides stray balls the last few
  // centimetres home, then catches any slow ball that arrives.
  useFrame(() => {
    if (checked || disabled) return;
    const now = performance.now();
    const c = wellCenter();
    if (!c) return;
    for (const ball of getLoose('radio-ball')) {
      const born = (ball.data?.bornAt as number) ?? 0;
      if (now - born < 700) continue;
      const dx = c.x - ball.body.position.x;
      const dy = c.y - ball.body.position.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 80 * 80 && d2 > 1) {
        const d = Math.sqrt(d2);
        const pull = 0.0006 * ball.body.mass * (1 - d / 80);
        Matter.Sleeping.set(ball.body, false);
        Matter.Body.applyForce(ball.body, ball.body.position, {
          x: (dx / d) * pull,
          y: (dy / d) * pull,
        });
      }
      const speed = Math.hypot(ball.body.velocity.x, ball.body.velocity.y);
      if (d2 < 20 * 20 && speed < 4 && now - lastCatch.current > 400) {
        lastCatch.current = now;
        removeLoose(String(ball.data?.looseId ?? ''));
        playEffect('pop', 1);
        group.setValue(value);
        break;
      }
    }
  });

  return (
    <label ref={ref} className="tmbl-radio" data-checked={checked || undefined}>
      <input
        type="radio"
        className="tmbl-sr-only"
        name={group.name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => group.setValue(value)}
      />
      <span ref={wellRef} className="tmbl-radio__well" aria-hidden="true">
        {checked && <span className="tmbl-radio__ball" />}
      </span>
      <span className="tmbl-radio__label">{children}</span>
    </label>
  );
}
