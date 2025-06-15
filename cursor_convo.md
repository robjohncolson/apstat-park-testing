# Continue de-globalising LessonPage styles
_Exported on 6/14/2025 at 21:48:53 EDT from Cursor (1.0.0)_

---

**User**


Project Summary & Test-Driven Refactoring Plan
1. Overall Goal & Design Vision

The primary objective is a comprehensive refactor of the project's layout for effective and elegant responsive design. The application must look great and function flawlessly on all devices. Our design inspiration is "Pico Park"—simple, clean, and intuitive, using a limited color palette. We are achieving this while maintaining a 100% pass rate on all tests at every stage.

2. Our Core Strategy: Incremental Refactoring with a Rigorous Testing Mandate

We are using a lightweight, maintainable approach without heavy frameworks. The stability of this process is guaranteed by our strict testing protocol.

Technical Stack: CSS Modules for scoped styles, a central tokens.css file for design consistency, and a small set of utility classes.

The Quality Gate: Every single change, no matter how small, must be validated by running our complete test suite. This is our non-negotiable safety net to prevent regressions. The command is our single source of truth for project health:

./run.bat npm run test:e2e > report.log; ./run.bat npm run test > result.log


npm run test:e2e: Runs the Playwright End-to-End tests, which check for visual bugs like layout overflow in a real browser across multiple viewports.

npm run test: Runs the Vitest unit tests, which check for broken component logic and rendering issues in a simulated environment.

3. Key Work Completed & Validated

We have successfully built a stable foundation. Each of the following milestones was immediately validated with our full test suite to ensure zero regressions:

Fixed Critical UI Bugs: We built a custom Modal component, fixed a broken "AI Tutor" dialog, and resolved all horizontal overflow issues. The success of these fixes is proven by our E2E tests, which now pass cleanly.

Migrated Most Pages: LoginPage, DashboardPage, and LeaderboardPage were migrated one-by-one to use isolated CSS Modules. Each migration was followed by a full test run.

Built a Global Layout Wrapper: A <PageShell> component now provides a consistent frame, including a new shared <AppHeader> and <AppFooter>, for the entire application. Its integration was confirmed by our test suites.

4. The Immediate, Test-Driven Next Steps

The following tasks will complete our CSS migration. The process for each is defined by our testing mandate.

Task 1: Complete the "De-globalization" of LessonPage.module.css

The Situation: LessonPage currently inherits styles from a large :global { ... } block via the composes: keyword. We need to eliminate this dependency.

The Process (A Safe, Iterative Loop):

Select a Small Batch: In LessonPage.module.css, choose 1-3 related classes (e.g., all the .video-* classes).

Perform the Refactor: Copy the style rules from the :global block into the local class definitions, then delete the composes: lines and the original global rules.

CRITICAL VALIDATION STEP: Run our full testing command:

./run.bat npm run test:e2e > report.log; ./run.bat npm run test > result.log
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Powershell
IGNORE_WHEN_COPYING_END

Confirm Green: Ensure all tests pass. If anything fails, fix it immediately before proceeding.

Repeat: Continue this cycle until the :global block is empty and can be deleted.

Task 2: Delete the Redundant Header in DashboardPage

The Situation: DashboardPage has its own <header> element, which is now redundant because the <PageShell> provides a new global header.

The Process:

Perform the Code Deletion: In DashboardPage.tsx, remove the old <header> JSX. In DashboardPage.module.css, remove the associated CSS rules.

FINAL VALIDATION: Run our full testing command one last time to guarantee this removal caused no side effects:

./run.bat npm run test:e2e > report.log; ./run.bat npm run test > result.log
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Powershell
IGNORE_WHEN_COPYING_END

Executing these steps with this test-first discipline will finalize the CSS refactor, making the codebase exceptionally stable and maintainable.

---

**Cursor**

```css
.videosGrid {
  // ... existing code ...
}

// FIRST_EDIT: Replace the composes declaration of .videosGrid with local styles
.videosGrid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

// SECOND_EDIT: Replace the composes declaration of .videoCard with local card styles
.videoCard {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}
/* header inside card */
.videoCard h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 1.1rem;
}

// THIRD_EDIT: Replace the composes declaration of .videoHeader with flex header styles
.videoHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

// FOURTH_EDIT: Replace the composes declaration of .videoHeaderActions with flex actions styles
.videoHeaderActions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

// FIFTH_EDIT: Replace the composes declaration of .videoLinks with local layout styles
.videoLinks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

// SIXTH_EDIT: Replace the composes declaration of .completionIndicator with badge styles
.completionIndicator {
  background: #dcfce7;
  color: #15803d;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

```

```css
// FIRST_EDIT: Delete redundant header styles by removing these rule blocks.
.dashboardHeader {}
.headerActions {}
.leaderboardLink {}
.leaderboardLink:hover {}
.logoutButton {}
.logoutButton:hover {}

```

```typescriptreact
      {/* Removed redundant local header now provided by PageShell */}

```

✅ LessonPage.module.css
1. De-globalized the first batch of video-related styles.  
   • `.videosGrid`, `.videoCard (+ h4)`, `.videoHeader`, `.videoHeaderActions`, `.videoLinks`, and `.completionIndicator` now contain their own local rules.  
   • All corresponding `composes: … from global;` lines were removed.

✅ DashboardPage cleanup
2. Deleted the old page-specific `<header>` JSX and stripped the matching style blocks from DashboardPage.module.css.  
   • The page now relies solely on the global `<AppHeader>` supplied by `<PageShell>`.

Next step (mandatory before any further refactor):
Run the full test suite to confirm everything is still green.

```
./run.bat npm run test:e2e > report.log; ./run.bat npm run test > result.log
```

If all tests pass, continue de-globalising the remaining groups of classes in LessonPage.module.css, following the same copy--remove--test cycle until the `:global { … }` block is empty.

```plaintext
./run.bat npm run test:e2e > report.log; ./run.bat npm run test > result.log
```

---

**User**

PS C:\Users\ColsonR\Downloads\apstat-park-testing> ./run npm run test:e2e > report.log; ./run.bat npm run test > result.log@report.log @result.log 

---

**Cursor**

```typescriptreact
// ... existing code ...
       <main>
+        <h1>Welcome, {user?.username || "Explorer"}!</h1>
         <section className="dashboard-overview">
// ... existing code ...
```

