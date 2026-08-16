# Changelog

All notable changes to OneKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.16] - 2026-08-16

### Added
- Add production feature subpath exports for `api`, `storage`, `a11y`, `animation`, `ergonomics`, `web-components`, `testing`, `query`, and `forms`.
- Add hydration parity checks for case-insensitive attributes, boolean properties, meaningful whitespace, object styles, fragments, and nested component output.
- Add DOM-first testing helpers (`renderTest`, `cleanup`, `fireEvent`, `flush`, and `waitFor`), a deduplicating `QueryClient`, and typed form state with validation, submit, reset, and subscriptions.
- Add router `prefetch()` for guard/loader data warming without committing navigation state, browser history, handlers, or subscribers.
- Add effect cleanup callbacks, nested-batch scheduling guarantees, last-write-wins router navigation, and stale-promise protection for async boundaries.
- Extend packed-package verification to cover ESM and CommonJS feature entry points.
- Add regression coverage for API timeout retries and storage key enumeration with corrupted records.
- Add adversarial security coverage for VDOM and SSR URL, event-attribute, style, and prototype-pollution boundaries.

### Fixed
- Apply the configured retry policy to request timeouts, matching network and HTTP failure behavior.
- Prevent stale asynchronous route loaders and boundary runs from overwriting the latest application state or notifying subscribers after a newer operation wins.
- Prevent one malformed storage record from hiding healthy keys and size information.
- Reject unsafe URL protocols and string event attributes at client VDOM and SSR boundaries, filter dangerous CSS values, and harden safe cloning against attacker-controlled object methods.


## [3.1.13] - 2026-08-15

### Added
- Add production-ready V3 disposable effect scopes, automatic component/store/router teardown, live DevTools inspectors, lifecycle events, and development leak diagnostics.
- Add the restricted template expression AST evaluator and remove dynamic `new Function()` execution from template compilation.
- Add the Vite HMR plugin, HMR state preservation helper, package subpath export, and repeatable V3 benchmark harness.

### Fixed
- Make Rollup builds portable across Node 18, Node 20, and Node 22 CI environments by handling Web Crypto availability and skipping incompatible terser minification only on Node 18.
- Build generated Vite artifacts before clean package verification so `onekit-js/vite` is validated from the packed tarball.
- Extend automated coverage for disposable scopes, DevTools inspectors, component/store lifecycle events, and package entrypoints.

## [3.1.12] - 2026-08-15

### Added
- Add bounded DevTools event history with detached snapshots, metadata inspection, clear, and dispose controls.
- Add optional browser-global installation for development inspectors without mutating SSR globals.
- Add isolated `verify:package` clean-install verification for root, ESM, CJS, SSR, and CLI entrypoints.
- Add the complete V3 developer migration guide with before/after migrations, runnable application examples, router/store/SSR/hydration walkthroughs, testing guidance, troubleshooting, and release checklists.
- Add GitHub Actions CI for Node 18, 20, and 22.
- Add regression coverage for history overflow, browser/SSR lifecycle behavior, inspector cleanup, and router subscription disposal.

### Fixed
- Harden template expression rejection and ensure event/model directives use the correct root context.
- Preserve `ok-*` directive attributes and semantic HTML elements during sanitization.
- Upgrade the runtime `@rollup/plugin-terser` dependency to remove the vulnerable older transitive serializer.
- Remove committed `node_modules` artifacts and add repository ignore rules.

## [3.1.11] - 2026-08-15

### Added
- Complete the M5 project workflow with `onekit dev`, `onekit preview`, and `onekit test` in addition to `create` and `build`.
- Add `--cwd` support and argument passthrough for delegated project commands.
- Synchronize V3 usage, framework, getting-started, and production-readiness documentation with the 3.1.11 release.
- Add the experimental opt-in DevTools bridge for reactive effect/trigger and router navigation inspection.

### Fixed
- Validate preview prerequisites and preserve delegated child-process exit codes so CI failures are not hidden.
- Synchronize the exported `VERSION` constant with package version 3.1.11.

## [3.1.10] - 2026-08-15

### Added
- Add M4 SSR/Hydration hardening with request-scoped nested rendering, mismatch diagnostics, hydration listener disposal, and error/loading boundary primitives.
- Add regression coverage for SSR, hydration, boundaries, Node-safe imports, and runtime package behavior.

### Fixed
- Preserve the `onekit` CLI binary in published npm packages.
- Load the Rollup build implementation lazily so `onekit --help` works after a clean install.
- Move CLI build dependencies into runtime dependencies.
- Emit CLI CommonJS bundles with a `.cjs` extension for projects using `type: module`.
- Normalize npm package metadata and preserve the repository issue URL.

## [3.0.0] - 2024-12-XX

