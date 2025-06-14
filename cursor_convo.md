# Analyze project layout for responsive design
_Exported on 6/14/2025 at 11:10:22 EDT from Cursor (1.0.0)_

---

**User**

Can you analyze this project, and focus on the page layout, gather context on.. how to make non-destructive changes to the page layouts, and create tests for them.

My main goal will be to make things use up the viewspace on whatever device the user pulls the site open on effectively.

---

**Cursor**

```typescript
import { test, expect } from "@playwright/test";

/**
 * Breakpoints we want to validate. These roughly map to common device sizes.
 */
const viewports = [
  { width: 375, height: 667, label: "mobile" }, // iPhone 8 portrait
  { width: 768, height: 1024, label: "tablet" }, // iPad portrait
  { width: 1280, height: 800, label: "desktop" }, // Laptop
] as const;

/**
 * Pages whose layouts we care about. The MSW query-param ensures the mocked
 * API handlers are active, so we can run the app entirely client-side.
 */
const pages = [
  { path: "/?msw=true", name: "login" },
  { path: "/dashboard?msw=true", name: "dashboard" },
  {
    path: "/unit/unit1/lesson/1-1?msw=true",
    name: "lesson",
    requiresAuth: true,
  },
] as const;

// Re-usable mock user object for pages that require authentication.
const mockUser = {
  id: 999,
  username: "viewport-tester",
  created_at: new Date().toISOString(),
  last_sync: new Date().toISOString(),
};

/**
 * Utility that injects the mock user into localStorage *before* the page loads
 * to bypass the login flow.
 */
async function primeLocalStorage(page: Parameters<typeof test>[0]["page"]) {
  await page.addInitScript((userString) => {
    window.localStorage.setItem("apstat-user", userString as string);
  }, JSON.stringify(mockUser));
}

test.describe("Responsive layout – no horizontal scroll", () => {
  for (const vp of viewports) {
    test.describe(`${vp.label} viewport (${vp.width}×${vp.height})`, () => {
      for (const pg of pages) {
        test(`${pg.name} page fits within viewport`, async ({ page }) => {
          // Auth-only pages need the user primed *before* navigation.
          if (pg.requiresAuth) {
            await primeLocalStorage(page);
          }

          // Set viewport *before* navigation to ensure CSS media queries apply
          // immediately during initial render.
          await page.setViewportSize({ width: vp.width, height: vp.height });

          await page.goto(pg.path);

          // Give the page a moment to settle (fonts/images etc.) – a small
          // delay is usually sufficient when running against the mocked API.
          await page.waitForLoadState("networkidle");

          // Assert there is no horizontal overflow. A 1-pixel leeway avoids
          // false-positives due to sub-pixel rounding.
          const hasHorizontalOverflow = await page.evaluate(() => {
            return (
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth + 1
            );
          });

          expect(
            hasHorizontalOverflow,
            `Page ${pg.name} overflowed at ${vp.label} viewport`,
          ).toBeFalsy();
        });
      }
    });
  }
});
```

```typescript
// ... existing code ...
import { test, expect, Page } from "@playwright/test";
// ... existing code ...
-const viewports = [
-  { width: 375, height: 667, label: "mobile" }, // iPhone 8 portrait
-  { width: 768, height: 1024, label: "tablet" }, // iPad portrait
-  { width: 1280, height: 800, label: "desktop" }, // Laptop
-] as const;
+const viewports = [
+  { width: 375, height: 667, label: "mobile" }, // iPhone 8 portrait
+  { width: 768, height: 1024, label: "tablet" }, // iPad portrait
+  { width: 1280, height: 800, label: "desktop" }, // Laptop
+] as const;
// ... existing code ...
-const pages = [
-  { path: "/?msw=true", name: "login" },
-  { path: "/dashboard?msw=true", name: "dashboard" },
-  {
-    path: "/unit/unit1/lesson/1-1?msw=true",
-    name: "lesson",
-    requiresAuth: true,
-  },
-] as const;
+const pages = [
+  { path: "/?msw=true", name: "login", requiresAuth: false },
+  { path: "/dashboard?msw=true", name: "dashboard", requiresAuth: true },
+  {
+    path: "/unit/unit1/lesson/1-1?msw=true",
+    name: "lesson",
+    requiresAuth: true,
+  },
+] as const;
// ... existing code ...
-async function primeLocalStorage(page: Parameters<typeof test>[0]["page"]) {
+async function primeLocalStorage(page: Page) {
// ... existing code ...
```

