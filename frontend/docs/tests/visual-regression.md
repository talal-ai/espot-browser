# Visual Regression Testing Plan

We use Playwright snapshot testing to detect unintended visual changes.

## Setup

- Install Playwright dev dependency: `npm i -D @playwright/test`
- Initialize browsers: `npx playwright install`

## Test Example

```
import { test, expect } from '@playwright/test';

test('Templates page visual snapshot', async ({ page }) => {
  await page.goto('http://localhost:5173/templates');
  await page.waitForSelector('text=Template Catalog');
  const screenshot = await page.screenshot();
  expect(screenshot).toMatchSnapshot('templates-page.png');
});
```

Baseline snapshots are committed under `tests/__snapshots__`.

## CI Integration

- Run Playwright tests on PR to catch visual diffs.