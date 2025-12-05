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
declare class OneKitPluginManager implements PluginManager {
    private plugins;
    private installed;
    register(plugin: Plugin, options?: Record<string, unknown>): void;
    unregister(name: string): void;
    get(name: string): Plugin | undefined;
    list(): Plugin[];
    clear(): void;
}
declare const pluginManager: OneKitPluginManager;
export { pluginManager };
export type { Plugin, PluginManager };
