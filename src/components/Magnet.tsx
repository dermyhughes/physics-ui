import Matter from 'matter-js';
import { useFrame, useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { playEffect } from '../physics/sound';

export interface MagnetProps {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  /** Attraction radius in px. */
  reach?: number;
}

const FERROUS = new Set(['steel', 'brass']);
const IGNORED_KINDS = new Set(['claw', 'modal', 'score']);

/**
 * An electromagnet dressed as a humble toggle chip — bulk-select, made
 * physical. Switch it on and every loose ferrous part in reach (brass balls,
 * steel nuts, torn-off steel buttons; the shop magnet does not care about
 * metallurgy) is dragged in and clings to it. Tear the magnet off its mounts
 * and carry it around like a wand: the collection follows. Dump your haul
 * over an empty radio dial to make a selection.
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
    let reactX = 0;
    let reactY = 0;
    registry.forEach((t) => {
      if (t === e || t.body.isStatic) return;
      if (!FERROUS.has(t.material) || IGNORED_KINDS.has(t.kind)) return;
      // Loose parts and fully torn-off parts only — bolted UI stays put.
      const eligible = t.mode === 'free' || t.mounts.length === 0;
      if (!eligible) return;
      const dx = tip.x - t.body.position.x;
      const dy = tip.y - t.body.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach || dist === 0) return;
      Matter.Sleeping.set(t.body, false);
      if (dist < 30) {
        // Clinging: ride the magnet.
        Matter.Body.setVelocity(t.body, {
          x: t.body.velocity.x + (e.body.velocity.x - t.body.velocity.x) * 0.5 + dx * 0.06,
          y: t.body.velocity.y + (e.body.velocity.y - t.body.velocity.y) * 0.5 + dy * 0.06,
        });
      } else {
        const pull = 0.0018 * t.body.mass * (1 - dist / reach) ** 2;
        const fx = (dx / dist) * pull;
        const fy = (dy / dist) * pull;
        Matter.Body.applyForce(t.body, t.body.position, { x: fx, y: fy });
        reactX -= fx * 0.5;
        reactY -= fy * 0.5;
      }
    });
    // Newton's third law, scaled for comedy: a dangling magnet leans toward
    // its prey.
    if (e.mounts.length < e.mountCount) {
      Matter.Body.applyForce(e.body, e.body.position, { x: reactX, y: reactY });
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
