// ALNILAM adapter: only read the validated Site; never run upstream content:sync.
import fs from 'node:fs';
import path from 'node:path';
import {loadSite} from '../../../apps/web/src/lib/site-source.mjs';
const {root, config} = loadSite();
const hasSeries = fs.existsSync(path.join(root, 'content/series'));
const base = new URL(config.site.url).pathname.replace(/\/$/, '') || '/';
const disabled = {enable: false};
export const userConfigOverrides = {
  site: {
    site: config.site.url, base, title: config.site.title,
    subtitle: config.site.description, lang: config.site.locale.replace('-', '_'),
    // Build-time generated raster card; SVG covers fall back to this because
    // social crawlers do not render SVG previews.
    ogImage: '/og-default.png',
    themeColor: {hue: 315, fixed: true},
    wallpaperMode: {defaultMode: 'none'},
    banner: {src: {desktop: [], mobile: []}, homeText: {enable: false}},
    texture: disabled,
    favicon: [{src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="%237b68aa"/></svg>', sizes: 'any'}],
    displaySettings: {wallpaperMode: false, layoutMode: false},
  },
  profile: {avatar: '', name: config.site.title, bio: config.site.description, links: []},
  font: {mode: 'system', fontFamilies: []},
  postList: {pageSize: 5, layout: {mode: 'list', cover: 'right', cardWidth: 'regular'}},
  sidebar: {enable: true, arrangement: 'single', side: 'left', components: [
    {type: 'profile', enable: true, slot: 'top'},
    {type: 'tags', enable: true, slot: 'sticky'},
    {type: 'toc', enable: true, slot: 'sticky', pages: ['post']},
  ]},
  // Native nav links bind both href (`url`) and active-route key (`pageKey`, resolved by `resolvePageKey`).
  navBar: {links: [
    {name: '首页', url: '/', pageKey: 'home'},
    {name: '文章', url: '/posts/', pageKey: 'posts'},
    {name: '分类', url: '/categories/', pageKey: 'categories'},
    {name: '归档', url: '/archives/', pageKey: 'archive'},
    {name: '标签', url: '/tags/', pageKey: 'tags'},
    ...(hasSeries ? [{name: '系列', url: '/series/', pageKey: 'series'}] : []),
    ...(config.bangumi.enabled ? [{name: '番组', url: '/bangumi/', pageKey: 'bangumi'}] : []),
  ]},
  music: disabled, umami: disabled, contextMenu: disabled, albums: disabled,
  moments: disabled, anime: disabled, friends: disabled, projects: disabled,
  skills: disabled, games: disabled, timeline: disabled, devices: disabled,
  compass: disabled, about: disabled, series: {enable: hasSeries},
  // Upstream CommentSection is disabled because ALNILAM mounts its Core Giscus Comments island via slot="comments".
  comment: disabled,
};
export const userConfigSources = ['alnilam.config.yaml (validated, read-only)'];

export const siteAppearance = config.theme.appearance;
export const siteLocales = [...config.locales];
