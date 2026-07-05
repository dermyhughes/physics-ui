import { type ReactNode } from 'react';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { playEffect } from '../physics/sound';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
  disabled?: boolean;
}

/**
 * An industrial lever switch. Flipping it is a violent mechanical event:
 * the whole switch recoils and anything nearby gets shoved by the CLUNK.
 */
export function Toggle({ checked, onChange, children, disabled }: ToggleProps) {
  const { ref, impulse, shockwave } = usePhysicsBody<HTMLLabelElement>({
    kind: 'toggle',
    material: 'steel',
    weight: 1.2,
    mountBreakAt: 100,
  });

  const flip = (next: boolean) => {
    playEffect('ratchet', 1);
    // Recoil in the direction the knob slams.
    impulse(next ? 2.4 : -2.4, -1.2, next ? 0.06 : -0.06);
    shockwave(110, 2.2);
    onChange(next);
  };

  return (
    <label ref={ref} className="tmbl-toggle" data-checked={checked || undefined}>
      <input
        type="checkbox"
        role="switch"
        className="tmbl-sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => flip(e.target.checked)}
      />
      <span className="tmbl-toggle__track" aria-hidden="true">
        <span className="tmbl-toggle__knob" />
      </span>
      {children && <span className="tmbl-toggle__label">{children}</span>}
    </label>
  );
}