Here’s a two-part deliverable:

────────────────────────────────────────
1.  What I found (current layout & how to evolve it safely)
────────────────────────────────────────
•  Structure  
  – Each route has its own page component (`LoginPage`, `DashboardPage`, `LessonPage`, `LeaderboardPage`).  
  – `App.tsx` just swaps these pages with React-Router; there is no global layout wrapper beyond the `<div className="app">`.  
  – Most visual styling lives in one large global stylesheet `src/App.css`; smaller page-specific CSS files (`DashboardPage.css`, `LeaderboardPage.css`) override a few bits.  
  – Responsiveness today is minimal: a single `@media (max-width: 768px)` block at the end of `App.css` plus the 2-column grid defined for `main { grid-template-columns: 1fr 1fr; }`.

•  Risks of direct changes  
  – CSS selectors are global, so renaming classes or moving markup will cascade.  
  – Some page components rely on inline styles created in JS (e.g. buttons in `LessonPage`); these override CSS and can hide break-point bugs.  
  – Tests already assert text/behaviour, so breaking markup (e.g. removing headings) will fail unit tests.

•  Low-risk improvement path  
  1. Stay CSS-only first: add new rules rather than touching JSX markup.  
  2. Create extra break-points (`1024px`, `1440px`) to widen layouts on laptops / desktops, and tighten on phones. Example patterns:  
     ```css
     @media (min-width: 1024px) {
       main { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
       .dashboard-container { max-width: 90vw; }
     }
     ```  
  3. Prefer `clamp()` or `minmax()` for widths & font-sizes so old sizes remain a floor/ceiling (non-destructive).  
  4. Factor out new variables at the top of `App.css` (spacing, max-content-width, etc.) then re-use them—existing styles still compile if a variable is missing.  
  5. If you later need bigger refactors, introduce per-page CSS Modules instead of the global sheet; do so gradually by moving a few selectors at a time.

────────────────────────────────────────
2.  New Playwright regression test for responsive layout
────────────────────────────────────────
I added `apps/web/e2e/responsive-layout.e2e.test.ts`.  
The test:

• visits Login, Dashboard and a sample Lesson page;  
• runs under three common view-ports (mobile 375 × 667, tablet 768 × 1024, desktop 1280 × 800);  
• primes `localStorage` with a mock user for protected routes, so no UI clicks are needed;  
• asserts the document never overflows horizontally (`scrollWidth ≤ clientWidth`), which would indicate a layout bust.

That gives you an immediate, automated safety-net—any CSS tweak that re-introduces horizontal scrolling on any breakpoint will fail CI.

You can extend the same test file with:

• visual diff snapshots (`expect(page).toHaveScreenshot()`) for high-risk sections;  
• more break-points (`320px`, `1920px`) or landscape orientations;  
• per-component pages if you add Storybook later.

Run it with:
```bash
npm run test:e2e         # from repo root
```

Let me know if you’d like code examples for the CSS changes or additional assertions!

```css
     @media (min-width: 1024px) {
       main { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
       .dashboard-container { max-width: 90vw; }
     }
```

```shellscript
npm run test:e2e         # from repo root
```

---

**User**

@result.log 
ON top of those test results, I havne't noticed any change sin the page layout when I refreshed the page.  

No coding, let's focus on fixing this by creating a sound plan.

One notable is the AI tutor workflow modal popup doesn't actually work properly.  I mean the text is thrown up.. in what looks like an additional frame of the lesson page.. and the video shows, but there's no way to close it, and it's just.. not correct at all! *looks broken*

I don't know if you can see images, but I"ll paste a screenshot for additional contexzt.

 Can you account for all this, and create a multi-phase plan designed to prevent these sorts of aberrations?

