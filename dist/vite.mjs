import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import * as typescript from 'typescript';

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

function compileOkjsForVite(source, id) {
    const compiled = compileOkjs(source, id);
    const transpiled = typescript.transpileModule(compiled.code, {
        compilerOptions: {
            module: typescript.ModuleKind.ESNext,
            target: typescript.ScriptTarget.ES2020,
            sourceMap: false,
        },
        fileName: id,
    });
    return { code: transpiled.outputText, map: null };
}
/**
 * Vite plugin that announces OneKit module changes to the DevTools bridge and
 * keeps Vite's normal module graph/HMR behavior intact.
 */
function oneKitVitePlugin(options = {}) {
    const include = options.include ?? /\.(ts|tsx|js|jsx|vue|okjs|html)$/;
    const exclude = options.exclude ?? /node_modules/;
    let projectRoot = process.cwd();
    const isOkjs = (id) => id.split('?')[0].endsWith('.okjs') && !exclude.test(id);
    return {
        name: 'onekit-v3-hmr',
        enforce: 'pre',
        configResolved(config) {
            projectRoot = config.root;
        },
        resolveId(source, importer) {
            if (!isOkjs(source))
                return undefined;
            const cleanSource = source.split('?')[0];
            if (cleanSource.startsWith('/') && !cleanSource.startsWith('//'))
                return resolve(projectRoot, `.${cleanSource}`);
            if (cleanSource.startsWith('.') && importer)
                return resolve(dirname(importer.split('?')[0]), cleanSource);
            return undefined;
        },
        load(id) {
            if (!isOkjs(id))
                return undefined;
            return compileOkjsForVite(readFileSync(id.split('?')[0], 'utf8'), id);
        },
        transform(code, id) {
            if (!isOkjs(id) || code.includes('const __okjsComponent = __okjsDefineComponent'))
                return undefined;
            return compileOkjsForVite(code, id);
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
/**
 * Store a reactive module's state in Vite's hot data object. This keeps state
 * across accepted module updates without making production bundles depend on
 * Vite globals.
 */
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
    const meta = import.meta;
    return meta.hot;
}

export { oneKitVitePlugin, preserveHMRState, registerHMRDisposable };
//# sourceMappingURL=vite.mjs.map
