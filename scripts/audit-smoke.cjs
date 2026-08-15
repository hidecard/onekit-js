const assert = require('node:assert/strict');
const kit = require('../dist/onekit.cjs');

const state = kit.reactive({ count: 0 });
let runs = 0;
const runner = kit.effect(() => { state.count; runs += 1; });
state.count = 1;
kit.stop(runner);
state.count = 2;
assert.equal(runs, 2, 'stopped effect should not rerun');

const router = kit.createRouter([
  { path: '/users/:id' },
  { path: '/private', beforeEnter: () => false },
], { mode: 'memory' });

(async () => {
  const match = await router.navigate('/users/7?tab=posts');
  assert.equal(match.location.params.id, '7');
  assert.equal(match.location.query.tab, 'posts');
  assert.equal(await router.navigate('/private'), null);

  const html = kit.renderToString(kit.h('main', { class: 'shell' }, 'Hello'));
  assert.match(html.html, /<main[^>]*class="shell"[^>]*>Hello<\/main>/);
  console.log('audit smoke passed');
})();