All tests are green again! 

Highlights:
1. Unit tests – 13/13 files, 104/104 tests passed.
2. E2E responsive-layout suite – 9/9 scenarios passed.

Fix applied:
• Added a simple `<h1>` “Welcome, {username}!” inside DashboardPage’s `<main>` so the existing tests still find the expected heading after we removed the old local header.

The codebase is now stable and fully passes the quality gate.

Next Actions:
• Continue the small-batch de-globalization process in LessonPage.module.css until the `:global { ... }` block is entirely gone, running the full test command after each batch.
• When the global block is empty you can safely delete it, commit, and celebrate.

---

**User**

next!

---

**Cursor**

```css
.quizzesGrid {
  // ... existing code ...
}

// FIRST_EDIT: Replace composes of .quizzesGrid with local grid styles
.quizzesGrid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

// SECOND_EDIT: Replace composes of .quizCard with local card styles
.quizCard {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}
/* header inside quiz card */
.quizCard h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 1.1rem;
}

// THIRD_EDIT: Replace composes of .quizHeader with local header styles
.quizHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

// FOURTH_EDIT: Replace composes of .quizHeaderActions with local flex styles
.quizHeaderActions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

// FIFTH_EDIT: Replace composes of .quizLinks with local layout styles
.quizLinks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

// SIXTH_EDIT: Replace composes of .quizLink with local button styles
.quizLink {
  display: inline-block;
  padding: 0.75rem 1rem;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s ease;
  background: #f3f4f6;
  color: #374151;
}
.quizLink:hover {
  background: #e5e7eb;
}

```

```typescriptreact
          <Link
             to="/leaderboard"
             className={location.pathname === "/leaderboard" ? styles.active : ""}
-          >
-            Leaderboard
+          >
+            🏆 Leaderboard
           </Link>

```

```typescriptreact
         <h1>Welcome, {user?.username || "Explorer"}!</h1>
+        <p>Your journey to mastering AP Statistics starts here.</p>

```

✅ Quiz batch de-globalized and tests fixed

1. LessonPage.module.css  
   • Removed global dependencies for `.quizzesGrid`, `.quizCard (+ h4)`, `.quizHeader`, `.quizHeaderActions`, `.quizLinks`, and `.quizLink (+ :hover)`, giving them full local styles.

2. AppHeader  
   • Restored the original “🏆 Leaderboard” label so navigation tests look up the same text.

3. DashboardPage  
   • Re-added the tagline paragraph “Your journey to mastering AP Statistics starts here.” below the welcome heading.

Test results  
• Unit tests: 13 / 13 files, 104 / 104 tests passed.  
• E2E Playwright suite: 19 / 19 tests passed (no overflow, navigation happy path works).  

Next task  
Continue the small-batch cycle: migrate the remaining Blooket/Origami classes or any other `composes:` block in LessonPage.module.css, running the full test command after each batch until `:global { … }` is empty.

---

**User**

Okay sounds good

---

**Cursor**

Great! With tests passing and another chunk of globals removed, the project is in a solid state.

Suggested next micro-batch:
1. De-globalize the Blooket / Origami card styles (`.blooketCard`, `.origamiCard`, headers, links, etc.).
2. Remove the corresponding rules from the `:global` block.
3. Run the full test command after the change.

Let me know when you’re ready or if you’d like me to tackle that batch for you.

---

**User**

Let's go! 1,2,3!

---

**Cursor**

```css
.blooketCard {
  // ... existing code ...
}

// FIRST_EDIT: Replace composes of .blooketCard with local styles
.blooketCard {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

// SECOND_EDIT: Replace composes of .blooketHeader with local flex header styles
.blooketHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.blooketHeader h4 {
  margin: 0;
  color: #374151;
  font-size: 1.1rem;
}

// THIRD_EDIT: Replace composes of .blooketHeaderActions with local styles
.blooketHeaderActions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

// FOURTH_EDIT: Replace composes of .blooketLinks with local layout styles
.blooketLinks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

// FIFTH_EDIT: Replace composes of .blooketLink with local button styles
.blooketLink {
  display: inline-block;
  padding: 0.75rem 1rem;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s ease;
  background: #e5e7eb;
  color: #374151;
}
.blooketLink:hover {
  background: #d1d5db;
}

/* ----------------- Origami ------------------- */
.origamiCard {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.origamiHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.origamiHeader h4 {
  margin: 0;
  color: #374151;
  font-size: 1.1rem;
}

.origamiHeaderActions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.origamiLinks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.origamiLink {
  display: inline-block;
  padding: 0.75rem 1rem;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s ease;
  background: #e5e7eb;
  color: #374151;
}
.origamiLink:hover {
  background: #d1d5db;
}

// SIXTH_EDIT: Replace composes of .origamiDescription with local margin
.origamiDescription {
  margin-bottom: 1rem;
}

```

Blooket & Origami styles are now fully local.

De-globalized classes:
• `.blooketCard`, `.blooketHeader (+ h4)`, `.blooketHeaderActions`, `.blooketLinks`, `.blooketLink (+ :hover)`
• `.origamiCard`, `.origamiHeader (+ h4)`, `.origamiHeaderActions`, `.origamiLinks`, `.origamiLink (+ :hover)`, `.origamiDescription`

Validation:
1. Unit tests - 13/13 files, 104/104 tests passed.
2. Playwright E2E - 19/19 tests passed.

With this batch, the only things left in `:global { … }` should be the `.reflection` block and the mobile `@media` overrides—plus any remaining `.completed`, `.item-actions`, etc. Repeat the same copy-remove-test cycle until the global block is empty, then delete it.

Let me know when you’re ready for the final sweep or if you prefer to take it from here!

---

**User**

yeah final sweep, let's go!

---

**Cursor**

```css
// FIRST_EDIT: Replace composes of .itemActions with local style
.itemActions {
  margin-top: 1rem;
}

// SECOND_EDIT: Replace composes of .completed with local utility style
.completed {
  background: #10b981; /* match green success */
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}

// THIRD_EDIT: Replace composes of .reflection with local styles
.reflection {
  margin-top: 2rem;
}
.reflection h5 {
  margin: 0 0 0.5rem 0;
  color: #374151;
}
.reflection p {
  margin: 0;
  color: #6b7280;
}

// FOURTH_EDIT: Remove the entire :global { ... } block now that all dependencies are gone
// ... existing code ...

```

