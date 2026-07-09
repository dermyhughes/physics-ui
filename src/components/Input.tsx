import { useRef, type InputHTMLAttributes } from 'react';
import { useFrame, useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { relativeRect } from '../physics/geometry';
import type { MaterialName } from '../physics/materials';
import { playEffect } from '../physics/sound';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  /** What the part is stamped from — sets weight, bounce and impact voice. */
  material?: MaterialName;
}

/**
 * A text field with a hopper. Every character you type physically drops into
 * the field from above (the letters you see falling are real bodies). Shake
 * the field hard enough — or throw it — and it SPILLS: your text tumbles out
 * letter by letter and the field is cleared.
 */
export function Input({ label, value, onChange, hint, className, material = 'wood', ...rest }: InputProps) {
  const { spawnLoose, containerRef } = useWorld();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpill = useRef(0);

  const { ref, entry } = usePhysicsBody<HTMLDivElement>({
    kind: 'input',
    material,
    mountBreakAt: 110,
    // Collide as the field itself — the label above it is not a wall.
    hitboxRef: inputRef,
  });

  const inputCenter = () => {
    const el = inputRef.current;
    const container = containerRef.current;
    if (!el || !container) return null;
    const r = relativeRect(el, container);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, w: r.w };
  };

  const dropGlyph = (char: string) => {
    const c = inputCenter();
    if (!c || char.trim() === '') return;
    playEffect('pop', 0.2);
    spawnLoose({
      kind: 'letter',
      material: 'paper',
      shape: 'rect',
      w: 14,
      h: 18,
      x: c.x + (Math.random() - 0.5) * c.w * 0.6,
      y: c.y - 70 - Math.random() * 30,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 1,
      spin: (Math.random() - 0.5) * 0.3,
      ttl: 1300,
      debris: true,
      className: 'tmbl-letter',
      text: char,
    });
  };

  // Shake-to-clear: if the field is moving violently, the text spills out.
  useFrame(() => {
    const e = entry();
    if (!e || !value) return;
    const speed = Math.hypot(e.body.velocity.x, e.body.velocity.y);
    const now = performance.now();
    if (speed > 24 && now - lastSpill.current > 1500) {
      lastSpill.current = now;
      const c = inputCenter();
      if (!c) return;
      playEffect('whoosh', 1);
      [...value].forEach((char, i) => {
        if (char.trim() === '') return;
        spawnLoose({
          kind: 'letter',
          material: 'paper',
          shape: 'rect',
          w: 14,
          h: 18,
          x: c.x + (i / Math.max(1, value.length - 1) - 0.5) * c.w * 0.7,
          y: c.y,
          vx: e.body.velocity.x * 0.4 + (Math.random() - 0.5) * 4,
          vy: e.body.velocity.y * 0.3 - 3 - Math.random() * 3,
          spin: (Math.random() - 0.5) * 0.5,
          ttl: 5000,
          debris: true,
          className: 'tmbl-letter',
          text: char,
        });
      });
      onChange('');
    }
  });

  return (
    <div ref={ref} className={`tmbl-input ${className ?? ''}`} data-material={material}>
      <label className="tmbl-field-label" htmlFor={rest.id ?? `tmbl-in-${label}`}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={rest.id ?? `tmbl-in-${label}`}
        className="tmbl-input__field"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next.length > value.length) dropGlyph(next[next.length - 1] ?? '');
          onChange(next);
        }}
        {...rest}
      />
      {hint && <span className="tmbl-input__hint">{hint}</span>}
    </div>
  );
}
