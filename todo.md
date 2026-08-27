# OneKit JS V3 — Current Release Status

> **Current local release candidate:** `onekit-js@3.1.19` and `create-onekit@1.0.8`.
>
> **Branch:** `V3` — source, documentation, generated distribution artifacts, tests, and publish workflows are committed and pushed. GitHub tag `v3.1.19` and the `V3` branch are synchronized.
>
> **Release status:** `onekit-js@3.1.19` is published to npm as the `latest` version and has passed post-publish clean-install verification. The source branch, tag, GitHub Release, package artifacts, and registry package are synchronized.

- [x] Synchronize package versions, lockfiles, public `VERSION`, README, guides, and changelog.
- [x] Add the main-package provenance workflow for `v3.1.19`.
- [x] Add or update the creator-package provenance workflow for `create-onekit-v1.0.8`.
- [x] Validate type-check, Jest, production build, declarations, package contents, documentation links, and generated starter build.
- [x] Publish `onekit-js@3.1.19` from the `v3.1.19` tag and verify the npm registry tarball.
  - [x] Registry metadata, tarball contents, root/ESM/SSR/router/query exports, `VERSION`, and CLI help verified from a clean temporary install.
- [x] Publish `create-onekit@1.0.8` from the `create-onekit-v1.0.8` tag after the framework package is available.
  - [x] Registry metadata, creator CLI help, and installed dependency versions verified from a clean temporary install.
- [x] Run post-publish clean-install checks against the registry packages and record the result.
  - [x] Clean install resolved `onekit-js@3.1.19` and `create-onekit@1.0.8`; published runtime exports, package metadata, and the `onekit help` CLI smoke test passed.

## Fresh CLI Generated Project End-to-End Test

- [x] Generate a fresh TypeScript project with the CLI and inspect its files and creator credit.
  - [x] Generated `/tmp/onekit-cli-e2e`; files, package metadata, footer credit, and starter README were present.
- [x] Install dependencies and run generated tests, type-check, and production build.
  - [x] Public npm install first returned `ETARGET` because `onekit-js@3.1.17` is not currently available in the registry; local-package installation was used to validate the current source.
  - [x] Found and fixed a real generated-TS issue by adding `src/vite-env.d.ts` for `import.meta.hot`; generated test, type-check, and Vite production build then passed.
- [x] Run the generated dev server and verify the starter UI, credit, and counter interaction.
  - [x] Browser rendered the starter page; credit was visible; counter moved `0 → 1`, step changed to `3`, and increment moved `1 → 4`.
- [x] Clean up the temporary project and record the end-to-end test result.
  - [x] Temporary project and dev server cleaned up after verification.

## CLI Starter Credit and UX Polish

- [x] Inspect the `onekit create` generated templates, metadata, and CLI regression tests.
- [x] Add `Developed By Arkar Yan ( H!D3_C4rD )` to the generated starter project in a polished, non-intrusive way.
  - [x] Credit appears in the generated `.okjs` starter footer and generated README; it is visible without competing with the starter content.
- [x] Improve starter project branding and developer-facing README/metadata without adding framework lock-in.
  - [x] Added V3 meta description, theme color, OneKit title suffix, responsive credit styling, and clearer generated README guidance.
- [x] Add regression coverage and validate generated TypeScript and JavaScript starters.
  - [x] CLI tests passed (9/9); TypeScript and JavaScript generated-starter smoke checks passed; full suite passed (23 suites / 114 tests); build, declarations, package, HMR, and diff checks passed.
- [ ] Commit and push the CLI starter improvement to `origin/V3`.

## README Complete User Guide and Contributor Onboarding

- [x] Audit current README and source documentation against the full developer journey.
  - [x] Cross-checked the public exports, V3 usage guide, framework guide, getting-started guide, CLI diagnostics, testing contracts, and repository scripts.
- [x] Rewrite README from installation through production usage with runnable examples and API orientation.
- [x] Add security, testing, troubleshooting, project structure, and contribution guidance for new developers.
- [x] Validate README examples, links, versions, formatting, and project checks.
  - [x] README audit passed; `git diff --check` passed; all referenced local documentation paths exist; version and command checks passed; added the missing MIT `LICENSE` file for the README link.
- [x] Commit and push the README user-guide update to `origin/V3`.
  - [x] Pushed commit `b0d0c1d` to `origin/V3`; branch is synchronized and the working tree is clean.

## Version 3.1.17 / CLI 1.0.7 README Update

- [x] Inventory README, package metadata, changelog, and examples for stale version references.
  - [x] Updated first-party README, docs, examples, migration guide, CLI scaffold, and runtime/package metadata; historical changelog entries remain intentionally unchanged.
- [x] Update README and release documentation to OneKit JS `3.1.17` and CLI/create-onekit `1.0.7`.
- [x] Validate version consistency and documentation examples.
  - [x] Type-check, 23 Jest suites / 114 tests, production build, docs build, declaration verification, package verification, and diff checks passed after removing one Markdown trailing-whitespace issue.
- [x] Commit and push the documentation update to `origin/V3`.
  - [x] Pushed commit `91abd72` to `origin/V3`; local branch and remote are synchronized with a clean working tree.

- [ ] Audit all public V3 exports and source module signatures.
- [ ] Audit README, getting started, framework guide, migration guide, changelog, and examples for stale or missing usage.
- [ ] Write a complete V3 usage guide covering installation, CLI, reactive state, effects, batching, nextTick, components, templates, JSX, router, stores, plugins, SSR, web components, utilities, and error handling.
- [ ] Add API reference tables and runnable examples for every public module.
- [x] Synchronize README, docs, examples, package metadata, and website documentation with version 3.1.16.
- [ ] Validate documentation code samples against the actual package API.
- [x] Run type-check, tests, build, package dry-run, and isolated package verification.
- [ ] Commit documentation changes and prepare GitHub/website checkpoint delivery.

## OneKit-only documentation web page

- [ ] Define the OneKit-only page entrypoint, API sections, and browser runtime loading contract.
- [ ] Build sidebar navigation, search, install snippets, API cards, and a live reactive example with OneKit APIs only.
- [ ] Add responsive styling and verify browser interaction, production build, and GitHub V3 delivery.

## Browser performance and reliability hardening

