import { defineConfig } from '@playwright/test';

import { checkTarget, claimCheckRun } from './e2e/target.mjs';

/**
 * The browser check (`npm run test:e2e`).
 *
 * It runs against Shipyard's test copy of the app (its own database and build
 * folder), never against the preview: see `e2e/target.mjs`. Nobody here starts
 * a server (AGENTS.md R4.6), so there is no `webServer` on purpose.
 *
 * The browser is Microsoft Edge, which every Windows 11 computer already has,
 * so nothing is downloaded. `PLAYWRIGHT_CHANNEL` picks another one.
 */
const found = checkTarget();
// Only one browser-check run at a time on the test copy (see claimCheckRun).
const claim = 'url' in found ? claimCheckRun() : null;
const target = claim && 'error' in claim ? claim : found;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e.json' }]],
  metadata: 'error' in target ? { notRunBecause: target.error } : { target: target.url },
  use: {
    baseURL: 'url' in target ? target.url : undefined,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge',
    // Every check's screen, for browser-qa to read; Shipyard's own run asks
    // for failures only, which is all it keeps.
    screenshot: process.env.SHIPYARD_SCREENSHOTS === 'on-failure' ? 'only-on-failure' : 'on',
    trace: 'retain-on-failure',
  },
});
