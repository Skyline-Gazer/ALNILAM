import { test, expect, type Page } from "@playwright/test";
import { CLS_BUDGET, calculateCLS, assertCLSBudget, observeLayoutShifts } from "../../scripts/ci/cnb-metrics.mjs";

// Preserve actionable failure traces without archiving successful navigation recordings.
test.use({ trace: "retain-on-failure" });
const origins = ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"];
const captureScreenshot = async (page: Page, path: string) =>
  page.screenshot({
    path,
    fullPage: true,
    animations: "disabled",
    timeout: 5_000,
  });

async function switchToLight(page: Page, width: number) {
  if (width >= 1024) {
    await page.locator("#scheme-switch").click();
    await page.locator(".m3-menu .m3-menu-item").first().click();
  } else {
    for (let i = 0; i < 3; i++) {
      const isDark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
      const stored = await page.evaluate(() => localStorage.getItem("theme"));
      if (!isDark && stored === "light") break;
      await page.locator("#scheme-switch").click();
    }
  }
  await expect(page.locator("html")).not.toHaveClass(/dark/);
}

for (const origin of origins)
  for (const width of [390, 1440]) {
    test(`CNB navigation and CLS ${new URL(origin).pathname} ${width}`, async ({ browser }, info) => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
        hasTouch: width === 390,
      });
      await context.addInitScript(observeLayoutShifts);
      const page = await context.newPage();
      const errors: string[] = [];
      const samples: unknown[] = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("requestfailed", (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
      page.on("response", (response) => {
        if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
      });
      const sample = async (action: string) => {
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(650);
        const events = await page.evaluate("window.__cnbShifts || []");
        samples.push({ url: page.url(), action, cls: calculateCLS(events), events });
        await captureScreenshot(page, info.outputPath(`${action}.png`));
      };
      try {
        await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
        await sample("home");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await switchToLight(page, width);
        await sample("theme");
        // Pagefind searches the current document language; use the demo's default-locale article.
        const articlePath = `${new URL(origin).pathname.replace(/\/$/, "")}/posts/getting-started/`;
        await page.locator(`.m3-blog-postcard a.m3-blog-postcard__title[href="${articlePath}"]`).click();
        await expect(page.locator(".post-card")).toBeVisible();
        const articleURL = page.url();
        const articleTitle = (await page.locator(".post-card h1").innerText()).trim();
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sample("article-scroll");
        const scrollPosition = await page.evaluate(() => scrollY);
        expect(scrollPosition).toBeGreaterThan(0);
        for (let round = 0; round < 10; round++) {
          await page.goBack({ waitUntil: "domcontentloaded" });
          await expect(page.locator("#post-list")).toBeVisible();
          await page.goForward({ waitUntil: "domcontentloaded" });
          await expect(page.locator(".post-card")).toBeVisible();
          await expect
            .poll(async () => Math.abs((await page.evaluate(() => scrollY)) - scrollPosition))
            .toBeLessThanOrEqual(2);
          expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
        }
        await sample("restoration");
        await page.goto(`${origin}/tags/`, { waitUntil: "domcontentloaded" });
        await expect(page.locator("main h1")).toBeVisible();
        const tag = page.locator('main a[href*="/tags/"]').first();
        await expect(tag).toBeVisible();
        await tag.click();
        await expect(page.locator(".m3-blog-archive__item").first()).toBeVisible();
        await sample("tags");
        if (width === 390) {
          await page.locator("#search-switch").click();
          await page.locator("#search-panel input").fill(articleTitle);
        } else {
          await page.locator("#search-input-desktop-switch").click();
          await page.locator("#search-input-desktop").fill(articleTitle);
        }
        const search = page.locator("#search-panel");
        const resultURLs = () =>
          search
            .locator("a.m3-blog-searchpanel__item[href]")
            .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
        await expect.poll(resultURLs).toContain(articleURL);
        await search
          .locator("a.m3-blog-searchpanel__item[href]")
          .nth((await resultURLs()).indexOf(articleURL))
          .click();
        await expect(page).toHaveURL(articleURL);
        await expect(page.locator(".post-card")).toBeVisible();
        await sample("search");
        expect(errors).toEqual([]);
      } finally {
        await info.attach("cls.json", {
          body: JSON.stringify({ labOnly: true, origin, width, samples, errors }, null, 2),
          contentType: "application/json",
        });
        await context.close();
      }
    });
  }

test("optional integrations remain absent on disabled product pages", async ({ page }) => {
  const related: string[] = [];
  page.on("request", (request) => {
    if (/giscus|bgm\.tv|api\.bgm\.tv|googletagmanager|google-analytics|googlesyndication|doubleclick|twikoo|waline\.js\.org|cdn\.jsdelivr\.net\/npm\/(?:twikoo|@waline)/i.test(request.url()))
      related.push(request.url());
  });
  await page.goto(`${origins[0]}/`, { waitUntil: "domcontentloaded" });
  await page.locator(".m3-blog-postcard a.m3-blog-postcard__title").first().click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(650);
  expect(related).toEqual([]);
  expect(await page.locator('script[src*="giscus"],script[src*="google"],script[src*="twikoo"],script[src*="waline"]').count()).toBe(0);
  expect(await page.locator('a[href*="/bangumi"]').count()).toBe(0);
  expect(await page.locator('#comments, [data-comment-section], .giscus').count()).toBe(0);
});

