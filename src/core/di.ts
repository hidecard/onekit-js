// Dependency Injection System
interface ServiceDefinition {
  factory: (...args: unknown[]) => unknown;
  dependencies?: string[];
  singleton?: boolean;
}

interface ServiceInstance {
  instance: unknown;
  singleton: boolean;
}

class DependencyInjector {
  private services: Map<string, ServiceDefinition> = new Map();
  private instances: Map<string, ServiceInstance> = new Map();

  register(name: string, factory: (...args: unknown[]) => unknown, dependencies: string[] = [], singleton: boolean = true): void {
    this.services.set(name, { factory, dependencies, singleton });
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service "${name}" not registered`);
    }

    if (service.singleton && this.instances.has(name)) {
      return this.instances.get(name)!.instance as T;
    }

    const deps = service.dependencies?.map(dep => this.resolve(dep)) || [];
    const instance = service.factory(...deps);

    if (service.singleton) {
      this.instances.set(name, { instance, singleton: true });
    }

    return instance as T;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  clear(): void {
    this.services.clear();
    this.instances.clear();
  }
}

const di = new DependencyInjector();

export { DependencyInjector, di };
export type { ServiceDefinition, ServiceInstance };
