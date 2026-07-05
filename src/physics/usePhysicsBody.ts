import Matter from 'matter-js';
import { useEffect, useRef } from 'react';
import {
  usePhysicsExempt,
  useVehicleHandle,
  useWorld,
  type BodyEntry,
  type FlowBodyOptions,
} from './PhysicsWorld';

/**
 * Turn a DOM element into a mounted rigid body.
 *
 * The element keeps its place in normal document flow (so the design system
 * lays out like any other); physics is applied as a transform delta from its
 * layout home. Returns a ref to attach plus an api for applying impulses.
 */
export function usePhysicsBody<T extends HTMLElement>(
  opts: FlowBodyOptions & { hitboxRef?: React.RefObject<HTMLElement | null> },
) {
  const ref = useRef<T>(null);
  const { registerFlow, registry, engine } = useWorld();
  const exempt = usePhysicsExempt();
  const vehicle = useVehicleHandle();
  const entryRef = useRef<BodyEntry | null>(null);

  // Keep latest callbacks without re-registering the body.
  const impactRef = useRef(opts.onImpact);
  impactRef.current = opts.onImpact;
  const mountsRef = useRef(opts.onMountsChange);
  mountsRef.current = opts.onMountsChange;

  useEffect(() => {
    const el = ref.current;
    if (!el || exempt) return;
    let cleanup: (() => void) | null = null;
    let disposed = false;

    const attach = () => {
      if (disposed || !el.isConnected) return;
      cleanup = registerFlow(el, {
        ...opts,
        parent: vehicle?.entryRef.current ?? null,
        hitbox: opts.hitboxRef?.current ?? null,
        onImpact: (info) => impactRef.current?.(info),
        onMountsChange: (n) => mountsRef.current?.(n),
      });
      // Find our entry (registerFlow keyed it by body id; look it up via el).
      for (const e of registry.values()) {
        if (e.el === el) {
          entryRef.current = e;
          break;
        }
      }
    };

    // Riding a vehicle whose body doesn't exist yet (child effects run before
    // the parent's): wait for the vehicle to publish its entry.
    if (vehicle && !vehicle.entryRef.current) {
      const onReady = () => {
        vehicle.listeners.delete(onReady);
        attach();
      };
      vehicle.listeners.add(onReady);
      return () => {
        disposed = true;
        vehicle.listeners.delete(onReady);
        entryRef.current = null;
        cleanup?.();
      };
    }

    attach();
    return () => {
      disposed = true;
      entryRef.current = null;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api = useRef({
    entry: () => entryRef.current,
    body: () => entryRef.current?.body ?? null,
    /** Give the part a kick (world-space velocity change). */
    impulse(vx: number, vy: number, spin = 0) {
      const b = entryRef.current?.body;
      if (!b || b.isStatic) return;
      Matter.Sleeping.set(b, false);
      Matter.Body.setVelocity(b, { x: b.velocity.x + vx, y: b.velocity.y + vy });
      Matter.Body.setAngularVelocity(b, b.angularVelocity + spin);
    },
    /** Push every dynamic body within radius px away from this part. */
    shockwave(radius: number, power: number) {
      const entry = entryRef.current;
      if (!entry) return;
      const origin = entry.body.position;
      registry.forEach((other) => {
        if (other.body === entry.body || other.body.isStatic) return;
        const d = Matter.Vector.sub(other.body.position, origin);
        const dist = Matter.Vector.magnitude(d);
        if (dist > radius || dist === 0) return;
        const fall = 1 - dist / radius;
        const dir = Matter.Vector.normalise(d);
        Matter.Sleeping.set(other.body, false);
        Matter.Body.setVelocity(other.body, {
          x: other.body.velocity.x + dir.x * power * fall,
          y: other.body.velocity.y + dir.y * power * fall - power * fall * 0.35,
        });
      });
    },
    /** Shear off this part's mounts so it falls free. */
    breakLoose() {
      const entry = entryRef.current;
      if (!entry) return;
      entry.mounts.forEach((m) => Matter.Composite.remove(engine.world, m));
      entry.mounts = [];
      Matter.Sleeping.set(entry.body, false);
      entry.el.dataset.mounts = '0';
      entry.onMountsChange?.(0);
    },
  });

  return { ref, ...api.current };
}
