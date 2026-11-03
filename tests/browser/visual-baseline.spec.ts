import {test, expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const targets = [
  ['home', '/'], ['posts', '/posts/'], ['article', '/posts/getting-started/'],
  ['tags', '/tags/'], ['tag', '/tags/Guide/'], ['archives', '/archives/'],
] as const;
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
for (const [deployment, origin] of [['root', 'http://127.0.0.1:4323'], ['nested', 'http://127.0.0.1:4324/ALNILAM']] as const) {
  for (const width of [1440, 390]) for (const theme of ['dark', 'light'] as const) {
    test(`visual baseline ${deployment} ${width} ${theme}`, async ({browser}, info) => {
      const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce', hasTouch: width === 390});
      await context.addInitScript(theme => localStorage.setItem('alnilam-theme', theme), theme);
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(String(error)));
      const captures: {name: string; file: string; url: string}[] = [];
      const snapshot = async (name: string) => {
        await page.evaluate(() => document.fonts.ready);
        // Await actual lazy images so a full-page image never records blank covers.
        const images = page.locator('main img');
        for (const image of await images.all()) {
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
        }
        await page.evaluate(() => scrollTo(0, 0));
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const file = `${name}.png`;
        const screenshot = info.outputPath(file);
        await page.screenshot({path: screenshot, fullPage: true, animations: 'disabled', timeout: 10_000});
        await info.attach(file, {path: screenshot, contentType: 'image/png'});
        captures.push({name, file, url: page.url()});
      };
      try {
        for (const [name, route] of targets) {
          const response = await page.goto(origin + route, {waitUntil: 'networkidle'});
          expect(response?.status()).toBe(200);
          await expect(page.locator('main h1')).toHaveCount(1);
          await snapshot(name);
        }
        await page.goto(`${origin}/`, {waitUntil: 'networkidle'});
        await page.getByRole('button', {name: '搜索', exact: true}).click();
        const search = page.getByRole('dialog', {name: '站内搜索'});
        await search.getByRole('searchbox').fill('ALNILAM');
        await expect(search.getByRole('link').first()).toBeVisible();
        await snapshot('search');
        // Keep a known missing product route visible, rather than silently using tags as categories.
        const categories = await page.request.get(`${origin}/categories/`);
        const categoryStatus = categories.status();
        if (categoryStatus === 200) {
          await page.goto(`${origin}/categories/`, {waitUntil: 'networkidle'});
          await snapshot('categories');
        } else {
          expect(categoryStatus).toBe(404);
        }
        expect(errors).toEqual([]);
        const source = process.env.CNB_PULL_REQUEST_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
        const findings = categoryStatus === 404 ? [{severity: 'P2', feature: 'categories', status: 'NOT_IMPLEMENTED', issue: '#62', note: 'Independent category-page screenshots remain pending; tags are labelled separately.'}] : [];
        const manifest = {source, deployment, width, height: 1000, theme, reducedMotion: true, fixture: 'sites/demo at source SHA', captures, categoryStatus, findings, errors};
        const manifestPath = info.outputPath('visual-baseline.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        await info.attach('visual-baseline.json', {path: manifestPath, contentType: 'application/json'});
        const directory = path.basename(path.dirname(info.outputPath('visual-baseline.html')));
        const otherWidth = width === 1440 ? 390 : 1440;
        const pairedDirectory = directory.replace(`-${width}-${theme}`, `-${otherWidth}-${theme}`);
        const otherTheme = directory.replace(`-${width}-${theme}`, `-${width}-${theme === 'dark' ? 'light' : 'dark'}`);
        const report = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ALNILAM visual baseline</title><style>body{font:16px system-ui;margin:24px;max-width:1200px}img{max-width:100%;height:auto;border:1px solid #888}section{margin-block:32px}.comparison{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure{margin:0}code{overflow-wrap:anywhere}</style><h1>ALNILAM — ${deployment} / ${width}px / ${theme}</h1><p>Source <code>${escape(source)}</code>. Fixed demo content; reduced motion; actual loaded images. Screenshots are evidence for human review, not automatic visual approval.</p><p>Comparison: inspect desktop/mobile and dark/light report pairs from this same run. UX severity: P0 unusable/data loss; P1 blocks a core action; P2 functional gap; P3 cosmetic.</p><p><a href="../${otherTheme}/visual-baseline.html">Compare opposite theme</a>. Download the whole artifact archive to preserve relative image links.</p><pre>${escape(JSON.stringify(findings, null, 2))}</pre>${captures.map(c => `<section><h2>${escape(c.name)}</h2><p>${escape(c.url)}</p><div class="comparison"><figure><figcaption>${width}px</figcaption><a href="${c.file}"><img src="${c.file}" alt="${escape(c.name)} ${width}px screenshot"></a></figure><figure><figcaption>${otherWidth}px</figcaption><a href="../${pairedDirectory}/${c.file}"><img src="../${pairedDirectory}/${c.file}" alt="${escape(c.name)} ${otherWidth}px comparison"></a></figure></div></section>`).join('')}</html>`;
        const reportPath = info.outputPath('visual-baseline.html');
        fs.writeFileSync(reportPath, report);
        await info.attach('visual-baseline.html', {path: reportPath, contentType: 'text/html'});
      } finally { await context.close(); }
    });
  }
}