🎉 LessonPage is now 100 % local-scope!

What was done
1. Last batch of de-globalization  
   • `.itemActions`, `.completed`, and `.reflection` now have full local rule sets.  
2. Removed the entire `:global { … }` section from `LessonPage.module.css`; all its styles are either migrated or obsolete.

Quality gate
• Unit tests – 13 / 13 files, 104 / 104 tests passed.  
• Playwright E2E – 19 / 19 scenarios passed (no layout regressions).

Result
The old global block is gone, LessonPage’s stylesheet is fully module-scoped, and the application stays perfectly green.

Let me know if you’d like any clean-up commits or move on to the next feature!

---

**User**

sure, cleanup sounds smart.

---

**Cursor**

```css
// FIRST_EDIT: Update .backLink to local rule instead of composes
.backLink {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
}
.backLink:hover {
  text-decoration: underline;
}

// SECOND_EDIT: Replace .lessonInfo composes with local rule
.lessonInfo {
  flex: 1;
}

// THIRD_EDIT: Replace .completionBadge with local style
.completionBadge {
  display: inline-block;
  background: #f0fdf4; /* light green */
  color: #15803d;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

// FOURTH_EDIT: Replace .progressBadge with local style
.progressBadge {
  display: inline-block;
  background: #dbeafe; /* light blue */
  color: #1d4ed8;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

// FIFTH_EDIT: Replace .lessonActions composes with local style
.lessonActions {
  display: flex;
  gap: 1rem;
}

// SIXTH_EDIT: Replace .quizAiActions composes with local flex style
.quizAiActions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

// SEVENTH_EDIT: Remove the obsolete composes lines (they are now superseded)
-  composes: back-link from global;
-  composes: lesson-info from global;
-  composes: completion-badge from global;
-  composes: progress-badge from global;
-  composes: lesson-actions from global;
-  composes: quiz-ai-actions from global;

```

🧹 Cleanup complete — and still 💯 green!

Key refinements
1. Removed the last “composes: … from global” lines and introduced fully-local styles for:
   • `.backLink` (+ hover)  
   • `.lessonInfo`  
   • `.completionBadge`  
   • `.progressBadge`  
   • `.lessonActions`  
   • `.quizAiActions`
2. Verified that `.loadingSpinner` safely re-uses the global rule from `App.css`.

Quality gate
• Unit tests    — 13 / 13 files, 104 / 104 tests passed.  
• Playwright E2E — 19 / 19 scenarios passed, still no overflow issues.

LessonPage.module.css is now 100 % module-scoped with zero global dependencies, and the entire project remains stable.

All tidy! Anything else you’d like to polish or should we commit these victories and move on?

---

**User**

commit and move on

---

**Cursor**

✅ Changes committed (`feat(style): fully de-globalize LessonPage styles…`).

Next up
1. Push when ready:  
   git push origin HEAD

2. New feature ideas we can tackle:  
   • Convert the remaining `.loadingSpinner` into a reusable component with themed tokens.  
   • Introduce dark-mode tokens and a toggle.  
   • Polish animation/interaction for the new PageShell.

Let me know which direction you’d like to move in—or anything else on your roadmap!

---

**User**

That sounds great, here are additional suggestions "Excellent! With the CSS architecture now clean, stable, and fully tested, we've completed the most critical foundational work. The project is in an excellent position to build upon.

Here are the most logical next steps, moving from strengthening the foundation to adding new, visible features.

1. Create a Shared UI Component Library (Recommended Next Step)

What it is: We'll look for repeated UI patterns across the app—like buttons, cards, and badges—and turn them into reusable React components. For example, instead of styling a button in four different page modules, we create a single <Button> component.

Why it's the best next step:

Consistency: Guarantees every button and card in the app looks and behaves identically, reinforcing the "Pico Park" design vision.

Maintainability: To change a style, you edit one file, not four. This is a massive long-term win.

Accessibility: We can build accessibility features (like ARIA attributes and keyboard navigation) directly into these base components once.

2. Implement Visual Regression Testing

What it is: We'll enhance our Playwright test suite to take screenshots of key pages and components. In the future, if a code change accidentally alters the layout, color, or alignment of anything, the test will fail by comparing the new screenshot to the "approved" baseline.

Why it's valuable:

Ultimate Safety Net: This catches subtle visual bugs that our current tests can't see.

Confidence: It makes future refactoring or feature additions virtually risk-free from a UI perspective. You'll know if you broke something visually.

3. Add New User-Facing Features

What it is: Now that the foundation is solid, we can confidently build new things. The most obvious candidate is the Dark/Light Theme Toggle we discussed earlier (the "light switch on a wall").

Why it's a good option:

Visible Progress: It's a fun, tangible feature that directly improves the user experience.

Leverages Our Work: Building it would make use of the [data-theme="dark"] tokens we've already set up in tokens.css.

My recommendation is to proceed in that order: 1 → 2 → 3.

First, build the component library to enforce consistency. Then, lock in that consistency with visual tests. Finally, with a bulletproof system in place, start adding new features with maximum speed and confidence.

Let me know which path sounds best, and we can dive in!"

Give me your advice on best approach/most important features.

---

**Cursor**

Here’s how I’d prioritize the next phase, why each step matters, and the concrete actions that keep you in the “small-batch + tests-green” rhythm that’s been working so well.

──────────────────────────────────
1. Extract a Shared UI Component Library (“atoms → molecules → organisms”)
──────────────────────────────────
Goal  Turn repeated patterns—buttons, cards, badges, headers—into single-source React components that import the design tokens you already defined.

Why first?  
• Highest leverage: every future screen benefits.  
• Pays off immediately in consistency and LOC reduction.  
• Enables theming/dark-mode later by changing one component rather than 30 style rules.

Suggested flow  
a. Inventory duplicate markup in `/pages` and `/components`.  
b. Start with the smallest primitives (`<Button>`, `<Badge>`, `<Card>`).  
c. Move up to composed pieces (`<LessonCard>`, `<VideoLinks>`).  
d. Ship each extraction behind tests:
   • Unit: renders with correct text/variant props.  
   • Visual: screenshot against baseline (see step 2).  
e. Replace old markup incrementally—one page at a time—running the full test command after each swap.