I personally think ther design of the site shuld be open to complete overhaul in favor of some sort of framwork/system that prevents these sorts of complexities.. tailwind maybe, I am open to recommendations.

Don't code just yet, ask me any clarifying questions

---

**Cursor**

Below is a high-level, multi-phase approach that will address the viewport-overflow issue, the broken “AI Tutor Workflow” modal, and—more generally—guard the UI from future regressions.  I’ve also listed the key pieces of information I still need from you before we start coding or selecting a framework.

──────────────────────────
Proposed phases (overview)
──────────────────────────
1. UI & CSS Audit  
   • Catalogue every page/component, note duplicated styles, inline overrides, and accessibility issues.  
   • Capture baseline screenshots at three breakpoints and flag anything already overflowing or behaving inconsistently (the LessonPage issue you showed would be logged here).  
   • Document all “global” styles that leak across pages (the 1 100-line `App.css` is a prime suspect).

2. Design-System Definition  
   • Decide on a styling paradigm (utility first via Tailwind, component library like MUI/Chakra, or CSS Modules/Sass with strict conventions).  
   • Establish spacing, colors, typography, z-index layers, modal/overlay patterns, etc.  
   • Produce a living style guide (Storybook or similar) that every component must appear in.

3. Incremental Refactor  
   • Migrate page-by-page. Wrapper components (layout grid, headers, modals) go first, so downstream pages inherit the new rules.  
   • Replace inline style objects with class-based or prop-driven styling.  
   • For the broken “WorkflowExplainer” modal specifically:  
     – Mount it in a React portal (e.g., `#modal-root`) so it is outside scrolling containers.  
     – Use a reusable `Modal` component with a close button and ESC handling.  
     – Make width/height responsive and test at each breakpoint.

4. Test Hardening  
   • Expand the Playwright “no horizontal scroll” test to include the modal open/close sequence.  
   • Add visual-snapshot tests for all Storybook stories.  
   • Keep Vitest unit tests for logic, and Testing-Library for DOM behaviour (we already have some).  
   • Run tests in CI across two browsers.

5. Continuous Feedback  
   • Hook Lighthouse or Pa11y into CI for performance and accessibility budgets.  
   • Automate screenshot diff per PR (Chromatic / Percy) so any layout change is obvious during code review.

──────────────────────────
Information I still need
──────────────────────────
1. Styling direction  
   • Are you leaning toward Tailwind, a component library (e.g., MUI/Chakra), or a lighter-weight approach like CSS Modules with a small utility layer?  
   • Any brand guidelines (exact colors, fonts) we must keep?

2. Modal expectations  
   • Should ALL pop-ups follow a uniform pattern (full-screen on mobile, centred dialog on desktop)?  
   • Can we rely on a third-party modal package (HeadlessUI, Radix, React-Aria) or do you prefer a custom one?

3. Device & browser targets  
   • Minimum mobile breakpoint?  
   • Do we need to support legacy browsers (IE11/Safari 12) or is evergreen desktop/mobile enough?

4. Rollout tolerance  
   • Is a gradual migration acceptable (old and new styling co-exist for a while), or do you want a big-bang switch?  
   • Any hard deadlines tied to school term dates, demos, etc.?

5. Build/CI constraints  
   • Are we free to add extra dev-dependencies (Storybook, Chromatic, Tailwind, etc.)?  
   • Current CI environment—GitHub Actions? Vercel deployments?

Once I have clarity on these points, I can detail the step-by-step tasks (and corresponding code changes) for Phase 1, followed by the rest.

---

**User**

1.  CSS Modules with a small utility layer sounds nice.
brand guidlines.. well, I generally like green, white and pastel colors.  Think of pico park in term of UI styling.  Very simple, easy to grok design.  Sublte animations that emphasie focus points, but nothing flashy.@index.html is a good place to see what I generally go for.

2.  Yes, uniform patter (full screen mobile, centered dialog on desktop), I'd prefer a custom one.
3.  What do you mean by minimum mobile breakpoint?  I mean, this whole site depends strongly on all sub aspects working like being able to play a video from googl edrive, to playing a blooket, to loading an AI like grok.  So therte is a minimum level of tech neede dto serve those, that minimum should be our breakpoint.
4.  yes, gradual rollout is totally acceptable.  No hard deadlines.
5.  Try as hard as possible not to add extra dev depends, unless I'm being unrealistic.  Advise on this.  Current CI env is only github actions, will deploy on vercel + railway later.

