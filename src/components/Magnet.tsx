import Matter from 'matter-js';
import { useFrame, useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { applyMagnetism } from '../physics/magnetism';
import { playEffect } from '../physics/sound';

export interface MagnetProps {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  /** Attraction radius in px. */
  reach?: number;
}

/**
 * The raw shop electromagnet (machinery tier), dressed as a toggle chip.
 * For the same power inside a normal control, see `<Button magnetic>` —
 * hold it down and it recalls every loose metal part in the shop.
 */
export function Magnet({ on, onChange, label = 'Magno-collect', reach = 260 }: MagnetProps) {
  const { registry } = useWorld();

  const { ref, entry } = usePhysicsBody<HTMLLabelElement>({
    kind: 'magnet',
    material: 'steel',
    weight: 1.3,
    mountBreakAt: 110,
  });

  useFrame(() => {
    if (!on) return;
    const e = entry();
    if (!e) return;
    // Field concentrates at the horseshoe's mouth, just below centre.
    const tip = Matter.Vector.add(
      e.body.position,
      Matter.Vector.rotate({ x: 0, y: e.size.h * 0.42 }, e.body.angle),
    );
    const react = applyMagnetism(registry, e, tip, reach);
    // A dangling magnet leans toward its prey.
    if (e.mounts.length < e.mountCount) {
      Matter.Body.applyForce(e.body, e.body.position, react);
    }
  });

  return (
    <label ref={ref} className="tmbl-magnet" data-on={on || undefined}>
      <input
        type="checkbox"
        role="switch"
        className="tmbl-sr-only"
        checked={on}
        onChange={(ev) => {
          playEffect(ev.target.checked ? 'ratchet' : 'whoosh', 0.8);
          onChange(ev.target.checked);
        }}
      />
      <span className="tmbl-magnet__horseshoe" aria-hidden="true">
        <span className="tmbl-magnet__pole" data-pole="n" />
        <span className="tmbl-magnet__pole" data-pole="s" />
      </span>
      <span className="tmbl-magnet__label">
        {label}
        <em className="tmbl-magnet__state">{on ? 'FIELD ON' : 'field off'}</em>
      </span>
    </label>
  );
}
