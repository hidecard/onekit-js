import { preserveHMRState, registerHMRDisposable } from '../dist/vite.mjs';

const callbacks = [];
const hot = {
  data: {},
  accept() {},
  dispose(callback) {
    callbacks.push(callback);
  },
};

const state = preserveHMRState('verification', { count: 1 }, hot);
state.count = 2;

const resource = {
  disposed: 0,
  dispose() {
    this.disposed += 1;
  },
};
registerHMRDisposable(resource, hot);

const nextData = {};
callbacks.forEach(callback => callback(nextData));

if (resource.disposed !== 1) throw new Error('HMR disposable was not called exactly once');
if (nextData.state?.verification?.count !== 2) throw new Error('HMR state was not preserved');

console.log('HMR_SMOKE=PASS');
