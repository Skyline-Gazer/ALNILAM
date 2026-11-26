# #74 Manual Screen Reader Checklist — macOS Safari + VoiceOver

**Execution status:** `MANUAL_NOT_RUN`. The current host is Linux and cannot run macOS Safari or VoiceOver. This is an executable procedure, not evidence of a screen-reader pass. The existing axe and Playwright results do not replace this manual check.

Current automated engineering evidence is recorded in [P6-74-EVIDENCE.md](P6-74-EVIDENCE.md). It does not change this checklist's manual execution status.

## Run record

Fill this in before testing. Use the existing public Demo stable alias; do not use the formal Production project or a protected Preview.

| Field | Value |
| --- | --- |
| Test date / tester | |
| macOS version | |
| Safari version | |
| VoiceOver language / voice | |
| Layout width | `1440px` and `390px` |
| `DEMO_ORIGIN` | `https://<current-public-demo-alias>` |
| Core revision | Read from `${DEMO_ORIGIN}/alnilam-provenance.json` |
| Site digest | Read from `${DEMO_ORIGIN}/alnilam-provenance.json` |
| Result | `PASS` / `FAIL` / `BLOCKED` / `MANUAL_NOT_RUN` |

The 390px Safari Responsive Design Mode case checks the responsive drawer layout. It does not substitute for iOS Safari + VoiceOver on physical iOS hardware.

## Setup

1. Resolve `DEMO_ORIGIN` from the current stable public Demo deployment recorded in [HANDOFF.md](HANDOFF.md) and the live #138 deployment record. Confirm the provenance endpoint returns HTTP 200; record its Core revision and Site digest. If the Demo is unavailable or requires sign-in, stop and record `BLOCKED`.
2. Open Safari at 100% zoom. Test at 1440px, then at 390px using Responsive Design Mode. Keep the page language unchanged and record it.
3. Turn on VoiceOver with **Command–F5**. The default VoiceOver modifier is **Control–Option**, written below as `VO`; Caps Lock can be configured instead.
4. Use `VO–Right/Left` to read sequentially, `VO–Space` to activate the VoiceOver cursor item, `VO–U` to open the rotor, and `Tab` / `Shift–Tab` to test keyboard focus. Keep VoiceOver reading navigation distinct from keyboard focus navigation.
5. In Safari, enable the setting that lets Tab focus every webpage item if needed. Record any keyboard-navigation setting changed for the test.

Apple references: [Get started with VoiceOver](https://support.apple.com/en-cn/guide/voiceover/vo4be8816d70/mac), [VoiceOver keyboard commands](https://support.apple.com/en-cn/guide/voiceover/vo2681/mac), and [the VoiceOver rotor](https://support.apple.com/en-cn/guide/voiceover/mchlp2719/mac).

## Checklist

VoiceOver wording varies by macOS version, voice, and page language. Check that the expected **role, accessible name, state, and content** are conveyed; record the actual utterance instead of requiring one exact sentence.
Use the published `/en/posts/getting-started/` guide and `/posts/hello-alnilam/` article on the public Demo. Below 1024px, article pages use the in-flow contents disclosure in place of the floating TOC cluster ([#194](https://github.com/Skyline-Gazer/ALNILAM/issues/194) / [#217](https://github.com/Skyline-Gazer/ALNILAM/pull/217)). The default-locale `/posts/` spans two pages ([#35](https://github.com/Skyline-Gazer/ALNILAM/issues/35)).


| ID | Route / layout | Actions | Expected announcement and focus | Result / actual speech |
| --- | --- | --- | --- | --- |
| SR-01 | `/` · 1440px and 390px | Load the page. Use the rotor for landmarks, headings, and links. Tab from the start of the page and activate the skip link. | Page title and language are available. Landmarks identify banner/navigation/main/footer; the heading list has one page-level heading and a logical hierarchy. Skip link is keyboard reachable and moves focus into main content. Focus follows reading order. | |
| SR-02 | `/en/posts/getting-started/` · both layouts | Read by headings and landmarks. On narrow viewports, open the in-flow contents disclosure, follow a TOC link, then return. Visit each image and the linked image. | Article title is the page-level heading. Below 1024px the in-flow disclosure exposes TOC links with useful names and no trailing `#` noise. At 1440px desktop TOC links reach their headings. Images announce meaningful alternative text. | |
| SR-03 | `/en/posts/getting-started/` · 390px | Expand the contents disclosure summary, move through its links; activate one. Collapse and re-expand. | Summary name and expanded state are clear. Focus reaches links inside the article column. Activating a link reaches the named heading. Collapsing hides links from the accessibility tree. | |
| SR-04 | `/en/posts/getting-started/` · 1440px | Use the main navigation by rotor and keyboard. | Navigation landmark and each link have useful names. Current destination is identified. Tab focus is visible and follows visual order. | |
| SR-05 | `/en/posts/getting-started/` · 390px | Open the navigation drawer. Move through its controls until focus wraps. Try to reach page content behind it. Close with Escape, reopen, follow a primary nav link. | Toggle exposes collapsed/expanded state. Drawer is announced as modal with navigation landmark. Focus stays in drawer. Escape returns focus to toggle. | |
| SR-06 | `/` and `/search/` · 1440px and 390px | Open the header search control. Search for `ALNILAM`, then `voiceover-no-match-74`. On `/search/`, use the labelled searchbox and repeat. | Search control has localized accessible names. Results are links with understandable titles. No-results is announced as status. Escape restores focus to trigger. | |
| SR-07 | `/posts/` · 1440px | Use pagination links to open page 2, then return to page 1. | Page links have distinct names. Page 2 announces `第 2/2 页` or equivalent; URL is `/posts/2/`. | |
| SR-08 | `/posts/` · 390px | Focus the jump control; confirm name includes localized jump label and position. Activate, type `2`, Enter. On page 2, exercise Escape and blur. | Button announces position (for example, `1/2`). Enter navigates to `/posts/2/`. Escape returns focus to jump button without navigation. Record actual focus destination; do not infer it from the button reappearing. | |
| SR-09 | `/posts/hello-alnilam/` · 1440px and 390px | Tab to the lighthouse illustration, press Enter, tab through the viewer, then press Escape. Reopen with Space. | Lightbox is dialog/modal with alt text and caption. Tab stays in viewer. Escape restores focus to triggering image and preserves scroll. | |

### Failure and evidence record

For every `FAIL` or `BLOCKED` case, record:

```text
ID:
Date / tester:
DEMO_ORIGIN + route:
Core revision / Site digest:
macOS / Safari / VoiceOver version and language:
Layout width:
Expected role, name, state, focus, or announcement:
Actual VoiceOver utterance (quote it exactly where useful):
Focus before and after the action:
Reproduction steps:
Result: FAIL / BLOCKED
```

Use `MANUAL_NOT_RUN` when no macOS Safari + VoiceOver execution occurred. Do not convert the lab axe score, browser keyboard tests, or a checklist prepared on Linux into a manual screen-reader result. Relevant automated contracts: [`a11y.spec.ts`](../tests/browser/a11y.spec.ts), [`drawer-background.spec.ts`](../tests/browser/drawer-background.spec.ts), [`drawer-focus-trap.spec.ts`](../tests/browser/drawer-focus-trap.spec.ts), [`lightbox.spec.ts`](../tests/browser/lightbox.spec.ts), [`navigation-lifecycle.spec.ts`](../tests/browser/navigation-lifecycle.spec.ts), and [`pagination-pagefind.spec.ts`](../tests/browser/pagination-pagefind.spec.ts).
