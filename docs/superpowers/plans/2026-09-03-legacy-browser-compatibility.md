# Legacy Browser Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live HR portal work on older desktop browsers that currently fail with `Iterator is not defined`, while preserving the current modern-browser experience.

**Architecture:** Keep Vite’s modern output for current browsers and add Vite’s legacy plugin to emit a compatibility bundle selected by feature detection. Configure the TypeScript compiler to understand the supported baseline and let the legacy plugin inject only the polyfills required by that browser target.

**Tech Stack:** Vite, React, TypeScript, `@vitejs/plugin-legacy`, Browserslist, Vercel.

## Global Constraints

- Modern browsers must continue receiving the modern bundle.
- Legacy support targets Chrome 60+, Edge 79+, Firefox 60+, and Safari 12+.
- Do not add application-level `Iterator` shims unless a reproduced browser error proves one is required.
- Keep the existing API routes, authentication flow, and referral gate unchanged.
- Verify both modern and legacy output before production deployment.

---

### Task 1: Add the compatibility build dependency

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/package-lock.json`

- [ ] Add `@vitejs/plugin-legacy` as a development dependency using the version compatible with the project’s Vite 8 toolchain.
- [ ] Run `npm install --prefix apps/web` and confirm the lockfile changes only add the compatibility plugin and its required transitive packages.

### Task 2: Configure dual modern/legacy output

**Files:**
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/tsconfig.app.json`

- [ ] Import `legacy` from `@vitejs/plugin-legacy` and add it after the React plugin.
- [ ] Configure `targets` for Chrome 60+, Edge 79+, Firefox 60+, and Safari 12+.
- [ ] Enable polyfill injection for legacy browsers while leaving the modern bundle untouched.
- [ ] Change the TypeScript `target` and `lib` from ES2023 to ES2017 so the source-level browser baseline matches the compatibility target without changing module bundling.
- [ ] Keep `module: esnext`, the existing path alias, and the local API proxy unchanged.

### Task 3: Verify generated bundles and runtime fallback

**Files:**
- Create: `apps/web/scripts/check-legacy-build.mjs`

- [ ] Build the web app with `npm run build --prefix apps/web`.
- [ ] Make the script fail if `dist/index.html` lacks a legacy nomodule script and fail if the generated legacy assets are missing.
- [ ] Make the script report the modern and legacy asset counts and approximate compressed sizes using Node’s built-in `zlib`.
- [ ] Run the script after every build as the repeatable compatibility check.
- [ ] Test the deployed page in a current browser and in a browser matching the supported legacy floor; confirm login page rendering before authentication.

### Task 4: Deploy and monitor

**Files:**
- Modify: `apps/web/package.json`

- [ ] Add `check:legacy` and make the production build run the check after Vite completes.
- [ ] Run `npm run build --prefix apps/web` and `npm run check:legacy --prefix apps/web` with exit code 0.
- [ ] Deploy the web app to the existing production Vercel project.
- [ ] Verify the production URL returns HTTP 200 and load the login route in both browser classes.
- [ ] Record the final modern/legacy compressed size delta and the deployment URL.

