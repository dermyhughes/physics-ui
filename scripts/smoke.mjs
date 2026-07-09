/* Smoke-test the TUMBLE docs with system Chrome via playwright-core. */
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

// 2. Dark mode toggle flips data-theme
await page.click('text=Night shift', { force: true });
await page.waitForTimeout(300);
console.log('theme after toggle:', await page.evaluate(() => document.documentElement.dataset.theme));
await page.screenshot({ path: `${shots}-2-dark.png` });
await page.click('text=Night shift', { force: true });
await page.waitForTimeout(200);

// 3. Type into the name input — should spawn falling letter debris
await page.locator('#input').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.click('#tmbl-in-Full\\ name');
await page.keyboard.type('Rube', { delay: 60 });
await page.waitForTimeout(300);
console.log('falling letters while typing:', await page.locator('.tmbl-letter').count());

// 4. Switch radio — old ball should eject as a loose part
await page.locator('#radio').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.click('text=Swing shift', { force: true });
await page.waitForTimeout(400);
console.log('ejected radio balls:', await page.locator('.tmbl-radio-ball.tmbl-loose').count());
await page.screenshot({ path: `${shots}-3-ball-ejected.png` });

// 5. Uncheck a checkbox — tick debris
await page.locator('#checkbox').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.click('text=I accept the terms', { force: true });
await page.waitForTimeout(300);
console.log('tick debris:', await page.locator('.tmbl-tick-debris').count());

// 6. Material switching: card entry chip changes data-material
await page.locator('#card').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.locator('#card .docs-matpicker__chip[data-material="glass"]').click({ force: true });
await page.waitForTimeout(500);
const demoCardMat = await page.locator('#card .docs-demo-card').getAttribute('data-material');
console.log('demo card material after switch:', demoCardMat);

// 7. Shatter the (now glass) demo card by yanking it around
const card = page.locator('#card .docs-demo-card');
const box = await card.boundingBox();
if (box) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (const [dx, dy] of [[-300, 100], [200, -150], [-250, 350], [100, 500]]) {
    await page.mouse.move(cx + dx, cy + dy, { steps: 3 });
    await page.waitForTimeout(60);
  }
  await page.mouse.up();
  await page.waitForTimeout(900);
  console.log('shards:', await page.locator('.tmbl-shard').count());
  console.log('broken card:', await page.locator('.tmbl-card[data-broken]').count());
}
await page.screenshot({ path: `${shots}-4-after-violence.png` });

// 8. Stepper: inflate past max → burst
await page.locator('#stepper').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const plus = page.locator('.tmbl-stepper__btn[aria-label="Increase Tank pressure"]');
for (let i = 0; i < 6; i++) {
  await plus.dispatchEvent('click');
  await page.waitForTimeout(120);
}
await page.waitForTimeout(300);
console.log('stepper burst state:', await page.locator('.tmbl-stepper[data-burst]').count());
console.log('rubber scraps:', await page.locator('.tmbl-scrap').count());

// 9. Modal drops in on ropes, closing cuts them
await page.locator('#modal').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.locator('#modal button:has-text("Open dialog")').dispatchEvent('click');
await page.waitForTimeout(1500);
console.log('modal visible:', await page.locator('.tmbl-modal').count());
await page.screenshot({ path: `${shots}-5-modal.png` });
await page.locator('.tmbl-modal__close').dispatchEvent('click');
await page.waitForTimeout(1400);
console.log('modal gone:', (await page.locator('.tmbl-modal').count()) === 0);

// 10. Toasts stack on the header ledge
await page.locator('#toast button:has-text("Info toast")').dispatchEvent('click');
await page.locator('#toast button:has-text("Success toast")').dispatchEvent('click');
await page.waitForTimeout(400);
console.log('stacked toasts:', await page.locator('.tmbl-toaster__item').count());

// 11. Reset machine
await page.locator('.docs-header button:has-text("Reset")').dispatchEvent('click');
await page.waitForTimeout(700);
console.log('loose parts after reset:', await page.locator('.tmbl-loose').count());
await page.screenshot({ path: `${shots}-6-reset.png` });

console.log('--- ERRORS ---');
console.log(errors.length ? errors.join('\n') : '(none)');
await browser.close();