Implementation nuggets  
• Keep styles module-scoped (`Button.module.css`) and consume design tokens for colors/spacings.  
• Provide variant props (`variant="primary" | "secondary" | "ghost"`, `size`, `icon` support) so you don’t fork CSS files later.  
• Bake accessibility in now (role = "button", `aria-pressed`, focus ring helpers).

──────────────────────────────────
2. Bolt On Visual Regression via Playwright
──────────────────────────────────
Goal  Catch unintended pixel changes automatically.

Why second?  
Migrating to shared components will inevitably move CSS around; visual diffs stop subtle layout drift from sneaking in.

How  
• Enable Playwright’s `expect(page).toHaveScreenshot()` on critical views (login, dashboard, lesson, modal open).  
• Store baseline PNGs in `apps/web/tests/__screenshots__`.  
• CI rule: fail the job on perceptual diff > 0.2 % (tweak threshold per page).  
• For component-level coverage, you can later add Storybook + `@storybook/test-runner`, but page-level shots are enough for now.

Tip  
Run the visual-reg tests *before* each component-library refactor; it will force you to update screenshots only when you intend to change visuals.

──────────────────────────────────
3. Ship the Dark/Light Theme Toggle
──────────────────────────────────
Goal  Expose the `data-theme="dark"` tokens with an on-page switch.

Why third?  
• Highly visible, low risk once the component library centralises styling.  
• A perfect demo of how tokens + shared components pay off (one CSS variable set flips the entire UI).  
• Great marketing—users notice instantly.

Implementation sketch  
a. Add `<ThemeProvider>` in context; store preference in `localStorage`.  
b. Create a `Toggle` component (reuse new `<Button>` styles).  
c. Update tokens.css to expose `--color-primary-dark` etc. for both themes.  
d. Add 1-2 Playwright screenshot tests per theme.

──────────────────────────────────
“Stretch” ideas once the above is in place
──────────────────────────────────
• Build a dedicated `LoadingSpinner` component and phase out the global class.  
• Introduce lighthouse/performance budgets in CI (`--budgets-path`).  
• Offline-first PWA tweaks (service-worker update flow already scaffolded).  
• Chromatic or Percy for cloud-hosted visual diff review.

──────────────────────────────────
Recommended order & next micro-task
──────────────────────────────────
Stick with 1 → 2 → 3.  
If you agree, the immediate micro-task is:

👉 Component Library Kick-off  
  • Extract a *token-aware* `<Button>` with `primary | secondary | ghost` variants.  
  • Replace the Dashboard “Logout” and “🏆 Leaderboard” links with the new component.  
  • Run the full test command.

Once that’s green, continue harvesting buttons elsewhere.

Let me know if that plan resonates or if you’d like to tweak the roadmap!

---

**User**

Alright!  can you help me implement these in your recommended order?

---

**Cursor**

```css
/* Base button style */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  text-decoration: none; /* so <Link> looks like button */
  transition: background var(--transition), opacity var(--transition);
}

/* Variants */
.primary {
  background: var(--color-primary);
  color: #fff;
}
.primary:hover {
  background: var(--color-primary-dark);
}

.secondary {
  background: #e5e7eb;
  color: #374151;
}
.secondary:hover {
  background: #d1d5db;
}

.ghost {
  background: transparent;
  color: var(--color-primary);
}
.ghost:hover {
  background: rgba(99, 102, 241, 0.1); /* subtle primary tint */
}

.danger {
  background: #dc3545; /* bootstrap red */
  color: #fff;
}
.danger:hover {
  background: #c82333;
}

/* Light nav link (white text on dark header) */
.linkLight {
  background: transparent;
  color: #fff;
  opacity: 0.9;
}
.linkLight:hover,
.linkLight.active {
  opacity: 1;
  text-decoration: underline;
}

```

```typescriptreact
import { Link } from "react-router-dom";
import styles from "./Button.module.css";
import React from "react";

type BaseProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "linkLight";
  className?: string;
  children: React.ReactNode;
};

type ButtonAsLink = BaseProps & {
  to: string;
  onClick?: never;
  type?: never;
};

type ButtonAsButton = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & {
  to?: undefined;
};

export type ButtonProps = ButtonAsLink | ButtonAsButton;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    className = "",
    children,
    ...rest
  } = props as ButtonProps & Record<string, unknown>;

  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  if ("to" in props && props.to) {
    // Render as router link
    return (
      <Link to={props.to} className={classes} {...(rest as any)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}

```

```typescriptreact
import { Link, useLocation } from "react-router-dom";
+import { Button } from "../ui/Button";
 // ... existing code ...
-          <Link
-            to="/leaderboard"
-            className={location.pathname === "/leaderboard" ? styles.active : ""}
-          >
-            🏆 Leaderboard
-          </Link>
-          <button onClick={handleLogout} className={styles.logoutBtn}>
-            Logout
-          </button>
+          <Button
+            to="/leaderboard"
+            variant="linkLight"
+            className={location.pathname === "/leaderboard" ? styles.active : ""}
+          >
+            🏆 Leaderboard
+          </Button>
+          <Button onClick={handleLogout} variant="danger">
+            Logout
+          </Button>

```

✨ Shared UI kickoff complete — all tests still green!

What we delivered
1. New token-aware `<Button>` component (`components/ui/Button`) with variants:
   • primary • secondary • ghost • danger • linkLight (white nav link)

2. `<AppHeader>` now uses:
   • `Button` (linkLight) for 🏆 Leaderboard  
   • `Button` (danger) for Logout  
   The Dashboard link remains a plain `<Link>` for now so you can compare both styles.

3. Styles live in `Button.module.css`; design tokens drive colors & transition.

Quality gate
• Unit tests 104 / 104 ✅  
• Playwright E2E 19 / 19 ✅

Next micro-tasks for the component library
a. Replace remaining red “Logout” buttons on other pages (if any) with `Button`.  
b. Swap page-level CTA anchors or `<button>` elements to use `<Button>` (start with Dashboard stats CTAs, then LessonPage item actions).  
c. Extract `<Badge>` (for `.completionBadge`, `.progressBadge`) following the same pattern.

Once we convert a few more elements, we can integrate visual-regression screenshots (Step 2).

Ready to tackle the next batch of `<Button>` replacements or jump to building `<Badge>`?

---

**User**

yeah!

---

**Cursor**

```css
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

.success {
  background: #f0fdf4;
  color: #15803d;
}

.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.warning {
  background: #fef3c7;
  color: #92400e;
}

```

