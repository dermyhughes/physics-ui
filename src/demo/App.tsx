import { useState } from 'react';
import {
  Bumper,
  Button,
  Card,
  Checkbox,
  Conveyor,
  Crane,
  Input,
  Magnet,
  Modal,
  PartsBin,
  PhysicsText,
  PhysicsWorld,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Stepper,
  Toaster,
  Toggle,
  toast,
} from '../index';
import { useWorld } from '../physics/PhysicsWorld';

export default function App() {
  return (
    <PhysicsWorld className="shop">
      <Playground />
    </PhysicsWorld>
  );
}

type Floor = 'intake' | 'machinery';

function Playground() {
  const { setGravity, setSound, soundOn, resetMachine, spawnLoose, getBounds } = useWorld();

  const [floor, setFloor] = useState<Floor>('intake');

  // Intake floor state
  const [name, setName] = useState('');
  const [callsign, setCallsign] = useState('');
  const [shift, setShift] = useState<string | null>('day');
  const [union, setUnion] = useState(true);
  const [goggles, setGoggles] = useState(false);
  const [department, setDepartment] = useState<string | null>(null);
  const [torque, setTorque] = useState(40);
  const [zeroG, setZeroG] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Machinery floor state
  const [psi, setPsi] = useState(3);
  const [magnetOn, setMagnetOn] = useState(false);
  const [terms, setTerms] = useState(false);
  const [crateFragile, setCrateFragile] = useState(true);
  const [crateUpright, setCrateUpright] = useState(false);

  const dropPart = () => {
    const { w } = getBounds();
    const x = w * 0.15 + Math.random() * w * 0.7;
    if (Math.random() < 0.6) {
      spawnLoose({
        kind: 'radio-ball',
        material: 'brass',
        shape: 'circle',
        w: 15,
        h: 15,
        x,
        y: -30,
        vx: (Math.random() - 0.5) * 4,
        vy: 2,
        className: 'tmbl-radio-ball',
        data: { bornAt: performance.now() },
      });
    } else {
      spawnLoose({
        kind: 'nut',
        material: 'steel',
        shape: 'rect',
        w: 26,
        h: 22,
        x,
        y: -30,
        vx: (Math.random() - 0.5) * 4,
        vy: 2,
        spin: (Math.random() - 0.5) * 0.4,
        className: 'shop-nut',
      });
    }
  };

  return (
    <>
      <div className="shop-blueprint" aria-hidden="true" />

      <header className="shop-header">
        <div className="shop-masthead">
          <h1 className="shop-logo">
            TUMBLE<span className="shop-logo__reg">®</span>
          </h1>
          <PhysicsText as="p" className="shop-tagline" setting="loose">
            A design system with consequences — every component is a rigid body.
          </PhysicsText>
        </div>
        <nav className="shop-tabs" aria-label="Shop floors">
          <Button
            variant="secondary"
            size="sm"
            className={floor === 'intake' ? 'shop-tab shop-tab--active' : 'shop-tab'}
            onClick={() => setFloor('intake')}
          >
            Fl. 1 — Intake
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={floor === 'machinery' ? 'shop-tab shop-tab--active' : 'shop-tab'}
            onClick={() => setFloor('machinery')}
          >
            Fl. 2 — Machinery
          </Button>
        </nav>
        <div className="shop-controls">
          <Toggle checked={zeroG} onChange={(v) => { setZeroG(v); setGravity(v ? 0.05 : 1); }}>
            Zero-G
          </Toggle>
          <Toggle checked={soundOn} onChange={setSound}>
            Sound
          </Toggle>
          <Button variant="secondary" size="sm" onClick={dropPart}>
            Drop part
          </Button>
          <Button variant="danger" size="sm" onClick={resetMachine}>
            Reset machine
          </Button>
        </div>
      </header>

      <div className="shop-toaster">
        <Toaster />
      </div>

      {floor === 'intake' ? (
        <main className="shop-floor">
          <section className="shop-bench" aria-label="Operator intake form">
            <div className="shop-bench__head">
              <PhysicsText as="h2" className="shop-bench__title">
                Operator Intake
              </PhysicsText>
              <span className="shop-fig">FIG. 1 — STANDARD BORING FORM</span>
            </div>

            <div className="shop-bench__grid">
              <Input
                label="Full name"
                value={name}
                onChange={setName}
                placeholder="e.g. R. Goldberg"
                hint="shake the field to empty it"
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

            <div className="shop-bench__grid">
              <Select
                label="Department"
                value={department}
                onChange={(v) => setDepartment(v)}
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

            <div className="shop-bench__grid">
              <RadioGroup name="shift" label="Shift — the dot is a brass ball" value={shift} onChange={setShift}>
                <Radio value="day">Day shift</Radio>
                <Radio value="swing">Swing shift</Radio>
                <Radio value="graveyard">Graveyard</Radio>
              </RadioGroup>

              <div className="shop-checks">
                <span className="tmbl-field-label">Certifications</span>
                <Checkbox checked={union} onChange={setUnion}>
                  Union member, Local 404
                </Checkbox>
                <Checkbox checked={goggles} onChange={setGoggles}>
                  Safety goggles fitted
                </Checkbox>
              </div>
            </div>

            <div className="shop-bench__submit">
              <Button
                size="lg"
                onClick={() => {
                  setSubmitted(true);
                  toast('Application received — lowering paperwork', 'success');
                }}
              >
                Submit application
              </Button>
              <span className="shop-fine-print">pressing this shoves everything nearby. sorry.</span>
            </div>
          </section>

          <aside className="shop-shelf">
            <Card title="Notice" material="glass">
              <p className="shop-copy">
                This notice is printed on <strong>glass</strong>. Throw something
                at it — a brass ball, a steel nut, this sentence — and it will
                shatter. Management accepts no liability.
              </p>
            </Card>

            <Card title="Operating manual" material="wood">
              <ul className="shop-manual">
                <li>Grab any component. Throw it.</li>
                <li>Pull hard to shear a part off its mounts — one bolt left and it dangles.</li>
                <li>Change a radio: the old ball drops out. Catch it in another dial to select it.</li>
                <li>Drop something heavy on a button to press it physically.</li>
                <li>Shake a filled text field to spill the letters.</li>
                <li>Visit Floor 2 for the crane, the magnet and the pressure gauge.</li>
              </ul>
            </Card>

            <div className="shop-bumpers">
              <Bumper size={62} />
              <Bumper size={48} kick={16} />
            </div>
          </aside>
        </main>
      ) : (
        <main className="shop-floor shop-floor--machinery">
          <section className="shop-column">
            <Card title="Terms & conditions" material="wood" vehicle className="shop-terms">
              <PhysicsText as="p" setting="loose" className="shop-terms__text">
                The undersigned operator agrees that all interface components are
                supplied with mass, momentum and a two-bolt mounting warranty
                which is void the moment anybody touches anything. Words in this
                agreement are set in weak letterpress glue and constitute load
                bearing typography. Management is not responsible for clauses
                that fall off, roll under the conveyor, or are collected by the
                janitor unit and filed as scrap.
              </PhysicsText>
              <PhysicsText as="p" setting="loose" className="shop-terms__text">
                In the event of a dispute the shop magnet shall be consulted and
                its attraction considered legally binding. Overinflated gauges
                burst at the operator's own risk. This paragraph will not
                survive a direct hit and everyone involved knows it.
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

            <Card title="Shipping crate" material="wood" vehicle className="shop-crate">
              <p className="shop-crate__note">
                VEHICLE — contents are bolted to the crate, not the page. Drag
                the crate and throw it: everything rides along. Or tear the
                controls off it one by one.
              </p>
              <div className="shop-crate__row">
                <Checkbox checked={crateFragile} onChange={setCrateFragile}>
                  Fragile
                </Checkbox>
                <Checkbox checked={crateUpright} onChange={setCrateUpright}>
                  This way up
                </Checkbox>
                <Button size="sm" variant="secondary" onClick={() => {}}>
                  Inspect
                </Button>
              </div>
            </Card>
          </section>

          <section className="shop-column">
            <div className="shop-gauges">
              <Stepper
                label="Tank pressure"
                unit="PSI"
                min={0}
                max={8}
                value={psi}
                onChange={setPsi}
                onBurst={() => toast('Pressure vessel failure. Refitting diaphragm.', 'warning')}
              />
              <Magnet on={magnetOn} onChange={setMagnetOn} />
              <p className="shop-gauges__note">
                The gauge inflates as you step it up — past 8 PSI it bursts.
                The magnet is bulk-select: switch it on and every loose metal
                part in the shop comes to it. Tear it off and carry your haul.
              </p>
            </div>

            <div className="shop-crane-zone">
              <Crane auto dropAt={0.07} />
              <div className="shop-crane-zone__floor">
                <PartsBin label="Scrap" />
                <span className="shop-fine-print">
                  the janitor grabs whatever is lying around and files it in the
                  bin. the belt delivers; drop a part to give it something to do.
                </span>
              </div>
            </div>
          </section>
        </main>
      )}

      <div className="shop-belt">
        <Conveyor speed={3.2} />
      </div>

      <footer className="shop-footer" aria-hidden="true">
        <span>R.G. TUMBLE &amp; SONS · PRECISION INTERFACE WORKS · EST. 2026</span>
        <span>TOLERANCES ±90PX · ALL PARTS DRAGGABLE · NO WARRANTY EXPRESS OR IMPLIED</span>
      </footer>

      <Modal open={submitted} onClose={() => setSubmitted(false)} title="Application received">
        <p>
          Thank you, <strong>{name.trim() || 'unnamed operator'}</strong>. Your
          paperwork has been lowered into the machine for processing
          {shift ? ` on the ${shift} shift` : ''}.
        </p>
        <p className="shop-fine-print">
          Dismissing this dialog cuts the ropes. The panel will fall through
          your form. This is considered normal operation.
        </p>
        <div className="shop-modal-actions">
          <Button variant="secondary" onClick={() => setSubmitted(false)}>
            Jolly good
          </Button>
        </div>
      </Modal>
    </>
  );
}
