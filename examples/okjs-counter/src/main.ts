import { create, destroy, mount, register } from 'onekit-js';
import Counter from './Counter.okjs';
import './style.css';

// Register and mount exactly one application root. Clearing the host makes
// repeated Vite/HMR evaluations safe instead of stacking duplicate screens.
register('Counter', Counter);
const app = document.querySelector('#app');
if (!app) throw new Error('OneKit app mount point #app was not found');
app.replaceChildren();
const instance = create('Counter');
if (!instance) throw new Error('Counter component could not be created');
mount(instance, app);

if (import.meta.hot) {
  import.meta.hot.dispose(() => destroy(instance));
}
