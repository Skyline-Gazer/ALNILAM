import type { AlbumGroup, AlbumIndexItem } from "@alnilam/theme-shirone/album-types";
import type { SiteConfig } from "@alnilam/core";

export function normalizeGalleryImageUrl(value: string, label?: string): string;
export function galleryRouteLocales(config: SiteConfig): string[];
export function galleryAlbumDetailPath(
  locale: string,
  defaultLocale: string,
  prefixDefaultLocale: boolean,
  albumId: string,
): string;
export function loadSiteGallery(siteRoot: string): AlbumGroup[];
export function toAlbumIndexItem(album: AlbumGroup): AlbumIndexItem;
export function galleryPageText(locale: string): {
  title: string;
  description: string;
  back: string;
  photos: string;
};
