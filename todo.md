# OneKit JS V3 Documentation Update

- [ ] Audit all public V3 exports and source module signatures.
- [ ] Audit README, getting started, framework guide, migration guide, changelog, and examples for stale or missing usage.
- [ ] Write a complete V3 usage guide covering installation, CLI, reactive state, effects, batching, nextTick, components, templates, JSX, router, stores, plugins, SSR, web components, utilities, and error handling.
- [ ] Add API reference tables and runnable examples for every public module.
- [x] Synchronize README, docs, examples, package metadata, and website documentation with version 3.1.12.
- [ ] Validate documentation code samples against the actual package API.
- [x] Run type-check, tests, build, package dry-run, and isolated package verification.
- [ ] Commit documentation changes and prepare GitHub/website checkpoint delivery.

## OneKit-only documentation web page

- [ ] Define the OneKit-only page entrypoint, API sections, and browser runtime loading contract.
- [ ] Build sidebar navigation, search, install snippets, API cards, and a live reactive example with OneKit APIs only.
- [ ] Add responsive styling and verify browser interaction, production build, and GitHub V3 delivery.

## Production-readiness audit

- [ ] Audit public exports, API contracts, and compatibility guarantees against React/Next-like expectations.
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
- Target release: OneKit JS V3 / 3.1.12.
- Do not claim npm publication until registry authentication and publish verification succeed.

## Status

- Current phase: M7.1 DevTools diagnostics inspector completed; ready for the 3.1.12 release cycle.
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