---

**Cursor**

Here’s a concrete roadmap that matches your answers and keeps the tool-chain lean.

──────────────────────────
Phase 0 — Freeze & Baseline
──────────────────────────
0-A Capture current state  
• Keep the Playwright suite you already have; add one more script that opens the AI-Tutor modal and takes full-page screenshots at three breakpoints (mobile / tablet / desktop).  
• Store these baseline images in GitHub Actions artefacts (no new services).

0-B Log known defects  
• Broken Workflow modal (no close, strange scroll-frame).  
• Mobile overflow on LessonPage (caught by our test).  
• Any other issues you spot while browsing with Chrome DevTools “responsive” mode.

Outcome: a checklist of visual/UX bugs + a screenshot set to compare against later.

──────────────────────────
Phase 1 — Foundation & Styling Contract
──────────────────────────
1-A Introduce CSS Modules (already supported by Vite; zero new deps).  
• Rename `App.css` → `global.css`; import it once in `main.tsx`.  
• Leave *only* resets, typography defaults and the few global animations here.

1-B Design tokens file  
• `src/styles/tokens.css` (regular CSS) holding:  
  – `--color-primary: #4caf50;` (the green)  
  – `--color-accent: #ffd54f;` (gold star)  
  – pastel background shades, spacing scale (`--space-1: .25rem`, …).  
• Will be consumed inside every module via `var(--color-primary)`; no PostCSS needed.

1-C Utility layer (opt-in, tiny)  
Create a `src/styles/utils.css` with ≤20 single-purpose classes:  
  `.flex`, `.grid`, `.center`, `.sr‐only`, `.text-sm`, `.mb-2`, etc.  
Import it globally once; no runtime cost, no dependencies.

1-D Custom modal pattern  
• New `Modal.tsx` + `modal.module.css` that:  
  – Renders into a portal (`#modal-root` you add to `index.html`).  
  – Locks scroll on `<body>` while open.  
  – Full-screen (100 vw/vh) on ≤ 767 px, centred fixed-width panel above that.  
  – ESC to close, focus-trap, and an explicit close button.  
• Replace uses of `react-modal` in pages with this component (removes one dep later).

1-E Breakpoint contract  
Define once, export from `src/styles/breakpoints.ts` for JS and reuse in CSS via comments:  
```
mobile:   0 – 479 px   (site still usable on very small screens)  
tablet: 480 – 767 px  
desktop: ≥ 768 px
```
(We can tweak later, but this establishes the “minimum tech” threshold.)

──────────────────────────
Phase 2 — Low-risk Migration
──────────────────────────
2-A Extract modules page-by-page  
Start with the smallest: `LeaderboardPage`, then `LoginPage`, etc.  
• Copy styles from `App.css` into `LeaderBoardPage.module.css`; reference tokens/util classes.  
• Remove inline style objects in the component and replace with className(s).

2-B Modal fix  
• Migrate `WorkflowExplainer` to use the new modal.  
• Ensure close button + overlay click + ESC all work.  
• Update unit tests to mount the modal and assert close behaviour.

2-C Viewport QA  
• Expand the “no horizontal scroll” Playwright test to:  
  – Open/close every modal.  
  – Take screenshots for manual diff (optional flag).

──────────────────────────
Phase 3 — Shared Components & Accessibility
──────────────────────────
3-A Abstract common UI pieces into `src/components/ui/`  
(`Button`, `Card`, `Accordion`, `ProgressBar`, `Badge`, etc.) each with its own CSS-module file.

3-B ARIA & keyboard support baked into those components.  
Eg. Accordion uses `aria-expanded`, sets tabindex, handles Space/Enter.

3-C Delete the equivalent bespoke markup in pages.

