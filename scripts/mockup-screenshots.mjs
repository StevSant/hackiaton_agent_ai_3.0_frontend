import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', '.preview');
const BASE = 'http://localhost:4200';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));

async function shot(name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log('✓', name);
}

async function fullShot(name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log('✓', name, '(full)');
}

async function loginAs(role) {
  // Force logout by clearing the persisted session
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.removeItem('centinela:session'));
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const selector = role === 'antifraude'
    ? 'button:has-text("Analista antifraude")'
    : 'button:has-text("Analista de siniestros")';
  await page.waitForSelector(selector, { timeout: 5000 });
  await page.click(selector);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// 1. Login screen with both role cards
await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('01-login-role-cards');

// === ANALISTA flow ===
await loginAs('analista');
await page.waitForTimeout(500);
await shot('02-analista-bandeja');

// Open the rebotado claim (5th in mock data, bounced — analista has pending re-escalation)
await page.goto(`${BASE}/claims/SIN-2026-08412`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('03-analista-claim-detail-pendiente');

// Click a rule chip — should open RuleDetailDialog
const ruleChip = page.locator('claim-score-panel button.font-mono').first();
await ruleChip.click();
await page.waitForTimeout(400);
await shot('04-rule-detail-modal');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// Visit /alerts as analista — read-only view
await page.goto(`${BASE}/alerts`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('05-analista-alerts-readonly');

// Histórico tab on analista bandeja
await page.goto(`${BASE}/claims`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.click('button:has-text("Histórico")');
await page.waitForTimeout(300);
await shot('06-analista-historico-tab');

// === ANTIFRAUDE flow ===
await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
// Force logout via auth store reset by going to login and clicking the other role
await loginAs('antifraude');
await page.waitForTimeout(500);
await shot('07-antifraude-bandeja');

// Investigation page
await page.goto(`${BASE}/antifraude/investigacion`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await shot('08-antifraude-investigacion');

// Open an escalated claim (#2 in mock data — score 87, escalado state)
await page.goto(`${BASE}/claims/SIN-2026-08398`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('09-antifraude-claim-escalado-actions');

// /alerts as antifraude (edit mode)
await page.goto(`${BASE}/alerts`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('10-antifraude-alerts-editable');

// Find a dictaminado claim (4th in mock — case 3 index, score 84 maybe)
// Use investigacion to find one
await page.goto(`${BASE}/antifraude/investigacion`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
// Click "Dictaminados" filter to find one
const dictChip = page.locator('button:has-text("Dictaminados")');
if (await dictChip.count() > 0) {
  await dictChip.first().click();
  await page.waitForTimeout(300);
  // Open first row
  const firstRow = page.locator('claims-table tbody tr').first();
  if (await firstRow.count() > 0) {
    await firstRow.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await shot('11-claim-detail-dictaminado-card');
  }
}

// Sidebar comparison shot — full page so we capture entire sidebar
// First analista
await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
await loginAs('analista');
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, '12-sidebar-analista.png'), clip: { x: 0, y: 0, width: 232, height: 720 } });
console.log('✓ 12-sidebar-analista');

// Then antifraude sidebar
await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
await loginAs('antifraude');
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, '13-sidebar-antifraude.png'), clip: { x: 0, y: 0, width: 232, height: 720 } });
console.log('✓ 13-sidebar-antifraude');

await browser.close();
console.log('Done. Screenshots in', OUT);
