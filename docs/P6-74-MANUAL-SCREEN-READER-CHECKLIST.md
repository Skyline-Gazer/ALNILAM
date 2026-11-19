# #74 Manual Screen Reader Checklist — macOS Safari + VoiceOver

**Execution status:** `MANUAL_NOT_RUN`. The current host is Linux and cannot run macOS Safari or VoiceOver. This is an executable procedure, not evidence of a screen-reader pass. The existing axe and Playwright results do not replace this manual check.

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

| ID | Route / layout | Actions | Expected announcement and focus | Result / actual speech |
| --- | --- | --- | --- | --- |
| SR-01 | `/` · 1440px and 390px | Load the page. Use the rotor for landmarks, headings, and links. Tab from the start of the page and activate the skip link. | Page title and language are available. Landmarks identify banner/navigation/main/footer; the heading list has one page-level heading and a logical hierarchy. Skip link is keyboard reachable and moves focus into main content. Focus follows reading order. | |
| SR-02 | `/posts/hello-alnilam/` · both layouts | Read by headings and landmarks. Follow the table-of-contents link, then return to the article. Visit each image and the linked image. | Article title is the page-level heading. TOC links have useful names and reach their headings. Images announce meaningful alternative text; decorative icons add no duplicate speech. A text link containing an image remains one understandable link and navigates normally. | |
| SR-03 | `/posts/hello-alnilam/` · 390px | Open the floating TOC button with Enter. Move through its links; activate one. Reopen it, then close with Escape. | TOC button name and expanded state are clear. Focus reaches the panel and its links. Activating a link reaches the named heading and closes the panel. Escape closes it and restores focus to the TOC button. | |
| SR-04 | `/posts/hello-alnilam/` · 1440px | Use the main navigation by rotor and keyboard. | Navigation landmark and each link have useful names. The current destination is identified as the current page. Tab focus is visible and follows the visual order. | |
| SR-05 | `/posts/hello-alnilam/` · 390px | Open the navigation drawer. Move forward and backward through its controls until focus wraps. Try to reach page content behind it. Close with Escape, then reopen and follow the Posts link. | Toggle exposes collapsed/expanded state. The opened drawer is announced as a modal dialog named for the site and contains a navigation landmark. Focus enters and stays in the drawer; background content is unavailable. Escape closes it and returns focus to the toggle. Following a drawer link changes route and removes the modal state. | |
| SR-06 | `/` and `/search/` · 1440px and 390px | Open the header search control. Search for `ALNILAM`, then replace it with `voiceover-no-match-74`. On `/search/`, use the labelled searchbox and repeat. | Search control and searchbox have localized accessible names; opening moves focus into the input. Results are exposed as links with understandable titles and excerpts. The no-results message is exposed as a status and announced after the query completes. No stale results remain after the query changes. Escape closes the overlay and restores focus to its trigger. | |
| SR-07 | `/posts/` · 1440px | Use the pagination links to open page 2, then return to page 1. | Previous/next and page links have distinct names. The selected page is exposed as current. Page 2 announces the visible `第 2/3 页` status or equivalent localized page position; the URL changes to `/posts/2/`. Returning to page 1 restores the first-page state. | |
| SR-07 | `/posts/` · 390px | Use VoiceOver or Tab to focus the jump control. Confirm its name includes the localized jump label and current/total position, then activate with VO–Space or Enter. Type `2` in the replacement input and press Enter. On page 2, repeat the control, then press Escape; repeat once more and move focus away to exercise blur. | The button is announced with its localized jump label and current/total position (for example, `1/3`). Activation focuses a text input with numeric input mode, the same localized jump label, and the current page as its value. Enter navigates to `/posts/2/`; Escape and blur restore the button without navigation. For each, record the actual focus destination after the input is replaced; do not infer that focus returned from the button reappearing. | |
| SR-08 | `/posts/hello-alnilam/` · 1440px and 390px | Tab to each bare raster image and activate with Enter; repeat with Space. Open the second image, advance with ArrowRight, tab through the viewer, and close with Escape. | Bare images are keyboard reachable and announce their alt text. An image inside a text link does not create an extra tab stop. The lightbox is announced as a dialog/modal with the image alternative text and caption; current-image position changes and is announced after ArrowRight. Tab and Shift–Tab stay in the open viewer and do not reach the background. Escape closes it, restores focus to the triggering image, and preserves page scroll. | |

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
