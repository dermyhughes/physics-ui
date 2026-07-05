import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../physics/PhysicsWorld';
import { playEffect } from '../physics/sound';

export type ToastTone = 'info' | 'success' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

type ToastListener = (message: string, tone: ToastTone) => void;
const listeners = new Set<ToastListener>();
let toastCounter = 0;

/**
 * Fire a toast from anywhere (sonner-style API). A mounted <Toaster> catches
 * it and stacks it on the ledge.
 */
export function toast(message: string, tone: ToastTone = 'info') {
  listeners.forEach((l) => l(message, tone));
}

export interface ToasterProps {
  className?: string;
  /** How many toasts the ledge holds before the oldest gets knocked off. */
  capacity?: number;
}

/**
 * The notification area. Toasts arrive like normal toasts — stacked, on top
 * of everything, perfectly legible. The physics is deferred: a toast only
 * BECOMES a falling object when you dismiss it (×), or when a new arrival
 * needs the room and knocks the oldest one off the ledge. Dismissed
 * notifications tumble down through the shop and fade — unless the janitor
 * files them first.
 */
export function Toaster({ className, capacity = 3 }: ToasterProps) {
  const { spawnLoose, containerRef } = useWorld();
  const [items, setItems] = useState<ToastItem[]>([]);
  const stackRef = useRef<HTMLDivElement>(null);

  // Convert a displayed toast into a physical falling one at its current spot.
  const drop = (item: ToastItem, kick: { vx: number; vy: number; spin: number }) => {
    const container = containerRef.current;
    const el = stackRef.current?.querySelector<HTMLElement>(`[data-toast-id="${item.id}"]`);
    if (container && el) {
      const r = el.getBoundingClientRect();
      const c = container.getBoundingClientRect();
      spawnLoose({
        kind: 'toast',
        material: 'paper',
        shape: 'rect',
        w: r.width,
        h: r.height,
        x: r.left - c.left + r.width / 2,
        y: r.top - c.top + r.height / 2,
        ...kick,
        ttl: 6000,
        // Dismissed paperwork falls on its own layer — through the UI, not
        // into it. It can still land on an open modal.
        overlay: true,
        className: `tmbl-toast tmbl-toast--${item.tone}`,
        text: item.message,
      });
    }
    setItems((prev) => prev.filter((t) => t.id !== item.id));
  };

  useEffect(() => {
    const onToast: ToastListener = (message, tone) => {
      playEffect('pop', 0.4);
      setItems((prev) => {
        const next = [...prev, { id: ++toastCounter, message, tone }];
        if (next.length > capacity) {
          // The new arrival collides with the pile: the oldest is shoved off.
          const evicted = next[0];
          // Defer so the DOM node still exists for position capture.
          setTimeout(
            () => drop(evicted, { vx: (Math.random() - 0.5) * 4, vy: 1.5, spin: (Math.random() - 0.5) * 0.25 }),
            30,
          );
        }
        return next;
      });
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacity]);

  // Oldest sits at the bottom of the pile, new arrivals land on top.
  const visible = items.slice(-capacity);

  return (
    <div className={`tmbl-toaster ${className ?? ''}`} aria-live="polite" aria-label="Notifications">
      <div ref={stackRef} className="tmbl-toaster__stack">
        {visible.map((item, i) => (
          <div
            key={item.id}
            data-toast-id={item.id}
            className={`tmbl-toast tmbl-toast--${item.tone} tmbl-toaster__item`}
            style={{ bottom: `${i * 48}px` }}
          >
            {item.message}
            <button
              type="button"
              className="tmbl-loose__dismiss"
              aria-label="Dismiss notification"
              data-tmbl-nodrag=""
              onClick={() => {
                playEffect('whoosh', 0.5);
                drop(item, { vx: (Math.random() - 0.5) * 2, vy: 2, spin: (Math.random() - 0.5) * 0.3 });
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="tmbl-toaster__ledge" aria-hidden="true" />
      <span className="tmbl-toaster__label" aria-hidden="true">
        notifications land here
      </span>
    </div>
  );
}
