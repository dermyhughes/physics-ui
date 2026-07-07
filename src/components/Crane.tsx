import Matter from 'matter-js';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFrame, useWorld, type BodyEntry, type LooseSpec } from '../physics/PhysicsWorld';
import { CATEGORY } from '../physics/materials';
import { relativeRect } from '../physics/geometry';
import { nextId } from '../physics/ids';
import { playEffect } from '../physics/sound';
import { Button } from './Button';

export interface CraneProps {
  /** Patrol automatically whenever something is lying around. */
  auto?: boolean;
  /** Where along the rail (0..1) the claw releases its cargo — park the bin there. */
  dropAt?: number;
  label?: string;
}

type CraneState = 'idle' | 'seek' | 'descend' | 'grab' | 'raise' | 'carry' | 'release' | 'return';

const UNGRASPABLE = new Set(['claw', 'modal', 'toast', 'select-panel']);
const REST_LEN = 56;

/**
 * JANITOR UNIT 07 — bulk cleanup as a claw machine.
 *
 * A trolley rides the rail; a claw swings beneath it on a rope. On each cycle
 * it finds the lowest-lying loose part below the rail, trundles over, lowers,
 * grabs, hoists, carries it to the drop point and lets go — park a PartsBin
 * there and the shop cleans itself. It will happily pick up brass balls,
 * spilled letters, rubber scraps, and entire torn-off cards.
 *
 * Runs autonomously (`auto`), or press CYCLE to dispatch it by hand.
 */
