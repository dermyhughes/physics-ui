import { createElement, useMemo } from 'react';
import { usePhysicsBody } from '../physics/usePhysicsBody';

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
}

/**
 * Typography with mass. Every word is its own rigid body, pinned to the page
 * with weak letterpress glue. Knock a heading and the words wobble; hit it
 * hard and they tear off one by one and rain down into the machine.
 */
export function PhysicsText({ as = 'p', children, className, setting = 'set' }: PhysicsTextProps) {
  const words = useMemo(() => children.split(/\s+/).filter(Boolean), [children]);
  return createElement(
    as,
    { className: `tmbl-text ${className ?? ''}`, 'data-setting': setting },
    words.map((word, i) => (
      <Word key={`${word}-${i}`} word={word} loose={setting === 'loose'} />
    )),
  );
}

function Word({ word, loose }: { word: string; loose: boolean }) {
  const { ref } = usePhysicsBody<HTMLSpanElement>({
    kind: 'word',
    material: 'paper',
    mounts: 2,
    mountStiffness: loose ? 0.02 : 0.05,
    mountBreakAt: loose ? 34 : 60,
  });
  return (
    <span ref={ref} className="tmbl-word">
      {word}
    </span>
  );
}
