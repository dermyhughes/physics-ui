/**
 * PhysicsWorld — the machine room every TUMBLE component lives inside.
 *
 * Components render as normal DOM (real inputs, real buttons, normal CSS
 * layout). Each one registers a Matter.js rigid body "bolted" to its layout
 * position by two breakable spring mounts. The world loop runs the engine,
 * writes body transforms back onto the DOM, shears mounts that stretch too
 * far, routes collision events, and lets the user grab and throw anything.
 */

import Matter from 'matter-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { CATEGORY, MATERIALS, type MaterialName } from './materials';
import { playEffect, playImpact, primeAudio, setMuted } from './sound';

export interface Vec {
  x: number;
  y: number;
}

export interface ImpactInfo {
  /** Relative impact speed in px/tick (≈ how hard). >8 is a serious hit. */
  speed: number;
  /** The other participant, if it's a registered TUMBLE part. */
  other: BodyEntry | null;
  /** This entry (convenience for shared handlers). */
  self: BodyEntry;
}

export interface BodyEntry {
  id: number;
  body: Matter.Body;
  el: HTMLElement;
  /** Semantic kind, used for cross-component behaviours ('radio-ball', 'button'…). */
  kind: string;
  mode: 'flow' | 'free';
  material: MaterialName;
  home: Vec;
  size: { w: number; h: number };
  /** Spring mounts bolting a flow part to its home. Empty = torn free. */
  mounts: Matter.Constraint[];
  mountCount: number;
  mountStiffness: number;
  mountBreakAt: number;
  onImpact?: (info: ImpactInfo) => void;
  onMountsChange?: (remaining: number) => void;
  /** Arbitrary component payload (e.g. which radio value a loose ball holds). */
  data?: Record<string, unknown>;
}

export interface FlowBodyOptions {
  kind: string;
  material?: MaterialName;
  shape?: 'rect' | 'circle';
  /** true = immovable machinery (conveyors, bumpers, frames). */
  isStatic?: boolean;
  /** Number of mounts (0 = starts loose, 1 = swings like a sign, 2 = bolted). */
  mounts?: number;
  mountStiffness?: number;
  /** px of spring stretch before a mount shears off. */
  mountBreakAt?: number;
  /** Multiplies material density. */
  weight?: number;
  onImpact?: (info: ImpactInfo) => void;
  onMountsChange?: (remaining: number) => void;
  data?: Record<string, unknown>;
  /** Extra Matter body options (restitution overrides etc.) */
  bodyOverrides?: Matter.IBodyDefinition;
}

export interface LooseSpec {
  id: string;
  kind: string;
  material: MaterialName;
  shape: 'rect' | 'circle';
  w: number;
  h: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  spin?: number;
  /** ms until it fades out and is removed. */
  ttl?: number;
  className?: string;
  text?: string;
  /** DEBRIS parts don't collide with mounted components. */
  debris?: boolean;
  data?: Record<string, unknown>;
  onImpact?: (info: ImpactInfo) => void;
}

interface WorldCtx {
  engine: Matter.Engine;
  registry: Map<number, BodyEntry>;
  containerRef: React.RefObject<HTMLDivElement>;
  registerFlow: (el: HTMLElement, opts: FlowBodyOptions) => () => void;
  spawnLoose: (spec: Omit<LooseSpec, 'id'> & { id?: string }) => string;
  removeLoose: (id: string, opts?: { pop?: boolean }) => void;
  looseSpecs: LooseSpec[];
  registerLooseEl: (spec: LooseSpec, el: HTMLElement) => () => void;
  onFrame: (cb: () => void) => () => void;
  getLoose: (kind: string) => BodyEntry[];
  resetMachine: () => void;
  setGravity: (scale: number) => void;
  gravity: number;
  setSound: (on: boolean) => void;
  soundOn: boolean;
  /** px size of the world container. */
  getBounds: () => { w: number; h: number };
}

const Ctx = createContext<WorldCtx | null>(null);

/**
 * Marks a subtree as riding inside another body (e.g. modal contents).
 * usePhysicsBody becomes inert there: the parts render normally and move
 * with their vehicle instead of registering their own bodies.
 */
const ExemptCtx = createContext(false);