test("deterministic consent, ads, GA4, comments and adblock fixtures", async ({ page }, info) => {
  const calls: string[] = [];
  await page.route("https://fixture.invalid/**", async (route) => {
    calls.push(route.request().url());
    if (route.request().url().includes("blocked-ad")) return route.abort("blockedbyclient");
    await route.fulfill({ contentType: "application/javascript", body: "window.mockLoaded = true;" });
  });
  await page.addInitScript(observeLayoutShifts);
  await page.goto(`${origins[0]}/`);
  await page.setContent(`<style>body{margin:0}#slot{height:250px}#comments{height:260px}#notice{position:fixed;bottom:0}article{font:20px sans-serif}</style>
    <main><article><h1>Readable article fixture</h1><p>Article stays readable when optional requests fail.</p></article>
    <div id="slot"></div><div id="comments"></div></main><aside id="notice" hidden>Nonblocking adblock notice</aside>
    <script>window.pageviews=[];window.seen=new Set();window.initializeOptional=(consent,path,navigation)=>{
      if(!consent)return;
      for(const id of ['ads','ga4','comments']){if(document.getElementById('script-'+id))continue;const script=document.createElement('script');script.id='script-'+id;script.src='https://fixture.invalid/'+id+'.js';document.head.append(script)}
      if(!seen.has(navigation)){seen.add(navigation);pageviews.push(path)}
    };</script>`);
  await page.waitForTimeout(650);
  await page.evaluate("window.__cnbShifts = []");
  await page.evaluate('initializeOptional(false,"/article/")');
  expect(calls).toEqual([]);
  expect(await page.locator("script[src]").count()).toBe(0);
  await page.evaluate(
    'initializeOptional(true,"/article/",1);initializeOptional(true,"/article/",1);initializeOptional(true,"/next/",2);initializeOptional(true,"/article/",3)',
  );
  await expect.poll(() => calls.length).toBe(3);
  expect(await page.evaluate("pageviews")).toEqual(["/article/", "/next/", "/article/"]);
  await page.waitForTimeout(650);
  await page.evaluate(() => {
    const iframe = document.createElement("iframe");
    iframe.title = "Mock comments";
    iframe.style.cssText = "width:100%;height:250px;border:0";
    iframe.srcdoc = "<p>Mock comments</p>";
    document.querySelector("#comments")!.append(iframe);
    document.querySelector("#slot")!.textContent = "Reserved advertisement";
    document.querySelector<HTMLElement>("#notice")!.hidden = false;
    const ad = document.createElement("script");
    ad.src = "https://fixture.invalid/blocked-ad.js";
    document.head.append(ad);
  });
  await page.waitForTimeout(650);
  await expect(page.locator("article")).toBeVisible();
  expect((await page.locator("#slot").boundingBox())!.height).toBe(250);
  const events = await page.evaluate("window.__cnbShifts || []");
  expect(assertCLSBudget(events)).toBeLessThanOrEqual(CLS_BUDGET);
  await info.attach("optional-fixtures.json", {
    body: JSON.stringify({ calls, events, cls: calculateCLS(events) }),
    contentType: "application/json",
  });
});

for (const action of ["delayed-image", "font", "lazy", "menu", "comments", "ad", "consent", "adblock"]) {
  test(`LayoutShift attribution fixture: ${action}`, async ({ page }, info) => {
    await page.addInitScript(observeLayoutShifts);
    await page.goto(`${origins[0]}/`);
    await page.setContent(
      '<style>body{margin:0}main{font:24px sans-serif}#reserved{height:300px}#notice{position:fixed;bottom:0}</style><div id="reserved"></div><main><h1>Layout fixture</h1><p>Repeated content for deterministic layout measurement.</p></main><aside id="notice"></aside>',
    );
    await page.waitForTimeout(650);
    await page.evaluate("window.__cnbShifts = []");
    await page.evaluate(async (action) => {
      window["__cnbAction"] = action;
      const reserved = document.querySelector<HTMLElement>("#reserved")!;
      if (action === "font") {
        await document.fonts.load("24px serif");
        document.querySelector<HTMLElement>("main")!.style.fontFamily = "serif";
      } else if (action === "adblock" || action === "consent" || action === "menu") {
        document.querySelector("#notice")!.textContent = action;
      } else if (action === "delayed-image") {
        const image = document.createElement("img");
        image.width = 200;
        image.height = 200;
        image.src =
          "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="gray"/></svg>',
          );
        reserved.append(image);
      } else reserved.textContent = `Reserved ${action} content`;
    }, action);
    await page.waitForTimeout(650);
    const events = await page.evaluate("window.__cnbShifts || []");
    assertCLSBudget(events);
    await info.attach("layout-shifts.json", {
      body: JSON.stringify({ action, cls: calculateCLS(events), events }),
      contentType: "application/json",
    });
  });
}

test("large shift is detected and the CLS gate rejects it", async ({ page }) => {
  await page.addInitScript(observeLayoutShifts);
  await page.goto(`${origins[0]}/`);
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const slot = document.createElement("div");
    slot.style.height = "600px";
    (document.querySelector("main") ?? document.body).prepend(slot);
  });
  await page.waitForTimeout(500);
  const events = await page.evaluate("window.__cnbShifts || []");
  expect(calculateCLS(events)).toBeGreaterThan(CLS_BUDGET);
  expect(() => assertCLSBudget(events)).toThrow(/CLS regression/);
});