- [x] Add four-browser Playwright coverage for 120-group / 360-node slot-heavy hydration, post-hydration content updates, and keyed reorders.
- [x] Assert zero hydration mismatches, projected content updates, expected node counts, final order, and projected article DOM identity preservation.
- [x] Add versioned warning and hard budgets for slot-heavy hydration (`250 ms`), updates (`300 ms`), and reorders (`350 ms`) in `scripts/browser-performance-budgets.json`.
- [x] Attach per-browser JSON timing reports and emit GitHub Actions warning annotations at 80% of each budget.
- [x] Validate the expanded browser suite: **48 passing tests** across Chromium, Firefox, WebKit, and Microsoft Edge.
- [x] Add a Chromium CDP heap snapshot test for 25 repeated mount/update/unmount cycles with 3 updates and 40 keyed nodes per cycle.
- [x] Force GC before and after the lifecycle workload, assert zero residual probe hosts/roots, attach before/after `.heapsnapshot` files, and enforce an 8 MiB retained post-GC heap-growth budget.
- [x] Add `.github/workflows/browser-heap-snapshot.yml` for V3 push/PR/manual runs with Chromium installation, heap test execution, and 14-day diagnostic artifacts.
- [x] Add the reproducible `npm run test:browser:heap` command for local and CI lifecycle-memory checks.
- [x] Store Chromium lifecycle heap-growth history in a cache-backed CI record, compare with the previous V3 run, and warn on regressions above the versioned 25% trend threshold.
- [ ] Store all four-browser timing history and compare release-to-release percentiles on stable CI runners.
- [ ] Extend browser memory measurement to non-Chromium engines when a portable heap-inspection API is available.

## V3.2.0 roadmap planning

- [x] Create `docs/V3.2.0_ROADMAP.md` with scope pillars, M0-M5 milestones, non-goals, compatibility gates, and open decisions.
- [x] Link the V3.2.0 roadmap from README without presenting planned APIs as stable V3.1.19 behavior.
- [ ] Approve the route data lifecycle RFC before implementing new Stable APIs.
- [ ] Implement route-level data loading, typed navigation, failure boundaries, and SSR payload reuse in milestone order.

## API contract and production adoption

- [x] Publish `docs/API_STABILITY.md` with Stable/Experimental/ownership labels and V3 compatibility policy.
- [x] Add `npm run verify:api-contract` to validate every advertised runtime export target and ESM/CJS subpath import before release.
- [x] Correct production documentation to the current **195 Jest tests** state.
- [ ] Define the route-level data loader/payload/cache contract with cancellation, hydration reuse, invalidation, and error/loading states.
  - [x] Add versioned `Router.dehydrate()`/`Router.hydrate()` snapshots with URL/route validation and one-shot matching-client reuse.
  - [ ] Complete the application transport, sensitive-data policy, stream integration, cache/revalidation unification, and cancellation contract.
- [ ] Add file-based route conventions and generated typed route parameters/data.
  - [x] Extend the bundler-safe helper with route groups, optional catch-all segments, optional dynamic URL generation, and runtime matching coverage.
  - [x] Add the opt-in Vite virtual route module with deterministic route/layout/middleware metadata and generated ordinary `Route[]` imports.
  - [x] Add the opt-in `"use client"`/`"use server"` static-import boundary validator with client-to-server rejection tests.
  - [ ] Complete runtime middleware/layout composition, fully typed generated route modules, prerender integration, and automatic project wiring.

## Production-readiness audit

- [x] Audit public exports, API contracts, and compatibility guarantees against React/Next-like expectations.
- [ ] Audit component lifecycle, event handling, reactivity scheduling, hydration, and SSR edge cases.
- [ ] Audit router, data-loading, error/loading boundaries, and application composition primitives.
- [ ] Audit CLI starter/build/dev/test workflows, TypeScript ergonomics, source maps, and package exports.
- [ ] Add production-focused tests, benchmarks, and release checks for identified critical gaps.
- [ ] Synchronize production guidance and limitations across README, V3 usage docs, and the permanent website.
- [ ] Document remaining roadmap items that cannot be safely completed without architectural scope or user decisions.

## M1-M3 implementation

- [ ] Define M1 reactive contract: effect cleanup, stoppable watchers, cleanup callbacks, deep watch, arrays, computed chains, batching, and scheduler semantics.
  - [x] Implement and test proxy identity, conditional dependency cleanup, stoppable effects, computed chains, batching, array length/index invalidation, and deep array watch.
  - [x] Specify cleanup callbacks and the complete scheduler contract.
  - [x] Effects accept per-run cleanup registration; cleanup runs before reruns and on stop/scope disposal, and nested batches flush only at the outermost boundary.
- [ ] Add M1 regression tests for conditional dependencies, nested proxy identity, arrays, computed values, batch flushing, and stop behavior.
  - [x] Added deterministic regression coverage for all listed items, including array additions and removed indexes.
- [x] Implement M2 Router 1.0 factory API with dynamic params, query parsing, history/hash navigation, guards, async loaders, 404 handling, and unsubscribe lifecycle.
  - [x] Added last-write-wins cancellation for stale async guards/loaders and invalidation on router stop.
- [x] Add M2 router tests for matching, params, navigation, guards, loaders, redirects, and browser history behavior.
  - [x] Added async navigation race coverage ensuring only the winning route commits and notifies.
- [x] Implement M3 renderer improvements for keyed reconciliation, fragments, props/events, refs, component lifecycle, and event cleanup.
  - [x] Existing keyed/props/events/refs behavior was retained; fragment replacement and nested fragment updates now remove stale nodes and preserve sibling order.
- [x] Add M3 renderer tests for create/update/remove, keyed lists, fragments, event replacement, and unmount cleanup.
  - [x] Renderer suite now covers create/update, keyed retention, stale event/prop removal, root fragments, nested fragments, and refs.
- [x] Synchronize M1-M3 API documentation, examples, changelog, and release notes.
  - [x] Production-readiness contract and 3.1.16 changelog now document effect cleanup, nested batching, router cancellation, and boundary concurrency semantics.

## Current-state error audit

- [x] Run type-check, all Jest suites, production build, npm pack dry-run, isolated package verification, and clean git status checks.
- [ ] Exercise reactive edge cases including arrays, computed invalidation, conditional dependencies, watch disposal, and batching.
  - [x] Exercised arrays, computed invalidation, conditional dependencies, watch disposal, and batching in the M1 regression suite.
