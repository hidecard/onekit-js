import { emitDevToolsEvent, getDevToolsScopeId } from './devtools';

export type DisposeFn = () => void;

export interface ScopeDiagnostics {
  id: number;
  disposed: boolean;
  createdAt: number;
  ageMs: number;
  cleanupCount: number;
  childCount: number;
}

export interface DisposableScope {
  readonly disposed: boolean;
  readonly parent: DisposableScope | null;
  run<T>(fn: () => T): T;
  add(dispose: DisposeFn): DisposeFn;
  dispose(): void;
  diagnostics(): ScopeDiagnostics;
}

export interface ScopeLeakWarningOptions {
  thresholdMs?: number;
  intervalMs?: number;
  onWarning?: (scope: ScopeDiagnostics) => void;
}

let activeScope: DisposableScope | null = null;
const activeScopes = new Set<ScopeImpl>();
let leakTimer: ReturnType<typeof setInterval> | undefined;

class ScopeImpl implements DisposableScope {
  readonly parent: DisposableScope | null;
  readonly createdAt = Date.now();
  readonly id = getDevToolsScopeId(this);
  private readonly cleanups = new Set<DisposeFn>();
  private readonly children = new Set<ScopeImpl>();
  private disposedState = false;

  constructor(detached = false) {
    this.parent = detached ? null : activeScope;
    if (this.parent instanceof ScopeImpl) this.parent.children.add(this);
    activeScopes.add(this);
    emitDevToolsEvent({ type: 'scope:lifecycle', scopeId: this.id, phase: 'create' });
  }

  get disposed(): boolean { return this.disposedState; }

  run<T>(fn: () => T): T {
    if (this.disposedState) throw new Error('[OneKit] Cannot run a disposed scope');
    const previous = activeScope;
    activeScope = this;
    try { return fn(); } finally { activeScope = previous; }
  }

  add(dispose: DisposeFn): DisposeFn {
    if (this.disposedState) { dispose(); return () => undefined; }
    let active = true;
    const wrapped = () => {
      if (!active) return;
      active = false;
      this.cleanups.delete(wrapped);
      dispose();
    };
    this.cleanups.add(wrapped);
    return wrapped;
  }

  diagnostics(): ScopeDiagnostics {
    return {
      id: this.id,
      disposed: this.disposedState,
      createdAt: this.createdAt,
      ageMs: Math.max(0, Date.now() - this.createdAt),
      cleanupCount: this.cleanups.size,
      childCount: this.children.size,
    };
  }

  dispose(): void {
    if (this.disposedState) return;
    this.disposedState = true;
    for (const child of Array.from(this.children)) child.dispose();
    this.children.clear();
    for (const cleanup of Array.from(this.cleanups).reverse()) {
      try { cleanup(); } catch (error) { console.warn('[OneKit] Scope cleanup failed', error); }
    }
    this.cleanups.clear();
    activeScopes.delete(this);
    if (this.parent instanceof ScopeImpl) this.parent.children.delete(this);
    emitDevToolsEvent({ type: 'scope:lifecycle', scopeId: this.id, phase: 'dispose' });
  }
}

export function effectScope(detached = false): DisposableScope { return new ScopeImpl(detached); }
export function getCurrentScope(): DisposableScope | null { return activeScope; }

export function onScopeDispose(dispose: DisposeFn): DisposeFn {
  if (!activeScope) return () => undefined;
  return activeScope.add(dispose);
}

export function withScope<T>(fn: () => T, detached = false): { value: T; scope: DisposableScope } {
  const scope = effectScope(detached);
  return { value: scope.run(fn), scope };
}

export function registerDisposable<T extends { dispose?: DisposeFn; stop?: DisposeFn; unsubscribe?: DisposeFn }>(resource: T): T {
  const dispose = resource.dispose ?? resource.stop ?? resource.unsubscribe;
  if (dispose) onScopeDispose(() => dispose.call(resource));
  return resource;
}

export function getActiveScopeDiagnostics(): ScopeDiagnostics[] {
  return Array.from(activeScopes, (scope) => scope.diagnostics());
}

export function enableScopeLeakWarnings(options: ScopeLeakWarningOptions = {}): () => void {
  disableScopeLeakWarnings();
  const thresholdMs = Math.max(1_000, options.thresholdMs ?? 60_000);
  const intervalMs = Math.max(1_000, options.intervalMs ?? 30_000);
  const warn = () => {
    for (const scope of activeScopes) {
      const diagnostics = scope.diagnostics();
      if (diagnostics.ageMs < thresholdMs || diagnostics.cleanupCount === 0) continue;
      const message = `[OneKit] Scope ${diagnostics.id} has been active for ${diagnostics.ageMs}ms with ${diagnostics.cleanupCount} pending cleanup(s)`;
      if (options.onWarning) options.onWarning(diagnostics); else console.warn(message, diagnostics);
      emitDevToolsEvent({ type: 'scope:lifecycle', scopeId: diagnostics.id, phase: 'create' });
    }
  };
  leakTimer = setInterval(warn, intervalMs);
  return disableScopeLeakWarnings;
}

export function disableScopeLeakWarnings(): void {
  if (leakTimer !== undefined) clearInterval(leakTimer);
  leakTimer = undefined;
}
