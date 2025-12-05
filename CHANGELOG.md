# Changelog

All notable changes to OneKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
