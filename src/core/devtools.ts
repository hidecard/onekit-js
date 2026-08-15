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

export interface DevToolsOptions {
  historySize?: number;
  installGlobal?: boolean;
  globalName?: string;
}

export interface DevToolsMetadata {
  enabled: boolean;
  historySize: number;
  eventCount: number;
  listenerCount: number;
}

export interface DevToolsBridge {
  readonly enabled: boolean;
  subscribe(listener: DevToolsListener): () => void;
  getHistory(): readonly DevToolsEvent[];
  clearHistory(): void;
  getMetadata(): DevToolsMetadata;
  dispose(): void;
}

const DEFAULT_HISTORY_SIZE = 100;
const DEFAULT_GLOBAL_NAME = '__ONEKIT_DEVTOOLS__';
let enabled = false;
let historySize = DEFAULT_HISTORY_SIZE;
let nextTargetId = 1;
let nextEffectId = 1;
let installedGlobalName: string | null = null;
const targetIds = new WeakMap<object, number>();
const effectIds = new WeakMap<Function, number>();
const listeners = new Set<DevToolsListener>();
const history: DevToolsEvent[] = [];

export function isDevToolsEnabled(): boolean {
  return enabled;
}

export function enableDevTools(options: DevToolsOptions = {}): DevToolsBridge {
  enabled = true;
  historySize = Math.max(1, Math.floor(options.historySize ?? DEFAULT_HISTORY_SIZE));
  while (history.length > historySize) history.shift();

  const bridge: DevToolsBridge = {
    get enabled() { return enabled; },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getHistory() {
      return history.map(event => devToolsSnapshot(event));
    },
    clearHistory() {
      history.length = 0;
    },
    getMetadata() {
      return {
        enabled,
        historySize,
        eventCount: history.length,
        listenerCount: listeners.size
      };
    },
    dispose() {
      enabled = false;
      listeners.clear();
      history.length = 0;
      if (installedGlobalName && typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>)[installedGlobalName];
      }
      installedGlobalName = null;
    }
  };

  if (options.installGlobal && typeof window !== 'undefined') {
    const globalName = options.globalName ?? DEFAULT_GLOBAL_NAME;
    (window as unknown as Record<string, unknown>)[globalName] = bridge;
    installedGlobalName = globalName;
  }

  return bridge;
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

export function devToolsSnapshot<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value;
  const existing = seen.get(value as object);
  if (existing) return existing as T;
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    seen.set(value, result);
    value.forEach(item => result.push(devToolsSnapshot(item, seen)));
    return result as T;
  }
  const result: Record<string, unknown> = {};
  seen.set(value as object, result);
  Object.keys(value as object).forEach(key => {
    result[key] = devToolsSnapshot((value as Record<string, unknown>)[key], seen);
  });
  return result as T;
}

export function emitDevToolsEvent(event: DevToolsEvent): void {
  if (!enabled) return;
  history.push(devToolsSnapshot(event));
  while (history.length > historySize) history.shift();
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch {
      // DevTools must never break application execution.
    }
  });
}
