# Phase 17: responsive design and visual polish

The existing blue, green, peach, and cream palette is retained. This phase refines the interface for children ages 7–12 without changing question rules, answer generation, self-report recording, review attribution, mastery, statistics calculations, or storage keys. Phase 18 session recovery and navigation protection are not implemented here.

## Visual changes

- The practice card is centered on the page and limited to a comfortable reading width. A compact heading and an animation control below the card bring the question higher on the screen. The practice plan sits underneath, with grouped configuration details and totals.
- Arithmetic is larger than the page heading. Answer buttons remain large and rounded, with two columns on wider screens and full-width rows on narrow screens. Number badges and selection text remain visible, and numerical answers stay on one line.
- Shared heading, spacing, surface, and touch-target tokens keep the pages consistent. Existing focus indicators and reduced-motion behavior remain intact. Navigation keeps its four explicit labels, wrapping into a simple grid on smaller screens rather than hiding actions behind icons.
- Statistics already used cards instead of wide tables. Their layouts are retained and refined: tablet overviews use a two-by-two arrangement, operation/difficulty cards adapt to the viewport, and recent-session details wrap into readable groups. No horizontal table scroller is needed for the current data.
- Soft card shadows, pastel surfaces, and a responsive pair of eyes on the existing CSS math characters add polish without new illustration downloads or decorative motion.
- A quiet feedback banner varies its encouragement after an accepted self-report. Right reports receive positive messages; wrong reports receive supportive messages. Selecting an option or revealing a card does not change feedback or record a result. Messages remain stable during answer changes, flips, and viewport changes.

Settings now includes **Encouraging messages**. Turning it off removes the banner and its announcements. Sound and card animation retain their separate controls; no new sound, confetti, timer, or feedback animation was added.

The additive `feedbackEnabled` setting is optional in the shared model to preserve older version-1 settings. Missing means enabled; new defaults explicitly store `true`. Valid older preferences/history are retained, and an explicit `false` persists across reloads. Present values must be booleans. No schema version or storage key changed.

## Repeatable browser checks

```sh
npm ci
npm run check:responsive
```

The script needs a locally installed Chrome or Chromium and the Node version specified in `package.json`. It does not install or download a browser. It starts its own Vite server on an available loopback port, launches a temporary browser profile, loads test fixtures, runs checks, and stops both processes. Existing browser profiles and application data are not accessed.

For a custom executable or screenshots:

```sh
CHROME_BIN='/path/to/chrome' npm run check:responsive
RESPONSIVE_SCREENSHOT_DIR=/tmp/math-practice-screens npm run check:responsive
```

Screenshot output is optional and includes Home, both card faces, Statistics, and Summary for each size. Files remain in the directory you specify; the temporary browser profile is removed.

| Coverage                      | Viewport sizes in CSS pixels                          |
| ----------------------------- | ----------------------------------------------------- |
| Desktop and laptop            | 1440 × 900, 1280 × 800                                |
| Tablet landscape and portrait | 1024 × 768, 768 × 1024, 1180 × 820, 820 × 1180        |
| Mobile portrait               | 320 × 568, 360 × 800, 375 × 812, 390 × 844, 430 × 932 |
| Mobile landscape              | 844 × 390                                             |

The checks cover 133 rendered states: empty statistics plus Home, Setup, Settings, active/mastered mistake statistics, fallback, front/selected/revealed cards, rotation, and Summary across all sizes. They measure:

- Page and content overflow, without hiding overflowing content with global clipping.
- Touch areas of at least 48 × 48 CSS pixels for enabled controls. Native checkbox/radio label areas count as the touch target.
- Centered cards, large arithmetic, and stacked answers on the narrowest screens.
- Separation of metric labels and values.
- Preserved selected/revealed answers and unchanged storage during rotation.
- Five accepted self-reports per session, correct summary accuracy, and no attempts recorded during selection or reveal.

Question generation uses a seeded random stream only inside the isolated browser check. Failures identify the viewport/state and include offending elements, question text, and choices when available. The browser checks use the development server; `npm run build` separately verifies production compilation.

Unit/component tests cover feedback variation and stability, the student's actual self-report, disabling/loading the preference, legacy settings compatibility, and preservation of unrelated history and preferences. Run the usual checks with:

```sh
npm test
npm run lint
npm run format:check
npm run build
```

Verification passed with 1,056 tests in 49 files, lint, formatting, and the production build. A separate Chrome accessibility regression run passed 60 states, including native 200% browser zoom, 16px and 32px default font preferences, visible keyboard focus, text contrast, and all four animation-setting/reduced-motion combinations. Enlarged browser fonts do not replace the outstanding native OS font-scaling check in Phase 16.

## Manual checks

Chrome viewport emulation cannot establish physical-device usability. On a real tablet and phone, check comfortable reach, tap accuracy, browser toolbar behavior, scrolling, portrait/landscape rotation, and that no controls disappear behind device edges. Repeat in the target Safari/Firefox versions and with an external keyboard.

Inspect long arithmetic, long operation lists, large totals, dates, empty/populated history, review practice, and continuous sessions. Also repeat the accessibility audit's 200% zoom, larger system fonts, screen-reader speech, and OS reduced-motion checks. None of the new visuals should require animation or color perception to understand a result.