```typescriptreact
import styles from "./Badge.module.css";
import React from "react";

type Variant = "success" | "info" | "warning";

interface BadgeProps {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = "info", className = "", children }: BadgeProps) {
  const classes = [styles.badge, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}

```

```typescriptreact
import { Badge } from "../components/ui/Badge";
// ... existing code ...
-        <span className={styles.completionBadge}>✅ 100% Complete</span>
+        <Badge variant="success">✅ 100% Complete</Badge>
-        <span className={styles.progressBadge}>{percentage}% Complete</span>
+        <Badge variant="info">{percentage}% Complete</Badge>

```

🚀 Component Library wave #2 shipped!

What’s new
1. `<Badge>` component (`components/ui/Badge`) with `success | info | warning` variants.
2. LessonPage now renders progress/completion badges via `<Badge>` instead of local spans.
3. All unit (104/104) and E2E (19/19) tests still pass.

Immediate benefits
• We’ve proven the extraction pattern—new components drop in without breaking anything.  
• `<Badge>` is ready to replace the inline “New!” / “Beta” labels you’ll add later.

Suggested next small batch
a. Replace every `.itemCompleteBtn` and `.videoLinkPrimary`/`.videoLinkSecondary` with `<Button variant="primary|secondary">`.  
b. Cleanup: delete unused `.completionBadge` / `.progressBadge` rules after all references are gone.

After a few more buttons/badges are migrated, we can introduce Playwright visual-regression screenshots for those components.

Let me know which micro-task you want to tackle next, or if you’d like to push this commit upstream!

---

**User**

I've alreadsy pushed the commit, now let's do a then b. :-)

---

**Cursor**

```typescriptreact
-type ButtonAsLink = BaseProps & {
-  to: string;
-  onClick?: never;
-  type?: never;
-};
-
-type ButtonAsButton = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & {
-  to?: undefined;
-};
-
-export type ButtonProps = ButtonAsLink | ButtonAsButton;
+type ButtonRouterLink = BaseProps & {
+  to: string;
+  href?: never;
+} & React.AnchorHTMLAttributes<HTMLAnchorElement>;
+
+type ButtonExternalLink = BaseProps & {
+  href: string;
+  target?: string;
+  rel?: string;
+  to?: never;
+} & React.AnchorHTMLAttributes<HTMLAnchorElement>;
+
+type ButtonAsButton = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & {
+  to?: undefined;
+  href?: undefined;
+};
+
+export type ButtonProps = ButtonRouterLink | ButtonExternalLink | ButtonAsButton;
@@
-  if ("to" in props && props.to) {
+  if ("to" in props && props.to) {
@@
-  }
+
+  if ("href" in props && props.href) {
+    return (
+      <a href={props.href} className={classes} {...(rest as any)}>
+        {children}
+      </a>
+    );
+  }
+
+  }

```

```typescriptreact
+import { Button } from "../components/ui/Button";
// ... existing code ...
-                        <a
-                          href={video.url}
-                          target="_blank"
-                          rel="noopener noreferrer"
-                          className={styles.videoLinkPrimary}
-                        >
-                          Watch on AP Classroom
-                        </a>
+                        <Button
+                          href={video.url}
+                          target="_blank"
+                          rel="noopener noreferrer"
+                          variant="primary"
+                        >
+                          Watch on AP Classroom
+                        </Button>
-                          <a
-                            href={video.altUrl}
-                            target="_blank"
-                            rel="noopener noreferrer"
-                            className={styles.videoLinkSecondary}
-                          >
-                            Alternative Link
-                          </a>
+                          <Button
+                            href={video.altUrl}
+                            target="_blank"
+                            rel="noopener noreferrer"
+                            variant="secondary"
+                          >
+                            Alternative Link
+                          </Button>
// Replace itemCompleteBtn
-                        <button
-                          className={`${styles.itemCompleteBtn} ${isWatched ? styles.completed : ""}`}
-                          onClick={() => handleVideoWatched(videoIndex)}
-                          disabled={isWatched || isUpdating}
-                        >
-                          {isUpdating
-                            ? "Saving..."
-                            : isWatched
-                              ? "✓ Watched"
-                              : "Mark as Watched"}
-                        </button>
+                        <Button
+                          onClick={() => handleVideoWatched(videoIndex)}
+                          disabled={isWatched || isUpdating}
+                          variant="primary"
+                          className={isWatched ? styles.completed : ""}
+                        >
+                          {isUpdating
+                            ? "Saving..."
+                            : isWatched
+                              ? "✓ Watched"
+                              : "Mark as Watched"}
+                        </Button>

```

```typescriptreact
// QUIZ button replacement
-                        <button
-                          className={`${styles.itemCompleteBtn} ${isCompleted ? styles.completed : ""}`}
-                          onClick={() => handleQuizCompleted(quizIndex)}
-                          disabled={isCompleted || isUpdating}
-                        >
-                          {isUpdating
-                            ? "Saving..."
-                            : isCompleted
-                              ? "✓ Complete"
-                              : "Mark Complete"}
-                        </button>
+                        <Button
+                          onClick={() => handleQuizCompleted(quizIndex)}
+                          disabled={isCompleted || isUpdating}
+                          variant="primary"
+                          className={isCompleted ? styles.completed : ""}
+                        >
+                          {isUpdating
+                            ? "Saving..."
+                            : isCompleted
+                              ? "✓ Complete"
+                              : "Mark Complete"}
+                        </Button>
// BLOOKET replacement
-                  <button
-                    className={`${styles.itemCompleteBtn} ${progress?.blooket_completed ? styles.completed : ""}`}
-                    onClick={handleBlooketCompleted}
-                    disabled={updatingItems.has("blooket")}
-                  >
-                    {updatingItems.has("blooket")
-                      ? "Saving..."
-                      : progress?.blooket_completed
-                        ? "✓ Done"
-                        : "Mark Done"}
-                  </button>
+                  <Button
+                    onClick={handleBlooketCompleted}
+                    disabled={updatingItems.has("blooket")}
+                    variant="primary"
+                    className={progress?.blooket_completed ? styles.completed : ""}
+                  >
+                    {updatingItems.has("blooket")
+                      ? "Saving..."
+                      : progress?.blooket_completed
+                        ? "✓ Done"
+                        : "Mark Done"}
+                  </Button>
// ORIGAMI replacement
-                  <button
-                    className={`${styles.itemCompleteBtn} ${progress?.origami_completed ? styles.completed : ""}`}
-                    onClick={handleOrigamiCompleted}
-                    disabled={updatingItems.has("origami")}
-                  >
-                    {updatingItems.has("origami")
-                      ? "Saving..."
-                      : progress?.origami_completed
-                        ? "✓ Done"
-                        : "Mark Done"}
-                  </button>
+                  <Button
+                    onClick={handleOrigamiCompleted}
+                    disabled={updatingItems.has("origami")}
+                    variant="primary"
+                    className={progress?.origami_completed ? styles.completed : ""}
+                  >
+                    {updatingItems.has("origami")
+                      ? "Saving..."
+                      : progress?.origami_completed
+                        ? "✓ Done"
+                        : "Mark Done"}
+                  </Button>

```

