import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', '.preview');
const BASE = 'http://localhost:4200';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await ctx.newPage();

async function loginAs(role) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.removeItem('centinela:session'));
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const sel = role === 'antifraude'
    ? 'button:has-text("Analista antifraude")'
    : 'button:has-text("Analista de siniestros")';
  await page.waitForSelector(sel, { timeout: 5000 });
  await page.click(sel);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

async function scrollMainToBottom() {
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = main.scrollHeight;
  });
  await page.waitForTimeout(200);
}

async function shotBottom(name) {
  await scrollMainToBottom();
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  console.log('✓', name);
}

// Analista bandeja
await loginAs('analista');
await shotBottom('14-analista-bandeja-pagination');

// Antifraude investigacion
await loginAs('antifraude');
await page.goto(`${BASE}/antifraude/investigacion`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shotBottom('15-antifraude-investigacion-pagination');

// Alerts catalog
await page.goto(`${BASE}/alerts`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shotBottom('16-alerts-catalog-pagination');

// Click next page
const nextBtn = page.locator('ui-pagination button[aria-label="Página siguiente"]');
if ((await nextBtn.count()) > 0) {
  await nextBtn.click();
  await page.waitForTimeout(300);
  await shotBottom('17-alerts-catalog-page-2');
}

await browser.close();
console.log('Done.');
