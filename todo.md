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

## Decisions

- Documentation language: English for the public developer docs.
- Target release: OneKit JS V3 / 3.1.9.
- Do not claim npm publication until registry authentication and publish verification succeed.

## Status

- Current phase: API and documentation audit.
- Last completed: website checkpoint fbcfdc73 and npm publish dry-run for 3.1.9.
- Blocker: npm authentication is still required for actual publish.

