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
npm run dev      # the docs site, http://localhost:5173
npm run smoke    # headless-Chrome smoke test of the physics (needs Chrome + dev server)
```

## The core tenet: it's a real design system

Tokens, semantic layers, themes, accessible primitives, composability. You can
build a real, respectable web interface out of these components — forms,
settings pages, dialogs — and at rest it looks like one. The physics is
**latent**: a TUMBLE page is a boring page until someone touches it. Every
component earns its place twice: it has an honest real-world UI job, *and* a
physics quirk. (Anything that couldn't pass the first test — the janitor
crane, the conveyor belt — has been retired to the scrapyard of git history.)

## Surfaces & mass

Material Design grounds elevation in how paper behaves under light. TUMBLE
takes the same premise and refuses to stop: if surfaces are physical they have
**mass**, so they have momentum, restitution, and shear limits on their
mounting bolts. A modal is above your form because it is literally hanging
over it on two ropes; dismissing it cuts them.

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
- **Checkbox ticks pop out** when unchecked and clatter away.
- **Typing rains glyphs** into inputs; shaking a filled input spills its text out.
- **Glass shatters** above its impact tolerance, showing a `COMPONENT DAMAGED`
  placard until repaired.
- **Modals hang from ropes**; toasts pile on a ledge and fall when dismissed.
- **Text has mass.** `PhysicsText` gives every word its own body.
- **Procedural sound.** Thuds, knocks, boings, dings and clinks synthesized in
  WebAudio. No samples.

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
    <PhysicsWorld>
      {/* compose with normal CSS layout — flex, grid, whatever */}
      <Card title="Sign in" material="wood">…</Card>
    </PhysicsWorld>
  );
}
```

`<PhysicsWorld>` owns the Matter engine, the render loop, walls/floor, pointer
drag, collision routing and the loose-parts layer. Components must live inside it.

### Components

Every component takes a `material` prop (see below) alongside its real API.

| Component | Semantics | Physics behaviour |
| --- | --- | --- |
| `Button` | `<button>` | Shockwave on click; physically pressable; `variant`, `size`. `magnetic`: hold to recall every loose metal part |
| `RadioGroup` / `Radio` | native radios | Selection dot is a brass ball; ejects on deselect, catchable by empty dials |
| `Checkbox` | native checkbox | Tick pops out as debris on uncheck; impact-toggleable |
| `Toggle` | `role="switch"` | Lever slam: recoil + shockwave on flip |
| `Input` | `<label>` + `<input>` | Typed glyphs fall in; shake to spill & clear |
| `Card` | `<section>` | The material showcase; **glass shatters**; corner screws reflect surviving mounts; `vehicle` bolts children to the card |
| `Select` | listbox | **A hydraulic press**: the options panel drives down on pistons and shoves the UI aside; picking drops the menu out of the interface |
| `Slider` | `role="slider"` | The thumb is a ball in the groove; knock it and it sloshes, tilt it and your setting rolls downhill |
| `Stepper` | `role="spinbutton"` | Inflates per increment, grows buoyant, **bursts** past max (`onBurst`) |
| `Toaster` / `toast()` | `aria-live` | Physics deferred: a toast only falls when dismissed or knocked off the full ledge |
| `Tabs` | `role="tablist"` | Deliberately physics-free wayfinding. Every shop needs a fire exit |
| `ProgressBar` | `role="progressbar"` | Filled with ball bearings; overflows at 100% (`onOverflow`); spills if tilted past ~25° |
| `Modal` | `role="dialog"` | Lowered on two ropes; close = cut ropes; contents are `PhysicsExempt` passengers |
| `PhysicsText` | `h1–h3/p/span/label` | Each word is a body; `setting="loose"` scatters easily |

### Materials (the token layer of physics)

Every component's `material` prop sets density, restitution, friction, shatter
tolerance, its **impact voice**, and its finish (`--tmbl-mat-*` tint):

| Material | Feel | Voice |
| --- | --- | --- |
| `steel` | dense, dead drop | thud |
| `wood` | the workshop default | knock |
| `rubber` | superball | boing |
| `brass` | heavy, ringy | ding |
| `glass` | brittle — **shatters** | clink |
| `paper` | near-weightless, high drag | flutter |

### Design tokens & theming

Everything visual is a CSS custom property in `src/styles/tokens.css` under
`--tmbl-*`, in three layers: **primitives** (paper/ink scales, safety orange,
brass, blueprint), **semantic** (`--tmbl-color-bg/surface/text/action/focus/…`),
and **material** (`--tmbl-mat-surface`, mixed from a per-material tint and the
theme surface via `color-mix`).

Dark mode: set `data-theme="dark"` on `<html>` and the paper/ink scales swap
roles — the night shift. Shadows don't flip (`--tmbl-shade`): shadows are cast
by mass, not by fashion. The docs initialise the attribute from
`prefers-color-scheme`; library consumers own it. `prefers-reduced-motion`
disables ambient CSS animation.

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

`useWorld()` exposes the machine room: `spawnLoose`, `getLoose(kind)`,
`setGravity`, `resetMachine`, `onFrame`, the raw Matter `engine`, and the
registry of every body. `PhysicsExempt` makes a subtree inert (that's how modal
contents ride the panel, and how the docs' Reset button can never be torn off).

## How it holds together

- **Flow bodies**: components stay in document flow; physics is a transform
  *delta* from their layout home, so resting UI is pixel-crisp and
  layout/resize keep working.
- **Gravity compensation**: fully-mounted parts have gravity cancelled each tick
  — no spring sag. Lose a bolt and gravity applies again.
- **Collision categories**: `PART`, `LOOSE`, `DEBRIS` (can't jam your form),
  `WORLD`, `OVERLAY` (modals and dismissed toasts only collide with each other).
- **Hitboxes**: labelled controls collide as their interactive part only.
- **Cross-component behaviours** ride the collision bus (`onImpact`), which is
  what makes balls press buttons and empty radio dials reel in passing balls.
- **One rAF loop**, fixed 60Hz step; DOM writes are imperative. React owns
  discrete state only.

## Known limits / future work

- Vehicles don't nest (falls back to page mounting with a console warning).
- Touch dragging works, but the world blocks touch scrolling inside it —
  the docs remain desktop-first.

*Filed under: exploration of interaction and delight. Handle with gloves.*
