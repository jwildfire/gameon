// Evidence for the Send to the Matrix rename: the label and confirmation change, sending doesn't.
// Run: npm run evidence -- tests/evidence/<this file's name without .spec.mjs>
import { test, expect } from "./evidence.mjs";

test("the Send button says Send to the Matrix and still sends", async ({ page, shot, note, browserErrors }) => {
  await page.addInitScript(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
  await page.goto("new/");
  await expect(page.locator("#send")).toHaveText("Send to the Matrix");
  await page.locator("#tab-type").click();
  await page.locator("#idea").fill("a game where a robot cat surfs on a giant pancake across the sky");
  await page.locator("#maker").fill("Bean");
  await shot("ready");
  await page.locator("#send").click();
  await expect(page.locator("#handoff .msg")).toContainText("Sent to the Matrix!");
  await expect(page.locator("#handoff .msg")).toContainText("press Submit");
  const opened = new URL(await page.evaluate(() => window.__opened[0]));
  expect(opened.origin + opened.pathname).toBe("https://github.com/jwildfire/gameon/issues/new");
  expect(opened.searchParams.get("maker")).toBe("Bean");
  note("button reads Send to the Matrix; the GitHub hand-off is unchanged");
  await shot("sent");
  expect(browserErrors).toEqual([]);
});
