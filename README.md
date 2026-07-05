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

## The core tenet: it looks like a normal UI

You should be able to build a real, respectable web interface out of these
components — forms, settings pages, dialogs — and at rest it should look like
one. The physics is **latent**: a TUMBLE page is a boring page until someone
touches it. The system has two tiers:

- **Component tier** — Button, Input, Select, Slider, Stepper, Radio,
  Checkbox, Toggle, Card, Modal, Toast, Text. These read as standard UI. The
  twist lives inside the interaction: the dropdown is a hydraulic press, the
  slider thumb is a ball that rolls if you don't keep the UI level, the
  stepper inflates, notifications physically pile up until dismissed.
- **Machinery tier** — Conveyor, Crane, Magnet, PartsBin. Openly mechanical,
  opt-in scenery that gives the loose parts somewhere to go. The trash can is
  a claw machine; the raw electromagnet also ships embedded in a normal
  control (`<Button magnetic>`).

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
- **Machinery**: conveyor belts carry whatever lands on them (click to
  reverse), and the janitor crane files loose parts in the bin.
- **Procedural sound.** Thuds, knocks, boings, brass dings and glass clinks are
  synthesized in ~150 lines of WebAudio. No samples.

## Using it

```tsx
import {
  PhysicsWorld, Card, Input, RadioGroup, Radio, Checkbox,
  Toggle, Button, Modal, PhysicsText, Select, Slider, Toaster,
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
| `Button` | `<button>` | Steel. Shockwave on click; physically pressable; `variant` primary/secondary/danger, `size` sm/md/lg. `magnetic`: hold it down and it becomes an electromagnet that recalls every loose metal part in the shop |
| `RadioGroup` / `Radio` | native radios | Selection dot is a brass ball; ejects on deselect, catchable by empty dials |
| `Checkbox` | native checkbox | Tick pops out as debris on uncheck; impact-toggleable |
| `Toggle` | `role="switch"` | Lever slam: recoil + shockwave on flip |
| `Input` | `<label>` + `<input>` | Typed glyphs fall in; shake to spill & clear |
| `Card` | `<section>` | `material` prop; **glass shatters**, shows repair state; corner screws reflect surviving mounts |
| `Select` | `aria-haspopup` listbox | **A hydraulic press.** The steel options panel is driven down on two pistons and physically shoves the UI beneath it aside; picking releases the pistons and the unwanted menu falls out of the interface. Drag the trigger and the open menu swings along |
| `Slider` | `role="slider"` | The thumb is a brass ball in the groove. Drag it like any slider — but knock the component and the ball sloshes; tilt it and your setting rolls downhill. A slider dangling off one bolt pegs itself |
| `Stepper` | `role="spinbutton"` | Inflates with every increment, grows buoyant (strains upward against its bolts; floats away if torn off), and **bursts** past max — scraps, bang, value slams to min. `onBurst` hook |
| `Toaster` / `toast()` | `aria-live` region | Arrives like a normal toast: stacked, legible, on top of everything. The physics is **deferred** — a toast only becomes a falling object when you dismiss it (×) or a new arrival knocks the oldest off the full ledge. Dismissed toasts fall on the overlay layer: through the UI, not into it |
| `Tabs` | `role="tablist"` (arrow keys) | Pure navigation chrome: folder tabs, arrow-key roving, a small mechanical settle on the incoming panel — and deliberately nothing else |
| `ProgressBar` | `role="progressbar"` | Filled with actual ball bearings. At 100% it **overflows** — surplus dribbles over the brim (`onOverflow`). Tip it past ~25° and the whole quota spills; level it to recover |
| `Modal` | `role="dialog"` | Lowered from ceiling on two ropes; close = cut ropes; contents are `PhysicsExempt` passengers |
| `PhysicsText` | `h1–h3/p/span/label` | Each word is a body; `setting="loose"` scatters easily |
| `Card` (+`vehicle`) | `<section>` | With `vehicle`, children bolt to the card instead of the page: throw the card and its controls ride along, or tear them off it one by one |
| `Conveyor` | machinery | Static; drags riders along the belt; click to reverse |
| `Crane` | machinery | The janitor: patrols its rail, lowers a claw on a rope, grabs the lowest-lying loose part and files it at the drop point. `auto` or manual CYCLE |
| `Magnet` | machinery (toggle chip) | The raw shop electromagnet. Prefer `<Button magnetic>` for the same power inside a normal control |
| `PartsBin` | machinery | The trash can: collects any loose part that settles inside, with a running tally |

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
riding inside another body (that's how modal contents work) — it also makes
any component **inert**: the demo wraps its "Reset machine" button in it so
the escape hatch can never be torn off, thrown, or pressed by falling debris.

## How it holds together

- **Flow bodies**: components stay in document flow; physics is a transform
  *delta* from their layout home, so resting UI is pixel-crisp (the transform is
  removed entirely below a threshold) and layout/resize keep working.
- **Gravity compensation**: fully-mounted parts have gravity cancelled each tick
  — no spring sag — so the "boring form" really is boring until provoked. Lose a
  bolt and gravity applies again.
- **Collision categories** keep the machine sane: `PART` (mounted components),
  `LOOSE` (balls, torn-off parts), `DEBRIS` (shards, spilled letters — they
  can't jam your form), `WORLD` (walls, belts), and `OVERLAY` (modals and
  dismissed toasts — they only collide with each other, so the drop-in is
  never cut short by the header).
- **Hitboxes**: labelled controls collide as their interactive part only —
  an Input's body is its field, a Slider's is its groove. No invisible walls
  where a label happens to be. (`usePhysicsBody({ hitboxRef })`.)
- **Cross-component behaviours** ride the collision bus (`onImpact` with speed +
  the other entry's `kind`/`data`), which is what makes balls press buttons,
  debris toggle checkboxes, and empty radio dials reel in passing balls.
- **One rAF loop**, fixed 60Hz step with an accumulator; DOM writes are
  imperative (no React re-render per frame). React owns discrete state only.

## Composition recipes (things that emerge, not features)

- Belt → dump point → crane → bin: the shop cleans itself.
- Hold the magnetic recall button until the shop's stray balls cling to it,
  then release them over a radio group: empty dials are gently magnetic and
  will catch a slow ball — selection by ball delivery.
- Burst a stepper near the glass card: the scraps are harmless (debris), but
  the bang's shockwave isn't.
- Fill the quota bar to 100% and let the overflow bearings roll to the belt —
  the janitor files your surplus productivity as scrap.
- Flick a toast off the ledge: it's litter now, and litter is the janitor's
  problem.
- Open a Select above your checkboxes and enjoy the physical layout shift.

## Responsiveness

The demo renders as a normal, well-behaved page at any viewport — the world
grows with its content (the container is observed, walls and layout homes
re-seat on any resize or tab switch), the header wraps, floors stack on
narrow screens, and nothing is displaced on initial load. Resizing a live,
already-wrecked machine can of course cause collisions; that's gravity's
department.

## Known limits / future work

- Vehicles don't nest (a vehicle card inside another vehicle card falls back
  to page mounting, with a console warning).
- The crane chases conveyor-borne targets slower than the belt moves; it
  misses a lot. The union has been notified.
- Touch dragging works, but the world blocks touch scrolling inside it —
  the demo remains desktop-first.

*Filed under: exploration of interaction and delight. Handle with gloves.*
