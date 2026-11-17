import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSitePageRoutes } from "../../apps/web/src/lib/site-pages.mjs";

const options = { defaultLocale: "zh-CN", locales: ["zh-CN", "en", "ja"] };
const entry = (id, data = {}) => ({ id, data: { title: id, ...data } });

test("page routes preserve nested slugs, strip matching locale directories, and omit drafts", () => {
  const routes = buildSitePageRoutes([
    entry("about", { lang: "zh-CN", translationKey: "about" }),
    entry("en/guide/getting-started", { lang: "en", translationKey: "getting-started" }),
    entry("ja/guide/getting-started", { lang: "ja", translationKey: "getting-started" }),
    entry("en/draft", { lang: "en", draft: true }),
  ], options);

  assert.deepEqual(routes.map(({ locale, slug, path }) => ({ locale, slug, path })), [
    { locale: "zh-CN", slug: "about", path: "/pages/about/" },
    { locale: "en", slug: "guide/getting-started", path: "/en/pages/guide/getting-started/" },
    { locale: "ja", slug: "guide/getting-started", path: "/ja/pages/guide/getting-started/" },
  ]);
  assert.deepEqual(routes[1].alternates, [
    { lang: "en", path: "/en/pages/guide/getting-started/" },
    { lang: "ja", path: "/ja/pages/guide/getting-started/" },
  ]);
});

test("translation alternates include x-default only when the default locale exists", () => {
  const [english, japanese] = buildSitePageRoutes([
    entry("en/privacy", { lang: "en", translationKey: "privacy" }),
    entry("ja/privacy", { lang: "ja", translationKey: "privacy" }),
  ], options);

  assert.deepEqual(english.alternates, [
    { lang: "en", path: "/en/pages/privacy/" },
    { lang: "ja", path: "/ja/pages/privacy/" },
  ]);
  assert.deepEqual(japanese.alternates, english.alternates);
  assert.equal(buildSitePageRoutes([entry("legal")], options)[0].alternates, null);
});

test("invalid locale declarations, mismatched locale directories, and duplicate routes fail closed", () => {
  assert.throws(
    () => buildSitePageRoutes([entry("about", { lang: "fr" })], options),
    /declares disabled locale "fr"/,
  );
  assert.throws(
    () => buildSitePageRoutes([entry("en/about", { lang: "ja" })], options),
    /under locale directory "en" but declares "ja"/,
  );
  assert.throws(
    () => buildSitePageRoutes([entry("about"), entry("zh-CN/about")], options),
    /duplicate page route for locale "zh-CN": "about"/,
  );
  assert.throws(
    () => buildSitePageRoutes([
      entry("about", { lang: "zh-CN", translationKey: "same" }),
      entry("about-2", { lang: "zh-CN", translationKey: "same" }),
    ], options),
    /duplicate page translationKey "same" for locale "zh-CN"/,
  );
});
