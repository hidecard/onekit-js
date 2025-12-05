// Storage Utilities Module
import { validateStorageKey } from '../core/security';
import { errorHandler } from '../core/error-handler';

interface StorageOptions {
  prefix?: string;
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
  ttl?: number; // Time to live in milliseconds
}

class Storage {
  private storage: globalThis.Storage;
  private options: Required<StorageOptions>;

  constructor(storage: globalThis.Storage, options: StorageOptions = {}) {
    this.storage = storage;
    this.options = {
      prefix: options.prefix || '',
      serialize: options.serialize || JSON.stringify,
      deserialize: options.deserialize || JSON.parse,
      ttl: options.ttl || 0
    };
  }

  private getKey(key: string): string {
    return this.options.prefix + key;
  }

  private isExpired(timestamp: number): boolean {
    return this.options.ttl > 0 && Date.now() - timestamp > this.options.ttl;
  }

  set<T>(key: string, value: T): boolean {
    try {
      // Validate key to prevent prototype pollution
      if (!validateStorageKey(key)) {
        console.error('OneKit Security: Invalid storage key (prototype pollution attempt blocked)');
        return false;
      }

      const data = {
        value: this.options.serialize(value),
        timestamp: Date.now()
      };

      this.storage.setItem(this.getKey(key), JSON.stringify(data));
      return true;
    } catch (error) {
      errorHandler(error, 'Storage.set');
      return false;
    }
  }

  get(key: string, defaultValue?: any): any {
    try {
      // Validate key to prevent prototype pollution
      if (!validateStorageKey(key)) {
        console.error('OneKit Security: Invalid storage key (prototype pollution attempt blocked)');
        return defaultValue;
      }

      const item = this.storage.getItem(this.getKey(key));
      if (!item) {
        return defaultValue;
      }

      const data = JSON.parse(item);

      // Check TTL
      if (this.isExpired(data.timestamp)) {
        this.remove(key);
        return defaultValue;
      }

      return this.options.deserialize(data.value);
    } catch (error) {
      errorHandler(error, 'Storage.get');
      return defaultValue;
    }
  }

  remove(key: string): boolean {
    try {
      // Validate key to prevent prototype pollution
      if (!validateStorageKey(key)) {
        console.error('OneKit Security: Invalid storage key (prototype pollution attempt blocked)');
        return false;
      }

      this.storage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      errorHandler(error, 'Storage.remove');
      return false;
    }
  }

  clear(): boolean {
    try {
      // Only clear items with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.options.prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => this.storage.removeItem(key));
      return true;
    } catch (error) {
      errorHandler(error, 'Storage.clear');
      return false;
    }
  }

  has(key: string): boolean {
    try {
      // Validate key to prevent prototype pollution
      if (!validateStorageKey(key)) {
        return false;
      }

      const item = this.storage.getItem(this.getKey(key));
      if (!item) {
        return false;
      }

      const data = JSON.parse(item);
      return !this.isExpired(data.timestamp);
    } catch (error) {
      return false;
    }
  }

  keys(): string[] {
    try {
      const keys: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.options.prefix)) {
          const cleanKey = key.slice(this.options.prefix.length);
          // Check if not expired
          const item = this.storage.getItem(key);
          if (item) {
            const data = JSON.parse(item);
            if (!this.isExpired(data.timestamp)) {
              keys.push(cleanKey);
            }
          }
        }
      }
      return keys;
    } catch (error) {
      errorHandler(error, 'Storage.keys');
      return [];
    }
  }

  size(): number {
    return this.keys().length;
  }
}

// Pre-configured storage instances
export const localStorage = new Storage(window.localStorage, { prefix: 'onekit_' });
export const sessionStorage = new Storage(window.sessionStorage, { prefix: 'onekit_' });

// Utility functions
export function createStorage(storage: globalThis.Storage, options?: StorageOptions): Storage {
  return new Storage(storage, options);
}

// Cache with TTL
export const cache = new Storage(window.sessionStorage, {
  prefix: 'onekit_cache_',
  ttl: 5 * 60 * 1000 // 5 minutes
});
