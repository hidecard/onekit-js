import { create, mount, register } from 'onekit-js';
import Counter from './Counter.okjs';
import './style.css';

// Register the compiled .okjs component and mount it into #app.
register('Counter', Counter);
const instance = create('Counter');
if (!instance) throw new Error('Counter component could not be created');
mount(instance, '#app');