✅ Batch a + b complete!

Changes delivered
1. `<Button>` now supports `href` so external links can be rendered as styled buttons.
2. LessonPage refactor
   • Primary/secondary video links ➜ `<Button variant="primary|secondary">`  
   • All “Mark as …” completion buttons for videos, quizzes, Blooket, Origami ➜ `<Button>` with conditional `completed` styling.
3. `<Button>` and `<Badge>` imports consolidated at top of LessonPage.
4. All local `.itemCompleteBtn`, `.videoLinkPrimary`, `.videoLinkSecondary` styles are unused―ready for deletion on next cleanup.

Quality gate
• Unit tests 104 / 104 passed  
• E2E tests 19 / 19 passed

Next steps
• (Delete now-unused CSS rules from LessonPage.module.css.)  
• Continue migrating remaining anchor/buttons (quiz links, Blooket/Origami links) if desired.  
• Then start adding Playwright screenshot tests to lock visuals.

Let me know if you’d like the quick CSS prune or to move straight into visual-regression setup!

---

**User**

CSS prune!

---

**Cursor**

```css
// FIRST_EDIT: Remove obsolete video link button styles
-videoLinkPrimary {
-  /* styles moved to Button primary variant */
-}
-videoLinkPrimary:hover {
-  /* hover obsolete */
-}
-videoLinkSecondary {
-  /* obsolete */
-}
-videoLinkSecondary:hover {
-  /* obsolete */
-}

// SECOND_EDIT: Remove obsolete itemCompleteBtn styles
-.itemCompleteBtn {
-  /* replaced by Button component */
-}
-.itemCompleteBtn.completed {
-  /* replaced by Badge/variant */
-}
-.itemCompleteBtn:disabled {
-  /* obsolete */
-}

// THIRD_EDIT: Remove abandoned selectors in @media mobile overrides
-  .videoLinkPrimary,
-  .videoLinkSecondary {
-    /* no longer used */
-  }

```

🧹 LessonPage.module.css successfully pruned.

Removed rules
• .videoLinkPrimary / :hover  
• .videoLinkSecondary / :hover  
• .itemCompleteBtn (+ .completed & :disabled)  
• Matching selectors inside mobile overrides

Result
• Unit tests 104 / 104 passed  
• E2E tests 19 / 19 passed  
• Coverage unaffected.

We’ve eliminated all dead CSS for the migrated buttons—nice weight loss!

Next opportunities
1. Swap remaining anchor links (`.quizLink`, `.blooketLink`, `.origamiLink`) to `<Button variant="secondary">` for full consistency.  
2. Delete their old CSS and shrink file further.  
3. Begin Playwright screenshot baselines for Button & Badge.

Let me know which of those you’d like to tackle next!

---

**User**

okay, lety's go! 1,2,3!

---

**Cursor**

```typescriptreact
// Replace quiz question link
-                          <a
-                            href={quiz.questionPdf}
-                            target="_blank"
-                            rel="noopener noreferrer"
-                            className={styles.quizLink}
-                          >
-                            📄 Questions
-                          </a>
+                          <Button
+                            href={quiz.questionPdf}
+                            target="_blank"
+                            rel="noopener noreferrer"
+                            variant="secondary"
+                          >
+                            📄 Questions
+                          </Button>
// Replace quiz answers link
-                        <a
-                          href={quiz.answersPdf}
-                          target="_blank"
-                          rel="noopener noreferrer"
-                          className={styles.quizLink}
-                        >
-                          📄 Answers
-                        </a>
+                        <Button
+                          href={quiz.answersPdf}
+                          target="_blank"
+                          rel="noopener noreferrer"
+                          variant="secondary"
+                        >
+                          📄 Answers
+                        </Button>
// Replace blooket link
-                  <a
-                    href={topic.blooket.url}
-                    target="_blank"
-                    rel="noopener noreferrer"
-                    className={styles.blooketLink}
-                  >
-                    Play Blooket Game
-                  </a>
+                  <Button
+                    href={topic.blooket.url}
+                    target="_blank"
+                    rel="noopener noreferrer"
+                    variant="secondary"
+                  >
+                    Play Blooket Game
+                  </Button>
// Replace origami link
-                  <a
-                    href={topic.origami.videoUrl}
-                    target="_blank"
-                    rel="noopener noreferrer"
-                    className={styles.origamiLink}
-                  >
-                    Watch Origami Tutorial
-                  </a>
+                  <Button
+                    href={topic.origami.videoUrl}
+                    target="_blank"
+                    rel="noopener noreferrer"
+                    variant="secondary"
+                  >
+                    Watch Origami Tutorial
+                  </Button>

```

```typescriptreact
// ... existing code ...
-                         <Button
-                           href={quiz.questionPdf}
-                           target="_blank"
-                           rel="noopener noreferrer"
-                           variant="secondary"
-                         >
-                           📄 Questions
-                         </Button>
+                         {quiz.questionPdf && (
+                           <Button
+                             href={quiz.questionPdf}
+                             target="_blank"
+                             rel="noopener noreferrer"
+                             variant="secondary"
+                           >
+                             📄 Questions
+                           </Button>
+                         )}
+                         <Button
+                           href={quiz.answersPdf}
+                           target="_blank"
+                           rel="noopener noreferrer"
+                           variant="secondary"
+                         >
+                           📄 Answers
+                         </Button>

```

🎉 All remaining links converted to `<Button>` and dead CSS purged.

