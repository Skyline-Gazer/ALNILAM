// 循环依赖规避：navBarConfig 等配置消费 i18n，本模块只允许从具体文件导入 siteConfig 与 i18nConfig，
// 禁止走 @/config barrel（见 src/config/README.md）
import { i18nConfig } from "../config/i18nConfig.ts";
import { siteConfig } from "../config/siteConfig.ts";
import type I18nKey from "./i18nKey.ts";
import { en } from "./languages/en.ts";
import { es } from "./languages/es.ts";
import { id } from "./languages/id.ts";
import { ja } from "./languages/ja.ts";
import { ko } from "./languages/ko.ts";
import { th } from "./languages/th.ts";
import { tr } from "./languages/tr.ts";
import { vi } from "./languages/vi.ts";
import { zh_CN } from "./languages/zh_CN.ts";
import { zh_TW } from "./languages/zh_TW.ts";

export type Translation = {
	[K in I18nKey]: string;
};

/** Site-owned overrides: locale → (UI key → custom text). */
export type TranslationOverrides = {
	[lang: string]: { [key: string]: string };
};

const defaultTranslation = en;

const map: { [key: string]: Translation } = {
	es: es,
	en: en,
	en_us: en,
	en_gb: en,
	en_au: en,
	zh_cn: zh_CN,
	zh_tw: zh_TW,
	ja: ja,
	ja_jp: ja,
	ko: ko,
	ko_kr: ko,
	th: th,
	th_th: th,
	vi: vi,
	vi_vn: vi,
	id: id,
	tr: tr,
	tr_tr: tr,
};

export function getTranslation(lang: string): Translation {
	const key = lang.toLowerCase();
	const exact = map[key];
	if (exact) return exact;
	// A regional variant without its own entry falls back to the base language
	// dictionary (es-ES → es) before it falls back to English.
	const base = map[key.split("_")[0]];
	return base || defaultTranslation;
}

/** 归一化语言代码：小写 + 连字符转下划线（zh-CN / zh_CN / zh_cn 等价）。 */
function normalizeLocale(locale: string): string {
	return (locale || "en").toLowerCase().replaceAll("-", "_");
}

/** 归一化 Site 覆盖表：语言代码同样按小写下划线匹配。 */
function normalizeOverrides(
	overrides?: TranslationOverrides | null,
): Map<string, { [key: string]: string }> {
	const normalized = new Map<string, { [key: string]: string }>();
	if (!overrides || typeof overrides !== "object") return normalized;
	for (const [name, scoped] of Object.entries(overrides)) {
		if (!scoped || typeof scoped !== "object") continue;
		normalized.set(normalizeLocale(name), scoped as { [key: string]: string });
	}
	return normalized;
}

/**
 * 解析单个文案键：Site 覆盖 → 当前语言词典 → 英文词典 → 键名本身。
 * 后两级是缺失键的既定退化行为，保证界面永远不会拿到 undefined。
 */
function lookup(
	lang: string,
	key: I18nKey,
	overrides: Map<string, { [key: string]: string }>,
): string {
	// 1. Site 自定义覆盖（语言代码大小写与分隔符不敏感）
	const custom = overrides.get(lang)?.[key];
	if (typeof custom === "string") return custom;

	// 2. 内置 10 语言词典
	const localized = getTranslation(lang)[key];
	if (typeof localized === "string") return localized;

	// 3. 退化到英文词典，最后退到键名
	const fallback = defaultTranslation[key];
	return typeof fallback === "string" ? fallback : String(key);
}

const siteOverrides = normalizeOverrides(i18nConfig as TranslationOverrides | undefined);

/** Translate one key for an explicit locale, with an injectable override map. */
export function resolveTranslation(
	locale: string,
	key: I18nKey,
	overrides?: TranslationOverrides | null,
): string {
	return lookup(
		normalizeLocale(locale),
		key,
		overrides ? normalizeOverrides(overrides) : siteOverrides,
	);
}

/** Translate for an explicit page locale, keeping Site i18n overrides. */
export function i18nForLocale(locale: string, key: I18nKey): string {
	return lookup(normalizeLocale(locale), key, siteOverrides);
}

export function i18n(key: I18nKey): string {
	return i18nForLocale(siteConfig.lang || "en", key);
}