### Added
- **Modular Architecture**: Complete rewrite as ES modules with tree-shaking support
- **TypeScript Support**: Full TypeScript definitions and type safety
- **Multiple Build Formats**: UMD, ESM, and CommonJS builds with minification
- **Automated Testing**: Jest test suite with comprehensive coverage
- **Performance Benchmarks**: Built-in performance monitoring tools
- **Migration Guide**: Detailed guide for upgrading from v2.2.0
- **Enhanced Security**: Automatic XSS protection and input validation
- **Source Maps**: Included in all builds for better debugging
- **Tree Shaking**: Import only needed modules for smaller bundles

### Changed
- **Breaking**: Transformed from single IIFE file to ES modules
- **API Changes**:
  - `ok.store` → `ok.storage` (renamed for clarity)
  - `ok.wait` → `ok.utils.debounce` (moved to utils module)
  - `ok.flow` → `ok.utils.throttle` (moved to utils module)
  - `ok.plug` → `ok.plugin.register` (moved to plugin module)
- **Component System**: Updated to use `state` instead of `data` for consistency
- **Reactive State**: Enhanced with better type safety
- **Build System**: Migrated from manual builds to Rollup with TypeScript

### Removed
- **Deprecated Features**: Removed legacy APIs and unsupported features
- **Global Pollution**: No longer exposes global variables by default
- **Manual Security**: Automatic sanitization removes need for manual HTML escaping

### Fixed
- **TypeScript Errors**: Resolved all 64+ TypeScript compilation errors
- **Memory Leaks**: Improved cleanup and garbage collection
- **Security Vulnerabilities**: Automatic protection against XSS and prototype pollution
- **Performance Issues**: Optimized DOM operations and Virtual DOM diffing

### Security
- **Automatic XSS Protection**: All HTML insertion methods sanitize content
- **Input Validation**: Selectors, URLs, and user inputs are validated
- **Prototype Pollution Prevention**: Storage and reactive state protected
- **URL Sanitization**: Dangerous protocols blocked automatically

### Performance
- **Bundle Size**: Tree shaking reduces bundle size by up to 60%
- **Runtime Performance**: Optimized DOM operations and animations
- **Memory Usage**: Better cleanup and reduced memory leaks
- **Build Speed**: Faster compilation with TypeScript and Rollup

### Developer Experience
- **TypeScript IntelliSense**: Full type definitions for better IDE support
- **Source Maps**: Easier debugging in production
- **Comprehensive Tests**: Automated testing ensures reliability
- **Migration Documentation**: Clear upgrade path from v2.2.0

## [2.2.0] - 2024-XX-XX

### Security
- Added automatic HTML sanitization to prevent XSS attacks
- Implemented input validation for selectors and URLs
- Added prototype pollution prevention in storage and reactive state
- Enhanced URL sanitization to block dangerous protocols
- Improved component template security
- Added secure deep cloning with pollution protection
- Exposed security API via `ok.security`

### Improvements
- Better error handling and security warnings
- Enhanced storage operations with validation
- Improved API request security
- Router path sanitization

---

## Migration Notes

### From 2.2.0 to 3.0.0

This is a major version update with breaking changes. See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed migration instructions.

### Key Breaking Changes:
1. **Module System**: Must use ES imports instead of global `ok`
2. **API Changes**: Some method names and structures updated
3. **Security**: Now automatic, manual sanitization no longer needed
4. **TypeScript**: Full type safety may require code adjustments

### Compatibility:
- **Browsers**: Same support as 2.2.0 (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
- **Node.js**: Requires Node.js 14+ for development
- **Build Tools**: Compatible with modern bundlers (Webpack, Rollup, Vite, etc.)

---

## V3 Maintenance Pass — 2026-08-15

### Fixed
- Fixed the undefined `finalProps` reference in component creation.
- Corrected SSR streaming to pass a `WritableStreamDefaultWriter`.
- Removed the duplicate `defineStore` export and applied store plugins consistently.
- Converted the Jest configuration to `jest.config.cjs` for the ESM package.
- Exported store and SSR APIs from the package entrypoint.
- Corrected package declaration and subpath export targets to generated `dist/types` files.

### Added
- Added `docs/GETTING_STARTED.md`, a reactive counter example, and a store-backed todo example.

## Framework Expansion — 2026-08-15

### Added
- Added `nextTick`, `defineComponent`, and `unmount` ergonomic APIs.
- Added public template, JSX, web-component, and router exports.
- Added a working `onekit create` starter generator and `onekit build` TypeScript-aware bundler.
- Added CLI packaging metadata, Node.js engine requirements, subpath exports, and framework guide documentation.
- Added CLI regression coverage; the suite now covers ten passing tests.

### Improved
- Fixed CLI missing-dependency failures by using maintained Rollup plugins and Node.js built-ins.
- Improved delegated event typing and modern TypeScript build targets.

## Contributing

When contributing to OneKit, please:
1. Update the changelog with your changes
2. Follow the existing format
3. Add entries under the appropriate category (Added, Changed, Fixed, etc.)
4. Update version numbers according to semantic versioning

## Types of Changes
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` for vulnerability fixes

- Add typed lazy route component resolution, matched params/query context, and route-level scroll behavior callbacks.
- Harden `trapFocus` for empty containers and restore the previously focused element when released.
