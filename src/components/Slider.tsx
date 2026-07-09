import { useEffect, useRef } from 'react';
import { useFrame, useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import type { MaterialName } from '../physics/materials';
import { playImpact } from '../physics/sound';

export interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** What the groove is stamped from — sets weight, bounce and impact voice. */
  material?: MaterialName;
}

/**
 * A range input that looks entirely respectable — except the thumb is a
 * brass ball sitting in the groove, and the groove obeys gravity.
 *
 * Drag the ball to set a value like any slider. But knock the component and
 * the ball sloshes; tilt it (drag one end, or shear a mounting bolt so it
 * dangles) and your setting rolls downhill. A slider hanging off one bolt
 * quietly pegs itself to whichever end points at the floor. Level your UI if
 * you want your settings to stay put.
 */
export function Slider({ label, value, onChange, min = 0, max = 100, step = 1, unit, material = 'wood' }: SliderProps) {
  const { engine, containerRef } = useWorld();
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);

  const span = max - min || 1;
  // The ball's own 1D physics along the groove (fraction 0..1).
  const sim = useRef({
    pos: (value - min) / span,
    vel: 0,
    roll: 0,
    dragging: false,
    lastEmitted: value,
    prevBodyVel: { x: 0, y: 0 },
  });

  const { ref, entry } = usePhysicsBody<HTMLDivElement>({
    kind: 'slider',
    material,
    mountBreakAt: 100,
    // The groove is the part; the label floats above it.
    hitboxRef: trackRef,
  });

  // External value changes (controlled component) seat the ball directly
  // unless the user is mid-drag.
  useEffect(() => {
    if (!sim.current.dragging && value !== sim.current.lastEmitted) {
      sim.current.pos = (value - min) / span;
      sim.current.vel = 0;
      sim.current.lastEmitted = value;
    }
  }, [value, min, span]);

  const emit = () => {
    const s = sim.current;
    const raw = min + s.pos * span;
    const stepped = Math.round(raw / step) * step;
    const clamped = Math.max(min, Math.min(max, stepped));
    if (clamped !== s.lastEmitted) {
      s.lastEmitted = clamped;
      onChange(clamped);
    }
  };

  useFrame(() => {
    const e = entry();
    const s = sim.current;
    if (!e) return;

    if (!s.dragging) {
      // Gravity projected along the groove: tilt makes the ball roll.
      const tilt = e.body.angle;
      const g = engine.gravity.y * engine.gravity.scale;
      s.vel += Math.sin(tilt) * g * 3.2;
      // Jolts slosh the ball (inertia against the track's acceleration).
      const ax = e.body.velocity.x - s.prevBodyVel.x;
      const ay = e.body.velocity.y - s.prevBodyVel.y;
      s.vel -= (ax * Math.cos(tilt) + ay * Math.sin(tilt)) * 0.004;
      s.vel *= 0.94; // rolling friction — settles in ~16 frames
      s.pos += s.vel;
      if (s.pos < 0) {
        s.pos = 0;
        if (Math.abs(s.vel) > 0.004) playImpact('ding', Math.abs(s.vel) * 900, 200, `slider-${e.id}`);
        s.vel *= -0.35;
      } else if (s.pos > 1) {
        s.pos = 1;
        if (Math.abs(s.vel) > 0.004) playImpact('ding', Math.abs(s.vel) * 900, 200, `slider-${e.id}`);
        s.vel *= -0.35;
      }
      emit();
    }
    s.prevBodyVel = { x: e.body.velocity.x, y: e.body.velocity.y };

    // Render: thumb position + rolling rotation.
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (track && thumb) {
      const w = track.clientWidth - 18;
      s.roll += s.vel * w * 0.12;
      thumb.style.left = `${2 + s.pos * w}px`;
      thumb.style.setProperty('--roll', `${s.roll}rad`);
    }
  });

  // Dragging the thumb is ordinary slider interaction — it must not grab the
  // whole component, so stop the world's drag handler from seeing it.
  const onThumbDown = (ev: React.PointerEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    const s = sim.current;
    s.dragging = true;
    s.vel = 0;
    let lastX = ev.clientX;
    let lastT = performance.now();
    let flick = 0;

    const move = (me: PointerEvent) => {
      const track = trackRef.current;
      const container = containerRef.current;
      const e = entry();
      if (!track || !container || !e) return;
      const tr = track.getBoundingClientRect();
      // Project the pointer onto the (possibly tilted) groove axis.
      const cx = tr.left + tr.width / 2;
      const cy = tr.top + tr.height / 2;
      const tilt = e.body.angle;
      const along =
        (me.clientX - cx) * Math.cos(tilt) + (me.clientY - cy) * Math.sin(tilt);
      s.pos = Math.max(0, Math.min(1, 0.5 + along / (tr.width - 18)));
      const now = performance.now();
      flick = (me.clientX - lastX) / Math.max(1, now - lastT) / 60;
      lastX = me.clientX;
      lastT = now;
      emit();
    };
    const up = () => {
      s.dragging = false;
      // A gentle flick carries a little momentum; a drag stays put.
      s.vel = Math.max(-0.012, Math.min(0.012, flick));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div ref={ref} className="tmbl-slider" data-material={material}>
      <div className="tmbl-slider__head">
        <span className="tmbl-field-label">{label}</span>
        <span className="tmbl-slider__value">
          {value}
          {unit}
        </span>
      </div>
      <div ref={trackRef} className="tmbl-slider__track">
        <span className="tmbl-slider__groove" aria-hidden="true" />
        <span
          ref={thumbRef}
          className="tmbl-slider__thumb"
          data-tmbl-nodrag=""
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          onPointerDown={onThumbDown}
          onKeyDown={(ke) => {
            if (ke.key === 'ArrowRight' || ke.key === 'ArrowUp') {
              onChange(Math.min(max, value + step));
              sim.current.pos = (Math.min(max, value + step) - min) / span;
              sim.current.lastEmitted = Math.min(max, value + step);
            }
            if (ke.key === 'ArrowLeft' || ke.key === 'ArrowDown') {
              onChange(Math.max(min, value - step));
              sim.current.pos = (Math.max(min, value - step) - min) / span;
              sim.current.lastEmitted = Math.max(min, value - step);
            }
          }}
        />
      </div>
      <span className="tmbl-slider__hint">keep level — the setting rolls</span>
    </div>
  );
}
