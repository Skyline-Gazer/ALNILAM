/**
 * Lightbox selector module.
 * Public filenames stay Fancybox* for Shirone fork stability; runtime is PhotoSwipe.
 */

export const FANCYBOX_SELECTORS = {
	// 文章正文图片和封面图（排除画廊内图片，避免被整篇轮播组重复捕获）
	articleImages: ".custom-md img:not(.image-grid img), #post-cover img",

	// 画廊网格内带独立分组 ID 的链接（按 data-fancybox 值分组轮播）
	imageGrids: ".image-grid [data-fancybox]",

	// 带 data-fancybox 属性的其他元素（排除画廊链接，防止双绑）
	singleFancybox: "[data-fancybox]:not(.image-grid [data-fancybox])",
} as const;
