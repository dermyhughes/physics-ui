import Matter from 'matter-js';
import type { BodyEntry, Vec } from './PhysicsWorld';

const FERROUS = new Set(['steel', 'brass']);
const IGNORED_KINDS = new Set(['modal', 'toast', 'select-panel']);

/**
 * One tick of electromagnetism: pull every loose ferrous part within reach
 * toward `tip`; parts inside the cling zone ride the source. Returns the
 * reaction force (Newton's third law, scaled for comedy) so an unmounted
 * source can lean toward its prey.
 */
export function applyMagnetism(
  registry: Map<number, BodyEntry>,
  source: BodyEntry,
  tip: Vec,
  reach: number,
): Vec {
  let reactX = 0;
  let reactY = 0;
  registry.forEach((t) => {
    if (t === source || t.body.isStatic) return;
    if (!FERROUS.has(t.material) || IGNORED_KINDS.has(t.kind)) return;
    // Loose parts and fully torn-off parts only — bolted UI stays put.
    if (t.mode !== 'free' && t.mounts.length > 0) return;
    const dx = tip.x - t.body.position.x;
    const dy = tip.y - t.body.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist > reach || dist === 0) return;
    Matter.Sleeping.set(t.body, false);
    if (dist < 30) {
      Matter.Body.setVelocity(t.body, {
        x: t.body.velocity.x + (source.body.velocity.x - t.body.velocity.x) * 0.5 + dx * 0.06,
        y: t.body.velocity.y + (source.body.velocity.y - t.body.velocity.y) * 0.5 + dy * 0.06,
      });
    } else {
      // Linear falloff: even at the edge of reach the pull beats rolling
      // friction, so distant parts actually start moving.
      const pull = 0.004 * t.body.mass * (1 - dist / reach);
      const fx = (dx / dist) * pull;
      const fy = (dy / dist) * pull;
      Matter.Body.applyForce(t.body, t.body.position, { x: fx, y: fy });
      reactX -= fx * 0.5;
      reactY -= fy * 0.5;
    }
  });
  return { x: reactX, y: reactY };
}
