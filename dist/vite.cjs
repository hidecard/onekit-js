'use strict';

var node_fs = require('node:fs');
var node_path = require('node:path');
var typescript = require('typescript');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var typescript__namespace = /*#__PURE__*/_interopNamespaceDefault(typescript);

function readBlock(source, tag) {
    const match = source.match(new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? { attrs: match[1] ?? '', content: match[2] ?? '' } : null;
}
function assertNoUnsupportedBlocks(source) {
    const topLevel = source.replace(/<(script|template|style)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, '');
    const unsupported = topLevel.match(/<([a-z][\w-]*)(?:\s[^>]*)?>/gi)?.filter(tag => {
        const name = tag.match(/^<([a-z][\w-]*)/i)?.[1]?.toLowerCase();
        return name && !['script', 'template', 'style'].includes(name);
    });
    if (unsupported?.length)
        throw new Error(`[OneKit] Unsupported .okjs top-level block: ${unsupported[0]}`);
}
function parseOkjs(source, id = 'component.okjs') {
    assertNoUnsupportedBlocks(source);
    const script = readBlock(source, 'script');
    const template = readBlock(source, 'template');
    const style = readBlock(source, 'style');
    if (!template?.content.trim())
        throw new Error(`[OneKit] .okjs component ${id} must contain a <template> block.`);
    const lang = script?.attrs.match(/\blang\s*=\s*["'](ts|js)["']/i)?.[1]?.toLowerCase();
    return {
        script: script?.content.trim() ?? '',
        scriptLang: lang ?? 'ts',
        template: template.content.trim(),
        style: style?.content.trim() ?? '',
        styleScoped: Boolean(style?.attrs.match(/\bscoped(?:\s|=|$)/i)),
    };
}
function scopeTemplate(template, scopeId) {
    return template.replace(/^(\s*<([a-z][\w-]*))([^>]*>)/i, `$1 data-okjs-scope="${scopeId}"$3`);
}
function scopeCss(css, scopeId) {
    return css.replace(/([^{}]+)\{([^{}]*)\}/g, (_match, selector, body) => {
        const trimmed = selector.trim();
        if (!trimmed || trimmed.startsWith('@'))
            return `${selector}{${body}}`;
        const scoped = trimmed.split(',').map(item => `[data-okjs-scope="${scopeId}"] ${item.trim()}`).join(', ');
        return `${scoped}{${body}}`;
    });
}
function styleCode(style, id, scoped) {
    const styleId = `onekit-okjs-${id.replace(/[^a-z0-9_-]/gi, '-')}`;
    if (!style)
        return `\nconst __okjsStyleId = ${JSON.stringify(styleId)};\n`;
    const css = scoped ? scopeCss(style, styleId) : style;
    return `\nconst __okjsStyleId = ${JSON.stringify(styleId)};\nconst __okjsStyleText = ${JSON.stringify(css)};\nif (typeof document !== 'undefined' && !document.querySelector('[data-okjs-style="' + __okjsStyleId + '"]')) {\n  const __okjsStyle = document.createElement('style');\n  __okjsStyle.setAttribute('data-okjs-style', __okjsStyleId);\n  __okjsStyle.textContent = __okjsStyleText;\n  document.head.appendChild(__okjsStyle);\n}\n`;
}
function compileOkjs(source, id = 'component.okjs') {
    const block = parseOkjs(source, id);
    const styleId = `onekit-okjs-${id.replace(/[^a-z0-9_-]/gi, '-')}`;
    const template = block.styleScoped ? scopeTemplate(block.template, styleId) : block.template;
    const script = block.script
        ? block.script.replace(/export\s+default\s+/, 'const __okjsUserExport = ')
        : 'const __okjsUserExport = {};';
    const options = `const __okjsOptions = typeof __okjsUserExport === 'object' && __okjsUserExport !== null ? __okjsUserExport : {};`;
    const style = styleCode(block.style, id, block.styleScoped);
    const sourceComment = `\n//# sourceURL=${id}\n`;
    const code = `import { defineComponent as __okjsDefineComponent, hotUpdateComponent as __okjsHotUpdate } from 'onekit-js';\n${script}\n${options}\nconst __okjsTemplate = ${JSON.stringify(template)};${style}\nconst __okjsComponent = __okjsDefineComponent({ ...__okjsOptions, template: __okjsTemplate });\nexport default __okjsComponent;\nif (import.meta.hot) {\n  import.meta.hot.accept((__okjsNext) => {\n    const __okjsNextComponent = __okjsNext?.default;\n    if (__okjsNextComponent?.name) __okjsHotUpdate(__okjsNextComponent.name, __okjsNextComponent);\n  });\n  import.meta.hot.dispose(() => {\n    if (typeof document !== 'undefined') document.querySelector('[data-okjs-style="' + __okjsStyleId + '"]')?.remove();\n  });\n}\n${sourceComment}`;
    return { code, map: null };
}

/**
 * Preserve a route literal so TypeScript can retain its path type in generated
 * route tables while keeping the runtime representation compatible with Route.
 */
/** Convert a file-system-like module key into a router path. */
function fileRouteKind(filePath) {
    const name = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
    if (name === 'middleware' || name === '_middleware')
        return 'middleware';
    if (name === 'layout' || name === '_layout')
        return 'layout';
    return 'route';
}
function routeManifestEntry(filePath, options) {
    const kind = fileRouteKind(filePath);
    const conventionPath = kind === 'route' ? filePath : filePath.replace(/[\\/]([^\\/]+)$/, '');
    const path = filePathToRoutePath(conventionPath, options.root ?? '');
    const relative = path.replace(/^\//, '');
    const segments = relative.split('/').filter(Boolean);
    const dynamicSegments = segments.filter(segment => segment.startsWith(':') || segment === '*' || segment === '*?');
    const entry = {
        path,
        file: filePath,
        kind,
        ...(segments.length > 1 ? { parentPath: `/${segments.slice(0, -1).join('/')}` } : {}),
        ...(dynamicSegments.length ? { dynamic: true } : {}),
        ...(dynamicSegments.some(segment => segment === '*' || segment === '*?') ? { catchAll: true } : {}),
        ...(dynamicSegments.some(segment => segment === '*?') ? { optional: true } : {}),
    };
    return entry;
}
/** Find page files that normalize to the same or an ambiguous URL pattern. */
function findFileRouteConflicts(manifest) {
    const entriesByPattern = new Map();
    const canonicalPath = (path) => path
        .replace(/:[^/]+/g, ':param')
        .replace(/\*\?/g, '*?')
        .replace(/\*/g, '*');
    for (const entry of manifest.routes) {
        const entries = entriesByPattern.get(canonicalPath(entry.path)) ?? [];
        entries.push(entry);
        entriesByPattern.set(canonicalPath(entry.path), entries);
    }
    return [...entriesByPattern.values()]
        .filter(entries => entries.length > 1)
        .map(entries => ({
        path: entries[0].path,
        files: entries.map(entry => entry.file).sort(),
    }))
        .sort((left, right) => left.path.localeCompare(right.path));
}
/** Return explicit directory-scoped layout/middleware metadata without composing it. */
function createFileRouteAssociations(manifest) {
    const containing = (entry, kind) => manifest[kind]
        .filter(candidate => candidate.path === '/' || candidate.path === entry.path || entry.path === '/' || entry.path.startsWith(`${candidate.path}/`))
        .sort((left, right) => left.path.localeCompare(right.path) || left.file.localeCompare(right.file))
        .map(candidate => candidate.file);
    return manifest.routes.map(entry => ({
        path: entry.path,
        layouts: containing(entry, 'layouts'),
        middleware: containing(entry, 'middleware'),
    }));
}
function createFileRouteManifest(filePaths, options = {}) {
    const entries = filePaths
        .filter(filePath => options.includePrivate || !filePath.split(/[\\/]/).some(segment => segment.startsWith('_') && !/^_?(?:layout|middleware)(?:\.[^.]+)?$/.test(segment)))
        .map(filePath => routeManifestEntry(filePath, options))
        .filter(entry => options.includeInfrastructure || entry.kind === 'route')
        .sort((left, right) => left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind) || left.file.localeCompare(right.file));
    return {
        version: 1,
        root: options.root ?? '',
        routes: entries.filter(entry => entry.kind === 'route'),
        layouts: entries.filter(entry => entry.kind === 'layout'),
        middleware: entries.filter(entry => entry.kind === 'middleware'),
    };
}
function filePathToRoutePath(filePath, root = '') {
    let value = filePath.replace(/\\/g, '/');
    if (root) {
        const normalizedRoot = root.replace(/\\/g, '/').replace(/\/$/, '');
        if (value === normalizedRoot)
            value = '';
        else if (value.startsWith(`${normalizedRoot}/`))
            value = value.slice(normalizedRoot.length + 1);
    }
    value = value.replace(/^\.\//, '').replace(/\.(?:[cm]?[jt]sx?|vue|svelte)$/i, '');
    const segments = value.split('/').filter(Boolean);
    const routeSegments = [];
    for (const segment of segments) {
        if (/^(?:index|page)$/.test(segment))
            continue;
        if (segment === '_layout' || segment === 'layout' || /^\(.+\)$/.test(segment))
            continue;
        if (/^\[\[\.\.\.(.+)\]\]$/.test(segment)) {
            routeSegments.push('*?');
            continue;
        }
        if (/^\[\.\.\.(.+)\]$/.test(segment)) {
            routeSegments.push('*');
            continue;
        }
        const dynamic = segment.match(/^\[(.+)\]$/);
        routeSegments.push(dynamic ? `:${dynamic[1]}` : segment);
    }
    return routeSegments.length ? `/${routeSegments.join('/')}` : '/';
}

function compileOkjsForVite(source, id) {
    const compiled = compileOkjs(source, id);
    const transpiled = typescript__namespace.transpileModule(compiled.code, {
        compilerOptions: {
            module: typescript__namespace.ModuleKind.ESNext,
            target: typescript__namespace.ScriptTarget.ES2020,
            sourceMap: false,
        },
        fileName: id,
    });
    return { code: transpiled.outputText, map: null };
}
function cleanId(id) { return id.split('?')[0]; }
function detectComponentBoundary(code, markers = true) {
    const header = code.slice(0, 4096).replace(/^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)+/, '');
    const hasClientDirective = /^["']use client["'];?/.test(header);
    const hasServerDirective = /^["']use server["'];?/.test(header);
    const hasClientMarker = markers && /import\s+(?:['"]client-only['"]|[^;]*from\s+['"]client-only['"])/.test(header);
    const hasServerMarker = markers && /import\s+(?:['"]server-only['"]|[^;]*from\s+['"]server-only['"])/.test(header);
    const isClient = hasClientDirective || hasClientMarker;
    const isServer = hasServerDirective || hasServerMarker;
    if (isClient && isServer)
        throw new Error('OneKit component boundary violation: a module cannot declare both client and server boundaries');
    return isClient ? 'client' : isServer ? 'server' : 'shared';
}
function discoverFiles(root, include) {
    if (!statSafe(root)?.isDirectory())
        return [];
    const result = [];
    const visit = (directory) => {
        for (const entry of node_fs.readdirSync(directory, { withFileTypes: true })) {
            const file = node_path.resolve(directory, entry.name);
            if (entry.isDirectory())
                visit(file);
            else if (entry.isFile() && include.test(file))
                result.push(file);
        }
    };
    visit(root);
    return result.sort((left, right) => left.localeCompare(right));
}
function statSafe(file) {
    try {
        return node_fs.statSync(file);
    }
    catch {
        return undefined;
    }
}
function projectSourcePath(file, projectRoot) {
    const value = node_path.relative(projectRoot, file).replace(/\\/g, '/');
    return `/${value}`;
}
function manifestRoot(root) {
    const normalized = root.replace(/\\/g, '/').replace(/\/$/, '');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
}
function extensionPattern(extensions) {
    const values = (extensions?.length ? extensions : ['ts', 'tsx', 'js', 'jsx', 'vue', 'svelte', 'okjs'])
        .map(extension => extension.replace(/^\./, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`\\.(?:${values.join('|')})$`, 'i');
}
function generateFileRouteModule(files, options, projectRoot) {
    const sourceFiles = files.map(file => projectSourcePath(file, projectRoot));
    const manifest = createFileRouteManifest(sourceFiles, {
        root: manifestRoot(options.root),
        includeInfrastructure: options.includeInfrastructure,
    });
    const conflicts = findFileRouteConflicts(manifest);
    if (conflicts.length) {
        const details = conflicts.map(conflict => `${conflict.path}: ${conflict.files.join(', ')}`).join('; ');
        throw new Error(`OneKit file-route conflict: multiple route files normalize to the same path (${details})`);
    }
    const associations = createFileRouteAssociations(manifest);
    const routeEntries = manifest.routes.map(entry => ({ entry, index: sourceFiles.indexOf(entry.file) })).filter(item => item.index >= 0);
    const routePaths = routeEntries.map(({ entry }) => entry.path);
    const imports = routeEntries.map(({ entry, index }) => `import * as __route${index} from ${JSON.stringify(entry.file)};`).join('\n');
    const routeBindings = routeEntries.map(({ index }) => `const __route${index}Route = Reflect.get(__route${index}, 'route');\nconst __route${index}Default = Reflect.get(__route${index}, 'default');`).join('\n');
    const routes = routeEntries.map(({ entry, index }) => `{
    ...(typeof __route${index}Route === 'object' && __route${index}Route ? __route${index}Route : {}),
    path: __route${index}Route?.path ?? ${JSON.stringify(entry.path)},
    ...(__route${index}Default !== undefined ? { component: __route${index}Default } : {}),
    ...(__route${index}Route?.component !== undefined ? { component: __route${index}Route.component } : {}),
  }`).join(',\n');
    return `${imports}\n${routeBindings}\nexport const fileRouteManifest = ${JSON.stringify(manifest)};\nexport const fileRouteEntries = fileRouteManifest.routes;\n/** @type {readonly string[]} */\nexport const fileRoutePaths = [${routePaths.map(path => JSON.stringify(path)).join(', ')}];\nexport const fileRouteAssociations = ${JSON.stringify(associations)};\nexport const fileRouteLayouts = fileRouteManifest.layouts;\nexport const fileRouteMiddleware = fileRouteManifest.middleware;\nexport const routes = [${routes}];\nexport default routes;\n`;
}
function generateFileRouteTypes(manifest) {
    const routePathUnion = manifest.routes.length
        ? manifest.routes.map(entry => JSON.stringify(entry.path)).join(' | ')
        : 'never';
    return `import type { FileRouteAssociation, FileRouteManifest, FileRouteManifestEntry, RouteParamsFor } from 'onekit-js';
import type { Route } from 'onekit-js/router';
export type FileRoutePath = ${routePathUnion};
export type FileRouteParams<Path extends FileRoutePath> = RouteParamsFor<Path>;
export declare const fileRouteManifest: FileRouteManifest;
export declare const fileRouteEntries: readonly FileRouteManifestEntry[];
export declare const fileRoutePaths: readonly FileRoutePath[];
export declare const fileRouteAssociations: readonly FileRouteAssociation[];
export declare const fileRouteLayouts: readonly FileRouteManifestEntry[];
export declare const fileRouteMiddleware: readonly FileRouteManifestEntry[];
export declare const routes: readonly Route[];
export default routes;
`;
}
/**
 * Vite plugin for OKJS/HMR plus opt-in file-route generation and component-boundary checks.
 * The advanced capabilities are explicit so existing users retain the original plugin behavior.
 */
function oneKitVitePlugin(options = {}) {
    const include = options.include ?? /\.(ts|tsx|js|jsx|vue|svelte|okjs|html)$/;
    const exclude = options.exclude ?? /node_modules/;
    let projectRoot = process.cwd();
    const boundaryById = new Map();
    const importsById = new Map();
    const configuredBoundary = options.componentBoundary !== undefined;
    const strictBoundary = typeof options.componentBoundary === 'object' ? options.componentBoundary.strict !== false : true;
    const boundaryMarkers = typeof options.componentBoundary === 'object' ? options.componentBoundary.markers !== false : true;
    const virtualId = options.fileRoutes?.virtualModuleId ?? 'virtual:onekit/routes';
    const typesVirtualId = options.fileRoutes?.typesVirtualModuleId ?? `${virtualId}.d.ts`;
    const resolvedVirtualId = `\0${virtualId}`;
    const resolvedTypesVirtualId = `\0${typesVirtualId}`;
    const isOkjs = (id) => cleanId(id).endsWith('.okjs') && !exclude.test(id);
    const recordBoundary = (code, id) => {
        if (!configuredBoundary || exclude.test(id))
            return;
        boundaryById.set(cleanId(id), detectComponentBoundary(code, boundaryMarkers));
    };
    return {
        name: 'onekit-v3-hmr',
        enforce: 'pre',
        configResolved(config) {
            projectRoot = config.root;
        },
        resolveId(source, importer) {
            if (source === virtualId)
                return resolvedVirtualId;
            if (source === typesVirtualId)
                return resolvedTypesVirtualId;
            if (!isOkjs(source))
                return undefined;
            const cleanSource = cleanId(source);
            if (cleanSource.startsWith('/') && !cleanSource.startsWith('//'))
                return node_path.resolve(projectRoot, `.${cleanSource}`);
            if (cleanSource.startsWith('.') && importer)
                return node_path.resolve(node_path.dirname(cleanId(importer)), cleanSource);
            return undefined;
        },
        load(id) {
            if (id === resolvedTypesVirtualId && options.fileRoutes) {
                const configured = options.fileRoutes;
                const root = configured.root.startsWith('/') ? node_path.resolve(projectRoot, `.${configured.root}`) : node_path.resolve(projectRoot, configured.root);
                const files = discoverFiles(root, configured.include ?? extensionPattern(configured.extensions));
                const manifest = createFileRouteManifest(files.map(file => projectSourcePath(file, projectRoot)), {
                    root: manifestRoot(configured.root),
                    includeInfrastructure: configured.includeInfrastructure,
                });
                return { code: generateFileRouteTypes(manifest), map: null };
            }
            if (id === resolvedVirtualId && options.fileRoutes) {
                const configured = options.fileRoutes;
                const root = configured.root.startsWith('/') ? node_path.resolve(projectRoot, `.${configured.root}`) : node_path.resolve(projectRoot, configured.root);
                const files = discoverFiles(root, configured.include ?? extensionPattern(configured.extensions));
                const manifest = createFileRouteManifest(files.map(file => projectSourcePath(file, projectRoot)), {
                    root: manifestRoot(configured.root),
                    includeInfrastructure: configured.includeInfrastructure,
                });
                configured.onManifest?.(manifest);
                return { code: generateFileRouteModule(files, configured, projectRoot), map: null };
            }
            if (!isOkjs(id))
                return undefined;
            return compileOkjsForVite(node_fs.readFileSync(cleanId(id), 'utf8'), id);
        },
        transform(code, id) {
            recordBoundary(code, id);
            if (!isOkjs(id) || code.includes('const __okjsComponent = __okjsDefineComponent'))
                return undefined;
            return compileOkjsForVite(code, id);
        },
        moduleParsed(module) {
            if (!configuredBoundary)
                return;
            const id = cleanId(module.id);
            const imported = new Set();
            for (const child of module.importedModules ?? []) {
                if (child?.id)
                    imported.add(cleanId(child.id));
            }
            importsById.set(id, imported);
        },
        buildEnd() {
            if (!configuredBoundary || !strictBoundary)
                return;
            const reachesServer = (id, visiting) => {
                if (boundaryById.get(id) === 'server')
                    return id;
                if (visiting.has(id))
                    return undefined;
                const next = new Set(visiting).add(id);
                for (const imported of importsById.get(id) ?? []) {
                    const server = reachesServer(imported, next);
                    if (server)
                        return server;
                }
                return undefined;
            };
            for (const [id, boundary] of boundaryById) {
                if (boundary !== 'client')
                    continue;
                for (const imported of importsById.get(id) ?? []) {
                    const server = reachesServer(imported, new Set([id]));
                    if (server) {
                        throw new Error(`OneKit component boundary violation: client module ${id} statically imports server module ${server} (reaches server module through a transitive static path). Move the import behind a server-owned boundary or mark the shared module explicitly.`);
                    }
                }
            }
        },
        handleHotUpdate({ file, modules, server }) {
            if (!include.test(file) || exclude.test(file))
                return modules;
            options.onUpdate?.(file);
            server.ws.send({
                type: 'custom',
                event: 'onekit:hmr-update',
                data: {
                    file,
                    timestamp: Date.now(),
                    kind: file.endsWith('.okjs') ? 'okjs-component' : 'module',
                    reload: file.endsWith('.okjs') ? 'template-and-script' : 'module',
                },
            });
            return modules;
        },
    };
}

/** Store a reactive module's state in Vite's hot data object. */
function preserveHMRState(key, initial, hot = getHotModule()) {
    if (!hot)
        return initial;
    const existing = hot.data.state?.[key];
    const state = (existing && typeof existing === 'object' ? existing : initial);
    hot.accept();
    hot.dispose((data) => {
        data.state ??= {};
        data.state[key] = state;
        data.updatedAt = Date.now();
    });
    return state;
}
/** Register a scope/component/store cleanup for Vite module replacement. */
function registerHMRDisposable(resource, hot = getHotModule()) {
    if (!hot)
        return resource;
    const dispose = resource.dispose ?? resource.stop ?? resource.unsubscribe;
    if (dispose)
        hot.dispose(() => dispose.call(resource));
    return resource;
}
function getHotModule() {
    const meta = ({ url: (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('vite.cjs', document.baseURI).href)) });
    return meta.hot;
}

exports.oneKitVitePlugin = oneKitVitePlugin;
exports.preserveHMRState = preserveHMRState;
exports.registerHMRDisposable = registerHMRDisposable;
//# sourceMappingURL=vite.cjs.map
