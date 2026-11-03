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
