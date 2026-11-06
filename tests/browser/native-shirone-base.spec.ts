import {test, expect} from '@playwright/test';
for (const origin of ['http://127.0.0.1:4323', 'http://127.0.0.1:4324/ALNILAM']) {
  test(`locale navigation boundaries ${new URL(origin).pathname}`, async ({page}) => {
    const base = new URL(origin).pathname.replace(/\/$/, '');
    await page.goto(origin + '/en/', {waitUntil:'networkidle'});
    const nav = page.locator('#navbar nav[aria-label="Main navigation"]');
    await expect(nav.locator('[data-nav-key="posts"]')).toHaveAttribute('href', base + '/en/posts/');
    await expect(nav.locator('[data-nav-key="posts"]')).toHaveText('Posts');
    for (const [route, active] of [
      ['/en', 'home'], ['/en/posts/', 'posts'], ['/xx', ''],
      ['/xx/posts/', ''], ['/enough/posts/', ''],
    ]) {
      await page.evaluate((path) => {
        history.replaceState(null, '', path);
        dispatchEvent(new PopStateEvent('popstate'));
      }, base + route);
      const activeLinks = nav.locator('[data-nav-key][aria-current="page"]');
      if (active) await expect(activeLinks).toHaveAttribute('data-nav-key', active);
      else await expect(activeLinks).toHaveCount(0);
    }
  });
  for (const width of [1440,390]) {
    test(`pinned native Shirone Base ${new URL(origin).pathname} ${width}`, async ({browser}, info) => {
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      const page=await context.newPage();const errors:string[]=[];
      page.on('pageerror',error=>errors.push(String(error)));
      try {
        await page.goto(origin+'/',{waitUntil:'networkidle'});
        await expect(page.locator('#navbar.top-app-bar')).toBeVisible();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(page.locator('#main-grid')).toBeVisible();
        await expect(page.locator('#post-list .m3-blog-postcard')).toHaveCount(5);
        await expect(page.locator('.home-hero')).toHaveCount(0);
        await expect(page.locator('h1')).toHaveCount(1);
        const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(canonical).toBe('https://example.com' + new URL(origin).pathname.replace(/\/$/,'') + '/');
        if(width===390) {
          await page.locator('#nav-drawer-switch').click();
          await expect(page.locator('.site-drawer--open')).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(page.locator('.site-drawer--open')).toHaveCount(0);
        } else await expect(page.locator('#sidebar .m3-profile')).toBeVisible();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        expect(errors).toEqual([]);
        const shot=info.outputPath('native-shirone-base.png');
        await page.screenshot({path:shot,fullPage:true,animations:'disabled'});
        await info.attach('native-shirone-base.png',{path:shot,contentType:'image/png'});
      } finally {await context.close();}
    });
  }
}

