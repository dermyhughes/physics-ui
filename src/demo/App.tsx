import { useState } from 'react';
import {
  Bumper,
  Button,
  Card,
  Checkbox,
  Conveyor,
  Input,
  Modal,
  PhysicsText,
  PhysicsWorld,
  Radio,
  RadioGroup,
  Toggle,
} from '../index';
import { useWorld } from '../physics/PhysicsWorld';

export default function App() {
  return (
    <PhysicsWorld className="shop">
      <Playground />
    </PhysicsWorld>
  );
}

function Playground() {
  const { setGravity, setSound, soundOn, resetMachine, spawnLoose, getBounds } = useWorld();

  const [name, setName] = useState('');
  const [callsign, setCallsign] = useState('');
  const [shift, setShift] = useState<string | null>('day');
  const [union, setUnion] = useState(true);
  const [goggles, setGoggles] = useState(false);
  const [zeroG, setZeroG] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
            <Button size="lg" onClick={() => setSubmitted(true)}>
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
              <li>Uncheck a box and the tick flies out.</li>
            </ul>
          </Card>

          <div className="shop-bumpers">
            <Bumper size={62} />
            <Bumper size={48} kick={16} />
          </div>
        </aside>
      </main>

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
