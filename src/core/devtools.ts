// OneKit DevTools foundation: opt-in, browser/SSR-safe event inspection.

export type DevToolsEvent =
  | {
      type: 'reactive:trigger';
      targetId: number;
      key: string;
      oldValue: unknown;
      newValue: unknown;
    }
  | {
      type: 'reactive:effect';
      effectId: number;
      phase: 'run' | 'stop';
    }
  | {
      type: 'router:navigation';
      phase: 'start' | 'success' | 'cancel' | 'error';
      to: string;
      from: string | null;
      route?: string;
      error?: unknown;
    };

export type DevToolsListener = (event: DevToolsEvent) => void;

export interface DevToolsBridge {
  readonly enabled: boolean;
  subscribe(listener: DevToolsListener): () => void;
  dispose(): void;
}

let enabled = false;
let nextTargetId = 1;
let nextEffectId = 1;
const targetIds = new WeakMap<object, number>();
const effectIds = new WeakMap<Function, number>();
const listeners = new Set<DevToolsListener>();

export function isDevToolsEnabled(): boolean {
  return enabled;
}

export function enableDevTools(): DevToolsBridge {
  enabled = true;
  return {
    get enabled() { return enabled; },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      enabled = false;
      listeners.clear();
    }
  };
}

export function onDevToolsEvent(listener: DevToolsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDevToolsTargetId(target: object): number {
  const existing = targetIds.get(target);
  if (existing) return existing;
  const id = nextTargetId++;
  targetIds.set(target, id);
  return id;
}

export function getDevToolsEffectId(effect: Function): number {
  const existing = effectIds.get(effect);
  if (existing) return existing;
  const id = nextEffectId++;
  effectIds.set(effect, id);
  return id;
}

export function devToolsSnapshot<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => devToolsSnapshot(item)) as T;
  const result: Record<string, unknown> = {};
  Object.keys(value as object).forEach(key => {
    result[key] = devToolsSnapshot((value as Record<string, unknown>)[key]);
  });
  return result as T;
}

export function emitDevToolsEvent(event: DevToolsEvent): void {
  if (!enabled) return;
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch {
      // DevTools must never break application execution.
    }
  });
}
