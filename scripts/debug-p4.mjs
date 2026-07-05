import { chromium } from 'playwright-core';

const shots = '/private/tmp/claude-501/-Users-dermothughes-Documents-git-physics-ui/9c21b708-a652-49d8-a7cb-09c5963a8103/scratchpad';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 300)));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// 1. Input hitbox: body sized to the field, not the wrapper (label+hint)
const sizes = await page.evaluate(() => {
  const entries = [...window.__tumble.registry.values()];
  const input = entries.find((e) => e.kind === 'input');
  const wrapper = input?.el.getBoundingClientRect();
  return input ? { bodyH: Math.round(input.size.h), wrapperH: Math.round(wrapper.height) } : null;
});
console.log('input body height vs wrapper height:', JSON.stringify(sizes), '(body should be ~46, wrapper ~95)');

// 2. Modal on its own layer: opening + dropping must not displace header words
await page.locator('button:has-text("Submit application")').dispatchEvent('click');
await page.waitForTimeout(1600);
const displacedWords = await page.evaluate(
  () => [...document.querySelectorAll('.shop-tagline .tmbl-word')].filter((el) => {
    const m = (el.style.transform || '').match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/);
    return m && (Math.abs(+m[1]) > 3 || Math.abs(+m[2]) > 3);
  }).length,
);
console.log('header words displaced by modal drop (want 0):', displacedWords);
await page.screenshot({ path: `${shots}-p4-modal.png` });
await page.locator('.tmbl-modal__close').dispatchEvent('click');
await page.waitForTimeout(1400);

// 3. Dismissed toast falls without touching UI
await page.locator('.tmbl-toaster__item .tmbl-loose__dismiss').first().click();
await page.waitForTimeout(600);
const displacedAfterToast = await page.evaluate(
  () => [...document.querySelectorAll('.shop-controls [data-tmbl-body]')].filter((el) => {
    const m = (el.style.transform || '').match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/);
    return m && (Math.abs(+m[1]) > 3 || Math.abs(+m[2]) > 3);
  }).length,
);
console.log('control row parts displaced by falling toast (want 0):', displacedAfterToast);

// 4. Tabs: no crate, clean swap, correct visual
await page.locator('[role="tab"]:has-text("Machinery")').dispatchEvent('click');
await page.waitForTimeout(600);
console.log('crate elements (want 0):', await page.locator('.tmbl-tab-crate').count());
console.log('machinery shown:', await page.locator('.shop-floor--machinery').count());
await page.screenshot({ path: `${shots}-p4-tabs.png` });

// 5. ProgressBar spill + Reset machine recovers it
const track = page.locator('.tmbl-progress__track');
const tb = await track.boundingBox();
await page.mouse.move(tb.x + tb.width / 2, tb.y + 6);
await page.mouse.down();
await page.mouse.move(tb.x + tb.width / 2 - 200, tb.y + 300, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(800);
console.log('progress spilled after violent tilt:', await page.locator('.tmbl-progress[data-spilled]').count());
await page.locator('button:has-text("Reset machine")').dispatchEvent('click');
await page.waitForTimeout(600);
console.log('progress recovered after reset (want 0 spilled):', await page.locator('.tmbl-progress[data-spilled]').count());

// 6. Magnetic button: hold it, dropped balls should come to it
await page.locator('button:has-text("Drop part")').dispatchEvent('click');
await page.locator('button:has-text("Drop part")').dispatchEvent('click');
await page.waitForTimeout(2500);
const btn = page.locator('button:has-text("Recall parts")');
const bb = await btn.boundingBox();
const distBefore = await page.evaluate(({ x, y }) => {
  const balls = [...window.__tumble.registry.values()].filter((e) => e.mode === 'free' && (e.kind === 'radio-ball' || e.kind === 'nut'));
  return balls.map((b) => Math.round(Math.hypot(b.body.position.x - x, b.body.position.y - y)));
}, { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await page.mouse.down();
await page.waitForTimeout(2500);
const distAfter = await page.evaluate(({ x, y }) => {
  const balls = [...window.__tumble.registry.values()].filter((e) => e.mode === 'free' && (e.kind === 'radio-ball' || e.kind === 'nut'));
  return balls.map((b) => Math.round(Math.hypot(b.body.position.x - x, b.body.position.y - y)));
}, { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
await page.mouse.up();
console.log('part distances to magnet button before hold:', distBefore.join(','));
console.log('part distances after 2.5s hold (should shrink):', distAfter.join(','));
await page.screenshot({ path: `${shots}-p4-magnet.png` });

// 7. Janitor actually collects
for (let t = 0; t < 30; t += 5) {
  await page.waitForTimeout(5000);
  const count = await page.locator('.tmbl-bin__count').textContent();
  if (Number(count) >= 1) { console.log(`janitor collected within ${t + 5}s: ${count}`); break; }
  if (t + 5 >= 30) console.log('janitor collected within 30s: 0 (FAIL)');
}
await browser.close();
