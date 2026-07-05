import { useEffect, useRef } from 'react';
import { useWorld } from '../physics/PhysicsWorld';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { playEffect } from '../physics/sound';

export type ToastTone = 'info' | 'success' | 'warning';

type ToastListener = (message: string, tone: ToastTone) => void;
const listeners = new Set<ToastListener>();

/**
 * Fire a toast from anywhere (sonner-style API). A mounted <Toaster> catches
 * it — literally: the notification drops from above and lands on the ledge.
 */
export function toast(message: string, tone: ToastTone = 'info') {
  listeners.forEach((l) => l(message, tone));
}

export interface ToasterProps {
  /** How many notifications fit before the pile starts shoving itself off. */
  className?: string;
}

/**
 * The notification area, physically. Toasts are real bodies: they fall in
 * from above, clatter onto the ledge, and stack on top of each other like
 * unread paperwork — and they do NOT go away on their own. Dismiss one with
 * its × like a civilised person, or flick it off the ledge, in which case it
 * lands on the shop floor and the janitor crane eventually files it as
 * scrap. This is considered a feature.
 */
export function Toaster({ className }: ToasterProps) {
  const { spawnLoose, containerRef } = useWorld();
  const ledge = usePhysicsBody<HTMLDivElement>({ kind: 'toast-ledge', isStatic: true, material: 'steel' });
  const ledgeElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onToast: ToastListener = (message, tone) => {
      const el = ledgeElRef.current;
      const container = containerRef.current;
      if (!el || !container) return;
      const lr = el.getBoundingClientRect();
      const cr = container.getBoundingClientRect();
      playEffect('whoosh', 0.4);
      spawnLoose({
        kind: 'toast',
        // Paper: notifications flutter down slowly — terminal velocity stays
        // below the physical-press threshold, so falling paperwork can't
        // press "Reset machine" on its way past.
        material: 'paper',
        shape: 'rect',
        w: Math.min(250, lr.width - 10),
        h: 42,
        x: lr.left - cr.left + lr.width / 2 + (Math.random() - 0.5) * 24,
        y: lr.top - cr.top - 130 - Math.random() * 40,
        vy: 2,
        spin: (Math.random() - 0.5) * 0.1,
        // No TTL: unread notifications are physical clutter. Dismiss with the
        // ×, or flick them off the ledge and let the janitor deal with it.
        dismissible: true,
        className: `tmbl-toast tmbl-toast--${tone}`,
        text: message,
      });
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, [spawnLoose, containerRef]);

  return (
    <div className={`tmbl-toaster ${className ?? ''}`} aria-live="polite" aria-label="Notifications">
      <div
        ref={(el) => {
          ledgeElRef.current = el;
          (ledge.ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className="tmbl-toaster__ledge"
      />
      <span className="tmbl-toaster__label">notifications land here</span>
    </div>
  );
}
