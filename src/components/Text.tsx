import { createElement, useMemo } from 'react';
import { usePhysicsBody } from '../physics/usePhysicsBody';
import { CATEGORY } from '../physics/materials';

type TextTag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'label';

export interface PhysicsTextProps {
  as?: TextTag;
  children: string;
  className?: string;
  /**
   * How firmly the words are glued to the page.
   * 'set' type resists knocks; 'loose' type scatters if you sneeze at it.
   */
  setting?: 'set' | 'loose';
  /**
   * When true, torn-off words can collide with the scroll-tracking viewport
   * ceiling. Everything else passes through it — only opt-in bodies bounce.
   */
  viewportCollide?: boolean;
  /**
   * When true, a trailing period is stripped from the last word and replaced
   * with a rubber ball physics body — same mass as rubber, restitution 0.92.
   */
  trailingBall?: boolean;
}

/**
 * Typography with mass. Every word is its own rigid body, pinned to the page
 * with weak letterpress glue. Knock a heading and the words wobble; hit it
 * hard and they tear off one by one and rain down into the machine.
 */
export function PhysicsText({
  as = 'p',
  children,
  className,
  setting = 'set',
  viewportCollide,
  trailingBall,
}: PhysicsTextProps) {
  const { words, hasBall } = useMemo(() => {
    const ws = children.split(/\s+/).filter(Boolean);
    if (trailingBall && ws.length > 0 && ws[ws.length - 1].endsWith('.')) {
      ws[ws.length - 1] = ws[ws.length - 1].slice(0, -1);
      return { words: ws, hasBall: true };
    }
    return { words: ws, hasBall: false };
  }, [children, trailingBall]);

  const wordEls = words.map((word, i) => (
    <Word key={`${word}-${i}`} word={word} loose={setting === 'loose'} viewportCollide={viewportCollide} />
  ));

  return createElement(
    as,
    { className: `tmbl-text ${className ?? ''}`, 'data-setting': setting },
    hasBall ? [...wordEls, <RubberBallPeriod key="trailing-ball" viewportCollide={viewportCollide} />] : wordEls,
  );
}

function Word({ word, loose, viewportCollide }: { word: string; loose: boolean; viewportCollide?: boolean }) {
  const { ref } = usePhysicsBody<HTMLSpanElement>({
    kind: 'word',
    material: 'paper',
    mounts: 2,
    mountStiffness: loose ? 0.02 : 0.05,
    mountBreakAt: loose ? 34 : 60,
    bodyOverrides: viewportCollide
      ? {
          collisionFilter: {
            category: CATEGORY.PART,
            mask: CATEGORY.PART | CATEGORY.LOOSE | CATEGORY.WORLD | CATEGORY.DEBRIS | CATEGORY.VIEWPORT_CEIL,
          },
        }
      : undefined,
  });
  return (
    <span ref={ref} className="tmbl-word">
      {word}
    </span>
  );
}

function RubberBallPeriod({ viewportCollide }: { viewportCollide?: boolean }) {
  const { ref } = usePhysicsBody<HTMLSpanElement>({
    kind: 'rubber-period',
    material: 'rubber',
    shape: 'circle',
    mounts: 2,
    mountStiffness: 0.04,
    mountBreakAt: 55,
    bodyOverrides: viewportCollide
      ? {
          collisionFilter: {
            category: CATEGORY.PART,
            mask: CATEGORY.PART | CATEGORY.LOOSE | CATEGORY.WORLD | CATEGORY.DEBRIS | CATEGORY.VIEWPORT_CEIL,
          },
        }
      : undefined,
  });
  return <span ref={ref} className="tmbl-word tmbl-rubber-period" aria-hidden="true" />;
}
