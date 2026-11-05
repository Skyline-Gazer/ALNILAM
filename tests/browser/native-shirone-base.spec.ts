import {test, expect} from '@playwright/test';
for (const origin of ['http://127.0.0.1:4323', 'http://127.0.0.1:4324/ALNILAM']) {
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
        for (const route of ['/posts/', '/posts/hello-alnilam/', '/tags/', '/tags/Astro/', '/categories/', '/categories/guide/', '/archives/', '/posts/en/hello-alnilam/']) {
          const response=await page.goto(origin+route,{waitUntil:'networkidle'});
          expect(response?.status()).toBe(200);
          await expect(page.locator('#navbar.top-app-bar')).toBeVisible();
          await expect(page.locator('#main-grid')).toBeVisible();
          await expect(page.locator('h1')).toHaveCount(1);
          // Label/case variants stay reachable but canonicalize to the catalog slug.
          const canonicalRoute = route === '/tags/Astro/' ? '/tags/astro/' : route;
          expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://example.com'+new URL(origin).pathname.replace(/\/$/,'')+canonicalRoute);
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