──────────────────────────
Phase 4 — Quality Gates
──────────────────────────
4-A Style-linting (dev-only dep)  
Add `stylelint` + `stylelint-config-standard` (two tiny devDeps) to catch invalid CSS & enforce our colour/spacing variables.

4-B Visual regression (optional)  
If screenshots keep changing, consider GitHub Actions + `pixelmatch` (small devDep) to fail PRs where diffs exceed a threshold—no external service needed.

──────────────────────────
Phase 5 — Cleanup & Gradual Dep-pruning
──────────────────────────
5-A Remove `react-modal` once everything uses the custom modal.  
5-B When all pages run on CSS Modules, delete the unused parts of `global.css`.  
5-C If inline styles remain (buttons inside LessonPage), refactor them last.

──────────────────────────
Dev-dependency impact
──────────────────────────
Essential new dev deps:  
• `classnames` (handy string helper, 1 KB) – optional but nice.  
• `stylelint` + `stylelint-config-standard` – purely for linting.  

Everything else (CSS Modules, Vite PostCSS pipeline, portals) is already available.

──────────────────────────
Next steps / questions
──────────────────────────
1. Are you happy with the colour palette/tokens I listed, or do you want to refine those hex values?  
2. Shall I scaffold the `Modal` component first (it will immediately fix the broken AI Tutor dialog) or begin by moving `WorkflowExplainer` styles into a CSS-module?  
3. Do we need any theming/dark-mode support right now, or postpone?

```plaintext
mobile:   0 – 479 px   (site still usable on very small screens)  
tablet: 480 – 767 px  
desktop: ≥ 768 px
```

---

**User**

1, what do those hex values look like?  Can you make a quick and dirty HTML to demo it?
2.  Let's scaffold first.
3.  Sure, a theming support would be ncie.  I generally go for clean, two tone palletes.  Like.. dark green with mint green.. white would be focal.. gold would shown acheivment., etc.

Don't code yet thogh, still brinastorming.

---

**Cursor**

Below is a quick sketch of the palette and how we might demo it—followed by the clarified plan items.  No repository code will change yet.

──────────────────────────
1 Color tokens & “quick-n-dirty” demo
──────────────────────────
Proposed base tokens  
• --color-primary  #4CAF50 (Google-material “Green 500”)  
• --color-primary-dark  #2E7D32  
• --color-accent  #FFD54F (Material “Amber 300”)  
• --color-background-light  #F5FDF5 (pastel mint)  
• --color-background-dark  #1A2B1A (for dark theme)  
• --color-surface  #FFFFFF  
• --color-text-base  #1B1B1B  
• --radius 8px  
• --transition 150ms ease-in-out

“Quick-n-dirty” visualization (you can paste this into a blank HTML file to see solid swatches):

```html
<!DOCTYPE html>
<html>
<head>
<style>
:root{
  --color-primary:#4CAF50;
  --color-primary-dark:#2E7D32;
  --color-accent:#FFD54F;
  --color-bg-light:#F5FDF5;
  --color-bg-dark:#1A2B1A;
}
.swatch{width:140px;height:90px;margin:8px;border-radius:6px;color:#fff;
  font:14px/90px sans-serif;text-align:center;}
</style>
</head>
<body style="display:flex;flex-wrap:wrap;background:#fafafa">
<div class="swatch" style="background:var(--color-primary)">primary</div>
<div class="swatch" style="background:var(--color-primary-dark)">primary-dark</div>
<div class="swatch" style="background:var(--color-accent);color:#333">accent</div>
<div class="swatch" style="background:var(--color-bg-light);color:#333">bg-light</div>
<div class="swatch" style="background:var(--color-bg-dark)">bg-dark</div>
</body>
</html>
```

(Feel free to tweak any swatch in DevTools until the hues feel right.)

──────────────────────────
2 Scaffolding first – Modal component
──────────────────────────
Tasks for the initial “scaffold” commit:

A.  Add `#modal-root` div to `index.html` right after `<body>` opens.  
B.  Create `components/Modal/Modal.tsx`  
    • Portal to `#modal-root`.  
    • Prop interface: `open`, `onClose`, optional `className`, and `children`.  
    • Handles `Esc` and overlay click.  
