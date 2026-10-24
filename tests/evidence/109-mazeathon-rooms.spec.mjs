import { test, expect } from './evidence.mjs';
import world from '../../games/mazeathon/world.js';

const { Game, generate, W, H } = world;
const snapshot = page => page.evaluate(() => window.MazeAThon.inspect());
async function continueSave(page, saved) {
  await page.addInitScript(saved => {
    if (!localStorage.getItem('gameon.mazeathon.save.v1')) localStorage.setItem('gameon.mazeathon.save.v1', JSON.stringify(saved));
  }, saved);
  await page.goto(`./games/mazeathon/?seed=${saved.seed}`);
  await page.locator('#continue').click();
  await expect(page.locator('#overlay')).toBeHidden();
}
async function moveUntil(page, direction, predicate, phone) {
  if (phone) {
    const button = page.locator(`[data-dir="${direction}"]`);
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    try { await expect.poll(async () => predicate(await snapshot(page))).toBe(true); }
    finally { await page.mouse.up(); }
  } else {
    const key = `Arrow${direction[0].toUpperCase()}${direction.slice(1)}`;
    await page.keyboard.down(key);
    try { await expect.poll(async () => predicate(await snapshot(page))).toBe(true); }
    finally { await page.keyboard.up(key); }
  }
}
const inward = r => r.x > r.entry.x ? 'right' : r.x < r.entry.x ? 'left' : r.y > r.entry.y ? 'down' : 'up';

for (const seed of [2026, 909]) {
  test(`seed ${seed} spreads its rooms across the full maze`, async ({ page, shot, note, browserErrors }) => {
    const g = new Game(seed), saved = g.save();
    saved.mapped = true; saved.discovered.fill(1);
    await continueSave(page, saved);
    const actual = await snapshot(page), rooms = actual.world.rooms;
    expect(actual.layoutVersion).toBe(3);
    expect(rooms).toHaveLength(4);
    expect(rooms.map(r => [r.x, r.y, r.door])).toEqual(g.world.rooms.map(r => [r.x, r.y, r.door]));
    expect(rooms.some(r => r.x < W / 2)).toBe(true);
    expect(rooms.some(r => r.x > W / 2)).toBe(true);
    expect(rooms.some(r => r.y < H / 2)).toBe(true);
    expect(rooms.some(r => r.y > H / 2)).toBe(true);
    expect(new Set(rooms.map(r => `${Math.sign(r.door.x + .5 - r.x)},${Math.sign(r.door.y + .5 - r.y)}`)).size).toBe(4);
    expect(rooms.map(r => [r.x, r.y])).not.toEqual(generate(seed + 1, 0).rooms.map(r => [r.x, r.y]));
    await page.locator('#map').click();
    await expect(page.locator('#large-map')).toBeVisible();
    await page.locator('#large-map').scrollIntoViewIfNeeded();
    await expect(page.locator('#dialog')).toContainText('The whole section is mapped');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    note(`Map-reveal save fixture shows the complete new layout. Room centres: ${rooms.map(r => `${r.boost} (${r.x}, ${r.y})`).join('; ')}. Door sides and which boost occupies each location vary by seed. The model suite independently checks 900 sections.`);
    await shot(`maze-${seed}`);
    expect(browserErrors).toEqual([]);
  });
}

test('a scattered room stays locked when approached without its matching shape', async ({ page, note, browserErrors }, testInfo) => {
  const g = new Game(2026), r = g.world.rooms[0], saved = g.save();
  saved.player = { ...r.entry };
  await continueSave(page, saved);
  await moveUntil(page, inward(r), state => state.time > .7, testInfo.project.name === 'phone');
  const actual = await snapshot(page);
  expect(actual.world.rooms[0].opened).toBe(false);
  expect(actual.keys).toEqual([]);
  expect(Math.hypot(actual.player.x - r.x, actual.player.y - r.y)).toBeGreaterThan(2);
  await expect(page.locator('#toast')).toContainText('needs the circle key');
  note('Controlled save outside the east-facing circle door, with no key: moving toward it stops outside the room.');
  expect(browserErrors).toEqual([]);
});

for (const [shape, boost, label] of [[0, 'xray', 'X-ray vision'], [1, 'map', 'Map revealed'], [2, 'shield', 'Invulnerability'], [3, 'speed', 'Super speed']]) {
  test(`a matching key opens the ${boost} room from its entrance and the boost survives Continue`, async ({ page, shot, note, browserErrors }, testInfo) => {
    const g = new Game(2026), r = g.world.rooms[shape], saved = g.save();
    saved.player = { ...r.entry }; saved.keys = [shape];
    await continueSave(page, saved);
    await moveUntil(page, inward(r), state => boost === 'map' ? state.mapped : state.effects[boost] > 0, testInfo.project.name === 'phone');
    const actual = await snapshot(page);
    expect(actual.world.rooms[shape].opened).toBe(true);
    expect(actual.keys).toEqual([shape]);
    expect(actual.world.rooms[shape].readyAt).toBeGreaterThan(actual.time + 28);
    await expect(page.locator('#active-boosts')).toContainText(label);
    note(`Controlled save outside the room with its matching key; ${testInfo.project.name === 'phone' ? 'direction buttons' : 'arrow keys'} enter from the ${inward(r) === 'left' ? 'east' : inward(r) === 'right' ? 'west' : inward(r) === 'down' ? 'north' : 'south'} side. The boost activates without spending the key. Continue retains the open door and boost.`);
    await shot(`${boost}-room`);
    await page.locator('#pause').click();
    await page.reload();
    await page.locator('#continue').click();
    const restored = await snapshot(page);
    expect(restored.layoutVersion).toBe(3);
    expect(restored.world.rooms[shape].opened).toBe(true);
    expect(restored.keys).toEqual([shape]);
    expect(restored.world.cells).toEqual(actual.world.cells);
    if (boost === 'map') expect(restored.mapped).toBe(true);
    else expect(restored.effects[boost]).toBeGreaterThan(10);
    expect(browserErrors).toEqual([]);
  });
}

test('an adventure saved before scattered rooms keeps its maze and collected progress', async ({ page, note, browserErrors }) => {
  const original = generate(2026, 0, 2), saved = new Game(2026).save();
  Object.assign(saved, { layoutVersion: 2, player: original.shapes[0], keys: [0], opened: [true, false, false, false], time: 123, catches: 2 });
  await continueSave(page, saved);
  const restored = await snapshot(page);
  expect(restored.layoutVersion).toBe(2);
  expect(restored.world.cells).toEqual(original.cells);
  expect(restored.world.shapes).toEqual(original.shapes);
  expect(restored.player).toEqual(saved.player);
  expect(restored.keys).toEqual([0]);
  expect(restored.world.rooms[0].opened).toBe(true);
  expect(restored.catches).toBe(2);
  await expect(page.locator('#total-count')).toHaveText('1 / 12 shapes');
  note('A pre-change save continues in exactly its old layout with its key, open room, position, and catch count. Unit fingerprints also cover the original layout version.');
  expect(browserErrors).toEqual([]);
});
