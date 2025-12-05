interface ServiceDefinition {
    factory: (...args: unknown[]) => unknown;
    dependencies?: string[];
    singleton?: boolean;
}
interface ServiceInstance {
    instance: unknown;
    singleton: boolean;
}
declare class DependencyInjector {
    private services;
    private instances;
    register(name: string, factory: (...args: unknown[]) => unknown, dependencies?: string[], singleton?: boolean): void;
    resolve<T>(name: string): T;
    has(name: string): boolean;
    clear(): void;
}
declare const di: DependencyInjector;
export { DependencyInjector, di };
export type { ServiceDefinition, ServiceInstance };
