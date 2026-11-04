# P3 #57 — Shirone token and component contract

The active frontend has one static M3E token source:
`themes/shirone/src/tokens.css`, imported once by `shirone.css` from BaseLayout.
Dark defaults and light overrides define matching semantic color roles. Layout,
spacing, shape, typography and motion variables share the same source. There is
no HCT runtime, Firefly global stylesheet or second theme controller.

`html[data-theme]` is the theme API (`dark` or `light`), set by BaseLayout from the
Site default, persisted choice before paint, and the existing radio controls.
CSS does not depend on a checked radio being present before it can select the
light palette. Site configuration and persistence keys do not change.

## Dependency direction and existing APIs

| Layer | Owner/API | Dependencies |
| --- | --- | --- |
| Tokens | `tokens.css`: `primary/on-primary`, container pairs, surface/on-surface, outline, error/on-error; shape, space, font and motion roles | No components or scripts |
| Primitives | CSS focus/shape/typography, `Status.svelte` label | Semantic tokens; no route or Site imports |
| Interactive composition | `Search.svelte`, Pagefind on interaction; existing Comments island | Semantic token API and explicit props; no theme package import |
| Theme composition | `BaseLayout.astro`: title, Site title, appearance, locale and metadata; `PostCard.astro`: title, description, href, published, tags, optional cover | Tokens/primitives/islands; no Site filesystem writes |
| Routes | `apps/web/src/pages` | Core content/config and theme components; no duplicate design system |

Use semantic foreground/background pairs, not palette hex values in components.
Search consumes the same M3E roles as Status and the layout. Its legacy CSS var
fallbacks retain compatibility with the dormant Editorial rollback surface;
that stylesheet is not loaded by active routes and does not create a parallel
runtime. No duplicate Search/button/controller was introduced.

Both palettes include error/on-error; the light error foreground is light text
on a dark error surface. The existing token contrast test checks palette-role
parity and normal-text contrast for foreground/container/surface/error pairs.
It does not claim full-page accessibility or visual acceptance from static CSS.

## Verification scope

Use existing `pnpm test`, `pnpm check`, `pnpm build` and CNB functional/browser
feedback. Existing Shirone browser flows exercise dark/light choice, persistence,
search and root/subpath layouts and retain screenshots. New token-role tests are
local source checks until included in a target-owned harness. Record actual
source SHA, run and PR in the Issue; do not call pending native CI PASS.

This task does not redesign #58 layout or #59 settings, declare a P3 phase gate,
change Core/Site or depend on #55's real external-Site CI acceptance.
