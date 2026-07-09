import { useEffect, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
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
import { MATERIALS, type MaterialName } from '../physics/materials';

export default function App() {
  return (
    <PhysicsWorld className="docs">
      <Docs />
    </PhysicsWorld>
  );
}

/* ────────────────────────────────────────────────────────────── helpers */

const ALL_MATERIALS = Object.keys(MATERIALS) as MaterialName[];

/** Chip row for switching a live example's material. Plain DOM — inert. */
function MaterialPicker({
  value,
  onChange,
  exclude = [],
}: {
  value: MaterialName;
  onChange: (m: MaterialName) => void;
  exclude?: MaterialName[];
}) {
  return (
    <div className="docs-matpicker" role="group" aria-label="Material">
      <span className="docs-matpicker__label">material</span>
      {ALL_MATERIALS.filter((m) => !exclude.includes(m)).map((m) => (
        <button
          key={m}
          type="button"
          className="docs-matpicker__chip"
          data-material={m}
          data-active={m === value || undefined}
          aria-pressed={m === value}
          onClick={() => onChange(m)}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

/** One component's documentation entry: name, real use, quirk, live demo. */
function Entry({
  id,
  name,
  use,
  quirk,
  children,
  aside,
}: {
  id: string;
  name: string;
  use: string;
  quirk: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section id={id} className="docs-entry">
      <h3 className="docs-entry__name">{name}</h3>
      <dl className="docs-entry__meta">
        <div className="docs-entry__meta-row">
          <dt>Use it for</dt>
          <dd>{use}</dd>
        </div>
        <div className="docs-entry__meta-row">
          <dt>The physics</dt>
          <dd>{quirk}</dd>
        </div>
      </dl>
      <div className="docs-entry__demo">{children}</div>
      {aside}
    </section>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a className="docs-nav__link" href={`#${to}`}>
      {children}
    </a>
  );
}

/* ────────────────────────────────────────────────────────────── the docs */

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

function Docs() {
  const { setSound, soundOn, resetMachine } = useWorld();
  const [theme, setTheme] = useState<'light' | 'dark'>(prefersDark() ? 'dark' : 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  /* form-ish demo state */
  const [name, setName] = useState('');
  const [dept, setDept] = useState<string | null>(null);
  const [torque, setTorque] = useState(40);
  const [psi, setPsi] = useState(3);
  const [quota, setQuota] = useState(55);
  const [shift, setShift] = useState<string | null>('day');
  const [terms, setTerms] = useState(true);
  const [goggles, setGoggles] = useState(false);
  const [alerts, setAlerts] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [demoTab, setDemoTab] = useState('spec');

  /* per-entry material overrides (key remounts rebuild the body) */
  const [cardMat, setCardMat] = useState<MaterialName>('wood');
  const [checkMat, setCheckMat] = useState<MaterialName>('wood');
  const [inputMat, setInputMat] = useState<MaterialName>('wood');
  const [buttonMat, setButtonMat] = useState<MaterialName>('steel');

  return (
    <div className="docs-shell">
      <header className="docs-header">
        <div className="docs-brand">
          <a className="docs-logo" href="#top">
            TUMBLE<span className="docs-logo__reg">®</span>
          </a>
          <span className="docs-badge">v0.1 · docs</span>
        </div>
        <div className="docs-header-controls">
          <Toggle checked={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')}>
            Night shift
          </Toggle>
          <Toggle checked={soundOn} onChange={setSound}>
            Sound
          </Toggle>
          <PhysicsExempt>
            <Button variant="danger" size="sm" onClick={resetMachine}>
              Reset
            </Button>
          </PhysicsExempt>
        </div>
        <div className="docs-toaster">
          {/* No capacity: this demo never evicts. The pile is the point. */}
          <Toaster capacity={Infinity} />
        </div>
      </header>

      <div className="docs-body">
        <nav className="docs-nav" aria-label="Documentation">
          <span className="docs-nav__group">Foundations</span>
          <NavLink to="introduction">Introduction</NavLink>
          <NavLink to="surfaces">Surfaces &amp; mass</NavLink>
          <NavLink to="getting-started">Getting started</NavLink>
          <NavLink to="tokens">Tokens</NavLink>
          <NavLink to="theming">Theming</NavLink>
          <NavLink to="materials">Materials</NavLink>
          <span className="docs-nav__group">Components</span>
          <NavLink to="button">Button</NavLink>
          <NavLink to="input">Input</NavLink>
          <NavLink to="select">Select</NavLink>
          <NavLink to="slider">Slider</NavLink>
          <NavLink to="stepper">Stepper</NavLink>
          <NavLink to="checkbox">Checkbox</NavLink>
          <NavLink to="radio">Radio</NavLink>
          <NavLink to="toggle">Toggle</NavLink>
          <NavLink to="progress">ProgressBar</NavLink>
          <NavLink to="card">Card</NavLink>
          <NavLink to="modal">Modal</NavLink>
          <NavLink to="toast">Toast</NavLink>
          <NavLink to="tabs">Tabs</NavLink>
          <NavLink to="text">PhysicsText</NavLink>
        </nav>

        <main className="docs-main" id="top">
          {/* ─────────────────────────── hero */}
          <section id="introduction" className="docs-hero">
            <span className="docs-tag">Introduction</span>
            <PhysicsText as="h1" className="docs-hero-title" viewportCollide trailingBall>
              A design system with consequences.
            </PhysicsText>
            <p className="docs-lead">
              TUMBLE is a token-driven, themeable, accessible React component library in which
              every component is also a rigid body in a shared 2D physics world. At rest it lays
              out like any other design system. Then gravity, collision, and your throwing arm
              get a vote. Grab anything on this page — including that headline — and find out.
            </p>
            <p className="docs-lead docs-lead--muted">
              Real DOM, native inputs, focus rings, screen-reader semantics. Take one component,
              put it on your site, and give someone a small moment of delight. Build a whole app
              out of them and may whatever you believe in help your users.
            </p>
          </section>

          {/* ─────────────────────────── philosophy */}
          <section id="surfaces" className="docs-section">
            <span className="docs-tag">Foundations</span>
            <h2 className="docs-h2">Surfaces &amp; mass</h2>
            <p className="docs-p">
              Material Design famously grounds its elevation system in how physical paper behaves
              under light: surfaces cast shadows proportional to their height, and those shadows
              tell you what is above what. TUMBLE takes the same premise and simply refuses to
              stop. If surfaces are physical, they have <strong>mass</strong>. If they have mass,
              they have momentum, restitution, and shear limits on their mounting bolts.
            </p>
            <ul className="docs-list">
              <li><strong>Elevation is literal.</strong> A modal is above your form because it is hanging over it on two ropes.</li>
              <li><strong>Every part is bolted to its layout position</strong> by two breakable spring mounts. Tolerance is ±90px; past that, a bolt shears and the part dangles like a broken shop sign.</li>
              <li><strong>State changes are mechanical events.</strong> A radio's selection dot is a brass ball that physically leaves when deselected. Progress is a trough of ball bearings that spills if you don't keep it level.</li>
              <li><strong>Shadows follow from the simulation</strong> — a part torn free casts the drop shadow of a thing in flight, because it is one.</li>
            </ul>
            <p className="docs-p">
              It is a valid design system: tokens, semantic layers, themes, composable primitives,
              keyboard and screen-reader support. It is also art. Both statements are load-bearing.
            </p>
          </section>

          {/* ─────────────────────────── getting started */}
          <section id="getting-started" className="docs-section">
            <span className="docs-tag">Foundations</span>
            <h2 className="docs-h2">Getting started</h2>
            <Card material="steel" title="Install" className="docs-code-card">
              <pre className="docs-pre" data-tmbl-nodrag=""><code>npm install tumble-ui</code></pre>
            </Card>
            <Card material="wood" title="Usage" className="docs-code-card">
              <pre className="docs-pre" data-tmbl-nodrag=""><code>{`import { PhysicsWorld, Card, Input, Button } from 'tumble-ui';
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
              <code className="docs-code-inline">PhysicsWorld</code> owns the engine, walls,
              pointer drag and collision routing. Components must live inside it. These two cards
              are steel and wood — pick them up and feel the difference.
            </p>
          </section>

          {/* ─────────────────────────── tokens */}
          <section id="tokens" className="docs-section">
            <span className="docs-tag">Foundations</span>
            <h2 className="docs-h2">Tokens</h2>
            <p className="docs-p">
              Everything visual is a CSS custom property under{' '}
              <code className="docs-code-inline">--tmbl-*</code> in{' '}
              <code className="docs-code-inline">tokens.css</code>, in three layers:
            </p>
            <div className="docs-token-grid">
              <Card title="1 · Primitives" material="paper">
                <p className="docs-p docs-p--sm">
                  Raw palette scales: <code className="docs-code-inline">--tmbl-paper-050…300</code>,{' '}
                  <code className="docs-code-inline">--tmbl-ink-300…900</code>, safety orange, brass,
                  blueprint blue. Plus type scale, 4px spacing, radii, motion easings.
                </p>
              </Card>
              <Card title="2 · Semantic" material="paper">
                <p className="docs-p docs-p--sm">
                  What a color means: <code className="docs-code-inline">--tmbl-color-bg</code>,{' '}
                  <code className="docs-code-inline">-surface</code>,{' '}
                  <code className="docs-code-inline">-text</code>,{' '}
                  <code className="docs-code-inline">-action</code>,{' '}
                  <code className="docs-code-inline">-focus</code>,{' '}
                  <code className="docs-code-inline">-danger</code>. Themes override this layer.
                </p>
              </Card>
              <Card title="3 · Material" material="brass">
                <p className="docs-p docs-p--sm">
                  What a part is stamped from. <code className="docs-code-inline">data-material</code>{' '}
                  sets <code className="docs-code-inline">--tmbl-mat-surface</code> (a tint mixed into
                  the theme surface) and, in <code className="docs-code-inline">materials.ts</code>,
                  its density, restitution, shatter point and impact voice.
                </p>
              </Card>
            </div>
          </section>

          {/* ─────────────────────────── theming */}
          <section id="theming" className="docs-section">
            <span className="docs-tag">Foundations</span>
            <h2 className="docs-h2">Theming</h2>
            <p className="docs-p">
              Set <code className="docs-code-inline">data-theme="dark"</code> on{' '}
              <code className="docs-code-inline">&lt;html&gt;</code> and the paper/ink scales swap
              roles — the workshop goes on night shift. Accent colors stay on duty; focus blue gets
              brighter because focus must always win. Material tints are mixed into the theme
              surface with <code className="docs-code-inline">color-mix()</code>, so a brass
              checkbox stays brassy at 2am. Try the “Night shift” toggle in the header.
            </p>
            <p className="docs-fine">
              Shadows do not flip with the theme: shadows are cast by mass, not by fashion
              (<code className="docs-code-inline">--tmbl-shade</code>).
            </p>
          </section>

          {/* ─────────────────────────── materials */}
          <section id="materials" className="docs-section">
            <span className="docs-tag">Foundations</span>
            <h2 className="docs-h2">Materials</h2>
            <p className="docs-p">
              The token layer of the physics. Every component takes a{' '}
              <code className="docs-code-inline">material</code> prop that sets its density,
              restitution, friction, shatter tolerance, impact voice — and its finish.{' '}
              <strong>These cards are the materials.</strong> Pick them up.
            </p>
            <div className="docs-materials-grid">
              {ALL_MATERIALS.map((m) => (
                <Card key={m} material={m} title={m[0].toUpperCase() + m.slice(1)} className="docs-mat-card">
                  <dl className="docs-mat-props">
                    <div className="docs-mat-row"><dt>density</dt><dd>{MATERIALS[m].density}</dd></div>
                    <div className="docs-mat-row"><dt>restitution</dt><dd>{MATERIALS[m].restitution}</dd></div>
                    <div className="docs-mat-row"><dt>voice</dt><dd>{MATERIALS[m].voice}</dd></div>
                    {Number.isFinite(MATERIALS[m].shatterAt) && (
                      <div className="docs-mat-row"><dt>shatters at</dt><dd>{MATERIALS[m].shatterAt} px/tick</dd></div>
                    )}
                  </dl>
                  <p className="docs-mat-desc">{MATERIAL_COPY[m]}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* ─────────────────────────── components */}
          <section className="docs-section docs-section--components">
            <span className="docs-tag">Reference</span>
            <h2 className="docs-h2">Components</h2>
            <p className="docs-p">
              Each entry states the component's honest, real-world job and its physics. Every live
              example below is genuinely interactive — and genuinely draggable.
            </p>

            <Entry
              id="button"
              name="Button"
              use="Primary, secondary and destructive actions. Three sizes, real <button> semantics."
              quirk="Clicking fires a shockwave that shoves neighbouring components. Anything heavy landing on it presses it for real — onClick fires. The magnetic variant, held down, recalls every loose metal part on the page."
            >
              <div className="docs-demo-row" key={`btn-${buttonMat}`}>
                <Button size="lg" material={buttonMat} onClick={() => toast('Order confirmed. Nothing was harmed. Yet.', 'success')}>
                  Confirm order
                </Button>
                <Button variant="secondary" material={buttonMat} magnetic>
                  Recall parts (hold)
                </Button>
                <Button variant="danger" size="sm" material={buttonMat} onClick={() => toast('Deleted. It fell somewhere.', 'warning')}>
                  Delete
                </Button>
              </div>
              <MaterialPicker value={buttonMat} onChange={setButtonMat} />
            </Entry>

            <Entry
              id="input"
              name="Input"
              use="Single-line text entry with label and hint. A normal controlled <input>."
              quirk="Every character you type physically drops into the field from above. Shake the component hard enough and your text spills out letter by letter, clearing the field."
            >
              <div className="docs-demo-grid" key={`in-${inputMat}`}>
                <Input
                  label="Full name"
                  value={name}
                  onChange={setName}
                  placeholder="e.g. R. Goldberg"
                  hint="shake to empty"
                  autoComplete="off"
                  material={inputMat}
                />
              </div>
              <MaterialPicker value={inputMat} onChange={setInputMat} />
            </Entry>

            <Entry
              id="select"
              name="Select"
              use="Choosing one option from a list. Proper listbox semantics, arrow keys, Escape."
              quirk="The options panel is a hydraulic press: driven down on two pistons, it physically shoves the UI beneath it aside. Picking an option releases the pistons and the menu you no longer need falls out of the interface."
            >
              <div className="docs-demo-grid">
                <Select
                  label="Department"
                  value={dept}
                  onChange={setDept}
                  placeholder="Assign me anywhere"
                  options={[
                    { value: 'ballistics', label: 'Ballistics' },
                    { value: 'pendulums', label: 'Pendulums' },
                    { value: 'springs', label: 'Springs & Dampers' },
                  ]}
                />
              </div>
            </Entry>

            <Entry
              id="slider"
              name="Slider"
              use="Picking a value in a range. role=slider, arrow keys, drag."
              quirk="The thumb is a brass ball resting in the groove, and the groove obeys gravity. Knock the component and the ball sloshes; tilt it and your setting rolls downhill. Keep your UI level if you want your settings kept."
            >
              <div className="docs-demo-grid">
                <Slider label="Max torque" unit=" Nm" min={0} max={100} step={5} value={torque} onChange={setTorque} />
              </div>
            </Entry>

            <Entry
              id="stepper"
              name="Stepper"
              use="Precise numeric input with increment/decrement. role=spinbutton."
              quirk="The value bubble inflates with every increment and the gauge grows buoyant, straining against its bolts. Push past max and it bursts: bang, rubber scraps, value slams to min. onBurst is a real event in the API."
            >
              <div className="docs-demo-row">
                <Stepper
                  label="Tank pressure"
                  unit="PSI"
                  min={0}
                  max={8}
                  value={psi}
                  onChange={setPsi}
                  onBurst={() => toast('Pressure vessel failure. Refitting diaphragm.', 'warning')}
                />
              </div>
            </Entry>

            <Entry
              id="checkbox"
              name="Checkbox"
              use="Independent boolean choices — consents, options, settings."
              quirk="Checking stamps the tick in with a clunk. Unchecking pops it out: the tick tile goes flying and clatters around the page. Dropping something heavy on the box toggles it."
            >
              <div className="docs-demo-col" key={`cb-${checkMat}`}>
                <Checkbox checked={terms} onChange={setTerms} material={checkMat}>
                  I accept the terms while they are still attached
                </Checkbox>
                <Checkbox checked={goggles} onChange={setGoggles} material={checkMat}>
                  Safety goggles fitted
                </Checkbox>
              </div>
              <MaterialPicker value={checkMat} onChange={setCheckMat} />
            </Entry>

            <Entry
              id="radio"
              name="RadioGroup / Radio"
              use="Choosing exactly one of a small set. Native radios underneath."
              quirk="The selection dot is an actual brass ball. Change your choice and the old ball is ejected into the world. An empty dial is gently magnetic and catches any slow ball that rolls in — selecting that option. You can answer a form with a pinball."
            >
              <RadioGroup name="shift" label="Shift" value={shift} onChange={setShift}>
                <Radio value="day">Day shift</Radio>
                <Radio value="swing">Swing shift</Radio>
                <Radio value="graveyard">Graveyard</Radio>
              </RadioGroup>
            </Entry>

            <Entry
              id="toggle"
              name="Toggle"
              use="Instant on/off state. role=switch."
              quirk="An industrial lever: flipping it recoils the whole switch and the clunk shoves whatever is nearby. Settings pages become contact sports."
            >
              <div className="docs-demo-col">
                <Toggle checked={alerts} onChange={setAlerts}>
                  Overpressure alerts
                </Toggle>
              </div>
            </Entry>

            <Entry
              id="progress"
              name="ProgressBar"
              use="Determinate progress. role=progressbar with proper aria values."
              quirk="Filled with real ball bearings. At 100% it overflows — surplus dribbles over the brim onto the page (onOverflow fires). Tip it past ~25° and the entire quota spills; level it to recover."
            >
              <div className="docs-demo-col">
                <ProgressBar
                  label="Daily quota"
                  value={quota}
                  max={100}
                  onOverflow={() => toast('Quota met. Surplus directed to floor.', 'success')}
                />
                <div className="docs-demo-row">
                  <Button size="sm" variant="secondary" onClick={() => setQuota((q) => Math.min(100, q + 15))}>
                    Log output +15%
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setQuota(0)}>
                    Reset quota
                  </Button>
                </div>
              </div>
            </Entry>

            <Entry
              id="card"
              name="Card"
              use="Grouping content on a surface. The workhorse container."
              quirk="Corner screws show its two mounting bolts — shear one and it hangs crooked. Material matters most here: steel cards are nearly immovable, paper cards drift when thrown, and glass cards shatter above their impact tolerance, showing a COMPONENT DAMAGED placard until repaired."
            >
              <div key={`card-${cardMat}`}>
                <Card material={cardMat} title="Shipping note" className="docs-demo-card">
                  <p className="docs-p docs-p--sm">
                    This card is <strong>{cardMat}</strong>. Throw it. If it's glass, throw it
                    harder. The REPAIR button appears in the wreckage — nothing here is
                    permanently broken except the metaphor.
                  </p>
                </Card>
              </div>
              <MaterialPicker value={cardMat} onChange={setCardMat} />
            </Entry>

            <Entry
              id="modal"
              name="Modal"
              use="Blocking dialogs. role=dialog, aria-modal, Escape to close."
              quirk="Lowered from the ceiling on two ropes; it bounces and swings while you read. Closing it cuts the ropes — the panel tumbles down through your page on its way off the world. Elevation, resolved by gravity."
            >
              <div className="docs-demo-row">
                <Button onClick={() => setModalOpen(true)}>Open dialog</Button>
              </div>
            </Entry>

            <Entry
              id="toast"
              name="Toast / Toaster"
              use="Transient notifications. aria-live region, sonner-style toast() API."
              quirk="Toasts arrive normally: stacked, legible, on top. The physics is deferred — a toast only becomes a falling object when you dismiss it, or when a new arrival knocks the oldest off the full ledge. Dismissed notifications are litter."
            >
              <div className="docs-demo-row">
                <Button size="sm" variant="secondary" onClick={() => toast('Part 24-B back in stock.')}>
                  Info toast
                </Button>
                <Button size="sm" variant="secondary" onClick={() => toast('Weld inspection passed.', 'success')}>
                  Success toast
                </Button>
                <Button size="sm" variant="secondary" onClick={() => toast('Bolt torque below spec.', 'warning')}>
                  Warning toast
                </Button>
              </div>
              <p className="docs-fine">
                The ledge floats bottom-right and follows you. A production Toaster takes a{' '}
                <code className="docs-code-inline">capacity</code> (default 3, oldest gets knocked
                off) — this page sets it to Infinity, so notifications simply keep piling up until
                you dismiss them or they bury the interface. Like real life.
              </p>
            </Entry>

            <Entry
              id="tabs"
              name="Tabs"
              use="Sectioning content. role=tablist with arrow-key roving focus."
              quirk="Deliberately none. Tabs are wayfinding — the one part of the machine bolted directly to the building. The incoming panel settles with a small mechanical drop, and that is the entire concession. Every shop needs a fire exit."
            >
              <Tabs
                label="Part record"
                value={demoTab}
                onChange={setDemoTab}
                className="docs-demo-tabs"
                tabs={[
                  {
                    id: 'spec',
                    label: 'Specification',
                    content: <p className="docs-p docs-p--sm docs-tabpanel">Flange, brass, 40mm. Torque to 12 Nm. Do not lick.</p>,
                  },
                  {
                    id: 'history',
                    label: 'History',
                    content: <p className="docs-p docs-p--sm docs-tabpanel">Installed 2024. Thrown 2024. Reinstalled 2024.</p>,
                  },
                  {
                    id: 'notes',
                    label: 'Notes',
                    content: <p className="docs-p docs-p--sm docs-tabpanel">The tabs you are clicking do not move. Treasure this.</p>,
                  },
                ]}
              />
            </Entry>

            <Entry
              id="text"
              name="PhysicsText"
              use="Headings and copy — renders as h1–h3, p, span or label."
              quirk="Every word is its own rigid body, set in weak letterpress glue. Loose setting scatters at a touch; the trailing full stop of a heading can be a rubber ball. The hero at the top of this page is one."
            >
              <PhysicsText as="p" setting="loose" className="docs-demo-loosetext">
                All typography in this system is load bearing and the warranty is void the moment
                anybody touches anything.
              </PhysicsText>
            </Entry>
          </section>

          <footer className="docs-footer" aria-hidden="true">
            <span>R.G. TUMBLE &amp; SONS · PRECISION INTERFACE WORKS · EST. 2026</span>
            <span>TOLERANCES ±90PX · ALL PARTS DRAGGABLE · NO WARRANTY EXPRESS OR IMPLIED</span>
          </footer>
        </main>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Confirm shipment">
        <p>
          Ship <strong>{name.trim() || 'the unnamed crate'}</strong>
          {dept ? ` to ${dept}` : ''}? This dialog is currently suspended over your page on two
          ropes. Reading it makes them no stronger.
        </p>
        <p className="docs-fine">Dismissing cuts the ropes. This is considered normal operation.</p>
        <div className="docs-modal-actions">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Jolly good
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const MATERIAL_COPY: Record<MaterialName, string> = {
  steel: 'Dense, dead drop, barely bounces. Buttons and toggles default to steel — actions should land with authority.',
  wood: 'The workshop default. Solid but not heavy; a satisfying knock on impact. If you don’t specify a material, you get wood.',
  rubber: 'The superball. Restitution 0.92 is nearly perfectly elastic — throw this card at the floor and step back. Steppers are rubber; that’s why they burst.',
  brass: 'Heavy and ringy. Radio selection balls and progress bearings are brass. Dings on impact.',
  glass: 'Brittle. Above its impact tolerance it shatters into shards and shows a damage placard until repaired. For content that deserves respect.',
  paper: 'Near-weightless with high air drag — drifts when thrown instead of falling. PhysicsText words and toasts are paper.',
};
