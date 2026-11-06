import {test, expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const targets = [
  ['home', '/'], ['posts', '/posts/'], ['article', '/posts/getting-started/'],
  ['tags', '/tags/'], ['tag', '/tags/guide/'], ['categories', '/categories/'],
  ['category', '/categories/guide/'], ['archives', '/archives/'],
] as const;
const deployments = [['root', 'http://127.0.0.1:4323'], ['nested', 'http://127.0.0.1:4324/ALNILAM']] as const;
const widths = [1440, 390];
const themes = ['dark', 'light'] as const;
const keyFor = (deployment: string, width: number, theme: string) => `${deployment}-${width}-${theme}`;
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
type Capture = {name: string; file: string; url: string};

function renderReport({key, pairedKey, themeKey, width, provenance, testRunHead, captures, findings}: {
  key: string; pairedKey: string; themeKey: string; width: number;
  provenance: {core: {revision: string}; site: {digest: string}};
  testRunHead: string; captures: Capture[]; findings: unknown[];
}) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width"><title>Shirone visual baseline</title>
<style>
body{font:16px system-ui;margin:24px;max-width:1200px} img{max-width:100%;height:auto;border:1px solid #888}
section{margin-block:32px}.comparison{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
figure{margin:0}code{overflow-wrap:anywhere}
</style>
<h1>ALNILAM native Shirone — ${escape(key)}</h1>
<p>Built Core <code>${escape(provenance.core.revision)}</code>;
Site digest <code>${escape(provenance.site.digest)}</code>;
test runner HEAD <code>${escape(testRunHead)}</code>.</p>
<p>The images represent the served build. They do not certify a clean source checkout or visual approval.</p>
<p>Reduced motion; loaded images; desktop/mobile and opposite-theme pairs from this batch.</p>
<p><a href="../${themeKey}/visual-baseline.html">Compare opposite theme</a>.</p>
<pre>${escape(JSON.stringify(findings, null, 2))}</pre>
${captures.map(c => `<section>
<h2>${escape(c.name)}</h2><p>${escape(c.url)}</p>
<div class="comparison">
<figure><figcaption>${width}px</figcaption><a href="${c.file}"><img src="${c.file}" alt="${escape(c.name)} ${width}px"></a></figure>
<figure><figcaption>${width === 1440 ? 390 : 1440}px</figcaption><a href="../${pairedKey}/${c.file}"><img src="../${pairedKey}/${c.file}" alt="${escape(c.name)} other viewport"></a></figure>
</div></section>`).join('\n')}
</html>`;
}

for (const [deployment, origin] of deployments) {
  for (const width of widths) for (const theme of themes) {
    test(`visual baseline ${deployment} ${width} ${theme}`, async ({browser}, info) => {
      const key = keyFor(deployment, width, theme);
      const pairedKey = keyFor(deployment, width === 1440 ? 390 : 1440, theme);
      const themeKey = keyFor(deployment, width, theme === 'dark' ? 'light' : 'dark');
      const directory = path.join(info.project.outputDir, 'visual-baseline', key);
      fs.mkdirSync(directory, {recursive: true});
      const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce', hasTouch: width === 390});
      await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(String(error)));
      const captures: Capture[] = [];
      const snapshot = async (name: string) => {
        await page.evaluate(() => document.fonts.ready);
        for (const image of await page.locator('main img').all()) {
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
        }
        await page.evaluate(() => scrollTo(0, 0));
        expect(await page.locator('html').evaluate(el => el.classList.contains('dark'))).toBe(theme === 'dark');
        const file = `${name}.png`;
        const screenshot = path.join(directory, file);
        await page.screenshot({path: screenshot, fullPage: true, animations: 'disabled', timeout: 10_000});
        await info.attach(file, {path: screenshot, contentType: 'image/png'});
        captures.push({name, file, url: page.url()});
      };
      try {
        for (const [name, route] of targets) {
          expect((await page.goto(origin + route, {waitUntil: 'networkidle'}))?.status()).toBe(200);
          await expect(page.locator('main h1')).toHaveCount(1);
          await snapshot(name);
        }
        await page.goto(`${origin}/`, {waitUntil: 'networkidle'});
        if (width === 390) {
          await page.locator('#search-switch').click();
          await page.locator('#search-panel input').fill('ALNILAM');
        } else {
          await page.locator('#search-input-desktop-switch').focus();
          await page.keyboard.press('Enter');
          await page.locator('#search-input-desktop').fill('ALNILAM');
        }
        await expect(page.locator('#search-panel a.m3-blog-searchpanel__item').first()).toBeVisible();
        await snapshot('search');
        expect(errors).toEqual([]);
        const testRunHead = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8', cwd: process.env.CNB_CANDIDATE_ROOT ?? process.cwd()}).trim();
        const response = await page.request.get(`${origin}/alnilam-provenance.json`);
        expect(response.ok()).toBe(true);
        const provenance = await response.json();
        expect(provenance.site.digest).toMatch(/^[a-f0-9]{64}$/);
        const findings: unknown[] = [];
        const manifest = {testRunHead, buildProvenance: provenance, deployment, width, height: 1000, theme, reducedMotion: true, key, pairedKey, themeKey, captures, findings, errors};
        const manifestPath = path.join(directory, 'visual-baseline.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        await info.attach('visual-baseline.json', {path: manifestPath, contentType: 'application/json'});
        const reportPath = path.join(directory, 'visual-baseline.html');
        fs.writeFileSync(reportPath, renderReport({key, pairedKey, themeKey, width, provenance, testRunHead, captures, findings}));
        await info.attach('visual-baseline.html', {path: reportPath, contentType: 'text/html'});
      } finally {await context.close();}
    });
  }
}

test.afterAll(async ({}, info) => {
  const root = path.join(info.project.outputDir, 'visual-baseline');
  if (!fs.existsSync(root)) return;
  const expectedKeys = deployments.flatMap(([deployment]) =>
    widths.flatMap(width => themes.map(theme => keyFor(deployment, width, theme))),
  );
  const existingKeys = expectedKeys.filter(key =>
    fs.existsSync(path.join(root, key, 'visual-baseline.json')),
  );
  if (existingKeys.length < expectedKeys.length) return;
  // This report is a complete 8-scenario matrix; missing pair members fail the batch.
  for (const [deployment] of deployments) for (const width of widths) for (const theme of themes) {
    const key = keyFor(deployment, width, theme);
    const directory = path.join(root, key);
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'visual-baseline.json'), 'utf8'));
    expect(manifest.pairedKey).not.toBe(key);
    expect(manifest.themeKey).not.toBe(key);
    const html = fs.readFileSync(path.join(directory, 'visual-baseline.html'), 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      expect(fs.existsSync(path.resolve(directory, match[1])), match[1]).toBe(true);
    }
  }
});
