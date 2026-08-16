# OneKit JS V3 Developer Experience Audit

## Scope

This audit focuses on making common OneKit code easier to learn and write than the equivalent React or Vue code while preserving the existing V3 runtime contracts. The first implementation deliberately adds a compatibility layer rather than changing the existing `reactive`, `effect`, component, or `.okjs` semantics in place.

## Findings

The current runtime already provides production-oriented primitives such as `reactive`, `computed`, `effect`, `watch`, batching, scope disposal, components, SSR, Vite integration, and structured CLI diagnostics. However, the beginner path exposes several lower-level concepts at once: object-only `reactive()` for state, runner-based effect disposal, manual component registration before mounting, and multiple template/JSX styles.

The highest-value low-risk improvement is a small public ergonomic layer. It should provide one beginner vocabulary while keeping the existing APIs available for advanced and migrated applications.

| Beginner need | Existing lower-level API | V3 ergonomic direction |
|---|---|---|
| Primitive state | Object-only `reactive()` | `state(value)` with an explicit `.value` ref |
| Object/array state | `reactive(object)` | `state(object)` returns the same reactive proxy contract |
| Derived state | `computed(getter)` | `derive(getter)` alias with the same cached semantics |
| Reactive side effect | `effect()` plus `stop(runner)` | `watchEffect()` returns a disposer directly |
| First app mount | `register()` + `create()` + `mount()` | `createApp(definition).mount(target, props)` |

## Compatibility boundary

The first DX layer does not silently rewrite JavaScript semantics. In particular, primitive state remains an explicit ref (`count.value`) because JavaScript cannot make `count++` update a primitive binding without a compiler transform. Any future compiler sugar must be introduced as an opt-in, tested `.okjs` transform rather than as a runtime-only promise.

## Current implementation

The new public module is `src/modules/ergonomics.ts`, exported from `src/index.ts`. It currently implements `state`, `derive`, `watchEffect`, and `createApp`. Regression coverage lives in `tests/ergonomics-production.test.ts` and verifies primitive refs, object/array proxies, cached derived values, and direct disposer behavior.

## Next design priorities

The next safe improvements are a canonical `.okjs` beginner example set, typed prop/event helpers, a minimal official `createApp` starter template, compiler diagnostics for unsupported syntax, and end-to-end tests for `createApp` in a DOM environment. Existing V3 APIs and migration behavior must remain supported throughout the work.