export function PhysicsExempt({ children }: { children: ReactNode }) {
  return <ExemptCtx.Provider value={true}>{children}</ExemptCtx.Provider>;
}

export function usePhysicsExempt(): boolean {
  return useContext(ExemptCtx);
}

export function useWorld(): WorldCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('TUMBLE components must be rendered inside <PhysicsWorld>');
  return ctx;
}

/** Run a callback every physics frame (after the engine step). */
export function useFrame(cb: () => void) {
  const { onFrame } = useWorld();
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => onFrame(() => ref.current()), [onFrame]);
}

let looseCounter = 0;

const WALL_THICK = 240;

export function PhysicsWorld({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [looseSpecs, setLooseSpecs] = useState<LooseSpec[]>([]);
  const [gravity, setGravityState] = useState(1);
  const [soundOn, setSoundOn] = useState(true);

  const stable = useRef<{
    engine: Matter.Engine;
    registry: Map<number, BodyEntry>;
    frameSubs: Set<() => void>;
    walls: Matter.Body[];
  }>();
  if (!stable.current) {
    const engine = Matter.Engine.create({ enableSleeping: true });
    engine.gravity.y = 1;
    stable.current = { engine, registry: new Map(), frameSubs: new Set(), walls: [] };
  }
  const { engine, registry, frameSubs } = stable.current;

  // ---------------------------------------------------------------- walls
  useEffect(() => {
    const container = containerRef.current!;
    const rebuildWalls = () => {
      const { walls } = stable.current!;
      if (walls.length) Matter.Composite.remove(engine.world, walls);
      const w = container.clientWidth;
      const h = container.clientHeight;
      const opts: Matter.IBodyDefinition = {
        isStatic: true,
        friction: 0.4,
        restitution: 0.2,
        collisionFilter: { category: CATEGORY.WORLD },
        label: 'wall',
      };
      const next = [
        Matter.Bodies.rectangle(w / 2, h + WALL_THICK / 2, w + WALL_THICK * 4, WALL_THICK, {
          ...opts,
          label: 'floor',
        }),
        Matter.Bodies.rectangle(-WALL_THICK / 2, h / 2 - 1200, WALL_THICK, h + 3200, opts),
        Matter.Bodies.rectangle(w + WALL_THICK / 2, h / 2 - 1200, WALL_THICK, h + 3200, opts),
        Matter.Bodies.rectangle(w / 2, -2600 - WALL_THICK / 2, w + WALL_THICK * 4, WALL_THICK, opts),
      ];
      stable.current!.walls = next;
      Matter.Composite.add(engine.world, next);
    };
    rebuildWalls();

    // On viewport resize: rebuild walls and re-seat mounted parts at their
    // (possibly moved) layout homes.
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        rebuildWalls();
        const crect = container.getBoundingClientRect();
        registry.forEach((entry) => {
          if (entry.mode !== 'flow') return;
          const prev = entry.el.style.transform;
          entry.el.style.transform = 'none';
          const r = entry.el.getBoundingClientRect();
          entry.el.style.transform = prev;
          const home = { x: r.left - crect.left + r.width / 2, y: r.top - crect.top + r.height / 2 };
          entry.home = home;
          entry.mounts.forEach((m, i) => {
            const off = (m as any).plugin.homeOffset as Vec;
            m.pointA = { x: home.x + off.x, y: home.y + off.y };
          });
          if (entry.mounts.length === entry.mountCount && entry.mountCount > 0) {
            Matter.Body.setPosition(entry.body, home);
            Matter.Body.setAngle(entry.body, 0);
            Matter.Body.setVelocity(entry.body, { x: 0, y: 0 });
          }
        });
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [engine, registry]);

  // ---------------------------------------------------------------- loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const STEP = 1000 / 60;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      acc += Math.min(50, now - last);
      last = now;
      while (acc >= STEP) {
        Matter.Engine.update(engine, STEP);
        acc -= STEP;
      }

      // Sync DOM ← bodies, shear over-stretched mounts.
      registry.forEach((entry) => {
        const { body, el } = entry;
        if (body.isStatic && entry.mode === 'flow') return;

        // Mount shearing
        for (let i = entry.mounts.length - 1; i >= 0; i--) {
          const m = entry.mounts[i];
          const attach = Matter.Vector.add(
            body.position,
            Matter.Vector.rotate(m.pointB as Vec, body.angle),
          );
          const stretch = Matter.Vector.magnitude(Matter.Vector.sub(attach, m.pointA as Vec));
          const breakAt = (m as any).plugin.breakAt as number;
          if (stretch > breakAt) {
            Matter.Composite.remove(engine.world, m);
            entry.mounts.splice(i, 1);
            el.dataset.mounts = String(entry.mounts.length);
            entry.onMountsChange?.(entry.mounts.length);
            playEffect('pop', 0.9);
          }
        }

        // Write transform. Keep resting parts transform-free so text stays crisp.
        if (entry.mode === 'flow') {
          const dx = body.position.x - entry.home.x;
          const dy = body.position.y - entry.home.y;
          if (Math.abs(dx) < 0.08 && Math.abs(dy) < 0.08 && Math.abs(body.angle) < 0.002) {
            if (el.style.transform !== '') el.style.transform = '';
          } else {
            el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${body.angle.toFixed(4)}rad)`;
          }
        } else {
          el.style.transform = `translate(${(body.position.x - entry.size.w / 2).toFixed(2)}px, ${(
            body.position.y - entry.size.h / 2
          ).toFixed(2)}px) rotate(${body.angle.toFixed(4)}rad)`;
        }
      });

      frameSubs.forEach((cb) => cb());
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, registry, frameSubs]);

  // ------------------------------------------------- gravity compensation
  // Fully-mounted parts are "bolted down": we cancel gravity on them so the
  // layout doesn't sag. Lose a mount and gravity gets its hands on you.
  useEffect(() => {
    const before = () => {
      const g = engine.gravity;
      registry.forEach((entry) => {
        const b = entry.body;
        if (b.isStatic || entry.mode !== 'flow') return;
        if (entry.mountCount > 0 && entry.mounts.length === entry.mountCount) {
          b.force.y -= b.mass * g.y * g.scale;
          b.force.x -= b.mass * g.x * g.scale;
        }
      });

      // Conveyor belts drag whatever rests on them.
      const pairs = engine.pairs.list as Matter.Pair[];
      for (const pair of pairs) {
        if (!pair.isActive) continue;
        for (const [belt, rider] of [
          [pair.bodyA, pair.bodyB],
          [pair.bodyB, pair.bodyA],
        ] as const) {
          const speed = (belt.plugin as any)?.tumbleConveyor;
          if (typeof speed === 'number' && !rider.isStatic) {
            Matter.Sleeping.set(rider, false);
            Matter.Body.setVelocity(rider, {
              x: rider.velocity.x + (speed - rider.velocity.x) * 0.12,
              y: rider.velocity.y,
            });
          }
        }
      }
    };
    Matter.Events.on(engine, 'beforeUpdate', before);
    return () => Matter.Events.off(engine, 'beforeUpdate', before);
  }, [engine, registry]);

  // ------------------------------------------------------------ collisions
  useEffect(() => {
    const onCollide = (e: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of e.pairs) {
        const { bodyA, bodyB } = pair;
        const rel = Matter.Vector.sub(bodyA.velocity, bodyB.velocity);
        const speed = Matter.Vector.magnitude(rel);
        const a = registry.get(bodyA.id) ?? null;
        const b = registry.get(bodyB.id) ?? null;

        // Bumpers kick.
        for (const [bumper, other] of [
          [bodyA, bodyB],
          [bodyB, bodyA],
        ] as const) {
          const kick = (bumper.plugin as any)?.tumbleBumper;
          if (typeof kick === 'number' && !other.isStatic) {
            const dir = Matter.Vector.normalise(
              Matter.Vector.sub(other.position, bumper.position),
            );
            Matter.Body.setVelocity(other, {
              x: dir.x * kick + other.velocity.x * 0.25,
              y: dir.y * kick + other.velocity.y * 0.25,
            });
          }
        }

        if (a?.onImpact) a.onImpact({ speed, other: b, self: a });
        if (b?.onImpact) b.onImpact({ speed, other: a, self: b });

        // One sound per pair, voiced by the faster participant.
        const loud =
          Matter.Vector.magnitude(bodyA.velocity) > Matter.Vector.magnitude(bodyB.velocity)
            ? a ?? b
            : b ?? a;
        if (loud) {
          playImpact(
            MATERIALS[loud.material].voice,
            speed,
            loud.size.w * loud.size.h,
            `${Math.min(bodyA.id, bodyB.id)}-${Math.max(bodyA.id, bodyB.id)}`,
          );
        }
      }
    };
    Matter.Events.on(engine, 'collisionStart', onCollide);
    return () => Matter.Events.off(engine, 'collisionStart', onCollide);
  }, [engine, registry]);

  // ------------------------------------------------------------- dragging
  useEffect(() => {
    const container = containerRef.current!;
    let dragging: {
      entry: BodyEntry;
      constraint: Matter.Constraint;
      startX: number;
      startY: number;
      moved: boolean;
    } | null = null;

    const toLocal = (e: PointerEvent): Vec => {
      const r = container.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      primeAudio();
      const p = toLocal(e);
      const bodies = [...registry.values()]
        .filter((en) => !en.body.isStatic)
        .map((en) => en.body);
      const hits = Matter.Query.point(bodies, p);
      if (!hits.length) return;
      const body = hits[hits.length - 1];
      const entry = registry.get(body.id)!;
      const local = Matter.Vector.rotate(Matter.Vector.sub(p, body.position), -body.angle);
      const constraint = Matter.Constraint.create({
        pointA: p,
        bodyB: body,
        pointB: local,
        stiffness: 0.25,
        damping: 0.08,
        length: 0,
        render: { visible: false },
      });
      Matter.Composite.add(engine.world, constraint);
      Matter.Sleeping.set(body, false);
      dragging = { entry, constraint, startX: e.clientX, startY: e.clientY, moved: false };
      entry.el.dataset.dragging = 'true';
      // NB: no pointer capture — capturing retargets the compatibility click
      // event to the container, which would break every native control.
      document.documentElement.classList.add('tmbl-dragging');
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const p = toLocal(e);
      dragging.constraint.pointA = p;
      Matter.Sleeping.set(dragging.entry.body, false);
      if (
        !dragging.moved &&
        Math.hypot(e.clientX - dragging.startX, e.clientY - dragging.startY) > 7
      ) {
        dragging.moved = true;
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      Matter.Composite.remove(engine.world, dragging.constraint);
      delete dragging.entry.el.dataset.dragging;
      document.documentElement.classList.remove('tmbl-dragging');
      if (dragging.moved) {
        // A real drag happened: swallow the click that follows so throwing a
        // button doesn't also press it. The click (if any) dispatches in this
        // same event cycle, so disarm right after — otherwise a throw that
        // produces no click would eat the user's next real click.
        const swallow = (ce: MouseEvent) => {
          ce.stopPropagation();
          ce.preventDefault();
        };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
      }
      dragging = null;
    };

    container.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      container.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [engine, registry]);

  // ---------------------------------------------------------------- api
  const ctx = useMemo<WorldCtx>(() => {
    const registerFlow = (el: HTMLElement, opts: FlowBodyOptions) => {
      const container = containerRef.current!;
      const crect = container.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const home = { x: r.left - crect.left + r.width / 2, y: r.top - crect.top + r.height / 2 };
      const mat = MATERIALS[opts.material ?? 'wood'];
      const common: Matter.IBodyDefinition = {
        density: mat.density * (opts.weight ?? 1),
        restitution: mat.restitution,
        friction: mat.friction,
        frictionAir: mat.frictionAir,
        isStatic: opts.isStatic ?? false,
        collisionFilter: {
          category: opts.isStatic ? CATEGORY.WORLD : CATEGORY.PART,
          mask: CATEGORY.PART | CATEGORY.LOOSE | CATEGORY.WORLD | CATEGORY.DEBRIS,
        },
        label: opts.kind,
        ...opts.bodyOverrides,
      };
      const body =
        opts.shape === 'circle'
          ? Matter.Bodies.circle(home.x, home.y, Math.max(r.width, r.height) / 2, common)
          : Matter.Bodies.rectangle(home.x, home.y, r.width, r.height, {
              chamfer: { radius: Math.min(10, r.height / 4) },
              ...common,
            });

      const mountCount = opts.isStatic ? 0 : (opts.mounts ?? 2);
      const stiffness = opts.mountStiffness ?? 0.06;
      const breakAt = opts.mountBreakAt ?? 90;
      const mounts: Matter.Constraint[] = [];
      const offsets: Vec[] =
        mountCount === 1
          ? [{ x: 0, y: -r.height * 0.3 }]
          : [
              { x: -r.width * 0.38, y: -r.height * 0.25 },
              { x: r.width * 0.38, y: -r.height * 0.25 },
            ];
      for (let i = 0; i < mountCount; i++) {
        const off = offsets[i];
        const c = Matter.Constraint.create({
          pointA: { x: home.x + off.x, y: home.y + off.y },
          bodyB: body,
          pointB: { ...off },
          stiffness,
          damping: 0.1,
          length: 0,
        });
        (c as any).plugin = { homeOffset: off, breakAt, stiffness };
        mounts.push(c);
      }

      const entry: BodyEntry = {
        id: body.id,
        body,
        el,
        kind: opts.kind,
        mode: 'flow',
        material: opts.material ?? 'wood',
        home,
        size: { w: r.width, h: r.height },
        mounts,
        mountCount,
        mountStiffness: stiffness,
        mountBreakAt: breakAt,
        onImpact: opts.onImpact,
        onMountsChange: opts.onMountsChange,
        data: opts.data,
      };
      registry.set(body.id, entry);
      Matter.Composite.add(engine.world, [body, ...mounts]);
      el.dataset.tmblBody = '';
      el.dataset.mounts = String(mountCount);

      return () => {
        registry.delete(body.id);
        Matter.Composite.remove(engine.world, body);
        entry.mounts.forEach((m) => Matter.Composite.remove(engine.world, m));
      };
    };

    const spawnLoose: WorldCtx['spawnLoose'] = (spec) => {
      const id = spec.id ?? `loose-${++looseCounter}`;
      setLooseSpecs((prev) => [...prev, { ...spec, id }]);
      return id;
    };

    const removeLoose: WorldCtx['removeLoose'] = (id, o) => {
      if (o?.pop) playEffect('pop', 0.6);
      setLooseSpecs((prev) => prev.filter((s) => s.id !== id));
    };

    const registerLooseEl: WorldCtx['registerLooseEl'] = (spec, el) => {
      const mat = MATERIALS[spec.material];
      const common: Matter.IBodyDefinition = {
        density: mat.density,
        restitution: mat.restitution,
        friction: mat.friction,
        frictionAir: mat.frictionAir,
        label: spec.kind,
        collisionFilter: spec.debris
          ? { category: CATEGORY.DEBRIS, mask: CATEGORY.WORLD | CATEGORY.DEBRIS }
          : {
              category: CATEGORY.LOOSE,
              mask: CATEGORY.PART | CATEGORY.LOOSE | CATEGORY.WORLD | CATEGORY.DEBRIS,
            },
      };
      const body =
        spec.shape === 'circle'
          ? Matter.Bodies.circle(spec.x, spec.y, spec.w / 2, common)
          : Matter.Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
              chamfer: { radius: Math.min(6, spec.h / 4) },
              ...common,
            });
      Matter.Body.setVelocity(body, { x: spec.vx ?? 0, y: spec.vy ?? 0 });
      Matter.Body.setAngularVelocity(body, spec.spin ?? 0);
      const entry: BodyEntry = {
        id: body.id,
        body,
        el,
        kind: spec.kind,
        mode: 'free',
        material: spec.material,
        home: { x: spec.x, y: spec.y },
        size: { w: spec.w, h: spec.h },
        mounts: [],
        mountCount: 0,
        mountStiffness: 0,
        mountBreakAt: 0,
        onImpact: spec.onImpact,
        data: { ...spec.data, looseId: spec.id },
      };
      registry.set(body.id, entry);
      Matter.Composite.add(engine.world, body);

      let ttlTimer: ReturnType<typeof setTimeout> | undefined;
      if (spec.ttl) {
        ttlTimer = setTimeout(() => {
          el.dataset.fading = 'true';
          setTimeout(() => removeLoose(spec.id), 450);
        }, spec.ttl);
      }
      return () => {
        clearTimeout(ttlTimer);
        registry.delete(body.id);
        Matter.Composite.remove(engine.world, body);
      };
    };

    const resetMachine = () => {
      playEffect('ratchet', 1);
      // Pull loose bodies out of the simulation NOW — waiting for the React
      // commit would leave them overlapping re-seated parts for a few ticks,
      // and the solver resolves that by re-exploding the machine.
      registry.forEach((entry, id) => {
        if (entry.mode !== 'free' || entry.kind === 'modal') return;
        Matter.Composite.remove(engine.world, entry.body);
        registry.delete(id);
      });
      setLooseSpecs([]);
      registry.forEach((entry) => {
        if (entry.mode !== 'flow' || entry.body.isStatic) return;
        // Re-bolt: snap home FIRST, then rebuild sheared mounts. Matter
        // constraints capture bodyB.angle at creation (angleB) and rotate the
        // attachment relative to it, so building them while the part is still
        // tumbled makes the solver hurl it across the shop.
        entry.mounts.forEach((m) => Matter.Composite.remove(engine.world, m));
        entry.mounts = [];
        Matter.Body.setPosition(entry.body, entry.home);
        Matter.Body.setAngle(entry.body, 0);
        Matter.Body.setVelocity(entry.body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(entry.body, 0);
        Matter.Sleeping.set(entry.body, false);
        const { home, size, mountCount, mountStiffness, mountBreakAt } = entry;
        const offsets: Vec[] =
          mountCount === 1
            ? [{ x: 0, y: -size.h * 0.3 }]
            : [
                { x: -size.w * 0.38, y: -size.h * 0.25 },
                { x: size.w * 0.38, y: -size.h * 0.25 },
              ];
        for (let i = 0; i < mountCount; i++) {
          const off = offsets[i];
          const c = Matter.Constraint.create({
            pointA: { x: home.x + off.x, y: home.y + off.y },
            bodyB: entry.body,
            pointB: { ...off },
            stiffness: mountStiffness,
            damping: 0.1,
            length: 0,
          });
          (c as any).plugin = { homeOffset: off, breakAt: mountBreakAt, stiffness: mountStiffness };
          entry.mounts.push(c);
          Matter.Composite.add(engine.world, c);
        }
        entry.el.dataset.mounts = String(entry.mounts.length);
        entry.onMountsChange?.(entry.mounts.length);
      });
    };

    return {
      engine,
      registry,
      containerRef,
      registerFlow,
      spawnLoose,
      removeLoose,
      looseSpecs: [],
      registerLooseEl,
      onFrame: (cb) => {
        frameSubs.add(cb);
        return () => frameSubs.delete(cb);
      },
      getLoose: (kind) => [...registry.values()].filter((e) => e.mode === 'free' && e.kind === kind),
      resetMachine,
      setGravity: (scale: number) => {
        engine.gravity.y = scale;
        registry.forEach((e) => Matter.Sleeping.set(e.body, false));
        setGravityState(scale);
      },
      gravity: 1,
      setSound: (on: boolean) => {
        setMuted(!on);
        setSoundOn(on);
      },
      soundOn: true,
      getBounds: () => ({
        w: containerRef.current?.clientWidth ?? 0,
        h: containerRef.current?.clientHeight ?? 0,
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, registry, frameSubs]);

  const value: WorldCtx = { ...ctx, looseSpecs, gravity, soundOn };

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as any).__tumble = { engine, registry, Matter };
  }

  return (
    <Ctx.Provider value={value}>
      <div ref={containerRef} className={`tmbl-world ${className ?? ''}`} style={style}>
        {children}
        <LooseLayer />
      </div>
    </Ctx.Provider>
  );
}

/** Renders every free-flying object (balls, letters, shards, torn labels). */
function LooseLayer() {
  const { looseSpecs } = useWorld();
  return (
    <div className="tmbl-loose-layer" aria-hidden="true">
      {looseSpecs.map((spec) => (
        <LoosePart key={spec.id} spec={spec} />
      ))}
    </div>
  );
}

function LoosePart({ spec }: { spec: LooseSpec }) {
  const { registerLooseEl } = useWorld();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => registerLooseEl(spec, ref.current!), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      ref={ref}
      className={`tmbl-loose ${spec.className ?? ''}`}
      data-loose-id={spec.id}
      style={{ width: spec.w, height: spec.h }}
    >
      {spec.text}
    </div>
  );
}
