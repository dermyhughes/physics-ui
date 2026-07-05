# TUMBLE®

**A design system with consequences.** Every component is a rigid body in a shared
2D physics world. The UI lays out like any component library — then gravity,
collision, and the user's throwing arm get a vote.

```
R.G. TUMBLE & SONS · PRECISION INTERFACE WORKS
TOLERANCES ±90PX · ALL PARTS DRAGGABLE · NO WARRANTY EXPRESS OR IMPLIED
```

## Quick start

```bash
npm install
npm run dev      # the demo machine, http://localhost:5173
npm run smoke    # headless-Chrome smoke test of the physics (needs Chrome + dev server)
```

## What is this

React + [Matter.js](https://brm.io/matter-js/). Components render as **real DOM**
(native inputs, buttons, labels — focus rings, keyboards and screen readers all
work) laid out with normal CSS. Each component registers a rigid body **bolted to
its layout position by two breakable spring mounts**, and the world loop writes
the body's transform back onto the element every frame. At rest, the transform is
identity and the page looks perfectly boring. Then:

- **Grab anything and throw it.** Everything is draggable; release velocity is preserved.
- **Mounts shear.** Pull a part ~90px off station and a bolt pops. One bolt left
  and it dangles like a broken shop sign; both gone and it's cargo.
- **Radios dispense brass balls.** Changing a selection ejects the old ball into
  the world. An empty dial *catches* any slow ball that rolls in — and selects
  that option. You can answer a form with a pinball.
- **Buttons can be pressed by objects.** Anything heavy landing on a button fires
  its `onClick`. Clicking one emits a shockwave that shoves its neighbours.
- **Checkbox ticks pop out** when unchecked and clatter away. Dropping something
  heavy on a checkbox toggles it.
- **Typing rains glyphs** into inputs; shaking a filled input spills its text out
  letter by letter and clears the field.
- **Glass cards shatter** above their impact tolerance and show a
  `COMPONENT DAMAGED` placard until repaired.
- **Modals hang from ropes.** Dismissing one cuts the ropes; the panel tumbles
  down *through your form* on its way off the world.
- **Text has mass.** `PhysicsText` gives every word its own body on weak
  letterpress glue.
- **Machinery**: conveyor belts carry whatever lands on them (click to reverse),
  pinball bumpers launch parts and keep score.
- **Procedural sound.** Thuds, knocks, boings, brass dings and glass clinks are
  synthesized in ~150 lines of WebAudio. No samples.

## Using it

```tsx
import {
  PhysicsWorld, Card, Input, RadioGroup, Radio, Checkbox,
  Toggle, Button, Modal, PhysicsText, Conveyor, Bumper,
} from './src';
import './src/styles/tokens.css';
import './src/styles/base.css';
import './src/styles/components.css';

function App() {
  return (
    <PhysicsWorld style={{ width: '100vw', height: '100vh' }}>
      {/* compose with normal CSS layout — flex, grid, whatever */}
      <Card title="Sign in" material="wood">…</Card>
    </PhysicsWorld>
  );
}
```

`<PhysicsWorld>` owns the Matter engine, the render loop, walls/floor, pointer
drag, collision routing and the loose-parts layer. Components must live inside it.

### Components

| Component | Semantics | Physics behaviour |
| --- | --- | --- |
| `Button` | `<button>` | Steel. Shockwave on click; physically pressable; `variant` primary/secondary/danger, `size` sm/md/lg |
| `RadioGroup` / `Radio` | native radios | Selection dot is a brass ball; ejects on deselect, catchable by empty dials |
| `Checkbox` | native checkbox | Tick pops out as debris on uncheck; impact-toggleable |
| `Toggle` | `role="switch"` | Lever slam: recoil + shockwave on flip |
| `Input` | `<label>` + `<input>` | Typed glyphs fall in; shake to spill & clear |
| `Card` | `<section>` | `material` prop; **glass shatters**, shows repair state; corner screws reflect surviving mounts |
| `Modal` | `role="dialog"` | Lowered from ceiling on two ropes; close = cut ropes; contents are `PhysicsExempt` passengers |
| `PhysicsText` | `h1–h3/p/span/label` | Each word is a body; `setting="loose"` scatters easily |
| `Conveyor` | decorative machinery | Static; drags riders along the belt; click to reverse |
| `Bumper` | decorative machinery | Static; kicks anything that touches it; hit counter + score pops |

### Materials (the token layer of physics)

Every part is stamped from a material that sets density, restitution, friction,
shatter tolerance and its **impact voice**:

| Material | Feel | Voice |
| --- | --- | --- |
| `steel` | dense, dead drop | thud |
| `wood` | the workshop default | knock |
| `rubber` | superball | boing |
| `brass` | heavy, ringy | ding |
| `glass` | brittle — **shatters** | clink |
| `paper` | near-weightless, high drag | flutter |

### Design tokens

Everything visual is a CSS custom property in `src/styles/tokens.css` under
`--tmbl-*`: paper/ink/safety-orange/brass/blueprint palettes with semantic
aliases, Bricolage Grotesque + IBM Plex Mono type scale, 4px spacing, drafting
shadows, motion easings — and physics tokens (`--tmbl-mount-stiffness`,
`--tmbl-mount-break`) documenting the world defaults.

### Building your own parts

```tsx
import { usePhysicsBody, useWorld, useFrame } from './src';

function Gauge() {
  const { ref, impulse, shockwave, breakLoose } = usePhysicsBody<HTMLDivElement>({
    kind: 'gauge',
    material: 'brass',
    mounts: 1,            // hangs from a single bolt, swings when knocked
    mountBreakAt: 60,     // px of stretch before the bolt shears
    onImpact: ({ speed, other }) => speed > 8 && console.log('ouch', other?.kind),
  });
  return <div ref={ref} className="gauge" />;
}
```

`useWorld()` exposes the machine room: `spawnLoose` (balls, debris, anything),
`getLoose(kind)`, `setGravity`, `resetMachine`, `onFrame`, the raw Matter
`engine`, and the registry of every body. `PhysicsExempt` marks a subtree as
riding inside another body (that's how modal contents work).

## How it holds together

- **Flow bodies**: components stay in document flow; physics is a transform
  *delta* from their layout home, so resting UI is pixel-crisp (the transform is
  removed entirely below a threshold) and layout/resize keep working.
- **Gravity compensation**: fully-mounted parts have gravity cancelled each tick
  — no spring sag — so the "boring form" really is boring until provoked. Lose a
  bolt and gravity applies again.
- **Collision categories** keep the machine sane: `PART` (mounted components),
  `LOOSE` (balls, torn-off parts), `DEBRIS` (shards, spilled letters — they
  can't jam your form), `WORLD` (walls, belts, bumpers).
- **Cross-component behaviours** ride the collision bus (`onImpact` with speed +
  the other entry's `kind`/`data`), which is what makes balls press buttons,
  debris toggle checkboxes, and bumpers keep score.
- **One rAF loop**, fixed 60Hz step with an accumulator; DOM writes are
  imperative (no React re-render per frame). React owns discrete state only.

## Known limits / future work

- Parts nest **visually**, but each body is independent — a card and the button
  on it are separate rigid bodies (only `Modal` uses the passenger system so
  far). A general compound/vehicle API is the obvious next mechanism.
- Cranes and magnet arms didn't make this cut. The `LooseSpec`/constraint
  plumbing is all there; contributions of machinery welcome.
- Mobile works (pointer events), but the demo layout is desktop-first.

*Filed under: exploration of interaction and delight. Handle with gloves.*
