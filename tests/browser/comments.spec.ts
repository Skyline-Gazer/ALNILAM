import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { CLS_BUDGET, calculateCLS, observeLayoutShifts } from "../../scripts/ci/cnb-metrics.mjs";

const fixtureReady = process.env.COMMENTS_FIXTURE === "1";
const disabledOrigin = "http://127.0.0.1:4323";
const origins = [
  { origin: "http://127.0.0.1:4325", prefix: "" },
  { origin: "http://127.0.0.1:4326/ALNILAM", prefix: "/ALNILAM" },
];

const CLIENT_SCRIPT = `(() => {
  const script = document.currentScript;
  const box = document.querySelector(".giscus");
  if (!script || !box || box.querySelector("iframe.giscus-frame")) return;
  const css = document.getElementById("giscus-css") || document.createElement("link");
  css.id = "giscus-css";
  css.rel = "stylesheet";
  css.href = new URL("/default.css", script.src).href;
  document.head.prepend(css);
  const params = new URLSearchParams({
    theme: script.dataset.theme || "",
    lang: script.dataset.lang || "",
    term: script.dataset.term || "",
    mapping: script.dataset.mapping || "",
  });
  const frame = document.createElement("iframe");
  frame.className = "giscus-frame";
  frame.title = "Mock Giscus";
  frame.src = "https://giscus.app/widget?" + params.toString();
  box.appendChild(frame);
})();`;

const WIDGET_HTML = `<!doctype html><html><body>
<p id="mock-giscus">Mock Giscus</p>
<script>
  const params = new URLSearchParams(location.search);
  for (const key of ["theme", "lang", "term", "mapping"]) {
    document.documentElement.dataset[key] = params.get(key) || "";
  }
  addEventListener("message", (event) => {
    const config = event.data && event.data.giscus && event.data.giscus.setConfig;
    if (!config) return;
    for (const key of ["theme", "lang"]) if (config[key]) document.documentElement.dataset[key] = config[key];
  });
<\/script></body></html>`;

async function mockGiscus(page: Page, state: { calls: string[]; offline: boolean }) {
  await page.route("https://giscus.app/**", async (route) => {
    state.calls.push(route.request().url());
    if (state.offline) return route.abort("failed");
    const headers = { "access-control-allow-origin": "*" };
    if (route.request().url().includes("/client.js")) {
      return route.fulfill({ status: 200, headers: { ...headers, "content-type": "application/javascript" }, body: CLIENT_SCRIPT });
    }
    if (route.request().url() === "https://giscus.app/default.css") {
      return route.fulfill({ status: 200, headers: { ...headers, "content-type": "text/css" }, body: ".giscus-frame { --giscus-test-stylesheet-loaded: loaded; }" });
    }
    if (route.request().url().includes("/widget")) {
      return route.fulfill({ status: 200, headers: { ...headers, "content-type": "text/html" }, body: WIDGET_HTML });
    }
    return route.fulfill({ status: 404, headers, body: "" });
  });
}

async function giscusFrame(page: Page) {
  await expect
    .poll(() => page.frames().find((frame) => frame.url().startsWith("https://giscus.app/widget")))
    .toBeTruthy();
  return page.frames().find((frame) => frame.url().startsWith("https://giscus.app/widget"))!;
}

async function articleGeometry(page: Page) {
  return page.locator(".post-card").first().evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + window.scrollX, y: box.y + window.scrollY, width: box.width, height: box.height };
  });
}

async function prepareComments(page: Page) {
  const comments = page.locator("#comments");
  await comments.locator(".comments-action").scrollIntoViewIfNeeded();
  const island = comments.locator("astro-island");
  await expect(island).toHaveCount(1);
  await expect(island).not.toHaveAttribute("ssr", "");
  return comments;
}

