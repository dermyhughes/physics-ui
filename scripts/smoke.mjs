/* Smoke-test the TUMBLE demo with system Chrome via playwright-core. */
import { chromium } from 'playwright-core';

const shots = process.argv[2] ?? '/tmp/tumble';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('pageerror', (e) => { errors.push(`pageerror: ${e.message}`); console.log('PAGEERROR>', e.message.slice(0, 300)); });
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${shots}-1-initial.png` });

// 1. Count physics bodies
const bodyCount = await page.locator('[data-tmbl-body]').count();
console.log('physics bodies on page:', bodyCount);

// 2. Type into the name input — should spawn falling letter debris
await page.click('#tmbl-in-Full\\ name');
await page.keyboard.type('Rube', { delay: 60 });
await page.waitForTimeout(300);
const letters = await page.locator('.tmbl-letter').count();
console.log('falling letters while typing:', letters);

// 3. Switch radio — old ball should eject as a loose part
await page.click('text=Swing shift', { force: true });
await page.waitForTimeout(400);
const balls = await page.locator('.tmbl-radio-ball.tmbl-loose').count();
console.log('ejected radio balls:', balls);
await page.screenshot({ path: `${shots}-2-ball-ejected.png` });

// 4. Uncheck a checkbox — tick debris
await page.click('text=Union member, Local 404', { force: true });
await page.waitForTimeout(300);
console.log('tick debris:', await page.locator('.tmbl-tick-debris').count());

// 5. Drag the glass Notice card hard into the floor to shatter it
const card = page.locator('.tmbl-card[data-material="glass"]');
const box = await card.boundingBox();
if (box) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // yank it around violently, then slam down
  for (const [dx, dy] of [[-300, 100], [200, -150], [-250, 350], [100, 500]]) {
    await page.mouse.move(cx + dx, cy + dy, { steps: 3 });
    await page.waitForTimeout(60);
  }
  await page.mouse.up();
  await page.waitForTimeout(900);
  console.log('shards:', await page.locator('.tmbl-shard').count());
  console.log('broken card:', await page.locator('.tmbl-card[data-broken]').count());
}
await page.screenshot({ path: `${shots}-3-after-violence.png` });

// 6. Submit → modal drops in on ropes
await page.locator('button:has-text("Submit application")').dispatchEvent('click');
await page.waitForTimeout(1500);
console.log('modal visible:', await page.locator('.tmbl-modal').count());
await page.screenshot({ path: `${shots}-4-modal.png` });

// 7. Close modal (cut ropes) — it should fall away
await page.locator('.tmbl-modal__close').dispatchEvent('click');
await page.waitForTimeout(1400);
console.log('modal gone:', (await page.locator('.tmbl-modal').count()) === 0);

// 8. Drop parts + zero-g sanity
await page.locator('button:has-text("Drop part")').dispatchEvent('click');
await page.locator('button:has-text("Drop part")').dispatchEvent('click');
await page.waitForTimeout(800);
await page.screenshot({ path: `${shots}-5-parts.png` });

// 9. Reset machine
await page.locator('button:has-text("Reset machine")').dispatchEvent('click');
await page.waitForTimeout(700);
await page.screenshot({ path: `${shots}-6-reset.png` });
console.log('loose parts after reset:', await page.locator('.tmbl-loose').count());

// ---- Floor 2: machinery ----
await page.locator('button:has-text("Fl. 2")').dispatchEvent('click');
await page.waitForTimeout(900);
console.log('T&C word bodies:', await page.locator('.shop-terms .tmbl-word').count());
console.log('vehicle cards:', await page.locator('.tmbl-card[data-vehicle]').count());
console.log('crane claw:', await page.locator('.tmbl-crane__claw').count());
console.log('parts bin:', await page.locator('.tmbl-bin').count());

// Vehicle riding: drag the crate; its child checkbox should NOT develop its
// own large transform (it rides via the crate's transform).
const crate = page.locator('.shop-crate');
const cbox = await crate.boundingBox();
await page.mouse.move(cbox.x + cbox.width / 2, cbox.y + 14);
await page.mouse.down();
await page.mouse.move(cbox.x + cbox.width / 2 - 60, cbox.y - 40, { steps: 8 });
await page.waitForTimeout(200);
const crateT = await crate.evaluate((el) => el.style.transform || '(none)');
const riderT = await page.locator('.shop-crate .tmbl-checkbox').first().evaluate((el) => el.style.transform || '(none)');
await page.mouse.up();
console.log('crate transform while dragged:', crateT.slice(0, 44));
console.log('rider own transform (should be tiny/none):', riderT.slice(0, 44));

// Stepper: inflate past max → burst
const plus = page.locator('.tmbl-stepper__btn[aria-label="Increase Tank pressure"]');
for (let i = 0; i < 6; i++) {
  await plus.dispatchEvent('click');
  await page.waitForTimeout(120);
}
await page.waitForTimeout(300);
console.log('stepper burst state:', await page.locator('.tmbl-stepper[data-burst]').count());
console.log('rubber scraps:', await page.locator('.tmbl-scrap').count());
await page.waitForTimeout(1500);
console.log('stepper value after burst:', await page.locator('.tmbl-stepper__balloon').getAttribute('aria-valuenow'));

// Magnet on
await page.locator('.tmbl-magnet input').dispatchEvent('click');
await page.waitForTimeout(200);
console.log('magnet on:', await page.locator('.tmbl-magnet[data-on]').count());

// Let the janitor work on the scraps for a bit
await page.locator('button:has-text("Drop part")').dispatchEvent('click');
await page.waitForTimeout(9000);
const binText = await page.locator('.tmbl-bin__count').textContent();
console.log('bin collected (janitor, best-effort):', binText);
console.log('crane status:', await page.locator('.tmbl-crane__status').textContent());
await page.screenshot({ path: `${shots}-7-machinery.png` });

console.log('--- ERRORS ---');
console.log(errors.length ? errors.join('\n') : '(none)');
await browser.close();