for (const origin of ['http://127.0.0.1:4323', 'http://127.0.0.1:4324/ALNILAM']) {
  for (const width of [1440, 390]) {
    test(`native routes and real search ${new URL(origin).pathname} ${width}`, async ({browser}, info) => {
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      const page=await context.newPage(); const errors:string[]=[]; const checkedLinks=new Set<string>();
      page.on('pageerror',e=>errors.push(String(e)));
      try {
        const prefix=new URL(origin).pathname.replace(/\/$/,'');
        // /tags/Astro/ is a catalog tag; under the locale-first contract label
        // spellings collapse into canonical slugs, so probe the slug route.
        for (const route of ['/posts/', '/posts/hello-alnilam/', '/tags/', '/tags/astro/', '/categories/', '/categories/guide/', '/archives/', '/en/posts/hello-alnilam/']) {
          const response=await page.goto(origin+route,{waitUntil:'networkidle'});
          expect(response?.status()).toBe(200);
          await expect(page.locator('#navbar.top-app-bar')).toBeVisible();
          await expect(page.locator('#main-grid')).toBeVisible();
          await expect(page.locator('h1')).toHaveCount(1);
          // The route may be the canonical article (legacy layout) or a
          // noindex compatibility alias for the locale-first layout. Either
          // way its canonical must name a real, self-consistent page.
          const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
          expect(canonical,`route ${route} must render a canonical link`).toBeTruthy();
          expect(canonical!.startsWith('https://example.com'+prefix+'/'),`canonical ${canonical} must stay on the deploy origin+base`).toBe(true);
          const canonicalPath=new URL(canonical!).pathname;
          const canonicalLocal=new URL(canonicalPath,origin).href;
          if(canonicalLocal!==origin+route) {
            const canonicalResponse=await page.goto(canonicalLocal,{waitUntil:'networkidle'});
            expect(canonicalResponse?.status(),`canonical target ${canonicalPath} must return 200`).toBe(200);
            await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',canonical!);
            await expect(page.locator('h1')).toHaveCount(1);
          }
          expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
          const hrefs=await page.locator('a[href^="/"]').evaluateAll(links=>links.map(link=>(link as HTMLAnchorElement).href));
          for(const href of new Set(hrefs)) {
            if(checkedLinks.has(href)) continue;
            checkedLinks.add(href);
            expect((await page.request.get(href)).status(),href).toBe(200);
          }
          await page.screenshot({path:info.outputPath(route.replaceAll('/','_')+'.png'),fullPage:true,animations:'disabled'});
        }
        await expect(page.locator('html')).toHaveAttribute('lang','en');
        await expect(page.locator('link[hreflang="zh-CN"]')).toHaveCount(1);
        // Language switcher on translated article points directly to translated equivalent
        const zhTarget=await page.locator('#navbar [data-lang-switcher] a[data-lang-target="zh-CN"]').getAttribute('href');
        expect(zhTarget).toBe(new URL(origin).pathname.replace(/\/$/,'')+'/posts/hello-alnilam/');
        expect(await page.locator('#navbar [data-lang-switcher] a[data-lang-target="zh-CN"]').getAttribute('data-lang-exact')).toBe('true');
        await expect(page.locator('.markdown-content')).toContainText('This article lives in');
        await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
        await page.locator('#navbar [data-lang-switcher] a[data-lang-target="zh-CN"]').click();
        await expect(page).toHaveURL(origin+'/posts/hello-alnilam/');
        const canonicalPath = new URL(origin).pathname.replace(/\/$/,'')+'/en/posts/hello-alnilam/';
        await page.goto(origin+'/posts/en/hello-alnilam/',{waitUntil:'networkidle'});
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://example.com'+canonicalPath);
        await expect(page.locator(`a[href="${canonicalPath}"]`).first()).toBeVisible();
        await expect(page.locator('.markdown-content')).toHaveCount(0);
        const feed=await (await page.request.get(origin+'/en/rss.xml')).text();
        expect(feed).toContain('https://example.com'+canonicalPath);
        expect(feed).not.toContain('/posts/en/hello-alnilam/');
        // Localized taxonomy & listing routes (/en/categories/guide/, /en/posts/)
        const enCatResp=await page.goto(origin+'/en/categories/guide/',{waitUntil:'networkidle'});
        expect(enCatResp?.status()).toBe(200);
        await expect(page.locator('html')).toHaveAttribute('lang','en');
        expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://example.com'+new URL(origin).pathname.replace(/\/$/,'')+'/en/categories/guide/');
        if(width===390) {
          await page.locator('#nav-drawer-switch').click();
          const postsLink=page.locator('.site-drawer__nav').getByRole('link',{name:'Posts'});
          await expect(postsLink).toHaveAttribute('href',new URL(origin).pathname.replace(/\/$/,'')+'/en/posts/');
          await postsLink.click();
          await expect(page).toHaveURL(origin+'/en/posts/');
          await expect(page.locator('html')).toHaveAttribute('lang','en');
          await page.locator('#nav-drawer-switch').click();
          const categoriesLink=page.locator('.site-drawer__nav').getByRole('link',{name:'Categories'});
          await expect(categoriesLink).toHaveAttribute('href',new URL(origin).pathname.replace(/\/$/,'')+'/en/categories/');
          await categoriesLink.click();
          await expect(page).toHaveURL(origin+'/en/categories/');
        }
        // Untranslated article falls back to target locale homepage (/ja/)
        await page.goto(origin+'/posts/fixture-beta-zh/',{waitUntil:'networkidle'});
        expect(await page.locator('#navbar [data-lang-switcher] a[data-lang-target="ja"]').getAttribute('href')).toBe(new URL(origin).pathname.replace(/\/$/,'')+'/ja/');
        await page.locator('#navbar [data-lang-switcher] a[data-lang-target="ja"]').click();
        await expect(page).toHaveURL(origin+'/ja/');
        await page.goto(origin+'/',{waitUntil:'networkidle'});
        if(width===390) {
          await page.locator('#search-switch').click();
          await page.locator('#search-panel input').fill('ALNILAM');
        } else {
          await page.locator('#search-input-desktop-switch').focus();
          await page.keyboard.press('Enter');
          await page.locator('#search-input-desktop').fill('ALNILAM');
        }
        const results=page.locator('#search-panel a.m3-blog-searchpanel__item');
        await expect(results.first()).toBeVisible();
        expect(await results.first().getAttribute('href')).toContain(new URL(origin).pathname.replace(/\/$/,'')+'/posts/');
        const bounds=await page.locator('#search-panel').boundingBox();
        expect(bounds).not.toBeNull(); expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
        await page.keyboard.press("Escape");
        await expect(page.locator("#search-panel")).toHaveClass(/float-panel-closed/);
        await expect(page.locator(width===390 ? "#search-switch" : "#search-input-desktop-switch")).toBeFocused();
        if(width===390) await page.locator("#search-switch").click();
        else {await page.locator("#search-input-desktop-switch").click(); await page.locator("#search-input-desktop").focus();}
        await results.first().click();
        await expect(page.locator('.markdown-content')).toBeVisible();
        expect(errors).toEqual([]);
      } finally {await context.close();}
    });
  }
}