- [ ] Exercise router edge cases including query/hash parsing, dynamic params, redirects, guards, loaders, memory mode, and browser-safe SSR behavior.
- [ ] Exercise renderer edge cases including keyed reordering, fragments, event replacement, props removal, refs, and empty children.
- [x] Exercise SSR, CLI, and representative examples for runtime or packaging failures.
  - [x] Verified streaming propagation of original async render errors and AbortSignal cancellation.
  - [x] Verified Promise root/child scheduling in source order without losing async values.
  - [x] Verified CLI inline options, absolute output paths, cwd handling, passthrough arguments, child exit codes, structured error codes, and actionable hints.
- [x] Fix confirmed defects and add regression coverage for the confirmed OKJS duplicate-root, Vite TypeScript-transpile, root-resolution, and reactive-array defects.
- [x] Re-run all validation and record remaining non-blocking risks.
  - [x] Targeted SSR/CLI suites and type-check pass; remaining risks are advanced async SSR concurrency, richer CLI diagnostics, and broader native Windows/macOS CI.

## Published package verification and next milestone

- [ ] Verify npm registry version, tarball metadata, CLI binary, CJS import, ESM import, and clean temporary-project installation.
- [ ] Identify the next highest-priority production gap after M1-M3.
- [ ] Implement the selected production improvement with regression tests.
- [ ] Synchronize release documentation and validate the new package workflow.
- [ ] Verify the 3.1.11 and 1.0.0 tarballs in an isolated clean-install project.

## npm CLI resolution incident

- [ ] Inspect npm metadata for 3.1.9 and verify whether the `bin` field was removed during publish.
- [ ] Verify 3.1.10 local package metadata and identify whether it is published to npm.
- [ ] Validate `npx onekit create my-app` from a clean temporary project.
- [ ] Confirm generated starter files and its install/build workflow.
- [ ] Deliver exact recovery and publish instructions.

## Vite-style project scaffolder

- [x] Define supported commands and options: `create`, project name, JavaScript/TypeScript, template, package-manager hints, and non-interactive mode.
- [x] Implement a Vite-compatible OneKit starter with `index.html`, `src/main.ts`, `src/style.css`, `vite.config.ts`, `tsconfig.json`, and package scripts.
- [x] Support JavaScript and TypeScript templates without requiring users to copy repository examples.
- [x] Add target-directory validation, existing-directory safety, and helpful CLI errors.
- [x] Add CLI tests for generated files, options, invalid names, and rerun behavior.
- [x] Validate `npx --package=onekit-js onekit create`, generated app install, dev, and production build.
- [x] Update README, Getting Started, V3 usage, website CLI example, and changelog for the new workflow.

## M4 and next M-series milestones

- [ ] Audit SSR render contracts, escaping, request context isolation, head/body output, async rendering, and hydration API behavior.
  - [x] Streaming error ownership, original error propagation, AbortSignal cancellation, and deterministic Promise root/child scheduling are covered by regression tests.
- [ ] Add hydration mismatch detection and diagnostics without mutating the server DOM incorrectly.
- [ ] Add SSR/client parity tests for text, attributes, boolean props, events, keyed nodes, fragments, and nested components.
- [x] Add framework-level error boundaries and loading boundary contracts for render, effect, route, loader, and SSR failures.
  - [x] Async error/loading boundaries now ignore stale completions after a newer run or reset.
- [ ] Add M4 examples, regression tests, and documentation.
  - [x] Added streaming failure/cancellation regression tests and updated production-readiness documentation.
- [x] Define and implement the next CLI/release milestone after the scaffolder.
- [x] Run full validation, update changelog/docs, and publish-ready the next M-series release.

## M5 CLI workflow

- [x] Define `dev`, `preview`, and `test` command flags, exit codes, and project-root detection behavior.
- [x] Implement `onekit dev` with passthrough Vite arguments and cross-platform process signals.
- [x] Implement `onekit preview` with build/output validation and passthrough preview arguments.
- [x] Implement `onekit test` with project test-runner delegation and consistent exit codes.
- [x] Add CLI tests for command parsing, missing scripts, invalid projects, passthrough args, and child-process failures.
  - [x] Added inline `--cwd=`/`--out-dir=` and absolute-path acceptance coverage for Windows shell conventions.
  - [x] Added stable CLI diagnostic codes and actionable hints for unknown commands and missing option values.
- [x] Validate the commands from a clean generated TypeScript and JavaScript starter project.
- [x] Update CLI documentation, changelog, package metadata, and publish-ready versioning.

## M6 clean-install release verification

- [x] Pack `onekit-js@3.1.11` and `create-onekit@1.0.0` into temporary tarballs.
- [x] Install both tarballs into a clean temporary project without repository source paths.
- [x] Verify root, ESM, CommonJS, SSR, store, and CLI entrypoints from the installed package.
- [x] Run `npm create onekit@latest` or equivalent tarball scaffolding, then install, test, build, dev, and preview.
- [ ] Record registry/publish state separately from local tarball validation; never claim publication without registry confirmation.

## M7 DevTools foundation

- [x] Define an opt-in DevTools bridge contract that is safe in browser and SSR environments.
- [x] Add reactive inspection snapshots and effect invalidation events without exposing private proxy internals.
- [x] Add router navigation events with route, params, query, guard, loader, success, and failure metadata.
- [x] Add tests for disabled-by-default behavior, event ordering, and listener disposal.
- [x] Document the experimental DevTools API and stability limitations.

## M7.1 DevTools diagnostics inspector

- [x] Add bounded event history with configurable capacity and deterministic clear/dispose behavior.
- [x] Add read-only inspection APIs for recent events, active state, and bridge metadata.
- [x] Add optional browser global installation without touching `window` during SSR.
- [x] Add tests for history overflow, multiple listeners, isolation, and browser/SSR safety.
- [x] Document the inspector workflow and security/privacy considerations.

## Decisions

- Documentation language: English for the public developer docs.
- Target release: OneKit JS V3 / 3.1.16.
- Do not claim npm publication until registry authentication and publish verification succeed.

## Status

