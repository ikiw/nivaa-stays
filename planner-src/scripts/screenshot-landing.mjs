import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const url = process.env.PLANNER_URL || 'http://localhost:8765/pondicherry-itinerary/';
const theme = process.env.PLANNER_THEME || '';
const outDir = path.resolve('screenshots/planner');
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-1280x800', width: 1280, height: 800 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    if (theme) {
      await page.addInitScript((themeKey) => localStorage.setItem('nivaa.planner.theme', themeKey), theme);
    }
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const prefix = theme ? `${theme}-` : '';
    await page.screenshot({ path: path.join(outDir, `${prefix}${viewport.name}.png`), fullPage: false });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Saved ${viewports.length} screenshots to ${outDir}`);
