// Playwright setup for task evidence. See docs/evidence.md.
//
//   npm run evidence -- 46-evidence-framework   run one task's spec, write evidence/46-evidence-framework/
//   npm run evidence:check                      run every spec, write nothing into evidence/
//   EVIDENCE_BASE_URL=https://jwildfire.github.io/gameon/dev/ npm run evidence -- <spec>
//                                               run against the live site instead of a local server
import net from "node:net";
import { defineConfig } from "@playwright/test";

const live = process.env.EVIDENCE_BASE_URL || "";

// Pick a free high port once, in the main process. Workers load this file again and
// inherit the environment, so they all agree on the port.
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}
if (!live && !process.env.EVIDENCE_PORT) process.env.EVIDENCE_PORT = String(await freePort());

const port = process.env.EVIDENCE_PORT;
const baseURL = live ? live.replace(/\/?$/, "/") : `http://127.0.0.1:${port}/`;

export default defineConfig({
  testDir: "./tests/evidence",
  testMatch: "**/*.spec.mjs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  outputDir: "node_modules/.cache/gameon-evidence/test-results",
  reporter: [["list"], ["./tests/evidence/reporter.mjs"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { browserName: "chromium", viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }
  ],
  webServer: live ? undefined : {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    url: `${baseURL}index.html`,
    reuseExistingServer: false,
    stderr: "ignore", // http.server logs every request
    timeout: 15_000
  }
});