if (fixtureReady) {
  test("comments assets are emitted only for enabled sites", () => {
    const assets = (directory: string): { name: string; content: string }[] =>
      fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) return assets(file);
        return /\.(?:js|css)$/.test(entry.name)
          ? [{ name: entry.name, content: fs.readFileSync(file, "utf8") }]
          : [];
      });
    for (const output of ["site", "nested-base"]) {
      const files = assets(path.resolve("dist", output, "_astro"));
      expect(files.filter(({ name }) => /^(?:Comments[.-]|(?:Twikoo|Waline)\.astro[_ .-]|waline-emoji[.-]).*\.(?:js|css)$/.test(name))).toEqual([]);
      expect(files.filter(({ content }) => /giscus\.app|\.comments-provider|waline-emoji|twikoo\.js\.org|unpkg\.com\/@waline/.test(content))).toEqual([]);
    }
    for (const output of ["comments-root", "comments-nested"]) {
      const files = assets(path.resolve("dist", output, "_astro"));
      expect(files.some(({ name, content }) => name.endsWith(".js") && content.includes("giscus.app"))).toBe(true);
      expect(files.some(({ name, content }) => name.endsWith(".css") && content.includes(".comments-provider"))).toBe(true);
    }
  });

  for (const { origin, prefix } of origins) {
    test(`Giscus stylesheet loads without a CSP violation ${prefix || "/"}`, async ({ page }) => {
      const state = { calls: [] as string[], offline: false };
      await page.addInitScript(() => {
        const target = window as Window & { __cspViolations: { directive: string; blockedURI: string }[] };
        target.__cspViolations = [];
        document.addEventListener("securitypolicyviolation", (event) => {
          target.__cspViolations.push({ directive: event.effectiveDirective, blockedURI: event.blockedURI });
        });
      });
      await mockGiscus(page, state);
      await page.goto(`${origin}/posts/comment-fixture/`, { waitUntil: "networkidle" });
      await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
      const comments = await prepareComments(page);
      await comments.locator(".comments-action").click();
      await expect(comments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "ready");
      await expect(page.locator('#giscus-css[href="https://giscus.app/default.css"]')).toHaveCount(1);
      await expect(comments.locator("iframe.giscus-frame")).toHaveCSS("--giscus-test-stylesheet-loaded", "loaded");
      expect(state.calls).toContain("https://giscus.app/default.css");
      expect(await page.evaluate(() => (window as Window & { __cspViolations: { directive: string; blockedURI: string }[] }).__cspViolations)).toEqual([]);
    });

    test(`GitHub cards hydrate under the comments CSP ${prefix || "/"}`, async ({ page }) => {
      const requests: string[] = [];
      await page.route("https://api.github.com/repos/example/comments-fixture", async (route) => {
        requests.push(route.request().url());
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
          body: JSON.stringify({ description: "CSP card fixture", forks_count: 2, language: "TypeScript", license: null, owner: null, stargazers_count: 3 }),
        });
      });
      await page.goto(`${origin}/posts/comment-fixture/`, { waitUntil: "networkidle" });
      await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
      const card = page.locator('[data-github-card][data-github-repo="example/comments-fixture"]');
      await expect(card).toHaveAttribute("data-github-state", "ready");
      await expect(card.locator("[data-github-description]")).toHaveText("CSP card fixture");
      expect(requests).toHaveLength(1);
    });

    test(`Giscus follows data-theme without a dark class ${prefix || "/"}`, async ({ page }) => {
      const state = { calls: [] as string[], offline: false };
      await mockGiscus(page, state);
      await page.goto(`${origin}/posts/comment-fixture/`, { waitUntil: "networkidle" });
      const comments = await prepareComments(page);
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        document.documentElement.dataset.theme = "dark";
      });
      await comments.locator(".comments-action").click();
      await expect(comments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "ready");
      const frame = await giscusFrame(page);
      await expect(frame.locator("html")).toHaveAttribute("data-theme", "dark_dimmed");

      await page.evaluate(() => {
        document.documentElement.dataset.theme = "light";
        window.dispatchEvent(new CustomEvent("giscus-theme-change"));
      });
      await expect(frame.locator("html")).toHaveAttribute("data-theme", "light");
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "dark";
        window.dispatchEvent(new CustomEvent("shirone:theme-change"));
      });
      await expect(frame.locator("html")).toHaveAttribute("data-theme", "dark_dimmed");
      await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);
    });

    for (const width of [390, 1440]) {
      test(`Giscus stable identity, privacy gate and lifecycle ${prefix || "/"} ${width}`, async ({ browser }, info) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", hasTouch: width === 390 });
        await context.addInitScript(observeLayoutShifts);
        const page = await context.newPage();
        const state = { calls: [] as string[], offline: false };
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(String(error)));
        await mockGiscus(page, state);
        try {
          await page.goto(`${origin}/posts/comment-fixture/`, { waitUntil: "networkidle" });
          const comments = await prepareComments(page);
          await expect(comments).toBeVisible();
          await expect(comments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "idle");
          await expect(comments.locator("[data-comment-term]")).toHaveAttribute(
            "data-comment-term",
            "alnilam:translation:comment-fixture",
          );
          await expect(page.locator("script[src*='giscus'], iframe[src*='giscus']")).toHaveCount(0);
          expect(state.calls).toEqual([]);
          await expect(comments).toContainText(/Giscus|giscus/);

          const article = await page.locator(".markdown-content").innerText();
          const before = await articleGeometry(page);
          const scrollBefore = await page.evaluate(() => window.scrollY);
          await page.evaluate(() => (window.__cnbShifts = []));

          await comments.locator(".comments-action", { hasText: /加载评论|Load comments|コメントを読み込む/ }).click();
          await expect(comments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "ready", {
            timeout: 10_000,
          });
          await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);
          await expect(page.locator("script[src*='giscus']")).toHaveCount(1);
          const frame = await giscusFrame(page);
          expect(frame.url()).toContain("term=alnilam%3Atranslation%3Acomment-fixture");
          expect(frame.url()).toContain("lang=zh-CN");
          expect(frame.url()).toContain("mapping=specific");

          const after = await articleGeometry(page);
          expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore)).toBeLessThan(1);
          expect(Math.abs(after.y - before.y)).toBeLessThan(1);
          expect(Math.abs(after.height - before.height)).toBeLessThan(1);
          expect(await page.locator(".markdown-content").innerText()).toBe(article);

          const light = await frame.locator("html").getAttribute("data-theme");
          expect(light).toMatch(/dark/);
          await page.evaluate(() => {
            document.documentElement.classList.remove("dark");
            window.dispatchEvent(new CustomEvent("giscus-theme-change", { detail: "light" }));
          });
          await expect.poll(() => frame.locator("html").getAttribute("data-theme")).toBe("light");
          await page.screenshot({ path: info.outputPath(`comments-light-${width}.png`), fullPage: true, animations: "disabled" });
          await page.evaluate(() => {
            document.documentElement.classList.add("dark");
            window.dispatchEvent(new CustomEvent("giscus-theme-change", { detail: "dark" }));
          });
          await expect.poll(() => frame.locator("html").getAttribute("data-theme")).toBe("dark_dimmed");
          await page.screenshot({ path: info.outputPath(`comments-dark-${width}.png`), fullPage: true, animations: "disabled" });
          await page.waitForTimeout(700);

          await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);
          expect(state.calls.filter((url) => url.includes("/client.js"))).toHaveLength(1);
          const shifts = await page.evaluate("window.__cnbShifts || []");
          const cls = calculateCLS(shifts);
          expect(cls, `raw comment-mount CLS ${JSON.stringify(shifts)}`).toBeLessThanOrEqual(CLS_BUDGET);

          // MPA back/forward reloads the document: each document gets at most one
          // provider script/iframe, and the stable term survives navigation.
          await page.goto(`${origin}/en/posts/comment-fixture/`, { waitUntil: "networkidle" });
          const enComments = await prepareComments(page);
          await expect(enComments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "idle");
          await expect(enComments.locator("[data-comment-term]")).toHaveAttribute(
            "data-comment-term",
            "alnilam:translation:comment-fixture",
          );
          await enComments.locator(".comments-action").click();
          await expect(enComments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "ready");
          const enFrame = await giscusFrame(page);
          expect(enFrame.url()).toContain("lang=en");
          await page.goBack({ waitUntil: "networkidle" });
          const backComments = page.locator("#comments");
          if ((await backComments.locator("[data-comments-state]").getAttribute("data-comments-state")) !== "ready") {
            await prepareComments(page);
            await backComments.locator(".comments-action").click();
          }
          await expect(backComments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "ready");
          await expect(page.locator("#comments iframe.giscus-frame")).toHaveCount(1);
          expect(errors).toEqual([]);
        } finally {
          await info.attach("comments-lifecycle.json", {
            body: JSON.stringify({ origin, width, calls: state.calls, errors }, null, 2),
            contentType: "application/json",
          });
          await context.close();
        }
      });
    }
  }

  test("Giscus failure is non-blocking and retry recovers", async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const page = await context.newPage();
    const state = { calls: [] as string[], offline: true };
    await mockGiscus(page, state);
    try {
      await page.goto(`${origins[0].origin}/posts/comment-fixture/`, { waitUntil: "networkidle" });
      const comments = await prepareComments(page);
      await comments.locator(".comments-action").click();
      await expect(comments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "error", {
        timeout: 10_000,
      });
      await expect(comments.locator("[role='alert']")).toBeVisible();
      await expect(comments.locator("iframe.giscus-frame")).toHaveCount(0);
      await expect(page.locator(".markdown-content")).toBeVisible();
      const discussion = comments.locator(".comments-error .comments-discussion");
      await expect(discussion).toHaveAttribute("href", "https://github.com/alnilam/comments-fixture/discussions");

      state.offline = false;
      await comments.locator(".comments-error .comments-action").click();
      await expect(comments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "ready");
      await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);
      expect(state.calls.filter((url) => url.includes("/client.js")).length).toBeGreaterThanOrEqual(2);
      await page.screenshot({ path: info.outputPath("comments-recovered.png"), fullPage: true, animations: "disabled" });
    } finally {
      await info.attach("comments-offline.json", {
        body: JSON.stringify({ calls: state.calls }, null, 2),
        contentType: "application/json",
      });
      await context.close();
    }
  });
  test("Giscus timeout removes the failed mount and ignores a late iframe", async ({ page }) => {
    let scripts = 0;
    await page.route("https://giscus.app/**", async (route) => {
      const headers = { "access-control-allow-origin": "*" };
      if (route.request().url().includes("/client.js")) {
        scripts += 1;
        const body = scripts === 1
          ? `(() => {
              const box = document.querySelector(".giscus");
              window.__lateGiscusScheduled = true;
              setTimeout(() => {
                const frame = document.createElement("iframe");
                frame.className = "giscus-frame";
                box.appendChild(frame);
                window.__lateGiscusAppended = true;
              }, 16000);
            })();`
          : CLIENT_SCRIPT;
        return route.fulfill({ status: 200, headers: { ...headers, "content-type": "application/javascript" }, body });
      }
      return route.fulfill({ status: 200, headers: { ...headers, "content-type": "text/html" }, body: WIDGET_HTML });
    });
    await page.goto(`${origins[0].origin}/posts/comment-fixture/`, { waitUntil: "networkidle" });
    const comments = await prepareComments(page);
    await page.clock.install();
    await comments.locator(".comments-action").click();
    await expect.poll(() => page.evaluate("window.__lateGiscusScheduled === true")).toBe(true);
    await page.clock.runFor(15_000);
    await expect(comments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "error");
    await expect(comments.locator(".giscus")).toHaveCount(0);
    await comments.locator(".comments-error .comments-action").click();
    await expect(comments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "ready");
    await page.clock.runFor(2_000);
    expect(await page.evaluate("window.__lateGiscusAppended === true")).toBe(true);
    await expect(comments.locator("[data-comments-state]")).toHaveAttribute("data-comments-state", "ready");
    await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);
    expect(scripts).toBe(2);
  });
} else {
  test("comments fixture build unavailable", () => {
    test.skip(true, "Run scripts/local-browser.mjs to create and serve the comments fixtures");
  });
}

test("comments disabled output makes zero giscus requests", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (/giscus/i.test(request.url())) calls.push(request.url());
  });
  await page.goto(`${disabledOrigin}/posts/getting-started/`, { waitUntil: "networkidle" });
  await expect(page.locator("#comments")).toHaveCount(0);
  await expect(page.locator("script[src*='giscus'], iframe[src*='giscus']")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  expect(calls).toEqual([]);
});
