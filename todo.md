# OneKit JS V3 Documentation Update

- [ ] Audit all public V3 exports and source module signatures.
- [ ] Audit README, getting started, framework guide, migration guide, changelog, and examples for stale or missing usage.
- [ ] Write a complete V3 usage guide covering installation, CLI, reactive state, effects, batching, nextTick, components, templates, JSX, router, stores, plugins, SSR, web components, utilities, and error handling.
- [ ] Add API reference tables and runnable examples for every public module.
- [ ] Synchronize README, docs, examples, package metadata, and website documentation with version 3.1.9.
- [ ] Validate documentation code samples against the actual package API.
- [ ] Run type-check, tests, build, and package dry-run.
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
- [ ] Add M1 regression tests for conditional dependencies, nested proxy identity, arrays, computed values, batch flushing, and stop behavior.
- [ ] Implement M2 Router 1.0 factory API with dynamic params, query parsing, history/hash navigation, guards, async loaders, 404 handling, and unsubscribe lifecycle.
- [ ] Add M2 router tests for matching, params, navigation, guards, loaders, redirects, and browser history behavior.
- [ ] Implement M3 renderer improvements for keyed reconciliation, fragments, props/events, refs, component lifecycle, and event cleanup.
- [ ] Add M3 renderer tests for create/update/remove, keyed lists, fragments, event replacement, and unmount cleanup.
- [ ] Synchronize M1-M3 API documentation, examples, changelog, and release notes.

## Current-state error audit

- [ ] Run type-check, all Jest suites, production build, npm pack dry-run, and clean git status checks.
- [ ] Exercise reactive edge cases including arrays, computed invalidation, conditional dependencies, watch disposal, and batching.
- [ ] Exercise router edge cases including query/hash parsing, dynamic params, redirects, guards, loaders, memory mode, and browser-safe SSR behavior.
- [ ] Exercise renderer edge cases including keyed reordering, fragments, event replacement, props removal, refs, and empty children.
- [ ] Exercise SSR, CLI, and representative examples for runtime or packaging failures.
- [ ] Fix confirmed defects and add regression coverage.
- [ ] Re-run all validation and record remaining non-blocking risks.

## Published package verification and next milestone

- [ ] Verify npm registry version, tarball metadata, CLI binary, CJS import, ESM import, and clean temporary-project installation.
- [ ] Identify the next highest-priority production gap after M1-M3.
- [ ] Implement the selected production improvement with regression tests.
- [ ] Synchronize release documentation and validate the new package workflow.

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

## Decisions

- Documentation language: English for the public developer docs.
- Target release: OneKit JS V3 / 3.1.9.
- Do not claim npm publication until registry authentication and publish verification succeed.

## Status

- Current phase: API and documentation audit.
- Last completed: website checkpoint fbcfdc73 and npm publish dry-run for 3.1.9.
- Blocker: npm authentication is still required for actual publish.

