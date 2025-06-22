Excellent. That's the perfect, professional way to handle this. Creating a dedicated `bugfix/github_ci` branch isolates these environment and configuration fixes from your feature development.

The symptoms you're describing—failing GitHub CI, Vercel, and Railway deployments—almost always point to the same root cause: a discrepancy between your local development environment and the clean, automated environments used by these services.

Let's create a clear, systematic plan to diagnose and fix this. We'll approach it like a detective, starting with the most likely culprits.

---

## Plan for `bugfix/github_ci`

Our goal is to make your project build and test successfully in any standard Node.js environment, which will resolve the issues on all three platforms (GitHub, Vercel, Railway).

### **Phase B1: Analyze the CI Logs (The Evidence)**

The logs are everything. They contain the exact error messages that are causing the failures.

**Action:**

1.  Go to the "Actions" tab in your GitHub repository.
2.  Find the latest failed run on your `bugfix/github_ci` branch.
3.  Click into the failed job (usually named `build`, `test`, or `ci`).
4.  Scroll through the log output and find the **first red error message**. Often, a single initial error causes a cascade of other failures.

**Please paste the core error message here.** It will likely be one of the following:
*   `Error: Cannot find module '...'` (A dependency or file path issue)
*   `npm ERR! Could not resolve dependency:` (An `npm install` failure)
*   A type error from `tsc` (TypeScript compiler)
*   A test failure from `vitest` that only occurs in a non-interactive environment.

The error log will dictate our next steps.

---

### **Phase B2: Common CI/Deployment Fixes (The Usual Suspects)**

Based on the changes we've made (adding Vitest, Playwright, new packages), here are the most likely problems and their solutions. We can implement these proactively while waiting for the log analysis.

**Suspect #1: Missing `devDependencies` during build.**

*   **Problem:** By default, many platforms (like Vercel/Railway) run `npm install --omit=dev`, which skips `devDependencies`. However, your build process (`tsc`, `vite build`) or testing process (`vitest`) might require packages like `typescript`, `vitest`, or `vite` which are in `devDependencies`.
*   **Solution:** We need to ensure all necessary build/test tools are installed. There are two common ways to fix this:
    1.  **Move packages:** Move essential build tools from `devDependencies` to `dependencies` in the relevant `package.json` files.
    2.  **Force install:** Configure the platform to install dev dependencies. In Vercel, you can set an environment variable `VERCEL_FORCE_INSTALL_DEV=1`. In Railway, you can modify the `nixpacks.toml` or build command. **Let's hold off on this until we see the logs.**

**Suspect #2: Playwright installation in a headless environment.**

*   **Problem:** Playwright needs to download browsers when it's installed (`npx playwright install`). CI environments often don't do this automatically, leading to errors when E2E tests try to run.
*   **Solution:** We need to add a dedicated step in our CI script to install Playwright's browsers.

**Action:** In your root `package.json`, let's add a "post-install" script. This special script automatically runs after `npm install` completes.

```json
// In the root package.json, inside the "scripts" object
"scripts": {
  // ... your existing scripts
  "postinstall": "npx playwright install --with-deps"
},
```
This tells any environment that runs `npm install` to also run the Playwright setup command right after, ensuring the browsers are available for the E2E tests.

**Suspect #3: Inconsistent TypeScript or Node.js versions.**

*   **Problem:** Your local machine might be using Node.js v18, while the CI environment defaults to v20. This can cause subtle issues.
*   **Solution:** We should explicitly define the Node.js version for our project.

**Action:** In your root `package.json`, add an `engines` block.

```json
// In the root package.json (at the top level, not inside "scripts")
"engines": {
  "node": ">=18.0.0"
},
```
This tells platforms like Vercel and Railway which Node.js version your project is designed for, ensuring consistency.

---

### **Your Immediate Next Steps**

1.  **Branch:** Make sure you are on the `bugfix/github_ci` branch.
2.  **Modify `package.json`:**
    *   Add the `"postinstall": "npx playwright install --with-deps"` script.
    *   Add the `"engines": { "node": ">=18.0.0" }` block.
3.  **Commit and Push:** Commit these changes to your branch.
    ```bash
    git add package.json
    git commit -m "fix(ci): Add postinstall script for Playwright and specify node engine"
    git push
    ```
4.  **Analyze Logs:** While the new CI run is kicking off, go find the error logs from the *previous* failed run.

**Please share the error log.** It is the most critical piece of information. The proactive fixes we just made solve many common issues, but the log will tell us the exact problem if it's something else.