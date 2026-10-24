import { test, expect } from './evidence.mjs';
import world from '../../games/mazeathon/world.js';

const { Game, W, findPath } = world;
const url = './games/mazeathon/?seed=2026';
const snapshot = page => page.evaluate(() => window.MazeAThon.inspect());

async function loadSave(page, saved) {
  await page.addInitScript(saved => {
    if (!localStorage.getItem('gameon.mazeathon.save.v1')) localStorage.setItem('gameon.mazeathon.save.v1', JSON.stringify(saved));
  }, saved);
  await page.goto(url);
  await page.locator('#continue').click();
  await expect(page.locator('#overlay')).toBeHidden();
}

async function hold(page, direction, until, phone) {
  if (phone) {
    const button = page.locator(`[data-dir="${direction}"]`);
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    try { await expect.poll(async () => until((await snapshot(page)).player)).toBe(true); }
    finally { await page.mouse.up(); }
  } else {
    const key = `Arrow${direction[0].toUpperCase()}${direction.slice(1)}`;
    await page.keyboard.down(key);
    try { await expect.poll(async () => until((await snapshot(page)).player)).toBe(true); }
    finally { await page.keyboard.up(key); }
  }
}

test('a new adventure has early choices that work with keyboard and phone controls', async ({ page, shot, note, browserErrors }, testInfo) => {
  await page.goto(url);
  await page.locator('#begin').click();
  const initial = await snapshot(page);
  expect(initial.layoutVersion).toBe(3);
  expect(initial.world.cells[W + 2]).toBe(0);
  expect(initial.world.cells[2 * W + 1]).toBe(0);
  const phone = testInfo.project.name === 'phone';
  await hold(page, 'right', p => p.x > 2.2, phone);
  await hold(page, 'left', p => p.x < 1.6, phone);
  await hold(page, 'down', p => p.y > 2.2, phone);
  expect((await snapshot(page)).catches).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  note(`Seed 2026: both paths from camp are playable using ${phone ? 'the visible direction buttons' : 'arrow keys'}. Model regressions also check 100 seeds.`);
  await shot('opening-choices');
  await page.locator('#map').click();
  await expect(page.locator('#large-map')).toBeVisible();
  await shot('opening-map');
  expect(browserErrors).toEqual([]);
});

test('hugging a wall keeps its face visible and the floor behind it hidden, including after continuing', async ({ page, shot, note, browserErrors }) => {
  const saved = new Game(2026).save();
  saved.player = { x: 1.77, y: 2.5 };
  saved.discovered.fill(0);
  await loadSave(page, saved);
  // The pillar at (2,2) is directly beside the player; (3,2) is floor behind it.
  const before = await snapshot(page);
  expect(before.discovered[2 * W + 2]).toBe(1);
  expect(before.discovered[2 * W + 3]).toBe(0);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(.4);
  await page.keyboard.up('ArrowRight');
  const after = await snapshot(page);
  expect(after.player.x).toBeGreaterThanOrEqual(1.77);
  expect(after.player.x).toBeLessThan(1.781);
  expect(after.discovered[2 * W + 2]).toBe(1);
  expect(after.discovered[2 * W + 3]).toBe(0);
  await shot('close-wall');
  await page.locator('#pause').click();
  await page.reload();
  await page.locator('#continue').click();
  expect((await snapshot(page)).player).toEqual(after.player);
  expect((await snapshot(page)).layoutVersion).toBe(3);
  expect((await snapshot(page)).discovered[2 * W + 2]).toBe(1);
  note('Controlled save fixture beside the opening pillar; pushing into it stops at the collision boundary. The adjacent wall is discovered and the occluded floor stays undiscovered. Continue retains the layout.');
  expect(browserErrors).toEqual([]);
});

for (const big of [false, true]) {
  test(`${big ? 'big' : 'small'} monsters show a stationary warning before moving`, async ({ page, shot, note, browserErrors }) => {
    const g = new Game(2026), m = g.world.monsters.find(m => m.big === big);
    const saved = g.save();
    saved.player = big ? findPath(g.world, m.home, { x: 1.5, y: 1.5 })[1] : { ...m.home };
    saved.effects.shield = 14;
    await page.clock.install();
    await page.goto(url);
    await page.clock.pauseAt(new Date(Date.now() + 100));
    await page.evaluate(saved => localStorage.setItem('gameon.mazeathon.save.v1', JSON.stringify(saved)), saved);
    await page.reload();
    await page.locator('#continue').click({ force: true });
    let spotted;
    for (let n = 0; n < 60; n++) {
      await page.clock.runFor(100);
      const state = await snapshot(page);
      spotted = state.world.monsters.find(a => a.id === m.id);
      if (spotted.state === 'windup') break;
    }
    expect(spotted.state).toBe('windup');
    const remaining = spotted.timer;
    expect(remaining).toBeGreaterThan(big ? 1.05 : .6);
    await page.clock.runFor(big ? 950 : 500);
    const warning = (await snapshot(page)).world.monsters.find(a => a.id === m.id);
    expect(warning.state).toBe('windup');
    expect(warning.x).toBe(spotted.x);
    expect(warning.y).toBe(spotted.y);
    await shot(big ? 'big-monster-warning' : 'small-monster-warning');
    await page.clock.runFor(700);
    const chasing = (await snapshot(page)).world.monsters.find(a => a.id === m.id);
    expect(chasing.state).toBe('chase');
    expect(Math.hypot(chasing.x - spotted.x, chasing.y - spotted.y)).toBeGreaterThan(.1);
    note(`Controlled save near a real generated ${big ? 'guardian' : 'small monster'}, with a shield so the chase can be observed. Its ! warning lasts ${big ? '1.2' : '0.75'} seconds, with no movement. Then it chases. The unit suite separately checks unshielded corner encounters and loss of sight.`);
    expect(browserErrors).toEqual([]);
  });
}
