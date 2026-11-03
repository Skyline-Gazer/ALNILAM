import {test, expect} from '@playwright/test';
import {observeLayoutShifts, assertCLSBudget} from '../../scripts/ci/cnb-metrics.mjs';

for (const origin of ['http://127.0.0.1:4323', 'http://127.0.0.1:4324/ALNILAM']) {
  for (const width of [390, 1440]) {
    test(`MPA reading lifecycle ${new URL(origin).pathname} ${width}`, async ({browser}, info) => {
      const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce', hasTouch: width === 390});
      await context.addInitScript(observeLayoutShifts);
      const page = await context.newPage();
      const errors: string[] = [];
      const sdkRequests: string[] = [];
      const samples: unknown[] = [];
      let pagefindImports = 0;
      page.on('pageerror', error => errors.push(String(error)));
      page.on('request', request => {
        if (/giscus|googlesyndication|googletagmanager|google-analytics|doubleclick/i.test(request.url())) sdkRequests.push(request.url());
        if (request.url().endsWith('/pagefind/pagefind.js')) pagefindImports++;
      });
      const sample = async (action: string) => {
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(650);
        const shifts = await page.evaluate('window.__cnbShifts || []');
        samples.push({action, url: page.url(), shifts, cls: assertCLSBudget(shifts)});
      };
      try {
        await page.goto(`${origin}/posts/getting-started/`, {waitUntil: 'networkidle'});
        await sample('first-render');
        expect(pagefindImports).toBe(0);
        const headerY = await page.locator('.article-header').evaluate(el => el.getBoundingClientRect().top);
        await page.locator('[data-theme-choice="light"]').click();
        await sample('theme');
        if (width === 390) {
          const menu = page.getByRole('button', {name: '切换导航菜单'});
          await menu.click();
          await expect(page.getByRole('navigation', {name: '主导航'})).toBeVisible();
          expect(await page.locator('.article-header').evaluate(el => el.getBoundingClientRect().top)).toBe(headerY);
          await sample('mobile-menu-overlay');
          await page.keyboard.press('Escape');
          await expect(menu).toBeFocused();
        }
        const toc = page.locator('.article-toc');
        await expect(toc).toHaveCount(1);
        const summary = toc.locator('summary');
        const articleY = await page.locator('.prose-post').evaluate(el => el.getBoundingClientRect().top);
        await summary.focus();
        await page.keyboard.press('Enter');
        await expect(toc).toHaveAttribute('open', '');
        expect(await page.locator('.prose-post').evaluate(el => el.getBoundingClientRect().top)).toBe(articleY);
        const link = toc.getByRole('link').last();
        const fragment = await link.getAttribute('href');
        await link.click();
        await expect(page).toHaveURL(`${origin}/posts/getting-started/${fragment}`);
        await expect(toc).not.toHaveAttribute('open', '');
        const headingTop = await page.locator(fragment!).evaluate(el => el.getBoundingClientRect().top);
        expect(headingTop).toBeGreaterThanOrEqual(80);
        await summary.click();
        await toc.getByRole('link').first().focus();
        await page.keyboard.press('Escape');
        await expect(summary).toBeFocused();
        await expect(toc).not.toHaveAttribute('open', '');
        await sample('toc-scroll');
        await summary.click();
        await page.screenshot({path: info.outputPath('reading-toc.png'), fullPage: true, animations: 'disabled'});
        await summary.click();
        for (let round = 0; round < 10; round++) {
          await page.getByRole('link', {name: '← 返回全部文章'}).click();
          await expect(page.locator('.post-list')).toBeVisible();
          if (round === 0) {
            const image = page.locator('[data-post-card] img[loading="lazy"]').first();
            await image.scrollIntoViewIfNeeded();
            await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
            await sample('lazy-image-and-font-ready');
          }
          await page.locator(`[data-post-card] h2 a[href="${new URL(origin).pathname.replace(/\/$/, '')}/posts/getting-started/"]`).click();
          await expect(page.locator('.article-toc')).toHaveCount(1);
          await expect(page.locator('astro-island[component-export="default"]')).toHaveCount(1);
        }
        expect(pagefindImports).toBe(0);
        await sample('repeated-navigation');
        const toggle = page.getByRole('button', {name: '搜索', exact: true});
        await toggle.click();
        const search = page.getByRole('dialog', {name: '站内搜索'});
        await expect(search.getByRole('searchbox')).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        const searchBox = await search.boundingBox();
        expect(searchBox!.x).toBeGreaterThanOrEqual(0);
        expect(searchBox!.x + searchBox!.width).toBeLessThanOrEqual(width);
        if (width === 390) {
          await page.setViewportSize({width: 320, height: 900});
          // Viewport resizing settles on a rendering frame; keep both strict bounds.
          await expect.poll(async () => (await search.boundingBox())?.x ?? -Infinity).toBeGreaterThanOrEqual(0);
          await expect.poll(async () => {
            const box = await search.boundingBox();
            return box ? box.x + box.width : Infinity;
          }).toBeLessThanOrEqual(320);
          await page.setViewportSize({width, height: 900});
        }
        await page.screenshot({path: info.outputPath('search-overlay.png'), fullPage: true, animations: 'disabled'});
        await expect.poll(() => pagefindImports).toBe(1);
        await search.getByRole('searchbox').fill('ALNILAM');
        await expect(search.getByRole('link').first()).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(search).toHaveCount(0);
        await expect(toggle).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(search).toHaveCount(1);
        await expect(search.getByRole('searchbox')).toBeFocused();
        expect(pagefindImports).toBe(1);
        await sample('search-overlay');
        await page.keyboard.press('Escape');
        await page.goBack({waitUntil: 'networkidle'});
        await expect(page.locator('.post-list')).toBeVisible();
        await page.goForward({waitUntil: 'networkidle'});
        await expect(page.locator('.article-toc')).toHaveCount(1);
        // Synthetic provider-size probe uses product CSS; actual Comments mount is
        // verified separately with an enabled Site and a labelled mock Giscus response.
        await page.locator('.article-return').evaluate(el => {
          el.insertAdjacentHTML('beforebegin', '<section class="article-comments" aria-label="Synthetic comments reservation"></section>');
        });
        const comments = page.getByRole('region', {name: 'Synthetic comments reservation'});
        await comments.scrollIntoViewIfNeeded();
        const reservedHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        await comments.evaluate(el => {
          const frame = document.createElement('iframe');
          frame.title = 'Synthetic delayed comments';
          frame.style.cssText = 'width:100%;height:260px;border:0';
          frame.srcdoc = '<p>Mock provider size</p>';
          el.append(frame);
        });
        await expect(comments.locator('iframe')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(reservedHeight);
        await sample('reserved-comments');
        expect(sdkRequests).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        await info.attach('lifecycle-cls.json', {body: JSON.stringify({origin, width, reducedMotion: true, samples, sdkRequests, errors}), contentType: 'application/json'});
        await context.close();
      }
    });
  }
}