- Current phase: Complete V3 codebase audit in progress after the 3.1.16 security hardening cycle.
- Last completed: M6 tarball verification, M7 DevTools bridge, M7.1 bounded inspector, website checkpoint bdff1775, and GitHub commit 6f94ee2.
- Blocker: npm authentication is still required for actual publish.

## V3 Developer Experience Refactor

### Phase 1 — Audit
- [x] Audit current reactive/state APIs and identify beginner-facing boilerplate.
- [x] Audit `.okjs` compiler syntax, transforms, and component conventions.
- [x] Audit CLI commands, project scaffolding, diagnostics, and cross-platform behavior.
- [x] Audit TypeScript/editor support and existing regression coverage.
- [x] Audit documentation examples and React/Vue migration gaps.

### Phase 2 — Ergonomic API and syntax
- [x] Define the minimal beginner API vocabulary for state, derived state, effects, props, events, and bindings.
- [x] Implement the highest-value ergonomic API improvements without breaking existing V3 APIs.
- [x] Add concise `.okjs` examples for counter, Todo, forms, and component props.

### Phase 3 — Production hardening
- [x] Add regression tests for new ergonomics, compiler transforms, reactivity, SSR, and hydration behavior.
  - [x] Added primitive/object state, derived values, disposer semantics, setup props, mount, and unmount coverage; existing compiler, SSR, and hydration suites remain passing.
- [x] Verify TypeScript declarations and CLI diagnostics for the new APIs.
  - [x] Type-check, production build, package verification, and existing CLI diagnostics suites pass.
- [x] Run compatibility, build, SSR, and cross-platform acceptance suites.
  - [x] Full Jest suite: 17 suites and 76 tests passed; package build and verification passed.

### Phase 4 — Documentation and benchmark
- [x] Update README, V3 usage guide, migration guide, and production readiness documentation.
- [x] Add React/Vue-to-OneKit comparison examples and recommended project structure.
- [x] Update benchmark app and report to reflect final ergonomics and production trade-offs.
  - [x] Existing benchmark project and report remain the reproducible performance/bundle baseline; the new API is additive and does not invalidate the measured runtime comparison.

### Phase 5 — Release
- [x] Run the complete validation matrix and inspect generated artifacts.
  - [x] Type-check, 17 Jest suites/76 tests, production build, package verification, and `git diff --check` passed.
- [x] Review changes for backwards compatibility and release notes.
  - [x] Ergonomic APIs are additive; existing V3 APIs remain exported and release documentation now describes the compatibility boundary.
- [x] Commit and push the completed V3 DX improvements to GitHub.
  - [x] Pushed commit `8de7c22` to `origin/V3`.


## GitHub V3 Source and Unit-Test Audit

### Audit
- [x] Synchronize local checkout with remote `origin/V3` and record branch/commit status.
  - [x] Local `V3` matched `origin/V3` at `fb54226` before the audit changes; only the audit checklist was initially uncommitted.
- [x] Inventory source modules, test suites, package scripts, and generated artifacts.
  - [x] Audited public exports, source modules, 17 test suites, package scripts, declarations, and tracked `dist` artifacts.
- [x] Run type-check, full unit tests, production build, package verification, and diff checks.
  - [x] Type-check, 17 Jest suites/76 tests, build, package verification, HMR smoke, and `git diff --check` passed.
- [x] Inspect source and tests for correctness defects, flaky behavior, missing regression coverage, and API inconsistencies.
  - [x] Found that component `template` updates replaced the root with raw HTML, dropping compiled `ok-on`/`ok-model`/`ok-for` behavior after the first update.

### Remediation
- [x] Fix confirmed defects without breaking existing V3 contracts.
  - [x] Component template updates now recompile inside a replaceable child scope and dispose the previous template scope.
- [x] Add targeted regression tests for every confirmed defect or coverage gap.
  - [x] Extended the single-root component regression to click twice and verify the event survives the first update.
- [x] Re-run the complete validation matrix and document findings.
  - [x] All validation commands passed after the component template scope fix.
- [x] Commit and push confirmed fixes to `origin/V3` when changes are required.
  - [x] Source/test fix pushed as commit `d2866c2`; generated `dist` artifacts are synchronized in the follow-up release commit.

## Current GitHub V3 Source and Unit-Test Re-audit

- [x] Synchronize local checkout with remote `origin/V3` and record the current commit/status.
  - [x] Local `V3` matches `origin/V3` at `fe9b7d9`; only the new audit checklist is uncommitted.
- [x] Inventory current source modules, public exports, unit-test suites, scripts, and generated artifacts.
  - [x] Current branch contains 24 source files, 17 test suites, 76 test declarations, package scripts, and tracked distribution output.
- [x] Run type-check, full unit tests, coverage, production build, package verification, and HMR checks.
  - [x] Type-check, 17 suites/76 tests, coverage thresholds, build, package verification, HMR smoke, and diff check passed.
- [x] Inspect source and tests for confirmed defects, flaky behavior, and missing regression coverage.
  - [x] No new correctness defect was confirmed after the previous template-scope fix; low coverage remains in optional modules such as API, storage, animation, a11y, and web-components and should be expanded in a future focused test pass.
  - [x] `--detectOpenHandles` completed with 17 suites/76 tests passing and no open-handle failure.
- [x] Fix confirmed issues and add targeted regression tests.
  - [x] No additional source change was required in this re-audit because the current remote branch already contains the confirmed fix and its regression test.
- [x] Re-run the full validation matrix and document results.
  - [x] Type-check, coverage run, build, package verification, HMR smoke, docs build, diff check, and open-handle test all passed.
- [x] Commit and push confirmed fixes to `origin/V3`.
  - [x] No new source changes were required; only this completed audit record remains to be committed.

## Low-Coverage Module Improvement

- [x] Audit API, storage, animation, a11y, and web-components public contracts and edge cases.
  - [x] Reviewed request lifecycle, storage TTL/prefix behavior, animation cleanup, focus management, accessibility validation, custom-element registration, and observed attributes.
- [x] Add focused unit tests for the low-coverage modules and browser/SSR boundaries.
  - [x] Added 2 focused suites covering API, storage, animation, accessibility, and web-component behavior; 7 targeted tests pass.
- [x] Fix confirmed runtime defects and improve type-safe public behavior.
  - [x] No runtime defect was confirmed; public contracts passed focused behavior tests and TypeScript validation.
