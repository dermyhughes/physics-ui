export interface RelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** An element's bounding rect expressed in `container`-local pixel coordinates. */
export function relativeRect(el: Element, container: Element): RelRect {
  const r = el.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
}

/** The center point of `el`'s bounding rect, in `container`-local coordinates. */
export function relativeCenter(el: Element, container: Element): { x: number; y: number } {
  const r = relativeRect(el, container);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
