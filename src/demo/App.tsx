import { useRef, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Conveyor,
  Crane,
  Input,
  Modal,
  PartsBin,
  PhysicsExempt,
  PhysicsText,
  PhysicsWorld,
  ProgressBar,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Stepper,
  Tabs,
  Toaster,
  Toggle,
  toast,
} from '../index';
import { useWorld } from '../physics/PhysicsWorld';
import type { MaterialName } from '../physics/materials';

export default function App() {
  return (
    <PhysicsWorld className="shop">
      <Playground />
    </PhysicsWorld>
  );
}

type DocTab = 'getting-started' | 'materials' | 'components' | 'machinery';

function Playground() {
  const { setGravity, setSound, soundOn, resetMachine, spawnLoose, getBounds, containerRef } = useWorld();
  const [tab, setTab] = useState<DocTab>('getting-started');

  // Ref for targeting the glass card with a horizontally-fired steel slab
  const glassCardRef = useRef<HTMLDivElement>(null);

  // Components tab state
  const [name, setName] = useState('');
  const [callsign, setCallsign] = useState('');
  const [shift, setShift] = useState<string | null>('day');
  const [union, setUnion] = useState(true);
  const [goggles, setGoggles] = useState(false);
  const [department, setDepartment] = useState<string | null>(null);
  const [torque, setTorque] = useState(40);
  const [submitted, setSubmitted] = useState(false);

  // Machinery tab state
  const [zeroG, setZeroG] = useState(false);
  const [psi, setPsi] = useState(3);
  const [quota, setQuota] = useState(55);
  const [terms, setTerms] = useState(false);
  const [crateFragile, setCrateFragile] = useState(true);
  const [crateUpright, setCrateUpright] = useState(false);

  const spawnMaterial = (material: MaterialName) => {
    const { w } = getBounds();
    const x = w * 0.2 + Math.random() * w * 0.6;
    const isCircle = material === 'rubber' || material === 'brass';
    const size = {
      steel:  { w: 44, h: 28 },
      rubber: { w: 28, h: 28 },
      paper:  { w: 72, h: 48 },
      wood:   { w: 38, h: 26 },
      brass:  { w: 22, h: 22 },
      glass:  { w: 36, h: 24 },
    }[material];
    spawnLoose({
      kind: isCircle ? 'loose-ball' : 'loose-slab',
      material,
      shape: isCircle ? 'circle' : 'rect',
      w: size.w,
      h: size.h,
      x,
      y: -50,
      vx: (Math.random() - 0.5) * 6,
      vy: material === 'paper' ? 1 : 3,
      spin: material === 'paper' ? (Math.random() - 0.5) * 0.25 : 0,
      className: `docs-loose docs-loose--${material}`,
    });
  };

  const dropPart = () => {
    const materials: MaterialName[] = ['brass', 'steel', 'rubber'];
    spawnMaterial(materials[Math.floor(Math.random() * materials.length)]);
  };

  /* ── Getting Started ─────────────────────────────────────────── */
  const gettingStartedSection = (
    <main className="docs-content">
      <div className="docs-two-col">
        <div className="docs-main-col">

          <section className="docs-section">
            <span className="docs-tag">Overview</span>
            <PhysicsText as="h2" className="docs-hero-title" viewportCollide trailingBall>
              A design system with consequences.
            </PhysicsText>
            <Card material="wood" className="docs-intro-card">
              <p className="docs-p">
                Every component is a rigid body in a shared 2D physics world. The UI lays out like
                any component library — then gravity, collision, and the user's throwing arm get a
                vote.
              </p>
              <p className="docs-p">
                React + Matter.js. Components render as <strong>real DOM</strong> (native inputs,
                buttons, labels — focus rings, keyboards and screen readers all work). Each
                component registers a rigid body bolted to its layout position by two breakable
                spring mounts. At rest: a boring page. Pull something 90px off-station and a bolt
                shears.
              </p>
            </Card>
          </section>

          <section className="docs-section">
            <span className="docs-tag">Installation</span>
            <h3 className="docs-h3">Install</h3>
            <Card material="steel" className="docs-code-card">
              <pre className="docs-pre"><code>npm install tumble-ui</code></pre>
            </Card>
            <p className="docs-fine">Installation card is stamped in steel — dense, barely bounces. Drag it.</p>
          </section>

          <section className="docs-section">
            <span className="docs-tag">Usage</span>
            <h3 className="docs-h3">Quick start</h3>
            <Card material="wood" className="docs-code-card">
              <pre className="docs-pre"><code>{`import {
  PhysicsWorld, Card, Input,
  RadioGroup, Radio, Button,
} from 'tumble-ui';
import 'tumble-ui/styles.css';

function App() {
  return (
    <PhysicsWorld>
      <Card title="Sign in" material="wood">
        <Input label="Name" />
        <Button>Submit</Button>
      </Card>
    </PhysicsWorld>
  );
}`}</code></pre>
            </Card>
            <p className="docs-fine">
              <code className="docs-code-inline">PhysicsWorld</code> owns the engine, walls, pointer drag and collision
              routing. Components must live inside it.
            </p>
          </section>

          <section className="docs-section">
            <span className="docs-tag">Concept</span>
            <h3 className="docs-h3">Two tiers</h3>
            <div className="docs-tier-grid">
              <Card material="wood" title="Component tier">
                <ul className="docs-list">
                  <li>Button, Input, Select, Slider, Stepper, Radio, Checkbox, Toggle, Card, Modal, Toast, Text.</li>
                  <li>Read as standard UI at rest.</li>
                  <li>The twist lives inside the interaction.</li>
                </ul>
              </Card>
              <Card material="steel" title="Machinery tier">
                <ul className="docs-list">
                  <li>Conveyor, Crane, Magnet, PartsBin.</li>
                  <li>Openly mechanical. Opt-in scenery.</li>
                  <li>Gives loose parts somewhere to go.</li>
                </ul>
              </Card>
            </div>
          </section>

        </div>

        <aside className="docs-side-col">
          <Card material="glass" title="Try it now">
            <p className="docs-p docs-p--sm">
              Grab any element on this page and throw it. This card is <strong>glass</strong> — above
              its impact tolerance it will shatter. The installation card (steel) across the page weighs
              enough to break it.
            </p>
          </Card>

          <Card material="wood" title="What just happened">
            <ul className="docs-list docs-list--sm">
              <li>Every element here is a rigid body.</li>
              <li>Pull hard: bolts shear. One left and it dangles.</li>
              <li>Drop something heavy on a Button to fire its onClick.</li>
              <li>Shake a filled Input to spill the letters.</li>
              <li>The tagline above is PhysicsText — each word has mass.</li>
            </ul>
          </Card>

          <Card material="paper" title="Design tokens">
            <p className="docs-p docs-p--sm">
              This card is <strong>paper</strong> — near-weightless. Throw it across the page and watch
              it drift. Every material token lives in <code className="docs-code-inline">tokens.css</code> under{' '}
              <code className="docs-code-inline">--tmbl-*</code>.
            </p>
          </Card>
        </aside>
      </div>
    </main>
  );

  /* ── Materials ───────────────────────────────────────────────── */
  const materialsSection = (
    <main className="docs-content">
      <div className="docs-section-header">
        <span className="docs-tag">Reference</span>
        <PhysicsText as="h2" className="docs-h2">Materials</PhysicsText>
        <p className="docs-lead">
          Every part is stamped from a material that sets density, restitution, friction, shatter
          tolerance and its impact voice. <strong>The cards below are the materials</strong> — pick them up
          and feel the difference.
        </p>
      </div>

      <div className="docs-materials-grid">

        <Card material="steel" title="Steel" className="docs-mat-card">
          <dl className="docs-mat-props">
            <div className="docs-mat-row"><dt>density</dt><dd>0.0035</dd></div>
            <div className="docs-mat-row"><dt>restitution</dt><dd>0.08</dd></div>
            <div className="docs-mat-row"><dt>voice</dt><dd>thud</dd></div>
          </dl>
          <p className="docs-mat-desc">
            Dense, dead drop. Barely bounces. Buttons, machine frames, the installation
            card in Getting Started. Pick this up and drop it — hear the thud, watch it
            barely bounce.
          </p>
          <Button size="sm" variant="secondary" onClick={() => spawnMaterial('steel')}>
            Drop steel slab
          </Button>
        </Card>

        <Card material="rubber" title="Rubber" className="docs-mat-card">
          <dl className="docs-mat-props">
            <div className="docs-mat-row"><dt>density</dt><dd>0.0008</dd></div>
            <div className="docs-mat-row"><dt>restitution</dt><dd>0.92</dd></div>
            <div className="docs-mat-row"><dt>voice</dt><dd>boing</dd></div>
          </dl>
          <p className="docs-mat-desc">
            The superball. Restitution of 0.92 is nearly perfect elastic. Throw this card
            against the floor or wall and step back. The drop button spawns a loose rubber
            ball that will bounce until it finds a corner.
          </p>
          <Button size="sm" variant="secondary" onClick={() => spawnMaterial('rubber')}>
            Drop rubber ball
          </Button>
        </Card>

        <Card material="paper" title="Paper" className="docs-mat-card">
          <dl className="docs-mat-props">
            <div className="docs-mat-row"><dt>density</dt><dd>0.0003</dd></div>
            <div className="docs-mat-row"><dt>frictionAir</dt><dd>0.06</dd></div>
            <div className="docs-mat-row"><dt>voice</dt><dd>flutter</dd></div>
          </dl>
          <p className="docs-mat-desc">
            Near-weightless, high air drag. Drifts when thrown — it won't fall straight down.
            PhysicsText words use this material: each word has mass but floats. See the tagline
            in Getting Started.
          </p>
          <Button size="sm" variant="secondary" onClick={() => spawnMaterial('paper')}>
            Drop paper sheet
          </Button>
        </Card>

        <Card material="wood" title="Wood" className="docs-mat-card">
          <dl className="docs-mat-props">
            <div className="docs-mat-row"><dt>density</dt><dd>0.0012</dd></div>
            <div className="docs-mat-row"><dt>restitution</dt><dd>0.25</dd></div>
            <div className="docs-mat-row"><dt>voice</dt><dd>knock</dd></div>
          </dl>
          <p className="docs-mat-desc">
            The workshop default. Most Cards and Inputs are wood. Solid but not heavy — a
            satisfying knock on impact, a reasonable bounce. If you don't specify a material,
            you get wood.
          </p>
          <Button size="sm" variant="secondary" onClick={() => spawnMaterial('wood')}>
            Drop wood block
          </Button>
        </Card>

        <Card material="brass" title="Brass" className="docs-mat-card">
          <dl className="docs-mat-props">
            <div className="docs-mat-row"><dt>density</dt><dd>0.0028</dd></div>
            <div className="docs-mat-row"><dt>restitution</dt><dd>0.42</dd></div>
            <div className="docs-mat-row"><dt>voice</dt><dd>ding</dd></div>
          </dl>
          <p className="docs-mat-desc">
            Heavy and ringy. Radio selection dots are brass balls — change a selection and the
            old ball ejects into the world. An empty dial is gently magnetic and will catch a
            slow ball that rolls in, selecting that option.
          </p>
          <Button size="sm" variant="secondary" onClick={() => spawnMaterial('brass')}>
            Drop brass ball
          </Button>
        </Card>

        <div ref={glassCardRef}>
          <Card material="glass" title="Glass" className="docs-mat-card">
            <dl className="docs-mat-props">
              <div className="docs-mat-row"><dt>density</dt><dd>0.001</dd></div>
              <div className="docs-mat-row"><dt>shatterAt</dt><dd>11 px/tick</dd></div>
              <div className="docs-mat-row"><dt>voice</dt><dd>clink</dd></div>
            </dl>
            <p className="docs-mat-desc">
              Brittle. Above its impact tolerance, a glass card shatters and shows a COMPONENT
              DAMAGED placard until repaired. This card is glass — it can shatter too.
            </p>
            <Button size="sm" variant="secondary" onClick={() => {
              const cEl = containerRef.current;
              const gEl = glassCardRef.current;
              if (!cEl || !gEl) return;
              const cRect = cEl.getBoundingClientRect();
              const gRect = gEl.getBoundingClientRect();
              const { w } = getBounds();
              // Fire from the right edge at the glass card's centre height.
              // Glass is the rightmost card so the slab hits it first,
              // bypassing Paper which is directly above it.
              const targetY = gRect.top - cRect.top + gRect.height / 2;
              spawnLoose({
                kind: 'loose-slab',
                material: 'steel',
                shape: 'rect',
                w: 44, h: 28,
                x: w - 10,
                y: targetY,
                vx: -20,
                vy: (Math.random() - 0.5) * 2,
                className: 'docs-loose docs-loose--steel',
              });
            }}>
              Fire steel → (to shatter)
            </Button>
          </Card>
        </div>

      </div>

      <section className="docs-section docs-section--table">
        <h3 className="docs-h3">Reference table</h3>
        <Card material="wood" className="docs-table-card">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Feel</th>
                <th>Voice</th>
                <th>Shatters?</th>
                <th>Default use</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>steel</code></td><td>dense, dead drop</td><td>thud</td><td>—</td><td>Button, machine frames</td></tr>
              <tr><td><code>wood</code></td><td>workshop default</td><td>knock</td><td>—</td><td>Card, Input (default)</td></tr>
              <tr><td><code>rubber</code></td><td>superball</td><td>boing</td><td>—</td><td>bumpers, toggle knobs</td></tr>
              <tr><td><code>brass</code></td><td>heavy, ringy</td><td>ding</td><td>—</td><td>radio balls, fittings</td></tr>
              <tr><td><code>glass</code></td><td>brittle</td><td>clink</td><td>above 11 px/t</td><td>notice cards</td></tr>
              <tr><td><code>paper</code></td><td>near-weightless</td><td>flutter</td><td>—</td><td>labels, PhysicsText</td></tr>
            </tbody>
          </table>
        </Card>
      </section>
    </main>
  );

  /* ── Components ──────────────────────────────────────────────── */
  const componentsSection = (
    <main className="docs-content">
      <div className="docs-two-col">
        <section className="docs-main-col">

          <div className="docs-section-header">
            <span className="docs-tag">Reference</span>
            <h2 className="docs-h2">Components</h2>
            <p className="docs-lead">
              Standard UI components with physics built in. Every element below is a rigid body —
              draggable, throwable, and fully interactive.
            </p>
          </div>

          <div className="docs-comp-group">
            <h3 className="docs-h3">Input</h3>
            <p className="docs-p docs-p--sm">
              Typed glyphs rain into the field as falling characters. Shake the component to spill the
              letters and clear the field.
            </p>
            <div className="docs-bench-grid">
              <Input
                label="Full name"
                value={name}
                onChange={setName}
                placeholder="e.g. R. Goldberg"
                hint="shake to empty"
                autoComplete="off"
              />
              <Input
                label="Callsign"
                value={callsign}
                onChange={setCallsign}
                placeholder="PINBALL-01"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="docs-comp-group">
            <h3 className="docs-h3">Select</h3>
            <p className="docs-p docs-p--sm">
              A hydraulic press. The steel options panel is driven down on two pistons and physically
              shoves the UI beneath it aside. Drag the trigger while open and the panel swings along.
            </p>
            <div className="docs-bench-grid docs-bench-grid--wide">
              <Select
                label="Department"
                value={department}
                onChange={setDepartment}
                placeholder="Assign me anywhere"
                options={[
                  { value: 'ballistics', label: 'Ballistics' },
                  { value: 'pendulums', label: 'Pendulums' },
                  { value: 'springs', label: 'Springs & Dampers' },
                  { value: 'custodial', label: 'Custodial (janitor unit)' },
                ]}
              />
              <Slider label="Max torque" unit=" Nm" min={0} max={100} step={5} value={torque} onChange={setTorque} />
            </div>
          </div>

          <div className="docs-comp-group">
            <h3 className="docs-h3">RadioGroup · Checkbox · Toggle</h3>
            <p className="docs-p docs-p--sm">
              Radio selection dot is a brass ball — ejects on deselect, catchable by empty dials. Checkbox
              ticks pop out as debris. Toggle fires a lever-slam recoil and shockwave.
            </p>
            <div className="docs-bench-grid">
              <RadioGroup name="shift" label="Shift — dot is a brass ball" value={shift} onChange={setShift}>
                <Radio value="day">Day shift</Radio>
                <Radio value="swing">Swing shift</Radio>
                <Radio value="graveyard">Graveyard</Radio>
              </RadioGroup>
              <div className="docs-checks">
                <span className="tmbl-field-label">Certifications</span>
                <Checkbox checked={union} onChange={setUnion}>Union member, Local 404</Checkbox>
                <Checkbox checked={goggles} onChange={setGoggles}>Safety goggles fitted</Checkbox>
              </div>
            </div>
          </div>

          <div className="docs-comp-group">
            <h3 className="docs-h3">Button</h3>
            <p className="docs-p docs-p--sm">
              Steel. Shockwave on click shoves neighbours. Physically pressable by objects — anything
              heavy landing on a button fires its <code className="docs-code-inline">onClick</code>. Hold the magnetic variant
              to recall every loose metal part in the shop.
            </p>
            <div className="docs-button-row">
              <Button
                size="lg"
                onClick={() => {
                  setSubmitted(true);
                  toast('Application received — lowering paperwork', 'success');
                }}
              >
                Submit application
              </Button>
              <Button size="sm" variant="secondary" magnetic>
                Recall parts (hold)
              </Button>
              <Button size="sm" variant="danger">Danger</Button>
            </div>
            <p className="docs-fine">Pressing Submit fires a toast and opens a Modal (lowered on ropes).</p>
          </div>

        </section>

        <aside className="docs-side-col">
          <Card title="Notice" material="glass">
            <p className="docs-p docs-p--sm">
              This card is <strong>glass</strong>. Take the steel slab you dropped on the Materials tab
              and throw it here — it will shatter.
            </p>
          </Card>

          <Card title="Operating tips" material="wood">
            <ul className="docs-list docs-list--sm">
              <li>Grab any component. Throw it.</li>
              <li>Pull hard to shear a part off its mounts — one bolt left and it dangles like a broken shop sign.</li>
              <li>Change a radio: the old ball drops. Roll it into another empty dial to select.</li>
              <li>Drop something heavy on a Button to press it.</li>
              <li>Shake a filled Input field to spill letters.</li>
            </ul>
          </Card>

          <Card title="usePhysicsBody" material="steel">
            <pre className="docs-pre docs-pre--sm"><code>{`usePhysicsBody<HTMLDivElement>({
  kind: 'gauge',
  material: 'brass',
  mounts: 1,
  mountBreakAt: 60,
  onImpact: ({ speed }) =>
    speed > 8 && alert('ouch'),
})`}</code></pre>
          </Card>
        </aside>
      </div>
    </main>
  );

  /* ── Machinery ───────────────────────────────────────────────── */
  const machinerySection = (
    <main className="docs-content">
      <div className="docs-two-col">
        <section className="docs-main-col">

          <div className="docs-section-header">
            <span className="docs-tag">Machinery</span>
            <h2 className="docs-h2">Machinery tier</h2>
            <p className="docs-lead">
              Openly mechanical, opt-in scenery. The Conveyor carries riders along the belt (click to
              reverse). The Crane patrols its rail, lowers a claw, grabs the lowest-lying loose part and
              files it in the bin.
            </p>
          </div>

          <div className="docs-comp-group">
            <h3 className="docs-h3">Stepper + ProgressBar</h3>
            <p className="docs-p docs-p--sm">
              Stepper inflates with every increment and <strong>bursts</strong> past max — scraps, bang,
              value slams to min. ProgressBar fills with actual brass ball bearings; overflows at 100%;
              tip it past ~25° and the whole quota spills.
            </p>
            <div className="docs-gauges">
              <Stepper
                label="Tank pressure"
                unit="PSI"
                min={0}
                max={8}
                value={psi}
                onChange={setPsi}
                onBurst={() => toast('Pressure vessel failure. Refitting diaphragm.', 'warning')}
              />
              <div className="docs-quota">
                <ProgressBar
                  label="Daily quota"
                  value={quota}
                  max={100}
                  onOverflow={() => toast('Quota met. Surplus directed to floor.', 'success')}
                />
                <Button size="sm" variant="secondary" onClick={() => setQuota((q) => Math.min(100, q + 15))}>
                  Log output +15%
                </Button>
              </div>
              <p className="docs-fine">
                Past 8 PSI the stepper bursts. At 100% the bar overflows and spills ball bearings onto
                the conveyor. The janitor crane will file them.
              </p>
            </div>
          </div>

          <div className="docs-comp-group">
            <h3 className="docs-h3">Vehicle Card</h3>
            <p className="docs-p docs-p--sm">
              With <code className="docs-code-inline">vehicle</code> prop, children bolt to the Card instead of the page: throw the
              card and its controls ride along, or tear them off it one by one. PhysicsText words are set in
              weak letterpress glue.
            </p>
            <Card title="Terms & conditions" material="wood" vehicle className="docs-terms">
              <PhysicsText as="p" setting="loose" className="docs-terms-text">
                The undersigned operator agrees that all interface components are supplied with mass,
                momentum and a two-bolt mounting warranty which is void the moment anybody touches
                anything. Words in this agreement are set in weak letterpress glue and constitute
                load bearing typography.
              </PhysicsText>
              <Checkbox
                checked={terms}
                onChange={(v) => {
                  setTerms(v);
                  if (v) toast('Terms accepted. Legally binding, allegedly.', 'info');
                }}
              >
                I read the above while it was still attached
              </Checkbox>
            </Card>
          </div>

          <div className="docs-comp-group">
            <h3 className="docs-h3">Shipping Crate</h3>
            <Card title="Shipping crate" material="wood" vehicle className="docs-crate">
              <p className="docs-fine docs-fine--card">VEHICLE — drag the crate and everything rides along. Tear controls off it one by one.</p>
              <div className="docs-crate-row">
                <Checkbox checked={crateFragile} onChange={setCrateFragile}>Fragile</Checkbox>
                <Checkbox checked={crateUpright} onChange={setCrateUpright}>This way up</Checkbox>
                <Button size="sm" variant="secondary" onClick={() => {}}>Inspect</Button>
              </div>
            </Card>
          </div>

        </section>

        <aside className="docs-side-col">
          <div className="docs-crane-zone">
            <Crane auto dropAt={0.07} />
            <div className="docs-crane-floor">
              <PartsBin label="Scrap" />
              <span className="docs-fine">
                The janitor grabs whatever is lying around and files it in the bin. Drop a part to
                give it something to do.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );

  /* ── Shell ───────────────────────────────────────────────────── */
  return (
    <>
      <div className="shop-blueprint" aria-hidden="true" />

      <header className="docs-header">
        <div className="docs-brand">
          <h1 className="docs-logo">
            TUMBLE<span className="docs-logo__reg">®</span>
          </h1>
          <span className="docs-badge">docs</span>
        </div>
        <div className="docs-header-controls">
          <Toggle checked={zeroG} onChange={(v) => { setZeroG(v); setGravity(v ? 0.05 : 1); }}>
            Zero-G
          </Toggle>
          <Toggle checked={soundOn} onChange={setSound}>
            Sound
          </Toggle>
          <Button variant="secondary" size="sm" onClick={dropPart}>
            Drop part
          </Button>
          <PhysicsExempt>
            <Button variant="danger" size="sm" onClick={resetMachine}>
              Reset
            </Button>
          </PhysicsExempt>
        </div>
        <div className="shop-toaster">
          <Toaster />
        </div>
      </header>

      <Tabs
        label="Documentation"
        className="docs-tabs"
        value={tab}
        onChange={(id) => setTab(id as DocTab)}
        tabs={[
          { id: 'getting-started', label: 'Getting Started', content: gettingStartedSection },
          { id: 'materials',       label: 'Materials',        content: materialsSection },
          { id: 'components',      label: 'Components',       content: componentsSection },
          { id: 'machinery',       label: 'Machinery',        content: machinerySection },
        ]}
      />

      <div className="shop-belt">
        <Conveyor speed={3.2} />
      </div>

      <footer className="shop-footer" aria-hidden="true">
        <span>R.G. TUMBLE &amp; SONS · PRECISION INTERFACE WORKS · EST. 2026</span>
        <span>TOLERANCES ±90PX · ALL PARTS DRAGGABLE · NO WARRANTY EXPRESS OR IMPLIED</span>
      </footer>

      <Modal open={submitted} onClose={() => setSubmitted(false)} title="Application received">
        <p>
          Thank you, <strong>{name.trim() || 'unnamed operator'}</strong>. Your paperwork has been
          lowered into the machine for processing{shift ? ` on the ${shift} shift` : ''}.
        </p>
        <p className="docs-fine">
          Dismissing this dialog cuts the ropes. The panel will fall through your form. This is
          considered normal operation.
        </p>
        <div className="docs-modal-actions">
          <Button variant="secondary" onClick={() => setSubmitted(false)}>
            Jolly good
          </Button>
        </div>
      </Modal>
    </>
  );
}