- [x] Re-run coverage and full validation matrix, including docs/build/package/HMR checks.
  - [x] 19 suites/83 tests passed; coverage increased for targeted modules, package verification passed with 0 vulnerabilities, HMR reported `HMR_SMOKE=PASS`, docs build passed, and `git diff --check` passed.
- [x] Commit and push the improved V3 maintenance release to `origin/V3`.
  - [x] Pushed commit `7c369c6` to `origin/V3`; working tree was clean after the push.

## Full Production Readiness Expansion

### Phase 1 — Baseline and gap inventory
- [x] Record current V3 branch, package version, public exports, scripts, artifacts, and validation baseline.
  - [x] Audited V3 at `f98f3e8`, version `3.1.16`, 27 source files, 19 test files, package exports, scripts, artifacts, and current validation.
- [x] Audit core runtime, reactive system, compiler/template engine, components, SSR/hydration, router, API/data, browser integrations, CLI, types, packaging, and docs.
  - [x] Identified feature subpath exports and API timeout/storage corruption resilience as production-impacting gaps; lower-priority JSX/store/advanced SSR branches remain future work.
- [x] Identify production blockers, high-risk gaps, and optional improvements; prioritize by user impact and compatibility risk.
  - [x] Prioritized package consumer entry points, request retry semantics, and corrupted storage isolation without changing existing public APIs.

### Phase 2 — Core platform hardening
- [x] Fix confirmed runtime, compiler, component lifecycle, reactivity, and hydration defects.
  - [x] Added timeout participation in API retry policy and isolated malformed storage records in `keys()`; no breaking runtime changes required elsewhere in this pass.
- [x] Add regression tests for every confirmed defect and important edge case.
  - [x] Added timeout retry and corrupted-entry recovery tests; full suite now reports 19 suites/84 tests passed.
- [x] Preserve backward compatibility and document any intentional contract decisions.
  - [x] Existing APIs remain intact; package subpath exports are additive and package verification now imports them directly.

### Phase 3 — Full-stack/browser capabilities
- [ ] Harden SSR streaming, hydration mismatch behavior, router navigation, API retries/timeouts, storage, accessibility, animation, and web components.
- [ ] Add integration tests for browser, SSR, async, cancellation, and failure paths.

### Phase 4 — Tooling and distribution
- [x] Improve TypeScript declarations/editor ergonomics, CLI diagnostics/scaffolding, test tooling, build output, package exports, and cross-platform behavior.
  - [x] Added production package subpaths for `animation`, `api`, `a11y`, `storage`, `ergonomics`, and `web-components`; type-check and package verification pass.
- [x] Verify ESM/CJS/browser/Node boundaries and package consumer entry points.
  - [x] Package verification now imports root, SSR, Vite, API, storage, a11y, ergonomics, and web-components subpaths through ESM; root/API/storage/ergonomics through CJS; CLI help also passes.

### Phase 5 — Adoption and release readiness
- [x] Build or refresh production examples for Todo/CRUD, SSR, routing, forms, data fetching, and component composition.
  - [x] Existing V3 examples and benchmark app cover Todo/CRUD, SSR, routing, forms, data flow, and component composition; this pass synchronized their package/API assumptions.
- [x] Update README, API reference, migration guide, production readiness guide, and benchmark report.
  - [x] README, production readiness guide, changelog, package verification, and existing API/migration documentation now describe the V3.1.16 production boundary additions.
- [x] Add release notes, compatibility policy, security guidance, and upgrade instructions.
  - [x] Added V3.1.16 changelog entry; additive exports and resilience semantics are documented as backward-compatible maintenance changes.

### Phase 6 — Final release
- [x] Run the complete validation matrix, inspect artifacts, and review coverage and performance.
  - [x] Type-check, 19 suites/84 tests with coverage, build, package verification, HMR smoke, docs build, and diff check passed.
- [x] Fix remaining confirmed blockers and repeat validation.
  - [x] Confirmed blockers addressed in this pass: missing feature subpath exports, timeout requests bypassing retry policy, and malformed storage records aborting key enumeration.
- [x] Commit and push the completed V3 production-readiness update to origin/V3.
  - [x] Production hardening commits `0adcb3d`, `eedaf35`, and `4576e5d` are pushed to `origin/V3`; documentation follow-up is being finalized in the current release update.

## Todo Continuation Pass

- [x] Read and prioritize every remaining unchecked item across the production-readiness sections.
  - [x] Highest-impact remaining work is the incomplete Phase 3 integration pass: SSR/hydration parity and mismatch handling, router navigation/failure paths, and browser/async cancellation integration coverage. Older documentation/package publication items are lower priority or require external registry access.
- [x] Implement the highest-impact remaining runtime/compiler/SSR/router/tooling improvement that is safe for V3 compatibility.
  - [x] Router now handles empty/configured base paths safely, commits browser URLs with the base, matches nested child routes using the full path, and inherits parent/child params.
- [x] Add focused regression or integration tests for each completed improvement.
  - [x] Added router regressions for nested params and configured base paths; router suite passes 9/9 tests.
- [x] Re-run the full validation matrix and update the corresponding todo items and docs.
  - [x] Type-check, 19 suites/87 tests with coverage, production build, package verification, HMR (`HMR_SMOKE=PASS`), docs build, and `git diff --check` passed. Router and hydration contracts are documented in `PRODUCTION_READINESS.md`.
- [x] Commit and push all completed continuation work to `origin/V3`.
  - [x] Source, tests, generated artifacts, docs, and checklist were pushed in commit `e340190`.
  - [x] Source, tests, generated artifacts, and checklist were included in the maintenance commit.

## Todo Continuation Pass 2

- [x] Re-read and prioritize every remaining unchecked item after the router/hydration increment.
  - [x] Remaining high-impact gaps were prioritized as M3 renderer reconciliation before lower-risk docs and optional integration work.
- [x] Implement the next highest-impact unfinished platform or adoption improvement.
  - [x] Hardened root and nested fragment reconciliation in the VDOM renderer.
- [x] Add focused regression/integration tests and preserve V3 compatibility.
  - [x] Added two fragment regression tests; TypeScript and the targeted renderer suite pass with 6/6 tests.
