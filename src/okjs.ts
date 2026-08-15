export interface OkjsBlock {
  script: string;
  scriptLang: 'js' | 'ts';
  template: string;
  style: string;
  styleScoped: boolean;
}

export interface OkjsCompileResult {
  code: string;
  map: null;
}

function readBlock(source: string, tag: 'script' | 'template' | 'style'): { content: string; attrs: string } | null {
  const match = source.match(new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? { attrs: match[1] ?? '', content: match[2] ?? '' } : null;
}

function assertNoUnsupportedBlocks(source: string): void {
  const topLevel = source.replace(/<(script|template|style)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, '');
  const unsupported = topLevel.match(/<([a-z][\w-]*)(?:\s[^>]*)?>/gi)?.filter(tag => {
    const name = tag.match(/^<([a-z][\w-]*)/i)?.[1]?.toLowerCase();
    return name && !['script', 'template', 'style'].includes(name);
  });
  if (unsupported?.length) throw new Error(`[OneKit] Unsupported .okjs top-level block: ${unsupported[0]}`);
}

export function parseOkjs(source: string, id = 'component.okjs'): OkjsBlock {
  assertNoUnsupportedBlocks(source);
  const script = readBlock(source, 'script');
  const template = readBlock(source, 'template');
  const style = readBlock(source, 'style');
  if (!template?.content.trim()) throw new Error(`[OneKit] .okjs component ${id} must contain a <template> block.`);

  const lang = script?.attrs.match(/\blang\s*=\s*["'](ts|js)["']/i)?.[1]?.toLowerCase() as 'ts' | 'js' | undefined;
  return {
    script: script?.content.trim() ?? '',
    scriptLang: lang ?? 'ts',
    template: template.content.trim(),
    style: style?.content.trim() ?? '',
    styleScoped: Boolean(style?.attrs.match(/\bscoped(?:\s|=|$)/i)),
  };
}

function scopeTemplate(template: string, scopeId: string): string {
  return template.replace(/^(\s*<([a-z][\w-]*))([^>]*>)/i, `$1 data-okjs-scope="${scopeId}"$3`);
}

function scopeCss(css: string, scopeId: string): string {
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (_match, selector: string, body: string) => {
    const trimmed = selector.trim();
    if (!trimmed || trimmed.startsWith('@')) return `${selector}{${body}}`;
    const scoped = trimmed.split(',').map(item => `[data-okjs-scope="${scopeId}"] ${item.trim()}`).join(', ');
    return `${scoped}{${body}}`;
  });
}

function styleCode(style: string, id: string, scoped: boolean): string {
  const styleId = `onekit-okjs-${id.replace(/[^a-z0-9_-]/gi, '-')}`;
  if (!style) return `\nconst __okjsStyleId = ${JSON.stringify(styleId)};\n`;
  const css = scoped ? scopeCss(style, styleId) : style;
  return `\nconst __okjsStyleId = ${JSON.stringify(styleId)};\nconst __okjsStyleText = ${JSON.stringify(css)};\nif (typeof document !== 'undefined' && !document.querySelector('[data-okjs-style="' + __okjsStyleId + '"]')) {\n  const __okjsStyle = document.createElement('style');\n  __okjsStyle.setAttribute('data-okjs-style', __okjsStyleId);\n  __okjsStyle.textContent = __okjsStyleText;\n  document.head.appendChild(__okjsStyle);\n}\n`;
}

export function compileOkjs(source: string, id = 'component.okjs'): OkjsCompileResult {
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
