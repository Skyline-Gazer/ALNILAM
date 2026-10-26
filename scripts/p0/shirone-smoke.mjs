// P0 isolated preview only; uses the pinned upstream's own Playwright dependency.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { setTimeout } from 'node:timers/promises';

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
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(origin, { waitUntil: 'load', timeout: 120000 });
    const homeTitle = await page.title();
    assert.ok(homeTitle, 'home title');
    assert.ok(await page.locator('main').count(), 'home main landmark');
    await page.locator('#scheme-switch').waitFor();
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
    assert.ok(post, 'post link on home');
    await page.locator(`a[href=${JSON.stringify(post.href)}]`).first().click();
    await page.waitForURL(url => url.pathname.includes('/posts/'));
    assert.ok(await page.locator('[data-pagefind-meta="title"]').count(), 'upstream article title');
    assert.ok(await page.locator('#post-container, .markdown-content, .markdown-body, article').count(), 'article body');
    await page.screenshot({ path: `p0-evidence/${name}-post.png`, fullPage: true });
    const articleTitle = await page.locator('[data-pagefind-meta="title"]').first().innerText();
    const keyword = articleTitle.trim().split(/\s+/)[0];
    if (name === 'desktop') {
      await page.locator('.top-app-bar__search-shell').click();
      await page.locator('#search-input-desktop').fill(keyword);
    } else {
      await page.locator('#search-switch').click();
      await page.locator('#search-panel input').fill(keyword);
    }
    await page.locator('#search-panel a[href]').first().waitFor({ state: 'visible', timeout: 30000 });
    const searchResults = await page.locator('#search-panel a[href]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
    assert.ok(searchResults.some(link => new URL(link, origin).pathname === new URL(post.href, origin).pathname), 'real Pagefind article result');
    await page.screenshot({ path: `p0-evidence/${name}-search.png`, fullPage: true });
    await page.goBack({ waitUntil: 'load' });
    await page.locator('#scheme-switch').click();
    results.push({ name, width, height, homeTitle, articleTitle, article: post.href, searchResults, errors, links });
    assert.equal(errors.length, 0, 'browser runtime errors');
    await page.close();
  }
} finally {
  await writeFile('p0-evidence/browser.json', JSON.stringify(results, null, 2));
  await browser.close();
}
