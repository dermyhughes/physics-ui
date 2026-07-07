import { useRef, type ReactNode } from 'react';
import { useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { relativeRect } from '../physics/geometry';
import { playEffect } from '../physics/sound';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * A checkbox whose tick is a physical part.
 *
 * Checking stamps the tick in with a clunk. Unchecking POPS it out — the
 * little tick tile goes flying and clatters around the machine. Dropping
 * something heavy on the checkbox toggles it (industrial-grade input).
 */
export function Checkbox({ checked, onChange, children, disabled }: CheckboxProps) {
  const { spawnLoose, containerRef } = useWorld();
  const boxRef = useRef<HTMLSpanElement>(null);
  const lastToggle = useRef(0);

  const { ref, impulse } = usePhysicsBody<HTMLLabelElement>({
    kind: 'checkbox',
    material: 'wood',
    mountBreakAt: 80,
    onImpact: (info) => {
      // Heavy object lands on it → toggles. (Rate-limited so it doesn't buzz.)
      if (disabled) return;
      const now = performance.now();
      if (info.speed > 7 && info.other && !info.other.body.isStatic && now - lastToggle.current > 500) {
        lastToggle.current = now;
        toggle(!checked);
      }
    },
  });

  const toggle = (next: boolean) => {
    if (!next && boxRef.current && containerRef.current) {
      // Ejected tick becomes debris.
      const r = relativeRect(boxRef.current, containerRef.current);
      spawnLoose({
        kind: 'tick',
        material: 'wood',
        shape: 'rect',
        w: 18,
        h: 18,
        x: r.x + r.w / 2,
        y: r.y + r.h / 2 - 6,
        vx: (Math.random() - 0.5) * 5,
        vy: -7,
        spin: (Math.random() - 0.5) * 0.6,
        ttl: 6000,
        debris: true,
        className: 'tmbl-tick-debris',
        text: '✓',
      });
      playEffect('pop', 0.8);
    } else {
      playEffect('ratchet', 0.7);
      impulse(0, 0.8); // stamp clunk
    }
    onChange(next);
  };

  return (
    <label ref={ref} className="tmbl-checkbox" data-checked={checked || undefined}>
      <input
        type="checkbox"
        className="tmbl-sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => toggle(e.target.checked)}
      />
      <span ref={boxRef} className="tmbl-checkbox__box" aria-hidden="true">
        <span className="tmbl-checkbox__tick">✓</span>
      </span>
      <span className="tmbl-checkbox__label">{children}</span>
    </label>
  );
}
