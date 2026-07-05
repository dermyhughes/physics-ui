import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { playEffect } from '../physics/sound';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * A steel industrial pushbutton.
 *
 * Clicking it fires a shockwave that knocks nearby parts around — pressing a
 * button in TUMBLE is a mechanical event, not a state change. It can also be
 * pressed *physically*: drop something heavy on it (a radio ball, a torn-off
 * card) and it clicks for real, firing onClick.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  className,
  ...rest
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [mounts, setMounts] = useState(2);
  const lastPress = useRef(0);

  const { ref, impulse, shockwave } = usePhysicsBody<HTMLButtonElement>({
    kind: 'button',
    material: 'steel',
    weight: 1.4,
    onMountsChange: setMounts,
    onImpact: (info) => {
      // Physical press: something loose slammed into us hard enough.
      if (info.speed > 6.5 && info.other && !info.other.body.isStatic) {
        firePress(true);
      }
    },
  });

  const firePress = (physical: boolean) => {
    const now = performance.now();
    if (now - lastPress.current < 250) return;
    lastPress.current = now;
    setPressed(true);
    setTimeout(() => setPressed(false), 140);
    playEffect('pop', 1);
    // The clunk: button dips, neighbours get shoved.
    impulse(0, 1.2);
    shockwave(150, 3.2);
    if (ref.current) {
      const ev = physical
        ? new MouseEvent('click', { bubbles: false })
        : null;
      if (physical && onClick) onClick(ev as unknown as React.MouseEvent<HTMLButtonElement>);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`tmbl-button ${className ?? ''}`}
      data-variant={variant}
      data-size={size}
      data-pressed={pressed || undefined}
      data-mounts={mounts}
      onClick={(e) => {
        firePress(false);
        onClick?.(e);
      }}
      {...rest}
    >
      <span className="tmbl-button__cap">{children}</span>
    </button>
  );
}