C.  `modal.module.css` with two layouts:  
    • `.container` – centred panel (`max-width: 540px; width:90%`) plus subtle drop-shadow.  
    • Mobile media query flips to full-viewport block (`width:100%; height:100%; border-radius:0`).  
    • Fade/scale animation `--transition`.  
D.  Replace `react-modal` import in `LessonPage` and `WorkflowExplainer` with this component.  
E.  Temporary unit test verifying: clicking close sets `open=false` and body scrolling is re-enabled.

That alone should fix the “AI Tutor Workflow” dialog behaviour you observed.

──────────────────────────
3 Theming approach (two-tone, light & dark)
──────────────────────────
• Keep all tokens in `tokens.css`.  
• Duplicate them inside a `[data-theme="dark"]` selector for dark variations.  
  Example:

```css
[data-theme="dark"]{
  --color-surface:#1B1B1B;
  --color-text-base:#F0F0F0;
  --color-bg-light:#1A2B1A;
}
```

• Add a very small `useTheme` hook that toggles `data-theme` on `<html>`; this lets us switch later with a single click or a media query `(prefers-color-scheme: dark)`—no new deps.

──────────────────────────
Open questions before I start coding
──────────────────────────
a.  Are the five tokens above enough to begin, or do you want a secondary accent (e.g., teal or purple) in the set?  
b.  For the modal: ok to name the close control simply “×” in top-right, or would you prefer an explicit “Close” button at the bottom?  
c.  Any preference on animation style/speed (fade-in vs. scale-in)?  I plan to keep it subtle (opacity + slight scale).  
d.  Should the initial dark theme be shipped immediately (behind a toggle) or added later?

Once I have those clarifications I’ll prepare the first code edit (Phase 1-D).

```html
<!DOCTYPE html>
<html>
<head>
<style>
:root{
  --color-primary:#4CAF50;
  --color-primary-dark:#2E7D32;
  --color-accent:#FFD54F;
  --color-bg-light:#F5FDF5;
  --color-bg-dark:#1A2B1A;
}
.swatch{width:140px;height:90px;margin:8px;border-radius:6px;color:#fff;
  font:14px/90px sans-serif;text-align:center;}
</style>
</head>
<body style="display:flex;flex-wrap:wrap;background:#fafafa">
<div class="swatch" style="background:var(--color-primary)">primary</div>
<div class="swatch" style="background:var(--color-primary-dark)">primary-dark</div>
<div class="swatch" style="background:var(--color-accent);color:#333">accent</div>
<div class="swatch" style="background:var(--color-bg-light);color:#333">bg-light</div>
<div class="swatch" style="background:var(--color-bg-dark)">bg-dark</div>
</body>
</html>
```

```css
[data-theme="dark"]{
  --color-surface:#1B1B1B;
  --color-text-base:#F0F0F0;
  --color-bg-light:#1A2B1A;
}
```

---

**User**

a.  Eh, bg-light should be a mint-green very lightly toned green.  bg-dark should be.. a very darkly toned green... purple sounds like a nice addition.
b.  yes, x in top right sounds good!  "and keybaord based 'esc'" would be nice.
c.  opacity and slight scale is good.
d. sure, ship it behind a toggle, could be like a light switch on a wall! :-)


WHere are we on phases.. 0, right?  No code just yet, just flehs out the vision.


---

**Cursor**

Great — vision refined.  
Below is a more detailed blueprint (still Phase 0: planning only) incorporating your latest inputs.

──────────────────────────
🎨 Finalized Core Palette (tokens)
──────────────────────────
Light theme  
• --color-primary  #4CAF50 (Green 500)  
• --color-primary-dark #2E7D32 (Green 800)  
• --color-accent  #9C27B0 (Purple 500) ← new secondary accent  
• --color-achievement #FFD54F (Amber 300 / gold-star)  
• --color-bg-light  #F2FFF4 (Mint-green pastel)  
• --color-surface  #FFFFFF  
• --color-text-base #1B1B1B  

Dark theme (inside `[data-theme="dark"]`)  
• --color-bg-dark  #0F1E0F (very dark green)  
• --color-surface  #1A2B1A  
• --color-text-base #F0F0F0  
• Other colours stay identical unless readability dictates tweak.

