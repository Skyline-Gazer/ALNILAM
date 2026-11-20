import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Locale resolution contract for the Shirone UI dictionaries.
 *
 * `i18nForLocale()` is the single entry point the header, drawer, search and
 * theme islands use, so its behaviour is product-visible:
 *
 * - a page renders its own language in all ten shipped dictionaries;
 * - an unknown locale degrades to English instead of an empty label;
 * - a Site override wins over the built-in dictionary;
 * - a key nobody defines degrades to a defined value, never to "undefined".
 *
 * The dictionaries are vendored upstream sources, so their wording is pinned
 * here on purpose: a reworded label is a deliberate change, not an accident.
 */

const theme = new URL("../../themes/shirone/upstream/src/i18n/", import.meta.url);
const { i18nConfig } = await import(new URL("../config/i18nConfig.ts", theme));

// A Site override reaches the theme through `i18nConfig`, which the Site
// adapter fills at build time. ALNILAM's own Site contract has no i18n domain
// yet, so the override is injected exactly the way the adapter would inject it,
// before the translation module reads it.
i18nConfig.zh_cn = { archive: "站点归档" };

const { getTranslation, i18n, i18nForLocale, resolveTranslation } = await import(
  new URL("translation.ts", theme)
);

const DICTIONARIES = {
  en: "en",
  es: "es",
  id: "id",
  ja: "ja",
  ko: "ko",
  th: "th",
  tr: "tr",
  vi: "vi",
  zh_CN: "zh_CN",
  zh_TW: "zh_TW",
};

const dictionaries = {};
for (const [locale, name] of Object.entries(DICTIONARIES)) {
  dictionaries[locale] = (await import(new URL(`languages/${name}.ts`, theme)))[name];
}

const englishKeys = Object.keys(dictionaries.en).sort();

const HEADER_LABELS = {
  en: { menu: "Menu", displaySettings: "Display settings", search: "Search" },
  es: { menu: "Menú", displaySettings: "Ajustes de visualización", search: "Buscar" },
  id: { menu: "Menu", displaySettings: "Pengaturan tampilan", search: "Cari" },
  ja: { menu: "メニュー", displaySettings: "表示設定", search: "検索" },
  ko: { menu: "메뉴", displaySettings: "표시 설정", search: "검색" },
  th: { menu: "เมนู", displaySettings: "การตั้งค่าการแสดงผล", search: "ค้นหา" },
  tr: { menu: "Menü", displaySettings: "Görünüm ayarları", search: "Ara" },
  vi: { menu: "Menu", displaySettings: "Cài đặt hiển thị", search: "Tìm kiếm" },
  zh_CN: { menu: "菜单", displaySettings: "显示设置", search: "搜索" },
  zh_TW: { menu: "選單", displaySettings: "顯示設定", search: "搜尋" },
};

const LOCALE_VARIANTS = {
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
  "ja-JP": "ja",
  "en-US": "en",
  "en-GB": "en",
  "ko-KR": "ko",
  "th-TH": "th",
  "vi-VN": "vi",
  "es-ES": "es",
  "id-ID": "id",
  "tr-TR": "tr",
};

const UNKNOWN_LOCALES = ["fr", "xx", "", "de-DE", "zh-Hans-CN"];

test("every dictionary defines exactly the English key set", () => {
  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    assert.deepEqual(Object.keys(dictionary).sort(), englishKeys, `dictionary ${locale}`);
  }
});

for (const [locale, dictionary] of Object.entries(dictionaries)) {
  test(`locale ${locale} resolves every key to a non-empty string`, () => {
    for (const key of englishKeys) {
      const value = i18nForLocale(locale, key);
      assert.equal(typeof value, "string", `${locale}.${key} must be a string`);
      assert.ok(value.trim().length > 0, `${locale}.${key} must not be empty`);
    }
  });
}

for (const [locale, labels] of Object.entries(HEADER_LABELS)) {
  test(`locale ${locale} renders its own header labels`, () => {
    assert.equal(i18nForLocale(locale, "menu"), labels.menu);
    assert.equal(i18nForLocale(locale, "displaySettings"), labels.displaySettings);
    assert.equal(i18nForLocale(locale, "search"), labels.search);
  });
}

for (const [variant, base] of Object.entries(LOCALE_VARIANTS)) {
  test(`locale variant ${variant} resolves to the ${base} dictionary`, () => {
    assert.equal(i18nForLocale(variant, "menu"), dictionaries[base].menu);
    assert.equal(i18nForLocale(variant, "search"), dictionaries[base].search);
  });
}

for (const locale of UNKNOWN_LOCALES) {
  test(`unknown locale ${locale || "(empty)"} falls back to English`, () => {
    assert.equal(i18nForLocale(locale, "menu"), dictionaries.en.menu);
    assert.equal(i18nForLocale(locale, "search"), dictionaries.en.search);
  });
}

test("the Site default locale and the page locale agree", () => {
  assert.equal(i18n("menu"), i18nForLocale("zh-CN", "menu"));
});

test("a Site override wins over the built-in dictionary", () => {
  assert.equal(resolveTranslation("zh-CN", "menu", { "zh-CN": { menu: "站点菜单" } }), "站点菜单");
});

test("Site override locale keys match case- and separator-insensitively", () => {
  for (const key of ["zh_CN", "zh_cn", "zh-CN"]) {
    assert.equal(resolveTranslation("zh-CN", "menu", { [key]: { menu: "站点菜单" } }), "站点菜单");
  }
});

test("a Site override for another locale does not leak", () => {
  assert.equal(resolveTranslation("ja", "menu", { "zh-CN": { menu: "站点菜单" } }), dictionaries.ja.menu);
});

test("a non-string Site override is ignored", () => {
  assert.equal(resolveTranslation("ja", "menu", { ja: { menu: 42 } }), dictionaries.ja.menu);
});

test("the Site override map reaches i18nForLocale", () => {
  assert.equal(i18nForLocale("zh-CN", "archive"), "站点归档");
  assert.equal(i18nForLocale("ja", "archive"), dictionaries.ja.archive);
});

test("an unknown key degrades to the key name instead of undefined", () => {
  assert.equal(i18nForLocale("ja", "notARealKey"), "notARealKey");
  assert.equal(resolveTranslation("ja", "notARealKey", {}), "notARealKey");
});

test("a key missing from a locale dictionary degrades to the English text", () => {
  const dictionary = dictionaries.ja;
  const key = "archive";
  const english = dictionaries.en[key];
  assert.equal(typeof english, "string");
  assert.ok(Object.hasOwn(dictionary, key));
  delete dictionary[key];
  try {
    assert.equal(i18nForLocale("ja", key), english);
  } finally {
    dictionary[key] = english;
  }
});

test("getTranslation returns the English dictionary for unknown languages", () => {
  assert.equal(getTranslation("fr"), dictionaries.en);
  assert.equal(getTranslation("zh_CN"), dictionaries.zh_CN);
});
