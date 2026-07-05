import Matter from 'matter-js';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PhysicsExempt,
  useFrame,
  useWorld,
  type BodyEntry,
  type LooseSpec,
} from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { CATEGORY } from '../physics/materials';
import { playEffect } from '../physics/sound';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

let selectCounter = 0;

/**
 * A dropdown that takes its name literally. The trigger looks like any
 * select; open it and a steel options panel is driven down beneath it on two
 * pistons — a hydraulic press with a listbox role. Whatever UI happens to be
 * in the way is SHOVED aside (physical layout shift; components below strain
 * on their bolts). Pick an option and the pistons release: the menu you no
 * longer need drops out of the interface. Drag the trigger while it's open
 * and the menu swings along beneath it.
 */
export function Select({ label, value, onChange, options, placeholder = 'Choose…' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const { ref, entry } = usePhysicsBody<HTMLDivElement>({
    kind: 'select',
    material: 'wood',
    mountBreakAt: 100,
  });

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="tmbl-select" data-open={open || undefined}>
      <span className="tmbl-field-label">{label}</span>
      <button
        type="button"
        className="tmbl-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          playEffect(open ? 'whoosh' : 'ratchet', 0.6);
          setOpen(!open);
        }}
      >
        <span className={current ? '' : 'tmbl-select__placeholder'}>
          {current ? current.label : placeholder}
        </span>
        <span className="tmbl-select__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <SelectPanel
          triggerEntry={entry}
          options={options}
          value={value}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function SelectPanel({
  triggerEntry,
  options,
  value,
  onPick,
  onDismiss,
}: {
  triggerEntry: () => BodyEntry | null;
  options: SelectOption[];
  value: string | null;
  onPick: (value: string) => void;
  onDismiss: () => void;
}) {
  const { containerRef, registerLooseEl, registry, engine } = useWorld();
  const panelRef = useRef<HTMLDivElement>(null);
  const chainA = useRef<SVGLineElement>(null);
  const chainB = useRef<SVGLineElement>(null);
  const rig = useRef<{ chains: Matter.Constraint[]; entry: BodyEntry | null; closing: boolean }>({
    chains: [],
    entry: null,
    closing: false,
  });

  useEffect(() => {
    const el = panelRef.current;
    const trigger = triggerEntry();
    if (!el || !trigger) return;

    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const tb = trigger.body;
    const spawnX = tb.position.x;
    const spawnY = tb.position.y + trigger.size.h / 2 + ph / 2 + 8;
    el.style.transform = `translate(${spawnX - pw / 2}px, ${spawnY - ph / 2}px)`;

    const spec: LooseSpec = {
      id: `select-${++selectCounter}`,
      kind: 'select-panel',
      // A hydraulic press is not made of wood. Heavy enough to win against
      // anything bolted beneath it.
      material: 'steel',
      shape: 'rect',
      w: pw,
      h: ph,
      x: spawnX,
      y: spawnY,
      vy: 3,
      maskOverride: CATEGORY.PART | CATEGORY.WORLD | CATEGORY.LOOSE | CATEGORY.DEBRIS,
    };
    const cleanup = registerLooseEl(spec, el);
    let entry: BodyEntry | null = null;
    for (const e of registry.values()) {
      if (e.el === el) {
        entry = e;
        break;
      }
    }
    rig.current.entry = entry;

    if (entry) {
      // Press and trigger share a collision group so the assembly never
      // fights itself while it shoves everything else.
      if (!tb.collisionFilter.group || tb.collisionFilter.group >= 0) {
        tb.collisionFilter.group = Matter.Body.nextGroup(true);
      }
      entry.body.collisionFilter.group = tb.collisionFilter.group;

      const spread = pw * 0.36;
      const chains = [-1, 1].map((side) =>
        Matter.Constraint.create({
          bodyA: tb,
          pointA: { x: side * spread, y: trigger.size.h / 2 - 4 },
          bodyB: entry!.body,
          pointB: { x: side * spread, y: -ph / 2 + 6 },
          length: 6, // pistons start retracted, then drive the panel down
          stiffness: 0.32,
          damping: 0.1,
        }),
      );
      rig.current.chains = chains;
      Matter.Composite.add(engine.world, chains);
      playEffect('ratchet', 0.9);
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') release(false);
    };
    const onClickAway = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) release(false);
    };
    window.addEventListener('keydown', onKey);
    // Defer so the opening click doesn't immediately close it.
    const t = setTimeout(() => window.addEventListener('click', onClickAway, true), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClickAway, true);
      rig.current.chains.forEach((c) => Matter.Composite.remove(engine.world, c));
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chains release → the unwanted menu falls out of the UI.
  const release = (picked: boolean, pickedValue?: string) => {
    if (rig.current.closing) return;
    rig.current.closing = true;
    playEffect(picked ? 'pop' : 'whoosh', 0.7);
    rig.current.chains.forEach((c) => Matter.Composite.remove(engine.world, c));
    rig.current.chains = [];
    const e = rig.current.entry;
    if (e) {
      Matter.Sleeping.set(e.body, false);
      Matter.Body.setAngularVelocity(e.body, (Math.random() - 0.5) * 0.2);
      e.body.collisionFilter.mask = 0;
      e.el.dataset.fading = 'true';
    }
    setTimeout(() => (picked && pickedValue != null ? onPick(pickedValue) : onDismiss()), picked ? 120 : 450);
  };

  useFrame(() => {
    const { chains, entry } = rig.current;
    if (!entry) return;
    // Piston extension: drive the panel down to full drop over ~20 frames.
    for (const c of chains) {
      if (c.length < 18) c.length += 0.7;
    }
    const lines = [chainA.current, chainB.current];
    chains.forEach((c, i) => {
      const line = lines[i];
      if (!line || !c.bodyA) return;
      const a = Matter.Vector.add(c.bodyA.position, c.pointA as Matter.Vector);
      const b = Matter.Vector.add(entry.body.position, c.pointB as Matter.Vector);
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(b.x));
      line.setAttribute('y2', String(b.y));
    });
    if (!chains.length) lines.forEach((l) => l?.setAttribute('opacity', '0'));
  });

  const container = containerRef.current;
  if (!container) return null;

  return createPortal(
    <>
      <svg className="tmbl-select__chains" aria-hidden="true">
        <line ref={chainA} className="tmbl-select__chain" />
        <line ref={chainB} className="tmbl-select__chain" />
      </svg>
      <div ref={panelRef} className="tmbl-select__panel" role="listbox" aria-label="Options">
        <PhysicsExempt>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className="tmbl-select__option"
              data-selected={o.value === value || undefined}
              onClick={() => release(true, o.value)}
            >
              {o.label}
            </button>
          ))}
        </PhysicsExempt>
      </div>
    </>,
    container,
  );
}
