/**
 * TUMBLE material system.
 *
 * Every component is stamped from one of these materials. A material decides
 * how a part behaves when the world stops being polite: how heavy it is, how
 * it bounces, whether it shatters, what it sounds like when it lands.
 */

export type MaterialName =
  | 'steel' // dense, dead thud, barely bounces — buttons, machine frames
  | 'wood' // the workshop default — cards, inputs
  | 'rubber' // very bouncy — bumpers, toggle knobs
  | 'brass' // heavy and ringy — radio balls, small fittings
  | 'glass' // light, brittle: shatters above its impact tolerance
  | 'paper'; // near-weightless, high drag — labels, loose text

export interface Material {
  /** Matter.js body density (mass = density × area). */
  density: number;
  /** 0 = dead drop, 1 = superball. */
  restitution: number;
  friction: number;
  frictionAir: number;
  /** Impact speed (px/tick) above which the part breaks; Infinity = unbreakable. */
  shatterAt: number;
  /** Which impact voice the sound engine uses. */
  voice: 'thud' | 'knock' | 'boing' | 'ding' | 'clink' | 'flutter';
}

export const MATERIALS: Record<MaterialName, Material> = {
  steel: {
    density: 0.0035,
    restitution: 0.08,
    friction: 0.3,
    frictionAir: 0.015,
    shatterAt: Infinity,
    voice: 'thud',
  },
  wood: {
    density: 0.0012,
    restitution: 0.25,
    friction: 0.45,
    frictionAir: 0.02,
    shatterAt: Infinity,
    voice: 'knock',
  },
  rubber: {
    density: 0.0008,
    restitution: 0.92,
    friction: 0.9,
    frictionAir: 0.012,
    shatterAt: Infinity,
    voice: 'boing',
  },
  brass: {
    density: 0.0028,
    restitution: 0.42,
    friction: 0.15,
    frictionAir: 0.008,
    shatterAt: Infinity,
    voice: 'ding',
  },
  glass: {
    density: 0.001,
    restitution: 0.15,
    friction: 0.25,
    frictionAir: 0.02,
    shatterAt: 11,
    voice: 'clink',
  },
  paper: {
    density: 0.0003,
    restitution: 0.1,
    friction: 0.6,
    frictionAir: 0.06,
    shatterAt: Infinity,
    voice: 'flutter',
  },
};

/** Collision categories so decorative debris can't jam the machine. */
export const CATEGORY = {
  PART: 0x0001, // mounted components
  LOOSE: 0x0002, // free-flying objects (balls, torn-off parts)
  DEBRIS: 0x0004, // shards, spilled letters — collide with world, not with parts
  WORLD: 0x0008, // walls, floor
  /** Modals and toasts: their own layer, they only touch each other. */
  OVERLAY: 0x0010,
  /**
   * Scroll-tracking viewport ceiling. Bodies must explicitly include this in
   * their mask to bounce off it — everything else passes straight through.
   */
  VIEWPORT_CEIL: 0x0020,
} as const;