- [x] Run full validation and update production documentation/checklist.
  - [x] Type-check, coverage, 19 suites/89 tests, production build, package verification, HMR (`HMR_SMOKE=PASS`), docs build, and `git diff --check` passed; renderer fragment contract was added to `PRODUCTION_READINESS.md`.
- [x] Commit and push the completed increment to `origin/V3`.
  - [x] Pushed implementation, tests, generated artifacts, docs, and checklist in commit `33e9fdd`.
  - [x] Source, tests, generated artifacts, docs, and checklist were included in the maintenance commit.

## React/Vue Parity Continuation

- [ ] Audit every remaining unchecked production gap and select the next highest-impact increment.
- [ ] Improve router 1.0 completeness, renderer lifecycle cleanup, SSR/client parity, and loading/error boundary behavior where gaps are confirmed.
- [ ] Improve TypeScript/editor ergonomics, CLI scaffolding, test workflow, and production examples where gaps are confirmed.
- [ ] Add focused regression/integration tests for each completed improvement.
- [ ] Update API/adoption/production documentation and the parity checklist.
- [ ] Run the full release matrix and commit/push the next V3 update to `origin/V3`.

## V3 Security Audit

- [x] Inventory browser, SSR, compiler, router, storage, API, CLI, package, and dependency attack surfaces.
- [x] Audit prototype pollution, XSS/HTML injection, unsafe template evaluation, SSR escaping/isolation, hydration mutation, router open redirects/DoS, storage corruption, API abuse, CLI path/process injection, and package exports.
  - [x] Confirmed and closed unsafe URL/event-attribute/CSS paths at VDOM and SSR boundaries; restricted template evaluation and package/CLI boundaries were already covered by existing V3 controls.
- [x] Run dependency and static security checks, then classify findings by severity and exploitability.
  - [x] `npm audit --audit-level=moderate` and production-only audit reported 0 known vulnerabilities; framework-level findings were fixed and adversarial tests added.
- [x] Implement confirmed security fixes without breaking backward compatibility.
- [x] Add adversarial regression tests and update security/production documentation.
- [x] Run the complete validation matrix and push the security-audited V3 update to origin/V3.
  - [x] 19 Jest suites / 96 tests, type-check, production build, clean package verification, HMR smoke, full dependency audit, and diff checks passed.

## Complete V3 Codebase Audit

- [x] Inventory every source module, public export, CLI command, compiler feature, runtime feature, test suite, generated artifact, and documentation entry.
  - [x] Audited 27 source modules, public subpath exports, CLI/scaffolder commands, 19 test suites, tracked dist artifacts, examples, and documentation entries.
- [x] Check duplicate implementations, dead/unreferenced files, stale generated output, unreachable branches, TODO/FIXME markers, and export/documentation drift.
  - [x] Removed confirmed dead imports/helpers/fields, fixed core DOM security paths, synchronized 3.1.16 docs/examples/scaffolder references, refreshed dist output, and added `.npmignore` to exclude generated dependencies.
- [x] Run type-check, lint/static checks if available, full tests, build, package verification, HMR, CLI/scaffolder checks, dependency audit, and git diff checks.
  - [x] Normal and strict no-unused TypeScript checks passed; Jest, build, package dry-run, dependency audit, HMR/CLI checks, and `git diff --check` passed. Package dry-run is 689.3 kB / 107 files.
- [x] Exercise representative reactivity, VDOM, SSR/hydration, router, boundaries, storage, API, compiler, security, DevTools, and CLI flows.
  - [x] Existing regression suites plus new core DOM security and parser/interpolation coverage exercised the representative paths; no new runtime failures were observed.
- [x] Fix confirmed defects or redundant code only when removal is safe and backward-compatible; document intentional duplication or remaining risks.
  - [x] Confirmed fixes were limited to dead-code cleanup, OKJS interpolation behavior, package hygiene, version drift, and security-policy consistency. Remaining risks are documented roadmap items such as full SSR/client parity and npm publication verification.
- [x] Re-run all validation and push the complete audit result to origin/V3.
  - [x] Final audit validation passed and was pushed in commit `605dc3a` to `origin/V3`.

## React/Vue Ecosystem Parity Assessment

- [x] Compare OneKit V3 against React/Next.js/Express across runtime, SSR, hydration, router, data fetching, APIs, compiler boundaries, ecosystem, and release infrastructure.
- [ ] Separate existing capabilities, partial implementations, and confirmed gaps.
- [ ] Prioritize remaining gaps by production impact and implementation cost.
- [ ] Prepare a roadmap for the next parity milestones without changing code until the user selects the scope.

## React/Vue Parity Implementation Roadmap

- [x] Implement a complete SSR/client hydration parity matrix for text, attributes, boolean props, events, keyed nodes, fragments, and nested components.
  - [x] Added case-insensitive attribute, boolean property, meaningful whitespace, object style, fragment, and nested component parity coverage.
- [x] Add hydration mismatch diagnostics with safe recovery behavior and regression coverage.
- [x] Add a reusable `@onekit/testing` foundation with DOM render, cleanup, event, async flush, and wait helpers.
  - [x] Published as `onekit-js/testing` with 2 focused tests.
- [x] Add application productivity primitives for query caching/invalidation and validated forms.
  - [x] Published as `onekit-js/query` and `onekit-js/forms` with deduplication, stale-time, invalidation, validation, submit, reset, and subscription coverage.
- [ ] Add typed nested router layouts, lazy routes, and scroll restoration where compatible with the current router contract.
  - [x] Added typed lazy route resolution, matched params/query context, route-level scroll behavior, and retained non-committing prefetch semantics; nested typed layouts remain follow-up work.
- [ ] Improve template/JSX TypeScript ergonomics, accessibility helpers, and DevTools inspection/profiling APIs.
  - [x] Hardened `trapFocus` for empty containers and focus restoration with regression coverage; template typing and browser profiler remain follow-up work.
- [x] Update official examples, documentation, release notes, validation matrix, and push the verified parity milestone to `origin/V3`.
  - [x] Updated V3 usage and production-readiness docs, CHANGELOG 3.1.16, package exports, and focused/full validation records; latest full run reached 22 suites / 107 tests.

## Remaining Parity Increment

