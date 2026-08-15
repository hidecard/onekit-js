import { compileOkjs, parseOkjs } from '../src/okjs';

describe('.okjs single-file component compiler', () => {
  const source = `<script lang="ts">
export default {
  name: 'Greeting',
  data: () => ({ message: 'Hello' }),
};
</script>
<template><article><h1>{{message}}</h1></article></template>
<style scoped>
article { color: red; }
</style>`;

  it('parses script, template, style and scoped metadata', () => {
    expect(parseOkjs(source, '/src/Greeting.okjs')).toEqual({
      script: expect.stringContaining("name: 'Greeting'"),
      scriptLang: 'ts',
      template: '<article><h1>{{message}}</h1></article>',
      style: 'article { color: red; }',
      styleScoped: true,
    });
  });

  it('compiles to a default OneKit component module', () => {
    const result = compileOkjs(source, '/src/Greeting.okjs');
    expect(result.map).toBeNull();
    expect(result.code).toContain("import { defineComponent as __okjsDefineComponent } from 'onekit-js';");
    expect(result.code).toContain('data-okjs-scope');
    expect(result.code).toContain('data-okjs-style');
    expect(result.code).toContain('export default __okjsComponent;');
  });

  it('rejects missing templates and unsupported top-level blocks', () => {
    expect(() => parseOkjs('<script>export default {};</script>', 'Empty.okjs')).toThrow(/must contain a <template>/);
    expect(() => parseOkjs('<custom></custom><template><p>Hi</p></template>', 'Invalid.okjs')).toThrow(/Unsupported/);
  });
});
