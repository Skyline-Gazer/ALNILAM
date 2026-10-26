// P0 isolated preview only; uses the pinned upstream's own Playwright dependency.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const origin = 'http://127.0.0.1:4322';
await mkdir('p0-evidence', { recursive: true });
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  if (await fetch(origin, { signal: AbortSignal.timeout(2000) }).then(r => r.ok).catch(() => false)) {
    ready = true;
    break;
  }
  await setTimeout(1000);
}
assert.ok(ready, 'preview must respond before browser starts');
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const result = { name, width, height, errors: [] };
    results.push(result);
    page.on('pageerror', error => result.errors.push(String(error)));
    try {
      await page.goto(origin, { waitUntil: 'load', timeout: 120000 });
      result.homeTitle = await page.title();
      assert.ok(result.homeTitle, 'home title');
      await page.locator('main').waitFor();
      await page.locator('astro-island:has(#scheme-switch):not([ssr])').waitFor();
      for (const dark of [false, true]) {
        if (name === 'desktop') {
          await page.locator('#scheme-switch').click();
          await page.locator('#scheme-switch').locator('..').locator('.m3-menu-item').nth(dark ? 1 : 0).click();
        } else {
          for (let n = 0; n < 3 && await page.evaluate(() => document.documentElement.classList.contains('dark')) !== dark; n++) {
            await page.locator('#scheme-switch').click();
          }
        }
        await page.waitForFunction(expected => document.documentElement.classList.contains('dark') === expected, dark);
        await page.screenshot({ path: `p0-evidence/${name}-${dark ? 'dark' : 'light'}-home.png`, fullPage: true });
      }
      const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(n => ({ text: n.textContent.trim(), href: n.getAttribute('href') })));
      const post = links.find(n => /^\/posts\/[^/#]+\//.test(n.href) && !/^\/posts\/\d+\/$/.test(n.href) && !n.href.includes('#'));
      assert.ok(post, 'real article link on home');
      result.article = post.href;
      await page.locator(`a[href=${JSON.stringify(post.href)}]`).first().click();
      await page.waitForURL(url => url.pathname === new URL(post.href, origin).pathname);
      // Swup changes history before replacing content: wait for the actual article.
      await page.locator('.markdown-content').waitFor();
      const title = page.locator('[data-pagefind-meta="title"]').first();
      await title.waitFor();
      result.articleTitle = await title.innerText();
      await page.screenshot({ path: `p0-evidence/${name}-post.png`, fullPage: true });
      const keyword = result.articleTitle.trim().split(/\s+/)[0];
      if (name === 'desktop') {
        await page.locator('.top-app-bar__search-shell').click();
        await page.locator('#search-input-desktop').fill(keyword);
      } else {
        await page.locator('#search-switch').click();
        await page.locator('#search-panel input').fill(keyword);
      }
      await page.locator('#search-panel a[href]').first().waitFor({ state: 'visible', timeout: 30000 });
      result.searchResults = await page.locator('#search-panel a[href]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
      assert.ok(result.searchResults.some(link => new URL(link, origin).pathname === new URL(post.href, origin).pathname), 'real Pagefind article result');
      await page.screenshot({ path: `p0-evidence/${name}-search.png`, fullPage: true });
      await page.goBack({ waitUntil: 'load' });
      await page.waitForFunction(expected => document.title === expected, result.homeTitle);
      await page.locator('#scheme-switch').click();
      assert.equal(result.errors.length, 0, 'browser runtime errors');
      result.status = 'PASS';
    } catch (error) {
      result.status = 'FAIL';
      result.error = String(error);
      result.failedUrl = page.url();
      await page.screenshot({ path: `p0-evidence/${name}-failure.png`, fullPage: true });
      await writeFile(`p0-evidence/${name}-failure.html`, await page.content());
    } finally {
      await page.close();
    }
  }
} finally {
  await writeFile('p0-evidence/browser.json', JSON.stringify(results, null, 2));
  await browser.close();
}
assert.ok(results.every(result => result.status === 'PASS'), JSON.stringify(results));
