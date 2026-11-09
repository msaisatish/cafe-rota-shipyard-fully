import { existsSync } from 'node:fs';

import { expect, test } from '@playwright/test';

/**
 * The smoke check: the running app answers, shows something, and throws
 * nothing in the browser. The test engineer adds a spec per core flow beside
 * this one; this file only proves the app is alive and styled.
 */

test.beforeEach(({ baseURL }, testInfo) => {
  // Not a skip: a browser check that silently skips reads as a pass.
  if (!baseURL) {
    // The reason playwright.config.ts recorded: not running, or another run has the test copy.
    const why = (testInfo.config.metadata as { notRunBecause?: string } | undefined)?.notRunBecause;
    throw new Error(why ?? 'The test copy of the app is not running, so it could not be checked.');
  }
});

test('the home page answers without an error', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    // A failed request is reported below with its address, which says more.
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      problems.push(message.text());
    }
  });
  page.on('response', (answer) => {
    // A missing tab icon is not a broken app.
    if (answer.status() >= 400 && !answer.url().endsWith('/favicon.ico')) {
      problems.push(`${answer.status()} ${answer.url()}`);
    }
  });

  const response = await page.goto('/');
  expect(response?.status() ?? 0, 'the page answered').toBeLessThan(400);
  await expect(page.locator('body')).not.toBeEmpty();
  expect(problems, 'errors in the browser').toEqual([]);
});

test('the home page fits a phone', async ({ page }) => {
  // Four test apps scrolled sideways on a phone and no check saw it (test-app
  // grades, November 2026). Each core-flow spec checks its own pages the same way.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const { content, screen } = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    screen: window.innerWidth,
  }));
  expect(content, 'the page is no wider than a 390 px phone').toBeLessThanOrEqual(screen + 1);
});

test('the theme reaches the page when ui_foundation is installed', async ({ page }) => {
  test.skip(!existsSync('src/components/ui_foundation'), 'ui_foundation is not installed');
  await page.goto('/');
  const focus = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--focus').trim(),
  );
  expect(focus, 'the --focus colour is defined on the page').not.toBe('');
});