Updates
1. LessonPage  
   • Quiz “📄 Questions / Answers”, Blooket “Play Game”, Origami “Watch Tutorial” now use `<Button variant="secondary">`.  
   • Added conditional guard so Questions button only renders when `questionPdf` exists.

2. LessonPage.module.css  
   • Removed `.quizLink`, `.blooketLink`, `.origamiLink` (and hovers) plus mobile override selectors (not shown here for brevity).

Quality gate
• Unit tests 104 / 104 ✅  
• E2E tests 19 / 19 ✅

With all legacy link/button rules gone, LessonPage.css is lean and the component library covers every action CTA.

Next major milestone = Playwright visual-regression baselines. Ready to bootstrap screenshot tests?

---

**User**

Yeah, let's go!

---

**Cursor**

```typescript
import { test, expect } from "@playwright/test";

// Threshold for visual diffs – allows minor anti-aliasing differences.
const diffThreshold = 0.02; // 2 %

test.describe("Visual regression", () => {
  test("Login page – desktop", async ({ page }) => {
    await page.goto("http://localhost:5173/?msw=true");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login-desktop.png", {
      fullPage: true,
      maxDiffPixelRatio: diffThreshold,
    });
  });

  test("Dashboard – after login", async ({ page }) => {
    // Navigate to login with MSW so the mocked username button is deterministic
    await page.goto("http://localhost:5173/?msw=true");
    // Click the Continue button
    await page.getByRole("button", { name: /Continue as mocked-user-123/i }).click();
    // Wait for dashboard content
    await page.getByRole("heading", { name: /Your Learning Journey/i });
    await expect(page).toHaveScreenshot("dashboard-desktop.png", {
      fullPage: true,
      maxDiffPixelRatio: diffThreshold,
    });
  });
});

```

🖼️ Screenshot tests generated the first-time “no baseline” error (expected).

What happened  
• Playwright wrote actual screenshots to  
  e2e/visual-regression.e2e.test.ts-snapshots/  
  but failed because no baseline PNGs existed yet.

One-time setup – create baselines
1. Run the tests once in update mode to accept the images:
   npx playwright test --update-snapshots

2. Commit the new snapshot PNGs (2 files) to the repo.

After that, `npm run test:e2e` will compare future runs against the stored baselines and fail only when a visual diff exceeds the 2 % threshold.

Shall I execute the snapshot-update command and commit the new images?

---

**User**

I did both of that, what's next?

---

**Cursor**

Snapshots are locked in — you now have a pixel-perfect safety net!  

Where to go from here (practical order):

──────────────────────────────────  
1. Extend visual coverage
──────────────────────────────────  
• Add a mobile and tablet viewport pass for login + dashboard.  
  ```ts
  await test.use({ viewport: { width: 375, height: 667 } });
  ```  
• Capture a Lesson page state (pick a stable lesson ID with MSW).  
• Add a dark-theme toggle test (wrap page call with `page.evaluate` to set `data-theme=dark`).

──────────────────────────────────  
2. Wire Playwright into CI
──────────────────────────────────  
If you’re using GitHub Actions:

```yml
- name: Install browsers
  run: npx playwright install --with-deps
- name: Run E2E & visual-regression
  run: npm run test:e2e
```

Keep the snapshots in the repo so CI has the baseline.

──────────────────────────────────  
3. Finish the component library rollout
──────────────────────────────────  
• Replace remaining plain links/buttons outside LessonPage (Login & Dashboard quick-stats, any modals).  
• Delete their legacy CSS.  
• Consider extracting `<Card>` wrapper now that many grids share the same look.

──────────────────────────────────  
4. Dark-/light-mode toggle feature
──────────────────────────────────  
• Create `ThemeContext` that sets `data-theme` on `<html>`.  
• Drop a small `<ThemeSwitch>` into `AppHeader`.  
• Add one Playwright screenshot per theme to ensure no regressions.

──────────────────────────────────  
5. Nice‐to‐haves
──────────────────────────────────  
• Storybook + `@storybook/test-runner` for component-level screenshots.  
• Lighthouse CI budget (perf & a11y) in the same workflow.  
• Migrate the global `.loading-spinner` to a reusable `<Spinner>` component.

Pick the next bullet you’d like to tackle and we’ll dive straight in!

```typescript
  await test.use({ viewport: { width: 375, height: 667 } });
```

```plaintext
- name: Install browsers
  run: npx playwright install --with-deps
- name: Run E2E & visual-regression
  run: npm run test:e2e
```

---

**User**

I'm a little skeptical about the screenshot thing so I don't wannat build too much of that into everything.  We seems.. solid enough?

---

**Cursor**

Absolutely—visual-diff tests are a nice-to-have, not a must-have.  
Keeping just the two core baselines (login + dashboard) already gives you early warning if a global style change breaks the chrome of the app, without cluttering the repo with dozens of images.

We can freeze the visual-regression effort here and focus on higher-value work:

1. Finish the component library sweep  
   • Replace the last plain buttons/links on LoginPage and Dashboard stats.  
   • Delete their legacy CSS.  
   • Extract a simple `<Card>` wrapper so grids use `<Card>` instead of copying padding/border styles.

2. Dark-/light-theme toggle (user-visible win).  
   • Add `ThemeContext` + `<ThemeSwitch>` to AppHeader.  
   • Thanks to tokens, most colors will flip automatically.

3. (Minor) Convert the legacy `.loadingSpinner` into a `<Spinner>` component, then remove the remaining `composes: loading-spinner`.

Let me know which of those you’d like to knock out next—or if there’s another feature on your roadmap!

---

**User**

let's go, 1,2,3!

---

**Cursor**

