# Test suite implementation plan overview
_Exported on 6/21/2025 at 19:13:12 EDT from Cursor (1.1.3)_

---

**User**

Test Suite Implementation Plan
Overall Goal:
To create an automated, multi-layered test suite that verifies the "APStatChain" application complies with our architectural blueprint. This involves writing unit tests for core logic, integration tests for package interactions, and end-to-end tests for user flows.
Phase T1: Setting Up the Testing Foundation
Goal: To install and configure the necessary testing frameworks and tools within the monorepo. This provides the infrastructure for all subsequent testing phases.
Key Actions:
Choose and Install a Test Runner: We need a modern test runner that works well with monorepos and TypeScript/ESM. Vitest is the ideal choice.
From the project root, run npm install -D vitest.
Configure Vitest: Create a vitest.config.ts file in the project root. Configure it to find test files across all workspaces (e.g., in packages/*/src/**/*.test.ts and apps/web/src/**/*.test.tsx).
Add Test Scripts: In the root package.json, add scripts to make running tests easy:
"test": "vitest"
"test:watch": "vitest --watch"
"test:ui": "vitest --ui" (for Vitest's excellent visual interface)
Install E2E Testing Framework: We need a tool to control a real browser. Playwright is a powerful choice.
From the project root, run npm init playwright@latest. This will install Playwright and create its configuration file (playwright.config.ts) and a sample tests directory at the root.
Expected Outcome: You can run npm test from the root of your project, and the test runner will execute (finding no tests yet, but running without errors). The project is now fully equipped for all types of testing.

---

**Cursor**

```json
"scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
-    "test": "npm run test --workspaces --if-present",
-    "test:watch": "npm run test:watch --workspaces --if-present",
+    "test": "vitest run",
+    "test:watch": "vitest --watch",
+    "test:ui": "vitest --ui",
    "test:e2e": "npm run test:e2e --workspace=apps/web --if-present",
    "test:e2e:ui": "npm run test:e2e:ui --workspace=apps/web --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "lint:fix": "npm run lint:fix --workspaces --if-present",
    "format": "prettier \"**/*.{ts,tsx,js,jsx,css,md,json}\" --write",
    "clean": "rm -rf node_modules apps/*/node_modules apps/*/dist"
  },
  // ... existing code ...
  "devDependencies": {
    "@playwright/test": "^1.53.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0",
+    "vitest": "^1.4.0"
  }
```

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/src/**/*.test.{ts,tsx}',
      'apps/*/src/**/*.test.{ts,tsx}'
    ],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html']
    }
  }
});
```

---

**User**

@report.log 

---

**Cursor**

Here are the first 250 lines of `report.log` (the file is ~1 300 lines long; let me know if you’d like me to display the rest):

```1:250:report.log
  RUN  v3.2.4 C:/Users/rober/OneDrive/Documents/GitHub/apstat-park-testing

 › apps/web/src/utils/auth.test.ts (14 tests | 4 failed) 69 ms
   ✓ Auth Utilities › generateFallbackUsername › should generate username with correct format 2 ms
   ✓ Auth Utilities › generateFallbackUsername › should generate different usernames on multiple calls 0 ms
   ✓ Auth Utilities › isValidUsername › should accept valid usernames 0 ms
   ✓ Auth Utilities › isValidUsername › should reject invalid usernames 0 ms
   ✓ Auth Utilities › parseStoredUser › should parse valid user data 1 ms
   ✓ Auth Utilities › parseStoredUser › should return null for invalid JSON 0 ms
   ✓ Auth Utilities › parseStoredUser › should return null for invalid user objects 0 ms
   ✓ Auth Utilities › createOfflineUser › should create user with correct structure 1 ms
   ✓ Auth Utilities › createOfflineUser › should create different IDs for different users 0 ms
   ✗ Auth Utilities › generateUsernameFromAPI › should generate username via API successfully 35 ms
     └─ fetch failed
   ✓ Auth Utilities › generateUsernameFromAPI › should throw error when API fails 0 ms
   ✗ Auth Utilities › createUserViaAPI › should create user via API successfully 8 ms
     └─ fetch failed
   ✗ Auth Utilities › createUserViaAPI › should handle different usernames correctly 10 ms
     └─ fetch failed
   ✗ Auth Utilities › createUserViaAPI › should return valid date strings 8 ms
     └─ fetch failed

 › apps/web/src/context/AuthContext.test.tsx (4 tests | 4 failed) 13 ms
   ✗ AuthContext › initializes with user: null and unauthenticated state 8 ms
     └─ document is not defined
   ✗ AuthContext › handles login flow correctly 1 ms
     └─ document is not defined
   ✗ AuthContext › handles logout flow correctly 1 ms
     └─ document is not defined
   ✗ AuthContext › loads existing user from localStorage on mount 1 ms
     └─ window is not defined