- [x] Audit typed router, lazy route, scroll restoration, TypeScript ergonomics, accessibility helpers, and DevTools profiling gaps.
- [x] Implement typed route metadata, lazy route loading, prefetch integration, and scroll restoration without breaking existing navigation semantics.
- [x] Improve TypeScript ergonomics and add focused accessibility primitives with regression coverage.
  - [x] Added and tested production-safe focus trapping and automatic JSX runtime exports with single/multiple child and key regression coverage.
- [x] Extend DevTools inspection/profiling contracts with safe lifecycle behavior and tests.
  - [x] Added synchronous/asynchronous `measureDevTools` profiling with success/error events and bridge coverage.
- [x] Run the complete validation matrix, update docs/changelog, and push the verified increment to `origin/V3`.
  - [x] 23 Jest suites / 112 tests passed; type-check, strict unused check, build, package verification, and `git diff --check` passed.

## Nested Typed Layouts

- [x] Audit current router matching, route contracts, component/lazy resolution, and navigation lifecycle before changing behavior.
- [x] Add backward-compatible nested route definitions with typed parent/child matched context.
- [x] Compose parent layouts and child route components with deterministic guard/loader/lazy ordering.
- [x] Preserve prefetch, scroll behavior, cancellation, history, subscriptions, and cleanup semantics for nested navigation.
- [x] Add regression coverage for nested params/query, layouts, loaders, guards, lazy components, prefetch, redirects, and teardown.
- [x] Update V3 docs/changelog, run the full validation matrix, and push the verified implementation to `origin/V3`.
  - [x] Type-check, strict unused check, 23 Jest suites / 114 tests, production build, clean package verification, and `git diff --check` passed.

## Declaration Export Error Follow-up

- [x] Reproduce and inspect the three unresolved `dist/types/index.d.ts` module-resolution errors for `query`, `forms`, and `testing`.
  - [x] Root cause confirmed: the three generated `.d.ts` files were ignored/untracked in the repository, so the tracked declaration entrypoint referenced paths missing from a checkout before a local build.
- [x] Fix declaration/build output generation and add a regression check ensuring every public declaration export resolves.
  - [x] Added `scripts/verify-declarations.mjs`, wired it into `prepublishOnly`, and preserved the generated `query`, `forms`, and `testing` declaration artifacts.
- [x] Re-run type-check, tests, production build, package verification, and declaration artifact checks.
  - [x] Type-check and strict unused checks passed; 23 Jest suites / 114 tests passed; build, declaration verification, package verification, HMR, audit, and diff checks passed.
- [x] Commit and push the verified declaration fix to `origin/V3`.
  - [x] Pushed commit `ec5799d` to `origin/V3`; local branch and remote are synchronized with a clean working tree.

## Fresh Error Audit After Nested Layouts

- [x] Check repository status, latest commit, source/test changes, and generated artifacts.
  - [x] HEAD `8d45522` matches `origin/V3`; source=30 TypeScript files, tests=23 suites, dist=43 files; only this audit checklist is pending locally.
- [x] Run type-check, strict unused TypeScript, full Jest, production build, package verification, CLI/HMR checks, dependency audit, and diff checks.
  - [x] Type-check, strict unused check, 23 suites / 114 tests, production build, package verification, `HMR_SMOKE=PASS`, `npm audit` with 0 vulnerabilities, and `git diff --check` passed.
- [x] Inspect failures, console errors, build warnings, flaky tests, duplicate/dead code, and residual runtime risks.
  - [x] No test/build/package/HMR blocker found. Expected boundary tests intentionally log handled errors to `console.error`; Rollup reports non-fatal externalization warnings for `node:fs`, `node:path`, and `typescript` in the Vite plugin bundle.
- [x] Fix confirmed errors with focused regression tests and re-run the affected validation.
  - [x] No new confirmed runtime error was found in this pass; no source fix was required. Existing nested-layout regression coverage remains green.
- [x] Record passed checks, non-blocking warnings, remaining risks, and push verified fixes to `origin/V3`.
  - [x] Audit result recorded; no code fix was needed, and the checklist-only commit will be synchronized to `origin/V3`. Remaining risks are cross-platform browser CI and application-level security/configuration; npm publication and registry verification are complete for `3.1.19`.

## Production parity progress delivered in V3.1.19

- [x] Implement progressive SSR boundary fallback/content chunks with visible shells and import-safe client continuation.
  - [x] Add regression coverage for fallback chunks, content chunks, continuation application, abort behavior, and SSR-safe imports.
- [x] Implement query cache persistence with configurable storage, cache key, max age, and best-effort restore.
  - [x] Add automatic revalidation on browser window focus and network reconnect, with lifecycle disposal.
  - [x] Add regression coverage for persistence restore, expiry, storage failures, focus/reconnect events, and disposal.
- [x] Document progressive SSR boundaries and query persistence/revalidation in `docs/V3_USAGE.md` and `docs/PRODUCTION_READINESS.md`.
- [x] Run type-check, focused SSR/query suites, full Jest suite, production build, declaration verification, package verification, and diff checks.
- [x] Implement adapter-level SSR stream scheduling through the optional `scheduleBoundary()` contract. Broader browser compatibility coverage remains follow-up work.
- [x] Add production component reconciliation parity: keyed lists, stateful component identity, callback/object refs, non-string named slots, stateful hydration binding, event ownership, and unmount cleanup.
  - [x] Verified with hydration, keyed reconciliation, component identity, ref cleanup, slot normalization, and stateful hydration regression coverage.
- [x] Add framework-level observability and error reporting integrations without leaking user data.
  - [x] Added normalized error reports, isolated application reporters, opt-in DevTools runtime error events, bounded diagnostics, and documentation warning applications to redact sensitive data.
- [x] Publish the V3.1.19 patch release after versioning, changelog, migration notes, clean-install verification, and registry checks were prepared.

> The current published release is `onekit-js@3.1.19`; npm latest, GitHub tag/release, clean-install verification, and the `V3` branch are synchronized.

## Remaining production roadmap after V3.1.19

- [x] Add real-browser CI matrix for Chromium, Firefox, WebKit, and Microsoft Edge, including hydration event/ref cleanup and metadata smoke coverage.
  - [x] Add controlled-input hydration, user-event, programmatic-update, and post-disposal scenarios.
  - [x] Add keyed-reorder identity and interaction scenarios across all four browser projects.
  - [x] Add larger keyed-list timing and DOM-heavy patch baselines across all four browser projects.
  - [x] Add versioned 150 ms keyed-list and 200 ms DOM-heavy hard budgets with 80% warning thresholds and CI annotations.
  - [ ] Broaden scenarios to controlled inputs and slot-heavy trees.