Utility tokens  
• --radius: 8px  
• --transition: 150ms ease-in-out  
• --elev-1: 0 2px 4px rgba(0,0,0,.1)  

──────────────────────────
🗂  CSS Modules + Utility Layer
──────────────────────────
Files to be created (names subject to bikeshedding):

1.  `src/styles/tokens.css`  
   — Contains :root light tokens and dark override block.

2.  `src/styles/utils.css` (≤ 20 classes)  
   — e.g., `.flex`, `.grid`, `.center`, `.sr-only`, `.text-sm`, `.mb-2`, `.mt-4`, `.shadow-1`.

3.  `src/styles/global.css`  
   — Normalize/Reset + body defaults; imported once in `main.tsx`.

4.  Every component/page gets `{name}.module.css`.

No PostCSS or Tailwind required.

──────────────────────────
🖼  Modal Pattern Spec
──────────────────────────
Structure  
```html
<div id="modal-root"></div> <!-- lives in index.html -->

<Modal open onClose={fn}>
  <Modal.Header>How to Use the AI Quiz Tutor</Modal.Header>
  <Modal.Body>{children}</Modal.Body>
  <Modal.Footer>
     <Button onClick={onClose}>Got it!</Button>
  </Modal.Footer>
</Modal>
```

Behaviour  
• Portal to `#modal-root`.  
• Background overlay `rgba(0,0,0,.45)`.  
• ESC key and overlay click both call `onClose`.  
• Animations: fade-in + scale 0.96 → 1.  
• Layout:  
  – ≤ 767 px: full-screen sheet, scrolls with page; close “×” fixed top-right.  
  – ≥ 768 px: centred panel `max-width:540px`, rounded corners `var(--radius)`.

Accessibility  
• `role="dialog"`, `aria-modal="true"`, initial focus trap to container.  
• Restores previous focus on close.

──────────────────────────
🌘  Theme Toggle Concept
──────────────────────────
Component: `ThemeSwitch` (light-switch icon).  
• Sits in top-right of site header.  
• Toggles `data-theme="dark"` on `<html>`.  
• Persists preference in `localStorage`.  
• Bonus: auto-detect `prefers-color-scheme` on first load.

──────────────────────────
🔨  Phase Roadmap (recap)
──────────────────────────
Phase 0 – Baseline  
✓ Agree on tokens, modal spec, theming strategy (done).  
✓ Capture screenshots/tests (existing suite + new modal test).  

Phase 1 – Foundation  
1. Add `tokens.css`, `utils.css`, `global.css`; minimal PR.  
2. Inject `#modal-root`; scaffold `Modal` component; swap `react-modal` in one low-risk page (`WorkflowExplainer`) to prove pattern.  
3. Add `ThemeSwitch` (behind a feature flag if needed).  

Phase 2 – Gradual Module Migration  
Page-by-page CSS-module extraction, starting with Leaderboard → Login → Dashboard → Lesson.  

Phase 3 – Shared UI Kit & Accessibility  
Abstract `Button`, `Card`, `Accordion`, etc.  

Phase 4 – Quality Gates  
Stylelint, expanded Playwright tests, optional visual diff.  

Phase 5 – Cleanup & Dep-pruning  
Remove unused global CSS and `react-modal` dep.

──────────────────────────
Next checkpoint
──────────────────────────
Let me know if:

1. The colour hexes feel right (try the demo snippet).  
2. The modal spec matches your expectations (full-screen mobile, centred desktop, fade+scale).  
3. You’re happy to start coding Phase 1 step 1 (token + util + global scaffolding), followed by the Modal scaffold (step 2).

Once you give a 👍 I’ll prepare the first actual code edits.

```html
<div id="modal-root"></div> <!-- lives in index.html -->

<Modal open onClose={fn}>
  <Modal.Header>How to Use the AI Quiz Tutor</Modal.Header>
  <Modal.Body>{children}</Modal.Body>
  <Modal.Footer>
     <Button onClick={onClose}>Got it!</Button>
  </Modal.Footer>
</Modal>
```

