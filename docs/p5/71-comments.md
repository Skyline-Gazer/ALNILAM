# P5/T05 — Comments provider and privacy (#71)

Status: IMPLEMENTED IN WORKTREE — remote CI/browser evidence and PR link are
attached by the parent after this change is committed. No production deployment,
merge or provider-account activation is authorized here.

Related: #74 (post-scroll CLS budget), #60 (navigation lifecycle), #92
(third-party privacy/consent boundary).

## Scope

First-launch comments are one provider: **Giscus** on public GitHub Discussions.
Twikoo and Waline remain post-launch evaluations because they require their own
backend/persistence and must never be bundled as a second widget. The Site YAML
owns the public identifiers and the identity/privacy policy; Core owns the
provider adapter, validation, CSP and presentation.

## Reuse Decision Record (MIG-01, MOD-04)

| Legacy area | Shirone baseline | Official Astro | Decision | Reason / proof |
| --- | --- | --- | --- | --- |
| `packages/ui/src/Comments.svelte` (existing Giscus Svelte island) | `themes/shirone/upstream/src/components/organisms/comment/Giscus.astro`, `CommentSection.astro` | Astro island + `client:visible`; Svelte 5 effects | **ADAPT/WRAP** | Keep the proven ALNILAM config gate and one-island mounting. Add the missing provider interface, stable term, disclosure/click gate, teardown and fallback instead of replacing it with the upstream Astro/global-Swup implementation. |
| Site `comments` block in `packages/core/src/index.mjs` | `themes/shirone/upstream/src/config/commentConfig.ts` | n/a (config contract) | **KEEP/ADAPT** | Existing closed-world validation stays; add `mapping`, `sharing`, `load`, `lang`, `csp`, repo format and secret-field rejection. Upstream `commentConfig` remains disabled by `themes/shirone/adapter/site-config.mjs`, so exactly one widget can render. |
| Article comment slot | `themes/shirone/upstream/src/pages/posts/[...slug].astro` `slot="comments"` | Astro slots | **KEEP** | Continue rendering the Core island through the native article slot; no second provider selection path. |
| Identity | upstream `context.key` / `pathname` default | n/a | **ADAPT** | Use a build-time stable term (`specific`) rather than deployment URL; `pathname` is explicit legacy only. |

No Shirone upstream file is deleted or rewritten. The disabled upstream
`CommentSection` remains disabled to avoid duplicate widgets.

## Site schema contract

```yaml
comments:
  enabled: false             # default; no comment JS/network/DOM at all
  provider: giscus           # single first-launch provider
  repo: owner/repo           # public GitHub repository
  repoId: R_...
  category: Announcements
  categoryId: DIC_...
  mapping: specific          # specific | pathname | number
  sharing: translation       # translation | locale
  load: click                # click | visible
  lang: auto                 # auto | BCP-47/giscus locale
  csp: true                  # provider-scoped CSP meta on enabled articles
```

Post frontmatter gains optional `commentId` (non-whitespace, ≤200 characters).
Unknown/secret fields fail closed. Invalid enum values, missing enabled fields
and malformed `owner/repo` fail with field-specific messages that never echo
provider secrets.

### Stable identity

Term precedence: explicit `commentId` → `alnilam:translation:<translationKey>` →
`alnilam:content:<content-id>`. `sharing: translation` (default) shares one
discussion across localized pages; `sharing: locale` appends `::<locale>`.
`mapping: number` requires a numeric `commentId` with translation sharing.
The term never contains the deployment origin/base, so root and `/ALNILAM/`
builds, locale routes and slug renames (with an explicit `commentId`) keep the
same thread. `mapping: pathname` is documented as legacy and is not the default.

## Privacy and lifecycle

- Disabled: no comment island, script, iframe, placeholder or request. Existing
  demo browser tests continue to assert zero giscus traffic.
- Enabled: a distinct third-party Giscus/GitHub Discussions disclosure is
  always rendered. `load: click` (default) makes no external request until the
  reader activates the button. `load: visible` is an explicit owner choice and
  still represents third-party traffic.
- Exactly one `CommentProvider` (`GiscusProvider`) owns the script, iframe,
  mutation observer, timeout and theme/language forwarding. Failure, retry and
  teardown remove the whole mount node, keeping a late iframe out of the page.
- A blocked script or a missing iframe after 15 seconds produces a non-blocking
  `role="alert"` retry and a grounded `https://github.com/<repo>/discussions`
  link; article/navigation stay intact.
- `comments.csp: true` emits a document meta CSP for enabled articles. It
  allows `https://giscus.app` in `script-src`, `connect-src` and `frame-src`,
  adds `'wasm-unsafe-eval'` for Pagefind WASM search, permits the supported
  Markdown player origins in `frame-src` (YouTube nocookie, Bilibili, AcFun),
  and sets `media-src 'self' https:` for author media. A second provider
  (Twikoo/Waline) must not appear.
- The mount container reserves height (`340px` provider block / `240px` host) so
  late iframe creation does not move the article content above it.

## Tests and evidence map

| Acceptance | Test |
| --- | --- |
| Off by default, zero comment JS/network | `tests/browser/comments.spec.ts` disabled case; existing `tests/browser/cnb-quality.spec.ts` |
| Schema/secret/provider validation | `scripts/tests/comments.test.mjs`; `scripts/tests/contract.test.mjs` comments case |
| Stable identity root/`/ALNILAM/`/locale/rename | `scripts/tests/comments.test.mjs` identity cases; fixture build under both bases |
| ON mock Giscus, click gate, theme/lang, no duplicate iframe | `tests/browser/comments.spec.ts` 390/1440, root and `/ALNILAM/` |
| Provider offline/denied or timeout fallback, late iframe and retry | `tests/browser/comments.spec.ts` failure/retry cases |
| Post-scroll CLS / article stability | `tests/browser/comments.spec.ts` layout-shift sample around mount |
| Privacy/CSP | `scripts/tests/comments.test.mjs` CSP case |
| Deterministic enabled fixture | `tests/fixtures/comments-site`; composed by `scripts/local-browser.mjs` and `scripts/ci/cnb-consumer-build.mjs` into `dist/comments-root` + `dist/comments-nested` |

Live Giscus interaction still requires an owner-approved preview repository with
Discussions and the Giscus app configured. The deterministic browser suite uses
a routed mock provider and does not claim a live-provider PASS.

## Verification commands (parent-owned)

```bash
node --test scripts/tests/comments.test.mjs scripts/tests/contract.test.mjs
pnpm check
node scripts/local-browser.mjs all   # composes both fixtures and runs Playwright
node scripts/artifact-check.mjs dist/comments-root
node scripts/seo-check.mjs dist/comments-root
```

Remote CNB `pull_request.target` runs the trusted consumer build, Playwright,
artifact/SEO checks and the expected-red probe. Attach the actual PR, target
merge SHA, build URL and evidence archive to #71; do not mark acceptance from
this document alone.

## Rollback

Revert the #71 commit range and rebuild the unchanged Site with the prior Core
revision. The Site configuration remains read-only and no comment data is stored
in Core. Explicit `commentId` values, when present, are inert without the new
provider code.