export function Crane({ auto = true, dropAt = 0.86, label = 'Janitor unit 07' }: CraneProps) {
  const { containerRef, registerLooseEl, registry, engine } = useWorld();
  const railRef = useRef<HTMLDivElement>(null);
  const trolleyRef = useRef<HTMLDivElement>(null);
  const clawElRef = useRef<HTMLDivElement>(null);
  const ropeRef = useRef<SVGLineElement>(null);
  const [status, setStatus] = useState('IDLE');

  const sm = useRef({
    state: 'idle' as CraneState,
    claw: null as BodyEntry | null,
    rope: null as Matter.Constraint | null,
    grip: null as Matter.Constraint | null,
    targetId: null as number | null,
    trolleyX: 0,
    stateSince: 0,
    cooldownUntil: 0,
    manualRequest: false,
    // Targets it recently failed to grab — skip them for a while instead of
    // trying the same impossible pick forever.
    blacklist: new Map<number, number>(),
  });

  const go = (state: CraneState, note?: string) => {
    sm.current.state = state;
    sm.current.stateSince = performance.now();
    setStatus(note ?? state.toUpperCase());
  };

  // ------------------------------------------------------------- rig setup
  useEffect(() => {
    const rail = railRef.current;
    const clawEl = clawElRef.current;
    const container = containerRef.current;
    if (!rail || !clawEl || !container) return;
    const r = relativeRect(rail, container);
    const railY = r.y + r.h / 2;
    const startX = r.x + 40;

    const spec: LooseSpec = {
      id: nextId('claw'),
      kind: 'claw',
      material: 'steel',
      shape: 'rect',
      w: 34,
      h: 24,
      x: startX,
      y: railY + REST_LEN,
      // The claw must not knock the bolted UI around while patrolling.
      maskOverride: CATEGORY.WORLD | CATEGORY.LOOSE | CATEGORY.DEBRIS,
    };
    const cleanup = registerLooseEl(spec, clawEl);
    let claw: BodyEntry | null = null;
    for (const e of registry.values()) {
      if (e.el === clawEl) {
        claw = e;
        break;
      }
    }
    sm.current.claw = claw;
    sm.current.trolleyX = startX;

    if (claw) {
      const rope = Matter.Constraint.create({
        pointA: { x: startX, y: railY },
        bodyB: claw.body,
        pointB: { x: 0, y: -10 },
        length: REST_LEN,
        stiffness: 0.2,
        damping: 0.07,
      });
      sm.current.rope = rope;
      Matter.Composite.add(engine.world, rope);
    }

    return () => {
      if (sm.current.rope) Matter.Composite.remove(engine.world, sm.current.rope);
      if (sm.current.grip) Matter.Composite.remove(engine.world, sm.current.grip);
      sm.current.rope = null;
      sm.current.grip = null;
      sm.current.claw = null;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------- helpers
  const graspables = (): BodyEntry[] =>
    [...registry.values()].filter(
      (e) =>
        !e.body.isStatic &&
        !UNGRASPABLE.has(e.kind) &&
        (e.mode === 'free' || e.mounts.length === 0) &&
        e !== sm.current.claw,
    );

  const dropGrip = () => {
    if (sm.current.grip) {
      Matter.Composite.remove(engine.world, sm.current.grip);
      sm.current.grip = null;
    }
    if (clawElRef.current) delete clawElRef.current.dataset.holding;
    sm.current.targetId = null;
  };

  // -------------------------------------------------------- state machine
  useFrame(() => {
    const s = sm.current;
    const rail = railRef.current;
    const container = containerRef.current;
    if (!s.claw || !s.rope || !rail || !container) return;
    if (!registry.has(s.claw.id)) return;

    const r = relativeRect(rail, container);
    const railY = r.y + r.h / 2;
    const minX = r.x + 30;
    const maxX = r.x + r.w - 30;
    const dropX = minX + (maxX - minX) * dropAt;
    const maxLen = container.clientHeight - railY - 42;
    const now = performance.now();

    if (s.state !== 'idle') Matter.Sleeping.set(s.claw.body, false);
    const target = s.targetId != null ? (registry.get(s.targetId) ?? null) : null;
    // Cargo can vanish (bin collected it) or get re-bolted (machine reset).
    if (s.targetId != null && (!target || (target.mode === 'flow' && target.mounts.length > 0))) {
      dropGrip();
      if (s.state === 'descend' || s.state === 'grab' || s.state === 'carry') go('raise');
    }

    const moveTrolley = (toX: number, speed = 5.5): boolean => {
      const clamped = Math.max(minX, Math.min(maxX, toX));
      const d = clamped - s.trolleyX;
      s.trolleyX += Math.abs(d) < speed ? d : Math.sign(d) * speed;
      return Math.abs(d) < speed;
    };

    switch (s.state) {
      case 'idle': {
        const wants = s.manualRequest || (auto && now > s.cooldownUntil);
        if (wants) {
          // Only chase what the rail can actually reach: within its span,
          // below it, and not something it recently failed on.
          const candidates = graspables().filter(
            (e) =>
              e.body.position.x > minX - 60 &&
              e.body.position.x < maxX + 60 &&
              e.body.position.y > railY + 40 &&
              (s.blacklist.get(e.id) ?? 0) < now,
          );
          if (candidates.length) {
            // Lowest-lying part first: that's the one on the floor.
            const pick = candidates.reduce((a, b) =>
              a.body.position.y > b.body.position.y ? a : b,
            );
            s.targetId = pick.id;
            s.manualRequest = false;
            playEffect('ratchet', 0.5);
            go('seek', 'SEEKING');
          } else if (s.manualRequest) {
            s.manualRequest = false;
            setStatus('NOTHING TO GRAB');
            s.cooldownUntil = now + 1500;
          }
        }
        break;
      }
      case 'seek': {
        if (!target) break;
        if (moveTrolley(target.body.position.x)) go('descend', 'LOWERING');
        break;
      }
      case 'descend': {
        if (!target) break;
        moveTrolley(target.body.position.x, 4);
        s.rope.length = Math.min(maxLen, s.rope.length + 6);
        const d = Math.hypot(
          s.claw.body.position.x - target.body.position.x,
          s.claw.body.position.y - target.body.position.y,
        );
        if (d < Math.max(target.size.w, target.size.h) / 2 + 34) {
          s.grip = Matter.Constraint.create({
            bodyA: s.claw.body,
            pointA: { x: 0, y: 10 },
            bodyB: target.body,
            length: Math.max(4, target.size.h * 0.25),
            stiffness: 0.35,
            damping: 0.1,
          });
          Matter.Composite.add(engine.world, s.grip);
          if (clawElRef.current) clawElRef.current.dataset.holding = 'true';
          playEffect('pop', 0.7);
          go('grab', 'GRABBED');
        } else if (s.rope.length >= maxLen && now - s.stateSince > 2200) {
          if (s.targetId != null) s.blacklist.set(s.targetId, now + 12000);
          dropGrip();
          go('raise', 'MISSED');
        }
        break;
      }
      case 'grab': {
        if (now - s.stateSince > 220) go('raise', 'HOISTING');
        break;
      }
      case 'raise': {
        s.rope.length = Math.max(REST_LEN, s.rope.length - 6.5);
        if (s.rope.length <= REST_LEN) go(s.grip ? 'carry' : 'return', s.grip ? 'CARRYING' : 'RETURNING');
        break;
      }
      case 'carry': {
        if (moveTrolley(dropX, 3)) go('release', 'RELEASING');
        break;
      }
      case 'release': {
        if (now - s.stateSince > 260) {
          dropGrip();
          playEffect('whoosh', 0.5);
          s.cooldownUntil = now + (auto ? 1400 : 500);
          go('return', 'RETURNING');
        }
        break;
      }
      case 'return': {
        if (moveTrolley(minX + 10)) go('idle', auto ? 'PATROLLING' : 'IDLE');
        break;
      }
    }

    // ------------------------------------------------------- draw the rig
    s.rope.pointA = { x: s.trolleyX, y: railY };
    if (trolleyRef.current) {
      trolleyRef.current.style.transform = `translate(${s.trolleyX - 22}px, ${railY - 10}px)`;
    }
    if (ropeRef.current) {
      const attach = Matter.Vector.add(s.claw.body.position, s.rope.pointB as Matter.Vector);
      ropeRef.current.setAttribute('x1', String(s.trolleyX));
      ropeRef.current.setAttribute('y1', String(railY));
      ropeRef.current.setAttribute('x2', String(attach.x));
      ropeRef.current.setAttribute('y2', String(attach.y));
    }
  });

  const container = containerRef.current;

  return (
    <div className="tmbl-crane">
      <div ref={railRef} className="tmbl-crane__rail" aria-hidden="true" />
      <div className="tmbl-crane__housing">
        <span className="tmbl-crane__name">{label}</span>
        <span className="tmbl-crane__status" role="status">
          {status}
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            sm.current.manualRequest = true;
          }}
        >
          Cycle
        </Button>
      </div>
      {container &&
        createPortal(
          <div className="tmbl-crane__rig" aria-hidden="true">
            <svg className="tmbl-crane__ropes">
              <line ref={ropeRef} className="tmbl-crane__rope" />
            </svg>
            <div ref={trolleyRef} className="tmbl-crane__trolley" />
            <div ref={clawElRef} className="tmbl-crane__claw">
              <span className="tmbl-crane__prong" data-side="l" />
              <span className="tmbl-crane__prong" data-side="r" />
            </div>
          </div>,
          container,
        )}
    </div>
  );
}
