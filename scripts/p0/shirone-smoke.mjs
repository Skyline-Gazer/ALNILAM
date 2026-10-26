// P0 isolated preview only; uses the pinned upstream's own Playwright dependency.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const origin = 'http://127.0.0.1:4322';
await mkdir('p0-evidence', { recursive: true });
await fetch(origin, { signal: AbortSignal.timeout(120000) }).catch(() => {});
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(origin, { waitUntil: 'networkidle', timeout: 120000 });
    assert.ok(await page.title(), 'home title');
    assert.ok(await page.locator('main').count(), 'home main landmark');
    await page.screenshot({ path: `p0-evidence/${name}-home.png`, fullPage: true });
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(n => ({ text: n.textContent.trim(), href: n.getAttribute('href') })));
    const post = links.find(n => n.href?.includes('/posts/') && !n.href.includes('#'));
    assert.ok(post, 'post link on home');
    await page.locator(`a[href=${JSON.stringify(post.href)}]`).first().click();
    await page.waitForURL(url => url.pathname.includes('/posts/'));
    assert.ok(await page.locator('h1').count(), 'article title');
    await page.screenshot({ path: `p0-evidence/${name}-post.png`, fullPage: true });
    results.push({ name, width, height, homeTitle: await page.title(), article: page.url(), errors, links });
    assert.equal(errors.length, 0, 'browser runtime errors');
    await page.close();
  }
} finally {
  await writeFile('p0-evidence/browser.json', JSON.stringify(results, null, 2));
  await browser.close();
}
