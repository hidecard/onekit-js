import { createFileRouteManifest } from './modules/file-routes';
import { type PrerenderPaths, type PrerenderRenderContext, type PrerenderValue, type PrerenderedPage } from './modules/prerender';
export interface OneKitFileRoutePrerenderOptions {
    /** Concrete URL paths or an application-owned build-time path factory. */
    paths: PrerenderPaths;
    /** Application-owned path renderer; loaders and authorization remain explicit. */
    render: (context: PrerenderRenderContext) => PrerenderValue | Promise<PrerenderValue>;
    /** Optional output directory for `<path>/index.html` files. */
    outputDir?: string;
    /** Optional callback for upload, manifest, or custom output handling. */
    onPage?: (page: PrerenderedPage) => void | Promise<void>;
}
export interface OneKitFileRoutesOptions {
    /** Project-relative route directory, for example `/src/app` or `src/pages`. */
    root: string;
    /** File extensions included in route discovery. */
    include?: RegExp;
    /** File extensions used when include is not supplied. */
    extensions?: readonly string[];
    /** Include `_layout`, `layout`, `_middleware`, and `middleware` metadata entries. */
    includeInfrastructure?: boolean;
    /** Import path exposed by the generated virtual module. */
    virtualModuleId?: string;
    /** Declaration-only virtual module path; defaults to `<virtualModuleId>.d.ts`. */
    typesVirtualModuleId?: string;
    /** Optional build-time callback for explicitly handling the generated manifest. */
    onManifest?: (manifest: ReturnType<typeof createFileRouteManifest>) => void;
    /** Optional build-time prerendering of application-selected concrete paths. */
    prerender?: OneKitFileRoutePrerenderOptions;
}
export interface OneKitComponentBoundaryOptions {
    /** Throw on client-to-server transitive static imports during the build. Defaults to true. */
    strict?: boolean;
    /** Recognize explicit `server-only`/`client-only` side-effect marker imports. */
    markers?: boolean;
}
export interface OneKitVitePluginOptions {
    include?: RegExp;
    exclude?: RegExp;
    onUpdate?: (file: string) => void;
    /** Generate a deterministic virtual route table from project files when configured. */
    fileRoutes?: OneKitFileRoutesOptions;
    /** Validate `"use client"`/`"use server"` static import boundaries when configured. */
    componentBoundary?: boolean | OneKitComponentBoundaryOptions;
}
interface OneKitModuleInfo {
    id: string;
    importedModules?: readonly OneKitModuleInfo[];
    dynamicallyImportedModules?: readonly OneKitModuleInfo[];
}
export interface OneKitVitePlugin {
    name: string;
    enforce?: 'pre' | 'post';
    apply?: 'serve' | 'build';
    resolveId?: (source: string, importer?: string) => string | undefined;
    load?: (id: string) => {
        code: string;
        map: null;
    } | undefined;
    transform?: (code: string, id: string) => {
        code: string;
        map: null;
    } | undefined;
    configResolved?: (config: {
        root: string;
    }) => void;
    moduleParsed?: (module: OneKitModuleInfo) => void;
    buildEnd?: () => void;
    closeBundle?: () => void | Promise<void>;
    handleHotUpdate?: (context: {
        file: string;
        modules: unknown[];
        server: {
            ws: {
                send: (message: unknown) => void;
            };
        };
    }) => unknown[];
}
/**
 * Vite plugin for OKJS/HMR plus opt-in file-route generation and component-boundary checks.
 * The advanced capabilities are explicit so existing users retain the original plugin behavior.
 */
export declare function oneKitVitePlugin(options?: OneKitVitePluginOptions): OneKitVitePlugin;
export {};