TAP version 13
# Subtest: Validation Module
    # Subtest: isTransactionValid
        # Subtest: should return true for a valid transaction
        not ok 1 - should return true for a valid transaction
          ---
          error: "Cannot read properties of undefined (reading 'publicKey')"
...
```

Key take-aways so far:

• Web-layer unit tests are failing because they expect a browser‐like environment (e.g. `document`, `window`, fetch).  
  – Fix: configure Vitest to use `environment: "jsdom"` for those tests or mock the required globals.

• Several API-fetch tests fail with “fetch failed”; if they rely on MSW, ensure the server is started in test setup.

• Chain-core tests fail in `validation.test.ts` due to undefined data inside `createMockTransaction`.

Let me know if you want the remaining log lines or help configuring the test environment to make these tests pass.

```log
  RUN  v3.2.4 C:/Users/rober/OneDrive/Documents/GitHub/apstat-park-testing

 › apps/web/src/utils/auth.test.ts (14 tests | 4 failed) 69 ms
   ✓ Auth Utilities › generateFallbackUsername › should generate username with correct format 2 ms
   ✓ Auth Utilities › generateFallbackUsername › should generate different usernames on multiple calls 0 ms
   ✓ Auth Utilities › isValidUsername › should accept valid usernames 0 ms
   ✓ Auth Utilities › isValidUsername › should reject invalid usernames 0 ms
   ✓ Auth Utilities › parseStoredUser › should parse valid user data 1 ms
   ✓ Auth Utilities › parseStoredUser › should return null for invalid JSON 0 ms
   ✓ Auth Utilities › parseStoredUser › should return null for invalid user objects 0 ms
   ✓ Auth Utilities › createOfflineUser › should create user with correct structure 1 ms
   ✓ Auth Utilities › createOfflineUser › should create different IDs for different users 0 ms
   ✗ Auth Utilities › generateUsernameFromAPI › should generate username via API successfully 35 ms
     └─ fetch failed
   ✓ Auth Utilities › generateUsernameFromAPI › should throw error when API fails 0 ms
   ✗ Auth Utilities › createUserViaAPI › should create user via API successfully 8 ms
     └─ fetch failed
   ✗ Auth Utilities › createUserViaAPI › should handle different usernames correctly 10 ms
     └─ fetch failed
   ✗ Auth Utilities › createUserViaAPI › should return valid date strings 8 ms
     └─ fetch failed

 › apps/web/src/context/AuthContext.test.tsx (4 tests | 4 failed) 13 ms
   ✗ AuthContext › initializes with user: null and unauthenticated state 8 ms
     └─ document is not defined
   ✗ AuthContext › handles login flow correctly 1 ms
     └─ document is not defined
   ✗ AuthContext › handles logout flow correctly 1 ms
     └─ document is not defined
   ✗ AuthContext › loads existing user from localStorage on mount 1 ms
     └─ window is not defined

TAP version 13
# Subtest: Validation Module
    # Subtest: isTransactionValid
        # Subtest: should return true for a valid transaction
        not ok 1 - should return true for a valid transaction
          ---
          error: "Cannot read properties of undefined (reading 'publicKey')"
...
```