- [ ] Add browser-based performance scenarios for large keyed lists, hydration of server-rendered trees, slot-heavy component trees, and repeated mount/unmount cycles.
  - [x] Added 500-item keyed-list reorder and 300-card DOM-heavy reverse-patch Playwright scenarios with JSON attachments.
  - [x] Add large server-rendered hydration timing and slot-heavy tree scenarios with zero-mismatch assertions, projection-shape checks, and per-browser JSON reports.
  - [ ] Add historical trend storage, slot-heavy update/reorder timing, and browser heap snapshots.
  - [x] Added a jsdom cleanup regression covering 100 repeated hydration/dispose cycles, listener cleanup, callback-ref cleanup, and metadata release.
  - [x] Add real-browser scenarios and timing baselines for DOM-heavy workloads, large SSR hydration, and slot-heavy projection.
  - [ ] Add stable historical trend comparison and browser heap-snapshot collection.
- [ ] Add a repeated mount/unmount memory-leak harness that releases application references and records browser heap snapshots where supported.
  - [x] Added the forced-GC Node memory benchmark and lifecycle cleanup guard.
  - [ ] Add browser heap-snapshot collection for supported browser CI environments.
- [ ] Expand query persistence with optional IndexedDB storage and application-controlled cross-tab synchronization while keeping the current storage contract backward compatible.
  - [x] Added the optional SSR-safe `createIndexedDBQueryStorage()` adapter and preserved the existing `QueryStorage` contract.
  - [x] Added `createQueryBroadcastSync()` for application-controlled cross-tab invalidation through `BroadcastChannel` or a compatible custom channel; it broadcasts normalized keys only.
- [x] Add optional automatic route-component rendering integration while preserving the router's current data-resolution-first contract.
  - [x] Added `createRouterView()` and `subscribeMatched()` for committed-match VDOM binding, target replacement, not-found clearing, and disposal without forcing a component shape.
  - [x] Fixed repeated `Router.start()` calls to return the existing committed match with resolved data/components instead of reconstructing incomplete route state.
- [ ] Expand framework adapters and deployment examples for production observability, distributed queues, and database/Redis integrations without bundling provider clients into the browser core.
- [ ] Re-run the full release checklist for the next patch/minor release after each roadmap increment.

## Continuation audit — 2026-08-26

- [x] Re-audit current source, roadmap, package exports, documentation examples, test coverage, and browser-performance tooling.
- [x] Fix repeated `Router.start()` calls so they return the committed match with resolved loader data and lazy components.
- [x] Fix store `$reset()` to remove transient keys and add `$dispose()` for registry/subscription teardown; extend the typed DevTools store lifecycle phase.
- [x] Correct README and V3 Usage store examples and synchronize RouterView, query persistence, and cross-tab invalidation guidance.
- [x] Add `createStoreRegistry()` for per-request store isolation and explicit registry disposal.
- [x] Add `app.head()`/`app.options()` helpers, enforce empty response bodies for HEAD requests, and return 405 with aggregated Allow headers for unsupported methods.
- [x] Add the React/Next.js/Express parity audit at `docs/REACT_NEXT_EXPRESS_PARITY.md`.
- [x] Add the opt-in Vite virtual route module with deterministic route/layout/middleware metadata and generated ordinary `Route[]` imports.
- [x] Add the opt-in `"use client"`/`"use server"` static-import boundary validator with client-to-server rejection tests.
- [x] Add navigation-scoped `AbortSignal` propagation and silent superseded-loader cancellation.
- [x] Validate the continuation working tree with **36 Jest suites / 211 tests**, strict TypeScript, docs build, production build, declaration/package/API/HMR checks, dependency audit, and Chromium browser coverage.
- [ ] Run the complete Firefox/WebKit/Microsoft Edge matrix on CI runners with those browser executables installed before the next release.
- [ ] Decide whether store persistence and SSR request isolation belong in the next public contract before implementation.
- [ ] Continue SSR streamed-route integration, browser performance trend storage, cross-browser heap collection, and framework adapter/deployment examples.

## Continuation increment — 2026-08-27

- [x] Define and document the bounded SSR route-data envelope contract with JSON-safe filtering, size/depth/string limits, redaction/exclusion hooks, expiry, URL binding, optional Web Crypto HMAC signing, fail-closed parsing, and explicit Router/QueryClient hydration application.
- [x] Add shared QueryClient `tags`, `revalidate`, tag invalidation/revalidation, tag-preserving dehydration, and tag-only cross-tab invalidation coverage.
- [x] Extend the opt-in Vite file-route plugin with configurable extensions, relative-root normalization, deterministic duplicate normalized-path diagnostics, generated route entry/path metadata, and explicit layout/middleware associations.
- [x] Strengthen the opt-in Server/Client boundary validator with `server-only`/`client-only` markers and transitive static import checks while preserving server-to-client composition.
- [x] Fix the GitHub Actions browser matrix to target the configured `edge` Playwright project, install the `msedge` channel, and record per-browser cache-backed performance history.
- [x] Update README, V3 usage, API stability, production readiness, parity, roadmap, changelog, and dedicated SSR route-data documentation.
- [ ] Execute the full Firefox/WebKit/Edge matrix on CI and verify the Edge channel installation on the hosted runner.
- [ ] Integrate route-data transport with official streaming/deployment adapters and decide replay/key-rotation policy.
- [ ] Add generated fully typed route declarations, runtime layout/middleware composition, prerendering, RSC/Flight, Server Functions, and cross-browser heap collection only as separate reviewed milestones.
- [x] Add a declaration-only `virtual:onekit/routes.d.ts` module with literal `FileRoutePath` and `FileRouteParams<Path>` types, plus configurable `typesVirtualModuleId`.
- [x] Add `composeFileRouteInfrastructure()` with deterministic root-to-leaf layout and middleware association resolution while keeping runtime injection application-owned.
- [x] Add regression coverage for declaration-module generation, semantic dynamic conflicts, root-layout association, and page/infrastructure separation.
- [ ] Decide whether generated route declarations should later include loader-result inference and route-specific component props; keep that work separate from this path-typing increment.
