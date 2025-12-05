// Plugin Architecture for Extensibility
interface Plugin {
  name: string;
  version: string;
  install: (app: any, options?: Record<string, unknown>) => void;
  uninstall?: (app: any) => void;
}

interface PluginManager {
  register: (plugin: Plugin, options?: Record<string, unknown>) => void;
  unregister: (name: string) => void;
  get: (name: string) => Plugin | undefined;
  list: () => Plugin[];
  clear: () => void;
}

class OneKitPluginManager implements PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private installed: Set<string> = new Set();

  register(plugin: Plugin, options?: Record<string, unknown>): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered. Overwriting...`);
    }

    this.plugins.set(plugin.name, plugin);

    // Auto-install if not already installed
    if (!this.installed.has(plugin.name)) {
      try {
        plugin.install({}, options);
        this.installed.add(plugin.name);
      } catch (error) {
        console.error(`Failed to install plugin "${plugin.name}":`, error);
      }
    }
  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin && plugin.uninstall) {
      try {
        plugin.uninstall({});
        this.installed.delete(name);
      } catch (error) {
        console.error(`Failed to uninstall plugin "${name}":`, error);
      }
    }
    this.plugins.delete(name);
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  clear(): void {
    for (const [name, plugin] of this.plugins) {
      if (plugin.uninstall && this.installed.has(name)) {
        try {
          plugin.uninstall({});
        } catch (error) {
          console.error(`Failed to uninstall plugin "${name}":`, error);
        }
      }
    }
    this.plugins.clear();
    this.installed.clear();
  }
}

const pluginManager = new OneKitPluginManager();

export { pluginManager };
export type { Plugin, PluginManager };