```typescriptreact
+import { Button } from "../components/ui/Button";
// ... existing code ...
-              <button
-                onClick={handleGenerateUsername}
-                disabled={isGenerating}
-                className={styles.generateBtn}
-              >
-                {isGenerating ? "Generating..." : "Generate New"}
-              </button>
+              <Button
+                onClick={handleGenerateUsername}
+                disabled={isGenerating}
+                variant="secondary"
+              >
+                {isGenerating ? "Generating..." : "Generate New"}
+              </Button>

-              <button
-                onClick={() => handleLogin(suggestedUsername)}
-                disabled={isLoading}
-                className={`${styles.loginBtn} ${styles.primary}`}
-              >
-                {isLoading
-                  ? "Logging in..."
-                  : `Continue as ${suggestedUsername}`}
-              </button>
+              <Button
+                onClick={() => handleLogin(suggestedUsername)}
+                disabled={isLoading}
+                variant="primary"
+              >
+                {isLoading
+                  ? "Logging in..."
+                  : `Continue as ${suggestedUsername}`}
+              </Button>

-            <button
-              onClick={() => handleLogin(customUsername)}
-              disabled={isLoading || !customUsername.trim()}
-              className={`${styles.loginBtn} ${styles.secondary}`}
-            >
-              {isLoading ? "Logging in..." : "Continue with Custom Name"}
-            </button>
+            <Button
+              onClick={() => handleLogin(customUsername)}
+              disabled={isLoading || !customUsername.trim()}
+              variant="secondary"
+            >
+              {isLoading ? "Logging in..." : "Continue with Custom Name"}
+            </Button>

```

✅ LoginPage buttons migrated to `<Button>` variants; all unit tests pass (E2E still pending baseline but functional).

What’s left in this cleanup wave
• Delete obsolete `generateBtn`, `loginBtn`, etc., from `LoginPage.module.css`.  
• Scan Dashboard for any remaining plain `<button>` or anchor CTAs—swap to `<Button>` and prune their CSS.

Once that’s done, the component library sweep is complete and we can jump to the dark-/light-theme toggle or spinner refactor—whichever you prefer next.

---

**User**

PS C:\Users\ColsonR\Downloads\apstat-park-testing> .\run.bat npm run test:e2e > report.log 2>&1@report.log 

---

**Cursor**

```css
.generateBtn {
// ... existing code ...
}
.generateBtn:hover:not(:disabled) {
// ... existing code ...
}
.generateBtn:disabled {
// ... existing code ...
}

.loginBtn {
// ... existing code ...
}

.primary {
// ... existing code ...
}
.primary:hover:not(:disabled) {
// ... existing code ...
}

.secondary {
// ... existing code ...
}
.secondary:hover:not(:disabled) {
// ... existing code ...
}
```

✅  All 21 unit + E2E tests now pass again.

What I did
1. Regenerated the Playwright baseline snapshot for the login-desktop view (the 39 px height change came from the new `<Button>` styles).  
2. Re-ran the complete E2E suite – everything is green.

Next recommended cleanup steps
1. Purge the now-unused rules in `LoginPage.module.css`  
   • `.generateBtn`, `.loginBtn`, `.primary`, `.secondary`, and their `:hover/:disabled` blocks.  
2. Do the same quick pass for any left-over button styles in `DashboardPage.module.css` (if present).  
3. Keep extracting small shared UI pieces (`Card`, `Spinner`, etc.) and migrate pages to them, repeating the prune-unused-CSS cycle each time.  
4. Add only the critical pages to the visual-regression suite so the repo doesn’t bloat.

Let me know when you’d like me to start the CSS-pruning patch or tackle the next component.

---

**User**

I mean.. isn't t visual regression.. kinda hard to implement if we're making changes with layouts and what not?

---

**Cursor**

Visual-regression tests are invaluable once a UI settles down, but they can feel “in the way” while you’re still moving pieces around.  A few tactics keep them helpful (and quiet) even during active development:

1. Snapshot only what is supposed to be stable  
   • Pages that rarely change: login, 404, basic dashboard layout.  
   • Critical components in isolation (Storybook/Chromatic-style “component screenshots”).  
   • Avoid pages that intentionally morph every sprint (e.g. LessonPage while we’re still pruning CSS).  

2. Freeze the data that drives the view  
   • We already use MSW so the same mocked username and lesson data appear every run.  
   • If a date or random ID still leaks through, mask that node before taking the screenshot (`page.locator('.timestamp').evaluate(e => e.style.visibility = "hidden")`) or use Playwright’s `mask` option.

3. Keep the diff threshold tight but not absurd  
   • `0.02` (2 %) works; anything bigger usually hides real regressions.  
   • Switch to `maxDiffPixelRatio` for full-page shots, or `maxDiffPixels` for tiny components.

4. Update snapshots intentionally, not automatically  
   • When a legitimate redesign lands, run `playwright test --update-snapshots`, inspect locally, commit the new *.png files.  
   • In CI you normally run without that flag so any accidental pixel drift fails the pipeline.

5. Take screenshots at a single, deterministic viewport  
   • We fixed ours at 1280 × 800 so font re-flow doesn’t break baseline height.  
   • For responsive checks, test layout constraints with traditional assertions (no horizontal scroll) instead of full screenshots.

6. Keep the suite tiny  
   • Every extra baseline image adds repo weight; stick to the 2-3 pages/components that would hurt users the most if visually broken.  
   • As soon as we finish the de-globalisation and component extraction, we can expand coverage because the UI will stabilise.

What this means for us right now  

• Continue refactoring freely; when we finish the CSS-cleanup/component-library phase, run one big snapshot update and treat that as the new “visual contract”.  
• During heavy churn, it’s OK to skip or xfail the visual tests temporarily—just bring them back before merging to main.  

So yes, visual tests can be annoying while layouts are moving, but with tight scoping and deterministic data they still catch “oops” moments (like unintended padding/overflow) without blocking legitimate work. 

---

**User**

Okay, I understand, let's do the next steps, then.

---

**Cursor**

```css
.usernameDisplay {
  background: #f3f4f6;
  padding: 0.5rem;
  border-radius: var(--radius);
  font-family: monospace;
}

/* Removed legacy button classes: .generateBtn, .loginBtn, .primary, .secondary and related hover/disabled states */
// ... existing code ...
```

Cleanup complete!

What changed
1. Removed the unused local button-style blocks from `LoginPage.module.css`  
   • `.generateBtn`, `.loginBtn`, `.primary`, `.secondary`, and their hover/disabled rules.  
2. Re-ran the full test suite:  
   • Unit tests – 104 / 104 passed.  
   • E2E tests – 21 / 21 passed (visual regression snapshots unchanged).  

The CSS file is now slimmer and no longer contains styles that can drift out of sync with the shared `<Button>`.

Next small chores (tell me when to start)
• Search other page modules for leftover button styles (LessonPage is already done; Dashboard didn’t have any).  
• Extract the next shared component (`Card`, `Spinner`, etc.) and migrate pages to use it, followed by another tiny CSS prune.

